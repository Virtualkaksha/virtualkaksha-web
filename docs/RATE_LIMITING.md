# Rate-limiting architecture

VirtualKaksha applies rate limits through a server-only `RateLimitAdapter`. The foundation provides policy metadata, opaque identifiers, trusted client-IP resolution, response helpers, a deterministic single-process memory adapter, and a distributed Upstash Redis adapter. Application endpoints are not wired yet.

Production always selects the Upstash adapter shared by every application instance. The memory adapter is restricted to development and tests and the factory throws when `NODE_ENV=production`. Adapter creation is lazy, so importing application modules during a build does not read or require Upstash credentials. Creating the production adapter validates all required configuration and fails closed; there is no in-memory production fallback.

## Trusted proxy assumptions

`RATE_LIMIT_TRUSTED_PROXY` must explicitly select one mode in production:

- `vercel` trusts only the first value in Vercel's `x-forwarded-for` header. It never scans later values or fallback headers.
- `direct` accepts only a remote address supplied by the trusted server runtime. Web `Request` objects do not expose a socket address, so callers must provide it from their runtime integration.
- `test` accepts explicit deterministic injection and is rejected in production.

Missing and malformed addresses return typed failures. The resolver never trusts `x-real-ip`, `cf-connecting-ip`, or arbitrary client-selected alternatives. Deployments behind any additional proxy must define and review their trust boundary before using it.

## Opaque identifiers

Limiter identifiers are normalized with Unicode NFKC normalization, surrounding whitespace removal, and lowercase conversion. Keys use HMAC-SHA256 with `RATE_LIMIT_KEY_SECRET` and contain only a version, policy name, and digest. Plain email addresses, IP addresses, user IDs, resource IDs, and compound identifiers are never stored in limiter keys.

Never log raw identifiers, request credentials, cookies, tokens, provider errors, or complete generated limiter keys. Operational telemetry may contain only a policy name, allowed/limited outcome, and an unrelated request correlation ID.

## Policies

Authentication and signup policies use sliding windows to avoid boundary bursts. All other policies currently use fixed windows, including the higher-volume bookmark and progress policies. Algorithm selection is represented explicitly and mapped to an Upstash limiter for every policy.

| Policy | Limit | Window | Algorithm | Failure mode |
| --- | ---: | ---: | --- | --- |
| `login-ip` | 20 | 10 minutes | Sliding | Closed |
| `login-identity` | 5 | 15 minutes | Sliding | Closed |
| `login-email` | 10 | 1 hour | Sliding | Closed |
| `signup-ip` | 5 | 1 hour | Sliding | Closed |
| `signup-email` | 3 | 1 day | Sliding | Closed |
| `resource-create-user` | 10 | 10 minutes | Fixed | Closed |
| `resource-create-ip` | 30 | 1 hour | Fixed | Closed |
| `pdf-upload-user` | 3 | 10 minutes | Fixed | Closed |
| `pdf-upload-ip` | 10 | 1 hour | Fixed | Closed |
| `bookmark-user` | 60 | 1 minute | Fixed | Open |
| `progress-user` | 120 | 10 minutes | Fixed | Open |
| `progress-resource` | 30 | 1 minute | Fixed | Open |
| `teacher-mutation-user` | 15 | 1 minute | Fixed | Closed |
| `teacher-resource-action` | 3 | 1 minute | Fixed | Closed |
| `admin-mutation-user` | 10 | 1 minute | Fixed | Closed |
| `admin-resource-action` | 2 | 10 seconds | Fixed | Closed |

Fail-closed groups are login, signup, resource creation, PDF upload, teacher status changes, and admin moderation. Bookmark and progress writes fail open if the future distributed backend is unavailable. Endpoint wiring must apply this metadata explicitly and must not treat all backend failures the same way.

## Memory adapter

The memory adapter implements atomic synchronous counter updates within one JavaScript process, weighted costs, fixed-window expiry, per-identifier reset, and an injectable clock. It is deterministic for tests but is not distributed and therefore is never production-safe.

## Upstash adapter

The production adapter uses `@upstash/redis` and `@upstash/ratelimit`. Redis and all policy limiter instances are retained by the module-level production factory. Analytics is disabled. Each limiter has an environment-and-policy-specific namespace, and receives only an HMAC-derived opaque identifier. Weighted costs use the Upstash `rate` option, and successful-login policies can reset the same opaque key with `resetUsedTokens`.

The backend timeout is 900 ms. Upstash timeout responses, local timeout enforcement, and provider exceptions become a sanitized `backend-unavailable` decision. The adapter does not decide whether that result is open or closed; Stage 3 endpoint wiring must apply each policy's documented failure mode. Reset errors throw only a fixed sanitized error.

## Responses

Route-handler rejection helpers return status `429`, `Retry-After`, `Cache-Control: private, no-store`, and a fixed non-sensitive JSON error. Server-action helpers return only a stable code, generic message, and retry duration. Neither response exposes identifiers, keys, policy internals, or backend errors.

## Environment configuration

Production requires the following server-only variables. Never commit their values or expose them through `NEXT_PUBLIC_` names:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_KEY_SECRET`
- `RATE_LIMIT_TRUSTED_PROXY`
- `RATE_LIMIT_ENV_PREFIX` (optional; isolates production, staging, and preview namespaces)
- `RATE_LIMIT_ADAPTER` (optional outside production; `memory` or `upstash`)

Production ignores an omitted adapter name and selects Upstash. It rejects `memory`, unsupported adapter names, missing credentials, the `test` proxy mode, and invalid environment prefixes. Development and tests default to memory and may explicitly select Upstash.

## Stage 3 application wiring

Stage 3A applies the factory to Auth.js credentials login, student signup, bookmark mutations, and PDF progress writes. Login and signup fail closed. Bookmark and progress writes fail open on a typed backend outage, while actual limit decisions return the shared private `429` response. The PDF viewer respects `Retry-After` without automatic retries.

Stage 3B applies fail-closed limits to resource creation, native PDF uploads, teacher resource mutations, and admin moderation. Native PDF creation uses `POST /api/teacher/resources`: authentication and all four user/IP checks occur before multipart parsing, and an oversized `Content-Length` is rejected before parsing. External and non-PDF resources retain the server-action flow with creation limits. Actual files still pass the existing 20 MB upload validator; no public or presigned storage URL is introduced.

Teacher ownership is checked before user/action limits, and the existing atomic transition predicate remains authoritative. Admin role checks precede moderation limits and the existing atomic `updateMany` transitions remain unchanged. Limited native requests return private `429` responses with `Retry-After`; server-action forms redirect to a sanitized wait notice and disable their submit button while pending.
