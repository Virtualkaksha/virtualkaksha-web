# Sprint 01 — Reliable Resource Platform

## Goal

Deliver a production-ready content path from admin creation to student consumption without changing existing public URL structure.

## Current verified state

- Academic catalogue and seeded chapters load.
- Admin can create URL/text-based resources.
- Published resources appear in the correct chapter.
- The internal resource route opens.
- Basic PDF/video/article/image/external rendering exists.
- Optional educator relation exists in the database.

## Scope

### 1. Resource service boundary

Create server-side resource services for:

- create resource
- update resource
- publish resource
- archive resource
- link/unlink educators
- get admin resource list
- get published student resource

### 2. Validation

- Required fields and enum validation.
- Compatible content source per format.
- Active chapter/resource-type checks.
- Scoped unique slug handling.
- Publication invariant enforcement.

### 3. Admin experience

- Paginated resource table.
- Create and edit forms.
- Draft/published/archive actions.
- Educator selection.
- Structured success and error feedback.
- Delete replaced by archive for published resources.

### 4. File upload foundation

- Storage-provider interface.
- Development provider and production S3-compatible provider.
- PDF/image/video allow-list.
- File-size limits.
- Upload progress in client UI.
- Store object key, provider, MIME type and size.

A Prisma migration is required before enabling file upload in production.

### 5. Student viewer

- Typed renderer components.
- PDF controls and progress hooks.
- Video embed/direct playback.
- Safe article rendering.
- External-link interstitial.
- Educator attribution.
- Related resources.
- Previous/next resource navigation.
- Clear unavailable-content state.

### 6. Reliability

- Route loading and error boundaries.
- No raw action exceptions shown to users.
- Transactional resource + educator creation.
- Tests for slug, publication and route scoping.

## Out of scope

- Payments.
- AI tutor.
- Institute tenancy.
- Full assessment engine.
- Recommendation algorithms.

## Acceptance checklist

- [ ] Admin route requires ADMIN permission.
- [ ] Valid PDF can be uploaded and saved as DRAFT.
- [ ] Invalid type/oversized file is rejected safely.
- [ ] Draft is absent from student pages.
- [ ] Publishing makes it visible in the mapped chapter.
- [ ] Resource opens at the existing scoped URL.
- [ ] Educator attribution displays when linked.
- [ ] PDF/video/article/image/external formats render correctly.
- [ ] Related and previous/next links remain inside the same chapter.
- [ ] Archiving removes the resource from student discovery.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Recommended implementation order

1. Add validation and service layer without changing UI.
2. Add structured server-action results.
3. Add edit/archive operations.
4. Add storage schema migration and provider.
5. Add upload UI.
6. Split resource renderers.
7. Add navigation and related content.
8. Add automated tests.
9. Run regression checklist and tag `v0.1.0-resource-platform`.

## Branch and commits

```text
feature/resource-platform

refactor(resources): add resource service and validation
feat(resources): add edit and archive operations
feat(storage): add resource upload provider
feat(viewer): add typed resource renderers
feat(resources): add related and sequential navigation
test(resources): cover publication and route scoping
```
