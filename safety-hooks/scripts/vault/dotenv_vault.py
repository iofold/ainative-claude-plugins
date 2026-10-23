#!/usr/bin/env python3
"""Centralized encrypted vault for .env files and per-key secrets management.

Extended vault with:
- Per-project whole-file backup (original SOPS-based, if GPG available)
- Per-key secrets store (Fernet-encrypted, auto-keyed)
- Per-project name mapping (central key name → local .env var name)
- Agent-safe injection into .env files
"""

import json
import os
import sys
import subprocess
import datetime
from pathlib import Path

import click


class KeyVault:
    """Per-key secrets store with Fernet encryption."""

    def __init__(self, vault_dir: Path):
        self.vault_dir = vault_dir
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.key_file = self.vault_dir / ".vault-key"
        self.secrets_file = self.vault_dir / "secrets.enc"
        self.maps_dir = self.vault_dir / "maps"
        self.maps_dir.mkdir(exist_ok=True)
        self._ensure_key()

    def _ensure_key(self):
        """Generate or load Fernet key."""
        from cryptography.fernet import Fernet

        if self.key_file.exists():
            self.fernet = Fernet(self.key_file.read_bytes().strip())
        else:
            key = Fernet.generate_key()
            self.key_file.write_bytes(key)
            os.chmod(str(self.key_file), 0o600)
            self.fernet = Fernet(key)
            click.echo(f"🔑 Generated vault key at {self.key_file}")

    def _load_secrets(self) -> dict:
        """Decrypt and load all secrets."""
        if not self.secrets_file.exists():
            return {}
        try:
            encrypted = self.secrets_file.read_bytes()
            decrypted = self.fernet.decrypt(encrypted)
            return json.loads(decrypted)
        except Exception as e:
            click.echo(f"❌ Failed to decrypt secrets: {e}", err=True)
            sys.exit(1)

    def _save_secrets(self, secrets: dict):
        """Encrypt and save all secrets."""
        plaintext = json.dumps(secrets, indent=2).encode()
        encrypted = self.fernet.encrypt(plaintext)
        self.secrets_file.write_bytes(encrypted)
        os.chmod(str(self.secrets_file), 0o600)

    def _project_name(self) -> str:
        return Path.cwd().name

    def _map_path(self, project: str = None) -> Path:
        project = project or self._project_name()
        return self.maps_dir / f"{project}.map"

    def _load_map(self, project: str = None) -> dict:
        """Load project key mapping. Returns {local_name: central_name}."""
        map_path = self._map_path(project)
        if not map_path.exists():
            return {}
        mapping = {}
        for line in map_path.read_text().strip().split("\n"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                local, _, central = line.partition("=")
                mapping[local.strip()] = central.strip()
        return mapping

    def _save_map(self, mapping: dict, project: str = None):
        """Save project key mapping."""
        map_path = self._map_path(project)
        project = project or self._project_name()
        with open(map_path, "w") as f:
            f.write(f"# Vault key mappings for {project}\n")
            f.write(f"# Format: LOCAL_ENV_VAR=CENTRAL_VAULT_KEY\n")
            for local, central in sorted(mapping.items()):
                f.write(f"{local}={central}\n")

    # --- Key CRUD ---

    def set_key(self, name: str, value: str):
        secrets = self._load_secrets()
        is_update = name in secrets
        secrets[name] = value
        self._save_secrets(secrets)
        action = "Updated" if is_update else "Added"
        click.echo(f"✅ {action} '{name}' in vault")

    def get_key(self, name: str) -> str | None:
        secrets = self._load_secrets()
        if name not in secrets:
            click.echo(f"❌ Key '{name}' not found in vault", err=True)
            return None
        return secrets[name]

    def remove_key(self, name: str):
        secrets = self._load_secrets()
        if name not in secrets:
            click.echo(f"❌ Key '{name}' not found in vault", err=True)
            return
        del secrets[name]
        self._save_secrets(secrets)
        click.echo(f"✅ Removed '{name}' from vault")

    def list_keys(self):
        secrets = self._load_secrets()
        if not secrets:
            click.echo("No keys in vault")
            return
        click.echo(f"🔑 Keys in vault ({len(secrets)}):")
        for k in sorted(secrets):
            # Show first 4 chars of value as hint
            v = secrets[k]
            preview = v[:4] + "..." if len(v) > 4 else v
            click.echo(f"  {k}  ({preview})")

    # --- Mapping ---

    def set_map(self, central_name: str, local_name: str, project: str = None):
        mapping = self._load_map(project)
        mapping[local_name] = central_name
        self._save_map(mapping, project)
        proj = project or self._project_name()
        click.echo(f"✅ Mapped: {central_name} → {local_name} (project: {proj})")

    def remove_map(self, local_name: str, project: str = None):
        mapping = self._load_map(project)
        if local_name not in mapping:
            click.echo(f"❌ No mapping for '{local_name}'", err=True)
            return
        del mapping[local_name]
        self._save_map(mapping, project)
        click.echo(f"✅ Removed mapping for '{local_name}'")

    def show_maps(self, project: str = None):
        mapping = self._load_map(project)
        proj = project or self._project_name()
        if not mapping:
            click.echo(f"No mappings for project '{proj}'")
            return
        click.echo(f"📋 Mappings for '{proj}':")
        for local, central in sorted(mapping.items()):
            click.echo(f"  {central} → {local}")

    # --- Injection ---

    def inject(self, key_specs: list[str], use_map: bool = False):
        """Inject secrets into the current directory's .env file.

        key_specs: list of KEY or CENTRAL=LOCAL specifiers
        use_map: also inject all keys from the project mapping
        """
        secrets = self._load_secrets()
        mapping = self._load_map()
        env_file = Path.cwd() / ".env"

        # Read existing .env preserving structure
        existing_lines = []
        existing_keys = {}
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                existing_lines.append(line)
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key, _, _ = stripped.partition("=")
                    existing_keys[key.strip()] = len(existing_lines) - 1

        # Collect keys to inject: {local_name: value}
        to_inject = {}
        warnings = []

        # From explicit specs
        for spec in key_specs:
            if "=" in spec:
                # CENTRAL=LOCAL format
                central, _, local = spec.partition("=")
                if central in secrets:
                    to_inject[local] = secrets[central]
                else:
                    warnings.append(f"Key '{central}' not found in vault")
            else:
                # Plain key name — check mapping first
                central_name = None
                local_name = spec

                # Check if spec is a local name with a mapping
                if spec in mapping:
                    central_name = mapping[spec]
                    local_name = spec
                # Check if spec is a central name mapped somewhere
                else:
                    for ln, cn in mapping.items():
                        if cn == spec:
                            central_name = cn
                            local_name = ln
                            break

                # Fall back to same name
                if central_name is None:
                    central_name = spec

                if central_name in secrets:
                    to_inject[local_name] = secrets[central_name]
                else:
                    warnings.append(f"Key '{central_name}' not found in vault")

        # From project mapping
        if use_map:
            for local_name, central_name in mapping.items():
                if local_name in to_inject:
                    continue  # explicit spec takes priority
                if central_name in secrets:
                    to_inject[local_name] = secrets[central_name]
                else:
                    warnings.append(
                        f"Mapped key '{central_name}' (→{local_name}) not found in vault"
                    )

        for w in warnings:
            click.echo(f"⚠️  {w}")

        if not to_inject:
            click.echo("❌ No keys to inject")
            return

        # Apply: update existing lines in place, append new ones
        for local_name, value in to_inject.items():
            line_content = f"{local_name}={value}"
            if local_name in existing_keys:
                idx = existing_keys[local_name]
                existing_lines[idx] = line_content
            else:
                existing_lines.append(line_content)

        # Write back
        with open(env_file, "w") as f:
            f.write("\n".join(existing_lines))
            if not existing_lines[-1] == "":
                f.write("\n")

        for k in sorted(to_inject):
            click.echo(f"  ✅ {k}")
        click.echo(f"💉 Injected {len(to_inject)} key(s) into .env")


class DotenvVault:
    """Original whole-file vault using SOPS+GPG (kept for backward compat)."""

    def __init__(self):
        self.vault_dir = Path.home() / "Git" / "dotenvs"
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.gpg_key = None
        self._detect_gpg_key()

    def _detect_gpg_key(self):
        """Detect GPG key (non-fatal)."""
        try:
            result = subprocess.run(
                ["gpg", "--list-secret-keys", "--keyid-format", "LONG"],
                capture_output=True,
                text=True,
                check=True,
            )
            lines = result.stdout.strip().split("\n")
            for line in lines:
                if "sec" in line:
                    key = line.split()[1].split("/")[1]
                    self.gpg_key = key
                    return
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass

    def _require_gpg(self):
        if not self.gpg_key:
            click.echo(
                "❌ No GPG key found. Run: gpg --gen-key\n"
                "   (GPG is only needed for whole-file encrypt/decrypt)",
                err=True,
            )
            sys.exit(1)

    def _project_name(self):
        return Path.cwd().name

    def _backup_path(self, project=None):
        project = project or self._project_name()
        return self.vault_dir / f"{project}.env.encrypt"

    def encrypt(self, force=False):
        """Encrypt current .env to centralized vault with protection."""
        self._require_gpg()
        env_file = Path.cwd() / ".env"
        if not env_file.exists():
            click.echo("❌ .env not found in current directory")
            return False

        backup_path = self._backup_path()

        if backup_path.exists():
            if not force:
                click.echo("⚠️  Encrypted backup already exists!")
                if not click.confirm("Overwrite encrypted backup?", default=False):
                    return False

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_save = f"{backup_path}.backup-{timestamp}"
            backup_path.rename(backup_save)
            click.echo(f"💾 Backed up encrypted file → {backup_save}")

        cmd = [
            "sops",
            "--encrypt",
            "--pgp",
            self.gpg_key,
            "--input-type",
            "dotenv",
            "--output-type",
            "dotenv",
            str(env_file),
        ]

        try:
            with open(backup_path, "w") as f:
                subprocess.run(cmd, stdout=f, check=True)
            click.echo(f"✅ Encrypted .env → {backup_path}")
            return True
        except subprocess.CalledProcessError as e:
            click.echo(f"❌ Encryption failed: {e}")
            return False

    def decrypt(self, force=False):
        """Decrypt from centralized vault to .env with safety checks."""
        self._require_gpg()
        backup_path = self._backup_path()
        if not backup_path.exists():
            click.echo(f"❌ {backup_path} not found")
            return False

        env_file = Path.cwd() / ".env"

        if env_file.exists():
            env_mtime = env_file.stat().st_mtime
            backup_mtime = backup_path.stat().st_mtime

            if env_mtime > backup_mtime:
                click.echo("⚠️  Current .env is newer than backup!")
                if not click.confirm("Proceed with decryption?", default=False):
                    return False

        if env_file.exists():
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f".env.backup-{timestamp}"
            env_file.rename(backup_name)
            click.echo(f"💾 Backed up current .env → {backup_name}")

        cmd = [
            "sops",
            "--decrypt",
            "--input-type",
            "dotenv",
            "--output-type",
            "dotenv",
            str(backup_path),
        ]

        try:
            with open(env_file, "w") as f:
                subprocess.run(cmd, stdout=f, check=True)
            click.echo(f"✅ Decrypted {backup_path} → {env_file}")
            return True
        except subprocess.CalledProcessError as e:
            click.echo(f"❌ Decryption failed: {e}")
            return False

    def list_backups(self):
        """List all encrypted backups."""
        backups = list(self.vault_dir.glob("*.env.encrypt"))
        if not backups:
            click.echo("No encrypted project backups found")
            return

        click.echo(f"📋 Encrypted project backups in {self.vault_dir}:")
        for backup in sorted(backups):
            size = backup.stat().st_size
            click.echo(f"  {backup.name} ({size} bytes)")

    def status(self):
        """Show status for current project."""
        project = self._project_name()
        backup_path = self._backup_path()

        env_exists = Path(".env").exists()
        backup_exists = backup_path.exists()

        if env_exists and backup_exists:
            env_mtime = Path(".env").stat().st_mtime
            backup_mtime = backup_path.stat().st_mtime

            if env_mtime > backup_mtime:
                click.echo("📊 Local .env is NEWER than backup")
                return "local_newer"
            elif backup_mtime > env_mtime:
                click.echo("📊 Backup is NEWER than local .env")
                return "backup_newer"
            else:
                click.echo("✅ .env and backup are identical")
                return "identical"
        elif env_exists:
            click.echo("📊 .env exists, no backup")
            return "local_only"
        elif backup_exists:
            click.echo("📊 Backup exists, no local .env")
            return "backup_only"
        else:
            click.echo("❌ Neither .env nor backup exists")
            return "neither"

    def sync(self, direction=None):
        """Smart sync between local .env and centralized vault."""
        self._require_gpg()
        status = self.status()

        if status == "identical":
            click.echo("✅ Already in sync")
            return True
        elif status == "local_only":
            click.echo("🔄 Encrypting local .env to centralized vault")
            return self.encrypt()
        elif status == "backup_only":
            click.echo("🔄 Decrypting centralized vault to local .env")
            return self.decrypt()
        elif status == "local_newer":
            if direction == "pull":
                click.echo("⚠️  Local .env is newer but --pull requested")
                if click.confirm("Overwrite local .env with backup?", default=False):
                    return self.decrypt()
            else:
                click.echo("🔄 Encrypting local .env to centralized vault")
                return self.encrypt()
        elif status == "backup_newer":
            if direction == "push":
                click.echo("⚠️  Backup is newer but --push requested")
                if click.confirm("Overwrite backup with local .env?", default=False):
                    return self.encrypt()
            else:
                click.echo("🔄 Decrypting centralized vault to local .env")
                return self.decrypt()


# --- CLI ---


@click.group()
def cli():
    """Centralized encrypted vault for .env files and secrets."""
    pass


# -- Per-key commands --


@cli.command("set")
@click.argument("name")
@click.argument("value")
def cmd_set(name, value):
    """Store a named secret in the vault."""
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    kv.set_key(name, value)


@cli.command("get")
@click.argument("name")
def cmd_get(name):
    """Retrieve a secret value (prints to stdout)."""
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    value = kv.get_key(name)
    if value is not None:
        click.echo(value)


@cli.command("keys")
def cmd_keys():
    """List all secret names in the vault."""
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    kv.list_keys()


@cli.command("rm")
@click.argument("name")
def cmd_rm(name):
    """Remove a secret from the vault."""
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    kv.remove_key(name)


@cli.command("map")
@click.argument("central_name")
@click.argument("local_name")
@click.option("--project", default=None, help="Project name (defaults to current dir)")
def cmd_map(central_name, local_name, project):
    """Map a vault key to a local .env variable name for this project.

    Example: vault map OPENAI_KEY_PERSONAL OPENAI_API_KEY
    """
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    kv.set_map(central_name, local_name, project)


@cli.command("unmap")
@click.argument("local_name")
@click.option("--project", default=None, help="Project name (defaults to current dir)")
def cmd_unmap(local_name, project):
    """Remove a key mapping for this project."""
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    kv.remove_map(local_name, project)


@cli.command("maps")
@click.option("--project", default=None, help="Project name (defaults to current dir)")
def cmd_maps(project):
    """Show key mappings for this project."""
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    kv.show_maps(project)


@cli.command("inject")
@click.argument("key_specs", nargs=-1)
@click.option("--mapped", is_flag=True, help="Also inject all mapped keys for this project")
def cmd_inject(key_specs, mapped):
    """Inject vault secrets into the current .env file.

    \b
    Examples:
      vault inject OPENAI_API_KEY              # same name in vault and .env
      vault inject OPENAI_KEY_WORK=OPENAI_API_KEY  # vault key → .env name
      vault inject --mapped                    # inject all project-mapped keys
      vault inject EXTRA_KEY --mapped          # mapped keys + explicit key
    """
    vault_dir = Path.home() / "Git" / "dotenvs"
    kv = KeyVault(vault_dir)
    kv.inject(list(key_specs), use_map=mapped)


# -- Whole-file commands (original) --


@cli.command("encrypt")
def cmd_encrypt():
    """Encrypt current .env to centralized vault (requires GPG+SOPS)."""
    vault = DotenvVault()
    vault.encrypt()


@cli.command("decrypt")
def cmd_decrypt():
    """Decrypt from centralized vault to .env (requires GPG+SOPS)."""
    vault = DotenvVault()
    vault.decrypt()


@cli.command("list")
def cmd_list():
    """List all encrypted project backups."""
    vault = DotenvVault()
    vault.list_backups()


@cli.command("status")
def cmd_status():
    """Show sync status for current project."""
    vault = DotenvVault()
    vault.status()


@cli.command("sync")
@click.option("--push", "direction", flag_value="push", help="Force push (encrypt)")
@click.option("--pull", "direction", flag_value="pull", help="Force pull (decrypt)")
def cmd_sync(direction):
    """Smart sync between local .env and centralized vault (requires GPG+SOPS)."""
    vault = DotenvVault()
    vault.sync(direction)


def main():
    cli()


if __name__ == "__main__":
    main()
