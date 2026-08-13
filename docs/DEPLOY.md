# Deployment

FamilyTable runs on [Railway](https://railway.com) at
**https://familytable.seanmckenna.app**.

## How a deploy happens

```
push to main
   ├─→ GitHub Actions CI  (typecheck, lint, build)
   └─→ Railway            (build → migrate → healthcheck → swap traffic)
```

Railway watches `main` through its native GitHub integration, so **merging to
`main` is the deploy**. There is no deploy step in CI and no `RAILWAY_TOKEN`
secret in the repo.

CI runs *alongside* the Railway build rather than gating it. A red CI run means
"revert or fix forward" — it does not stop the deploy. The healthcheck is what
actually protects production: Railway keeps the previous container serving until
the new one returns 200 from `/api/health`, so a failed migration or a boot
crash leaves the running site untouched.

## Project layout on Railway

| Resource       | Name          | Notes                                            |
| -------------- | ------------- | ------------------------------------------------ |
| Project        | `familytable` | Workspace: Sean McKenna's Projects               |
| App service    | `familytable` | Source: `seanmck/familymealplanner`, branch `main` |
| Database       | `Postgres`    | Reached over the private network                 |
| Environment    | `production`  | Only environment; no staging                     |

## Build and start

Controlled by [`railway.json`](../railway.json):

- **Builder**: Railpack (auto-detects Next.js; no Dockerfile needed)
- **Build**: `npm run build` → `prisma generate && next build`
- **Start**: `sh scripts/start.sh` → `prisma migrate deploy` then `next start`
- **Healthcheck**: `/api/health`, which verifies Postgres connectivity

Migrations run at **boot**, not at build. Railway's build sandbox has no route
to the private Postgres network, so `DATABASE_URL` only resolves at runtime.
Running them at boot also means a bad migration fails the release before the
healthcheck passes, keeping the old container in service.

## Environment variables

Set on the `familytable` service. `DATABASE_URL` and `DIRECT_URL` are Railway
variable references (`${{Postgres.DATABASE_URL}}`), so they follow the database
automatically and never need to be pasted in.

| Variable                | Status      | Purpose                                    |
| ----------------------- | ----------- | ------------------------------------------ |
| `DATABASE_URL`          | ✅ set       | Prisma connection (private network)        |
| `DIRECT_URL`            | ✅ set       | Prisma migrations                          |
| `AUTH_SECRET`           | ✅ set       | NextAuth JWT signing — distinct from dev   |
| `AUTH_URL`              | ✅ set       | `https://familytable.seanmckenna.app`      |
| `AUTH_TRUST_HOST`       | ✅ set       | Required: NextAuth v5 behind Railway's proxy |
| `NEXT_PUBLIC_APP_URL`   | ✅ set       | Links in outbound email                    |
| `ANTHROPIC_API_KEY`     | ✅ set       | AI meal planning, recipe/photo parsing     |
| `RESEND_FROM_EMAIL`     | ✅ set       | Invitation sender address                  |
| `RESEND_API_KEY`        | ⚠️ **unset** | Invitation emails will not send until set  |
| `GOOGLE_CLIENT_ID`      | ⚠️ **unset** | Google sign-in + Calendar unavailable      |
| `GOOGLE_CLIENT_SECRET`  | ⚠️ **unset** | Google sign-in + Calendar unavailable      |

The three unset variables were empty in local `.env` too, so those features are
simply not configured yet. Email/password login works without them.

To fill them in:

```bash
railway variables --service familytable \
  --set "RESEND_API_KEY=re_xxx" \
  --set "GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com" \
  --set "GOOGLE_CLIENT_SECRET=xxx"
```

If you enable Google sign-in, add the production callback to the OAuth client in
the [Google Cloud console](https://console.cloud.google.com/apis/credentials):

```
https://familytable.seanmckenna.app/api/auth/callback/google
```

## DNS

The custom domain is registered with Railway but needs these records in the
`seanmckenna.app` zone before TLS can be issued:

| Type    | Host                      | Value                                                                       |
| ------- | ------------------------- | --------------------------------------------------------------------------- |
| `CNAME` | `familytable`             | `jea9z4a1.up.railway.app`                                                    |
| `TXT`   | `_railway-verify.familytable` | `railway-verify=af67e0a0248be5e0bbd0edf8c2db4db30d3091d718e4a603e9798100ae8a65b8` |

If the domain sits behind Cloudflare, set the CNAME to **DNS only** (grey
cloud) until Railway has issued the certificate, or ownership validation stalls.

Check progress with `railway domain --service familytable --json`.

## Common operations

```bash
# Tail production logs
railway logs --service familytable

# Inspect the production database
railway connect Postgres

# List deployments with IDs and statuses
railway deployment list --service familytable

# Re-run the latest deployment (rebuilds from the same commit)
railway redeploy --service familytable

# Restart the running container without rebuilding
railway restart --service familytable
```

The CLI can only redeploy the *latest* deployment — there is no
`redeploy <id>`. To roll back, either revert the commit on `main` (which
re-deploys through the normal path) or use **Rollback** on an older deployment
in the Railway dashboard.

## Schema changes

Create the migration locally and commit it — never run `prisma db push` against
production. `scripts/start.sh` applies pending migrations on the next deploy.

```bash
npx prisma migrate dev --name add_something
git add prisma/migrations && git commit
```

Prisma applies migrations in one transaction per file and stops on the first
failure, so a bad migration aborts the release rather than half-applying.
