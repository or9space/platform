# or9.space platform

Multi-tenant SaaS platform for Star Citizen orgs. The org HQ for serious crews — forums, handbook, sign-offs, loot points, inventory, treasury, fleet, tournaments — runs as a single Next 16 app serving any number of tenants from a single deployment.

## Hosted

Use the hosted service at <https://or9.space> — free tier with ads, paid tier removes ads + custom domain + Discord bot. No setup, no servers.

## Self-host (this repo)

```sh
git clone https://github.com/or9space/platform.git
cd platform
pnpm install
cp .env.example .env
# edit .env to point at your Postgres + Resend + OAuth providers
pnpm db:migrate
pnpm db:seed
pnpm dev
```

See `docs/self-host.md` for production deploy.

## License

AGPL-3.0. See `LICENSE`.

`or9.space` is the hosted commercial service built on top of this repo plus a closed-source overlay (`platform-paid`). The overlay adds billing, ads, automated custom domain attach, and a managed Discord bot.

## Status

Phase 0 — platform skeleton. Not yet production-ready. See `docs/superpowers/specs/` for design + roadmap.
