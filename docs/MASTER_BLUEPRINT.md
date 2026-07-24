# VirtualKaksha Technical Blueprint

**Document status:** Active engineering baseline  
**Product repository:** `Virtualkaksha/virtualkaksha-web`  
**Documentation repository:** `Virtualkaksha/virtualkaksha-docs`  
**Current application version:** `0.1.0`  
**Reviewed codebase:** Next.js 16.2, React 19.2, TypeScript 5, Prisma 7.9, PostgreSQL

## 1. Product objective

VirtualKaksha is a multi-sided learning platform for students, educators and coaching institutes. The first public product must solve one workflow exceptionally well:

> An authorised content manager publishes a verified learning resource, and a student can discover, open and continue that resource reliably on any device.

The platform should grow through measurable learning utility, content quality, retention and institutional distribution. Visual polish matters, but it must sit on top of reliable content operations, permissions, analytics and maintainable architecture.

## 2. Current verified baseline

The repository already contains:

- Next.js App Router application.
- PostgreSQL through Prisma.
- Academic catalogue: Board → Class Level → Subject → Chapter.
- Competitive-exam catalogue: Exam → Subject → Topic.
- Resource engine with publication status, access level, format, language and version fields.
- Resource-to-educator many-to-many relation.
- Student bookmarks and learning progress tables.
- Student resource navigation and resource detail routes.
- Basic admin board and resource-management pages.

The present codebase is not a throwaway prototype. It should be evolved incrementally. Large rewrites require a written architectural reason and migration plan.

## 3. Technical principles

1. **One deployable application until scale proves otherwise.** Keep the modular monolith. Do not add microservices prematurely.
2. **Server-first Next.js.** Fetch data in Server Components by default. Use Client Components only for interaction, browser APIs or local state.
3. **Prisma is the persistence boundary.** UI components must not contain duplicated database rules.
4. **URL stability is a contract.** Existing student resource URLs remain backward compatible.
5. **No fake production data.** Seed data is allowed only for development and automated tests.
6. **Secure by default.** Admin routes and write actions must be protected before public launch.
7. **Incremental delivery.** Each branch must leave the application buildable and testable.
8. **Evidence before completion.** A task is complete only when its acceptance checks pass.

## 4. Recommended architecture

```text
app/
├── (marketing)/                 Public acquisition pages
├── admin/                       Internal content operations
├── student/                     Student learning experience
├── teacher/                     Educator workspace (future)
├── institute/                   Institute workspace (future)
└── api/                         Webhooks or integrations only when needed

components/
├── ui/                          Low-level reusable primitives
├── shared/                      Cross-product components
├── admin/                       Admin presentation components
├── student/                     Student presentation components
└── resources/                   Resource-specific presentation components

features/
├── academic-catalogue/
├── resources/
├── educators/
├── learning-progress/
├── search/
└── auth/

lib/
├── prisma.ts
├── auth/
├── validation/
├── storage/
├── observability/
└── utils/

server/
├── repositories/                Prisma query composition
├── services/                    Business rules and transactions
└── policies/                    Authorisation and access decisions

prisma/
├── schema.prisma
├── migrations/
└── seed.ts

tests/
├── unit/
├── integration/
└── e2e/
```

### Migration rule

Do not move every existing file immediately. Introduce these directories only while touching a feature. Existing working routes remain in place while their query and business logic move into feature/server modules.

## 5. Module boundaries

### Academic catalogue

Owns boards, classes, subjects, mappings, chapters, exams and topics. It does not own learning files or student progress.

### Resource engine

Owns resource metadata, publication lifecycle, access level, storage references, versioning, educator attribution and resource discovery.

### Learning progress

Owns bookmarks, last position, completion state, continue-learning and student history. It must not mutate resource content.

### Identity and access

Owns user identity, roles, profiles and authorisation. UI visibility is not a security boundary; server actions and server queries must enforce permissions.

### Media/storage

Owns file upload, MIME validation, size limits, object keys, signed URLs and deletion. Resource records store durable storage references, not local filesystem paths.

## 6. Data model decisions

The existing schema provides a sound base. Preserve:

- `Resource.status` for publication workflow.
- `Resource.access` for FREE, PREMIUM and ENROLLED_ONLY policies.
- `Resource.format` for rendering decisions.
- `Resource.version` for future content revision.
- `ResourceTeacher` for multiple educator attribution.
- `ResourceBookmark` and `StudentResourceProgress` for retention features.

### Required near-term schema hardening

These changes should occur only in reviewed migrations:

- Add a durable storage key/provider field before direct file upload launches.
- Add resource audit records before multiple admins edit content.
- Add soft-delete or archived lifecycle rules instead of destructive deletion for published content.
- Enforce that a resource belongs to exactly one learning target: chapter or exam topic.
- Define progress fields such as `lastPositionSeconds`, `lastPage`, `progressPercent` based on format.

## 7. Resource publication lifecycle

```text
DRAFT
  ↓ submit
PENDING_REVIEW
  ↓ approve
PUBLISHED
  ↓ retire
ARCHIVED

PENDING_REVIEW → REJECTED → DRAFT
```

Initial single-admin operation may allow DRAFT → PUBLISHED, but the service layer must be designed so review permissions can be added without rewriting pages.

### Published-resource invariant

A resource may be published only when:

- A valid active chapter or exam topic exists.
- A valid active resource type exists.
- Title and unique scoped slug exist.
- At least one renderable content source exists.
- Format and content source are compatible.
- `publishedAt` is set.

## 8. Rendering contract

- **PDF:** first-party viewer with page navigation, zoom, download policy and progress events.
- **VIDEO:** YouTube/Vimeo embed or first-party video; store duration where known.
- **ARTICLE:** sanitised rich content, never raw unsafe HTML.
- **IMAGE:** optimised image viewer with meaningful alt text.
- **DOCUMENT/INTERACTIVE:** allow-listed embeds only.
- **EXTERNAL_LINK:** clear external destination screen; no silent iframe of arbitrary sites.

A renderer receives a typed resource view-model. It must not perform database queries.

## 9. Security baseline

Before production launch:

- Protect `/admin/**` with authenticated ADMIN authorisation.
- Protect every write action independently.
- Validate all form data server-side with a schema validator.
- Apply upload MIME, extension and size checks.
- Use private storage plus signed URLs for restricted content.
- Add rate limits to authentication, upload and high-cost endpoints.
- Sanitize rich text.
- Prevent arbitrary iframe sources through an allow-list and Content Security Policy.
- Keep `.env*`, credentials and service keys outside Git.
- Record admin content mutations in audit logs.

## 10. Performance baseline

- Use selective Prisma `select` objects; avoid loading unused relations.
- Paginate admin lists and student discovery feeds.
- Use stable ordering after every query.
- Cache public catalogue queries with explicit revalidation.
- Invalidate only affected catalogue/resource paths after writes.
- Avoid loading full PDF/video data through Next.js server memory.
- Add database indexes only from measured query patterns; current resource and catalogue indexes are a strong starting point.

## 11. UI system

The existing visual language uses blue primary surfaces, slate neutrals, large rounded cards and clear educational hierarchy. Convert this into tokens rather than page-specific class repetition.

Required primitives:

- Button, LinkButton, IconButton
- Input, Select, Textarea, FormField
- Card, EmptyState, StatusBadge
- Breadcrumbs, PageHeader, SectionHeader
- DataTable, Pagination, ConfirmDialog
- Toast/inline form feedback
- ResourceCard, ResourceMetadata, EducatorCard
- Loading skeletons and route-level error states

Accessibility requirements:

- Keyboard-operable controls.
- Visible focus state.
- Semantic headings.
- Labels and errors connected to fields.
- Sufficient colour contrast.
- Reduced-motion support.

## 12. Git workflow

### Protected branches

- `main`: always releasable.
- Feature branches: `feature/<short-name>`.
- Fix branches: `fix/<short-name>`.
- Documentation branches: `docs/<short-name>`.

### Commit style

```text
feat(resources): add educator linking
fix(resources): preserve scoped resource route
refactor(resources): move publication rules to service
chore(ci): add build verification
```

### Merge conditions

- `npm run lint` passes.
- `npm run build` passes.
- Relevant test checklist passes.
- No secrets or generated build output are committed.
- Database migration is reversible or has a documented recovery path.

## 13. Environments and deployment

```text
local        Developer PostgreSQL and local environment variables
preview      Per-pull-request deployment and isolated/non-production data
staging      Production-like validation
production   Protected database and object storage
```

Recommended initial hosting:

- Application: Vercel or equivalent Next.js platform.
- Database: managed PostgreSQL with automated backups.
- Media: S3-compatible object storage with CDN.
- Monitoring: error tracking, structured logs and uptime checks.

Do not use production database credentials in preview deployments.

## 14. Testing strategy

### Unit tests

- Slug generation.
- Publication validation.
- URL/embed parsing.
- Format-to-renderer selection.
- Access-policy decisions.

### Integration tests

- Create, publish, update and archive resource.
- Chapter/resource scoped uniqueness.
- Educator linking transaction.
- Student discovery returns only active published resources.

### End-to-end tests

1. Admin signs in.
2. Admin creates a draft PDF resource.
3. Admin publishes it.
4. Student opens the chapter.
5. Student opens the resource.
6. Bookmark/progress state persists.

## 15. Product telemetry

Track events only after names and privacy rules are documented:

- Resource impression and open.
- Viewer start and completion.
- Bookmark add/remove.
- Search query and result click.
- Continue-learning resume.
- Upload failure and publication failure.

Investor-grade reporting should focus on activation, weekly learning users, resource completion, repeat learning, content supply velocity and institute/teacher conversion—not vanity page views alone.

## 16. Delivery milestones

### v0.1 — Reliable resource platform

Admin create/edit/archive, file upload, publication rules, educator linking, resource viewer, related/previous-next navigation, errors and basic tests.

### v0.2 — Student retention

Authentication, bookmarks, continue learning, progress tracking, search and personalised catalogue defaults.

### v0.3 — Educator operations

Teacher onboarding, verification, resource ownership, educator dashboard and content review.

### v0.4 — Assessments

Question bank, tests, attempts, scoring, analytics and recommendations.

### v0.5 — Commercial foundation

Plans, entitlements, payments, invoices, institute tenancy and audit controls.

### v1.0 — Public launch

Security review, accessibility review, observability, backups, support operations, legal/privacy pages and performance targets met.

## 17. Architecture decision process

Every major decision must record:

- Context and problem.
- Options considered.
- Decision.
- Consequences and risks.
- Reversal or migration plan.

No technology is adopted because it is fashionable. A new dependency must remove more complexity than it adds.
