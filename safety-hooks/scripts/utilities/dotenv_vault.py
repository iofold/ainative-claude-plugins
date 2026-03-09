#!/usr/bin/env python3
"""Centralized encrypted backup for .env files using SOPS."""

import os
import sys
import subprocess
import datetime
from pathlib import Path

import click


class DotenvVault:
    def __init__(self):
        self.vault_dir = Path.home() / "dotenvs"
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_gpg_key()

    def _ensure_gpg_key(self):
        """Detect GPG key or fail early."""
        try:
            result = subprocess.run(
                ["gpg", "--list-secret-keys", "--keyid-format", "LONG"],
                capture_output=True,
                text=True,
                check=True
            )
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if 'sec' in line:
                    key = line.split()[1].split('/')[1]
                    self.gpg_key = key
                    return
            click.echo("No GPG key found. Run: gpg --gen-key", err=True)
            sys.exit(1)
        except subprocess.CalledProcessError:
            click.echo("GPG not found or error listing keys", err=True)
            sys.exit(1)

    def _project_name(self):
        """Get current project name from directory."""
        return Path.cwd().name

    def _backup_path(self, project=None):
        """Get encrypted file path for project."""
        project = project or self._project_name()
        return self.vault_dir / f"{project}.env.encrypt"

    def encrypt(self, force=False):
        """Encrypt current .env to centralized vault with protection."""
        env_file = Path.cwd() / ".env"
        if not env_file.exists():
            click.echo(".env not found in current directory")
            return False

        backup_path = self._backup_path()

        # Protect encrypted backup
        if backup_path.exists():
            if not force:
                click.echo("Encrypted backup already exists!")
                if not click.confirm("Overwrite encrypted backup?", default=False):
                    return False

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_save = f"{backup_path}.backup-{timestamp}"
            backup_path.rename(backup_save)
            click.echo(f"Backed up encrypted file -> {backup_save}")

        cmd = [
            "sops", "--encrypt",
            "--pgp", self.gpg_key,
            "--input-type", "dotenv",
            "--output-type", "dotenv",
            str(env_file)
        ]

        try:
            with open(backup_path, 'w') as f:
                subprocess.run(cmd, stdout=f, check=True)
            click.echo(f"Encrypted .env -> {backup_path}")
            return True
        except subprocess.CalledProcessError as e:
            click.echo(f"Encryption failed: {e}")
            return False

    def decrypt(self, force=False):
        """Decrypt from centralized vault to .env with safety checks."""
        backup_path = self._backup_path()
        if not backup_path.exists():
            click.echo(f"{backup_path} not found")
            return False

        env_file = Path.cwd() / ".env"

        # Check if current .env is newer than backup
        if env_file.exists():
            env_mtime = env_file.stat().st_mtime
            backup_mtime = backup_path.stat().st_mtime

            if env_mtime > backup_mtime:
                click.echo("Current .env is newer than backup!")
                if not click.confirm("Proceed with decryption?", default=False):
                    return False

        # Always backup current .env if it exists
        if env_file.exists():
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f".env.backup-{timestamp}"
            env_file.rename(backup_name)
            click.echo(f"Backed up current .env -> {backup_name}")

        cmd = [
            "sops", "--decrypt",
            "--input-type", "dotenv",
            "--output-type", "dotenv",
            str(backup_path)
        ]

        try:
            with open(env_file, 'w') as f:
                subprocess.run(cmd, stdout=f, check=True)
            click.echo(f"Decrypted {backup_path} -> {env_file}")
            return True
        except subprocess.CalledProcessError as e:
            click.echo(f"Decryption failed: {e}")
            return False

    def list_backups(self):
        """List all encrypted backups."""
        backups = list(self.vault_dir.glob("*.env.encrypt"))
        if not backups:
            click.echo("No encrypted files found")
            return

        click.echo(f"Encrypted files in {self.vault_dir}:")
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
                click.echo("Local .env is NEWER than backup")
                click.echo(f"   .env: {datetime.datetime.fromtimestamp(env_mtime).strftime('%Y-%m-%d %H:%M:%S')}")
                click.echo(f"   backup: {datetime.datetime.fromtimestamp(backup_mtime).strftime('%Y-%m-%d %H:%M:%S')}")
                return "local_newer"
            elif backup_mtime > env_mtime:
                click.echo("Backup is NEWER than local .env")
                click.echo(f"   .env: {datetime.datetime.fromtimestamp(env_mtime).strftime('%Y-%m-%d %H:%M:%S')}")
                click.echo(f"   backup: {datetime.datetime.fromtimestamp(backup_mtime).strftime('%Y-%m-%d %H:%M:%S')}")
                return "backup_newer"
            else:
                click.echo(".env and backup are identical")
                return "identical"
        elif env_exists:
            click.echo(".env exists, no backup")
            return "local_only"
        elif backup_exists:
            click.echo("Backup exists, no local .env")
            return "backup_only"
        else:
            click.echo("Neither .env nor backup exists")
            return "neither"

    def sync(self, direction=None):
        """Smart sync between local .env and centralized vault."""
        project = self._project_name()
        backup_path = self._backup_path()
        env_file = Path.cwd() / ".env"

        status = self.status()

        if status == "identical":
            click.echo("Already in sync")
            return True

        elif status == "local_only":
            click.echo("Encrypting local .env to centralized vault")
            return self.encrypt()

        elif status == "backup_only":
            click.echo("Decrypting centralized vault to local .env")
            return self.decrypt()

        elif status == "local_newer":
            if direction == "pull":
                click.echo("Local .env is newer but --pull requested")
                if click.confirm("Overwrite local .env with backup?", default=False):
                    return self.decrypt()
            else:
                click.echo("Encrypting local .env to centralized vault")
                return self.encrypt()

        elif status == "backup_newer":
            if direction == "push":
                click.echo("Backup is newer but --push requested")
                if click.confirm("Overwrite backup with local .env?", default=False):
                    return self.encrypt()
            else:
                click.echo("Decrypting centralized vault to local .env")
                return self.decrypt()


def main():
    """Centralized encrypted backup for .env files."""
    import sys

    if len(sys.argv) == 1:
        # Default to sync if no command provided
        vault = DotenvVault()
        vault.sync()
    else:
        # Normal CLI handling
        import click

        @click.group()
        def cli():
            """Centralized encrypted backup for .env files."""
            pass

        @cli.command()
        def encrypt():
            """Encrypt current .env to centralized vault."""
            vault = DotenvVault()
            vault.encrypt()

        @cli.command()
        def decrypt():
            """Decrypt from centralized vault to .env."""
            vault = DotenvVault()
            vault.decrypt()

        @cli.command()
        def list():
            """List all encrypted backups."""
            vault = DotenvVault()
            vault.list_backups()

        @cli.command()
        def status():
            """Show detailed status for current project."""
            vault = DotenvVault()
            vault.status()

        @cli.command()
        @click.option('--push', 'direction', flag_value='push', help='Force push (encrypt)')
        @click.option('--pull', 'direction', flag_value='pull', help='Force pull (decrypt)')
        def sync(direction):
            """Smart sync between local .env and centralized vault."""
            vault = DotenvVault()
            vault.sync(direction)

        cli()


if __name__ == "__main__":
    main()
