# Contributing

## Issues

Bug reports + feature requests welcome via GitHub Issues. Please:
- Search existing issues first.
- Provide reproduction steps for bugs.
- For feature requests, describe the user problem before the proposed solution.

## Pull requests

- Branch from `main`.
- One feature per PR.
- All tests + lint + typecheck must pass.
- Multi-tenant code (anything touching `tenant_id`) requires TDD — write the tenant-isolation test first.
- Keep changes scoped — refactors land separately from features.

## Code style

- TypeScript strict mode.
- Prefer small focused files (<400 lines).
- Run `pnpm lint` + `pnpm typecheck` before committing.

## License

Contributions are accepted under AGPL-3.0.
