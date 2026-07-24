# VirtualKaksha Engineering Standards

## TypeScript

- Keep `strict` mode enabled.
- Do not use `any` without a documented boundary.
- Derive server query result types from Prisma selections where practical.
- Validate untrusted input at runtime; TypeScript types are not validation.

## Next.js

- Server Components by default.
- Client Components must begin with `"use client"` and remain small.
- Server Actions perform authorisation, validation and service calls.
- Use `notFound()` only for genuine missing public resources, not operational failures.
- Add `loading.tsx` and `error.tsx` to high-value route groups.

## Database

- Apply writes through service functions when more than one rule or relation is involved.
- Use Prisma transactions for multi-record operations.
- Never edit an applied migration.
- Never run destructive schema commands against production without a backup and reviewed plan.
- Scope resource slugs by their learning target, matching current unique constraints.

## Forms

- Display field-level validation errors.
- Disable submission while pending.
- Preserve user input after validation failure.
- Do not throw raw database errors into the browser.
- Confirm destructive actions.

## Components

- Page files orchestrate; reusable presentation belongs in components.
- Avoid components larger than one clear responsibility.
- No database imports inside presentation components.
- Avoid emojis as permanent product icons; use the established icon library with accessible labels.

## Naming

- Routes and slugs: kebab-case.
- Components and types: PascalCase.
- Functions and variables: camelCase.
- Constants: camelCase unless truly global immutable configuration.
- Database enums: uppercase values.

## Error handling

- Expected validation failures return structured user-facing errors.
- Unexpected failures are logged with request context and a safe user message.
- Never expose database URLs, stack traces, tokens or storage keys.

## Definition of Done

A feature is done only when:

- Acceptance criteria pass.
- Lint and production build pass.
- Empty, loading, success and error states are handled.
- Mobile and keyboard operation are checked.
- Security and data-access implications are reviewed.
- Documentation and migration notes are updated.
- Commit is pushed to a feature branch.
