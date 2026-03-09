# Documentation Patterns to Check

Common patterns and anti-patterns in project documentation.

## File Patterns

### Documentation Locations

```bash
# Common doc locations to search
docs/
doc/
documentation/
wiki/
.github/
README.md
CONTRIBUTING.md
CHANGELOG.md
API.md
ARCHITECTURE.md
```

### Glob Patterns for Finding Docs

```bash
# Markdown docs
**/*.md

# API specs
**/swagger.{json,yaml}
**/openapi.{json,yaml}
**/*api*.{json,yaml}

# Diagrams
**/*.mmd
**/*.puml
**/*.drawio

# Config docs
**/.env.example
**/config.example.*
```

## Common Staleness Patterns

### README.md Staleness

**Signs of outdated README:**
- Node/Python version doesn't match package.json/pyproject.toml
- Install commands reference old package manager (npm vs pnpm)
- Screenshots show old UI
- Links to docs.example.com that 404
- References to removed features
- "Coming soon" for features that exist

**Check commands:**
```bash
# Compare documented vs actual Node version
grep -E "node|engine" package.json
grep -E "[0-9]+\.[0-9]+" README.md | head -5

# Find potentially broken links
grep -oE 'https?://[^)]+' README.md
```

### API Documentation Staleness

**Signs of outdated API docs:**
- Endpoint paths changed (/api/v1 -> /api/v2)
- Request body fields added/removed
- Response format changed
- Authentication method changed
- Status codes different

**Check commands:**
```bash
# Find route definitions
grep -r "@route\|@api\|router\." src/
grep -r "app\.(get|post|put|delete)" src/
```

### Architecture Documentation Staleness

**Signs of outdated architecture:**
- Directories mentioned don't exist
- Components renamed
- Dependencies added/removed
- Patterns changed (REST -> GraphQL)
- Database schema evolved

**Check commands:**
```bash
# Compare documented structure with reality
ls -la src/
find src -type d -maxdepth 2
```

## Anti-Patterns to Flag

### Documentation Rot

```markdown
# Anti-pattern: Vague timestamps
"Recently updated" -> When?
"Coming soon" -> Is it here yet?
"TODO: Add docs" -> Still TODO?
```

### Dead Links

```bash
# Find potential dead links
grep -oE '\[.*\]\(http[^)]+\)' **/*.md
```

### Orphaned Documentation

Files that document removed features:
- Check if documented paths exist
- Check if documented functions exist
- Check if documented APIs are still active

### Conflicting Documentation

Multiple docs saying different things:
- README says Node 18, package.json says 20
- API.md says POST, actual code is PUT
- Setup says `npm install`, Makefile says `yarn`

## Documentation Quality Checklist

### README Must-Haves

- [ ] Project name and description
- [ ] Installation instructions
- [ ] Usage examples
- [ ] Configuration options
- [ ] Contributing guidelines (or link)
- [ ] License

### API Documentation Must-Haves

- [ ] All endpoints listed
- [ ] Request/response examples
- [ ] Authentication requirements
- [ ] Error codes and meanings
- [ ] Rate limits if applicable

### Setup Documentation Must-Haves

- [ ] Prerequisites (versions)
- [ ] Environment variables
- [ ] Step-by-step instructions
- [ ] Verification steps
- [ ] Common issues/troubleshooting

## Grep Patterns for Common Issues

```bash
# Find version numbers that might be outdated
grep -E "[0-9]+\.[0-9]+\.[0-9]+" docs/

# Find TODO/FIXME in docs
grep -rE "TODO|FIXME|XXX|HACK" docs/

# Find "coming soon" type phrases
grep -riE "coming soon|todo|will be|planned" docs/

# Find potentially broken relative links
grep -oE '\]\(\./[^)]+\)' **/*.md

# Find dates that might indicate staleness
grep -E "202[0-3]|January|February|March" docs/
```

## Archive Patterns

### When to Archive

Archive documentation when:
- Feature is fully implemented and stable
- Plan is completed or abandoned
- Spec is superseded by newer version
- Documentation is >6 months old and outdated

### Archive Structure

```
docs/
├── current/          # Active documentation
├── archive/          # Old but potentially useful
│   ├── 2024/
│   │   ├── v1-api.md
│   │   └── old-auth-plan.md
│   └── 2023/
└── plans/            # Active plans only
```

### Archive Naming

```bash
# Add date prefix when archiving
mv docs/plans/auth.md docs/archive/2024-01-auth-plan.md

# Or use subdirectories
mv docs/plans/auth.md docs/archive/2024/auth-plan.md
```

## Output Consistency

### Finding Format

```markdown
### [Category]
| Item | Status | Details |
|------|--------|---------|
| [item] | [ok/warning/error] | [specifics] |
```

### Recommendation Format

```markdown
### Recommendations
1. **[Priority]**: [Action] - [Reason]
2. **[Priority]**: [Action] - [Reason]
```

Priority levels:
- **Critical**: Blocks users, incorrect info
- **High**: Causes confusion, missing essential info
- **Medium**: Improvements, nice-to-have
- **Low**: Polish, minor updates
