# Contributing

Habit League is proprietary software. This repository is shared only with invited collaborators and authorized partners.

## Before You Contribute

- Do not copy, reuse, redistribute, or republish repository code or documentation outside authorized project work.
- Access to the repository does not grant ownership or reuse rights.
- Read the repository `LICENSE` and `SECURITY.md` first.

## Branching

- Use feature branches
- Keep changes focused
- Avoid mixing product work with unrelated cleanup

Suggested branch format:

- `feature/...`
- `fix/...`
- `chore/...`

## Environment and Secrets

- Never commit `.env`
- Keep `.env.example` updated when environment requirements change
- Do not commit credentials, tokens, keystores, or local config artifacts

## Verification

Run these before opening a pull request:

```powershell
npx.cmd expo install --check
npx.cmd tsc --noEmit
npx.cmd expo export --platform android --clear
```

## Commit Style

Preferred commit style:

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`

Use short, clear summaries.

## Pull Request Expectations

Pull requests should include:

- concise summary
- what changed
- screenshots if UI changed
- verification notes
- known risks or follow-up work
- explicit confirmation that `.env` was not committed

## Scope Discipline

- Keep code beginner-friendly
- Reuse existing patterns when possible
- Avoid unnecessary rewrites
- Keep Firebase and demo mode behavior in sync when touching the data layer
