# Environment configuration

VirtualKaksha validates server configuration by subsystem. Never commit real credentials, tokens, connection strings, or production secret values. No server variable may use a `NEXT_PUBLIC_` name or be passed into client components.

## Lazy validation

The accessors in `lib/env` validate only the requested subsystem and cache only successful results. Importing the modules does not validate configuration, connect to a service, or require production secrets. Prisma, Auth.js, resource storage, and rate limiting call these accessors at their first runtime use.

Prisma client creation and the storage/rate-limit factories remain lazy. Auth.js uses its lazy configuration callback so importing unrelated build modules does not require runtime credentials. Validation occurs before the corresponding client, provider, or adapter is created.

Errors identify the variable and rule that failed but never include its value. Values copied from templates, including `change-me`, `replace-me`, `example`, `your-secret`, and `placeholder` variants, are rejected where credentials or production endpoints are expected.

## Inventory

| Variable | Classification | Rules |
| --- | --- | --- |
| `NODE_ENV` | Required configuration | Exactly `development`, `test`, or `production`. |
| `DATABASE_URL` | Required production secret | PostgreSQL URL with a hostname and database name. Optional but validated when present outside production. |
| `AUTH_SECRET` | Required production secret | At least 32 characters and not a placeholder. Optional but validated when present outside production. |
| `AUTH_URL` | Required production configuration | Absolute HTTPS URL in production. Local HTTP is allowed only for `localhost`, `127.0.0.1`, or `[::1]` outside production. |
| `AUTH_TRUST_HOST` | Required production configuration | Exactly `true` or `false`. When false, `AUTH_URL` must be configured. |
| `RESOURCE_STORAGE_PROVIDER` | Required configuration | `s3` in production; `local` or `s3` outside production. |
| `RESOURCE_UPLOAD_MAX_MB` | Optional configuration | Integer from 1 through 20; defaults to 20. |
| `LOCAL_RESOURCE_STORAGE_PATH` | Development/test configuration | Required when the selected provider is `local`; local storage is forbidden in production. |
| `S3_ENDPOINT` | Required S3 configuration | Required with `s3`; HTTPS in production, HTTP(S) outside production. |
| `S3_REGION` | Required S3 configuration | Required with `s3`; placeholders rejected. |
| `S3_BUCKET` | Required S3 configuration | Required with `s3`; placeholders rejected. |
| `S3_ACCESS_KEY_ID` | Required production secret | Required with `s3`; placeholders rejected. |
| `S3_SECRET_ACCESS_KEY` | Required production secret | Required with `s3`; placeholders rejected. |
| `S3_FORCE_PATH_STYLE` | Required S3 configuration | Exactly `true` or `false`. |
| `RATE_LIMIT_ADAPTER` | Required production configuration | Must be `upstash` in production. Outside production, `memory` or `upstash`; defaults to `memory`. |
| `RATE_LIMIT_KEY_SECRET` | Required secret | At least 32 characters and not a placeholder. Required for both adapters. |
| `RATE_LIMIT_TRUSTED_PROXY` | Required configuration | `vercel` or `direct`; `test` is permitted only with `NODE_ENV=test`. |
| `RATE_LIMIT_ENV_PREFIX` | Optional configuration | Defaults to `NODE_ENV`; must match `^[a-z0-9][a-z0-9_-]{0,47}$`. |
| `UPSTASH_REDIS_REST_URL` | Required Upstash configuration | Required with Upstash; HTTPS in production, HTTP(S) outside production. |
| `UPSTASH_REDIS_REST_TOKEN` | Required production secret | Required with Upstash; placeholders rejected. |

## Cross-variable rules

- Production database, Auth.js, S3, and distributed rate-limiting configuration is mandatory.
- Production storage cannot use `local`; selecting `s3` requires every S3 variable.
- Production rate limiting cannot use `memory`; selecting `upstash` requires its URL and token.
- `RATE_LIMIT_TRUSTED_PROXY=test` is test-only.
- `AUTH_TRUST_HOST=false` requires an explicit canonical `AUTH_URL`.
- Production service endpoints and `AUTH_URL` must use HTTPS.
- Upload limits cannot exceed the current 20 MB application limit.

## Local development example

The following values are templates only. Replace every secret placeholder before the corresponding subsystem is exercised.

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/virtualkaksha
AUTH_SECRET=replace-me-with-at-least-32-random-characters
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
RESOURCE_STORAGE_PROVIDER=local
RESOURCE_UPLOAD_MAX_MB=20
LOCAL_RESOURCE_STORAGE_PATH=./storage/resources
RATE_LIMIT_ADAPTER=memory
RATE_LIMIT_KEY_SECRET=replace-me-with-at-least-32-random-characters
RATE_LIMIT_TRUSTED_PROXY=direct
RATE_LIMIT_ENV_PREFIX=development
```

Test-only IP injection requires both `NODE_ENV=test` and `RATE_LIMIT_TRUSTED_PROXY=test`.

## Production deployment checklist

1. Store secrets in the hosting platform's encrypted server-side configuration.
2. Set `NODE_ENV=production`, a valid PostgreSQL connection string, and complete Auth.js configuration.
3. Configure a private S3-compatible provider using HTTPS; never select local storage.
4. Configure Upstash using HTTPS; never select the memory rate limiter.
5. Use independently generated high-entropy values for `AUTH_SECRET` and `RATE_LIMIT_KEY_SECRET`.
6. Select the trusted-proxy mode that matches the deployment topology.
7. Use a deployment-specific rate-limit prefix so staging and production do not collide.
8. Run `npm run validate:env` after the deployment platform injects production configuration and before serving traffic. The command requires `NODE_ENV=production`, validates configuration only, and does not connect to the database, storage, or rate-limit backend.
9. Confirm no server configuration or secret appears in browser bundles, logs, error pages, or monitoring metadata.

## Deployment validation command

`npm run validate:env` is an explicit pre-start or release check. It validates common, database, Auth.js, storage, and rate-limit configuration using the same lazy accessors as the application. It exits with status 0 and a fixed success message when every production rule passes. A failure exits non-zero and identifies only the affected variable and validation rule.

The command reads the environment inherited by the process. It does not load or print `.env` files, instantiate Prisma, create a storage provider, initialize Redis, or make network requests. Configure it as a separate deployment step after server-only secrets are available; it is intentionally not chained into `next build` because runtime secrets may be unavailable during image or artifact builds.
