# Self-host guide

This guide shows how to run the open-source `platform` build on your own infrastructure. The hosted `or9.space` service includes additional closed-source features (Stripe billing, ads, CF SSL-for-SaaS automation, managed Discord bot) that are absent here.

## Prereqs

- A Postgres database (Supabase free tier works, or your own).
- A domain you control (e.g., `myorg.example`).
- Resend account for transactional email (free tier covers small orgs).
- Discord OAuth app for sign-in.
- A small Linux VPS (1 GB RAM minimum) OR a Vercel Hobby project (non-commercial use only per Vercel TOS).

## Local dev

```sh
git clone https://github.com/or9space/platform.git
cd platform
pnpm install
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, OAuth + Resend keys.
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Visit `http://localhost:3000`. Two seeded tenants at `demo.localhost:3000` and `freedomguards.localhost:3000`. Add these hostnames to your `hosts` file if your browser blocks them.

## Production (Linux VPS + Cloudflare Tunnel)

Recommended: $5/mo VPS (Hetzner CX22, Contabo VPS S, etc.) behind Cloudflare's free wildcard SSL.

1. Install Docker on the VPS.
2. Clone this repo to `/opt/platform`.
3. Copy `.env.example` to `.env`, fill in production secrets.
4. Set up Cloudflare Tunnel:
   - In CF dashboard, Zero Trust, Networks, Tunnels, Create.
   - Install `cloudflared` on the VPS, run the install command from the dashboard.
   - Route `*.yourdomain.com` to `http://localhost:3000`.
5. Start the stack: `docker compose up -d`.
6. Visit `https://demo.yourdomain.com` and watch the tenant home render.

## Custom domain attach

OSS self-host: manual. Add a CNAME from `yourtenant.com` to `<your-vps>.yourdomain.com`, then `INSERT INTO tenants (..., custom_domain) VALUES (..., 'yourtenant.com');`. Issue your own cert via Cloudflare or Caddy.

Hosted or9.space: one-click via CF SSL-for-SaaS (paid tier).

## Going further

The closed-source `platform-paid` overlay is not available for self-host. To replicate paid features yourself:
- Billing: integrate Stripe Checkout directly.
- Ads: serve from your own ad inventory.
- Custom-domain automation: roll your own CF API client.

If you build these and want to keep using upstream `platform`, ensure your overlay implements the `AdProvider` / `BillingProvider` / `DomainAttachProvider` interfaces (`lib/extensions/*-provider.ts`) and registers via `ExtensionRegistry.register(...)` at module-load time.
