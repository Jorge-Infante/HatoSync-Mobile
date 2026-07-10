# OpenCode Skills

This directory is the source of truth for shared workspace skills.

## Scope

- OpenCode desktop reads shared skills from `.opencode/skills/`.
- OpenCode Docker service receives a synced mirror at `devzeros-ai-office/opencode/.opencode/skills/`.
- Codex receives a generated repo-scoped mirror at `.agents/skills/`.
- `devzeros-ai-office/opencode/skills/` is deprecated and should keep only its README reference.

## Usage

- Load `devzeros-design-system` for any frontend visual change.
- Load `design-skill-stack` when a task spans product UI, prototypes, motion, video, accessibility, SEO, or skill routing.
- HyperFrames skills are installed for HTML-native video deliverables. Huashu Design is research-only unless written commercial authorization is obtained.
- Keep skill content aligned with `AGENTS.md` and `.opencode/instructions/INSTRUCTIONS.md`.
- Add auxiliary files only when they materially help the skill.
- Every `SKILL.md` should expose `name` and `description` metadata. The sync script patches missing metadata in the generated Codex mirror, but source skills should still be kept explicit over time.

## Synchronization

```bash
npm run agents:sync
npm run agents:sync:check
```

Narrow sync commands are available when needed:

```bash
npm run opencode:sync
npm run codex:sync
```

## Structure

```text
skill-name/
|-- SKILL.md
|-- README.md            # optional
`-- references/          # optional
```

## Create Or Edit A Skill

1. Edit `skill-name/SKILL.md` in this directory.
2. Keep guidance specific to this repository and avoid generic stack advice that does not apply here.
3. Run `npm run agents:sync`.
4. Do not add shared skills directly under `devzeros-ai-office/opencode/skills/` or `.agents/skills/`.
