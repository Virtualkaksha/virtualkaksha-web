# VirtualKaksha

VirtualKaksha is a Next.js learning-resource platform for students, teachers, coaching institutes, and administrators. It supports moderated resource publishing, protected PDF delivery, bookmarks, reading progress, revocable sessions, and distributed production rate limiting.

## Local development

Copy the documented environment variables from `.env.example`, then use `npm run dev`. Validate TypeScript with `npx tsc --noEmit`, lint with `npm run lint`, test with the focused Node test commands under `tests/`, and create a production build with `npm run build`.

## Environment and deployment

Run `npm run validate:env` explicitly against a production deployment environment. Deployment requires PostgreSQL, private S3-compatible object storage, Auth.js configuration, and Upstash-compatible Redis rate limiting. Never commit credentials.

Prisma migrations are reviewed and applied with the deployment workflow; do not use `db push` in production. See `docs/ENVIRONMENT.md`, `docs/RATE_LIMITING.md`, and the Prisma migration history.

## Security

Protected actions use fresh database identity checks, revocable JWT sessions, role boundaries, same-origin protections, rate limiting, private storage abstraction, validated PDF delivery, and Report-Only nonce CSP. Legal drafts and public-launch readiness are tracked in `docs/PUBLIC_LAUNCH.md`; legal review is not represented as complete.
