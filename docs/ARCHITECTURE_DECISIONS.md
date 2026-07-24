# VirtualKaksha Architecture Decisions

## ADR-001 — Modular monolith

**Status:** Accepted  
**Decision:** Keep one Next.js application and one PostgreSQL database. Organise by domain boundaries, not separate services.  
**Reason:** Current product stage needs iteration speed and transactional consistency.  
**Revisit when:** A module has independent scaling, ownership or reliability requirements proven by production metrics.

## ADR-002 — Preserve Prisma and PostgreSQL

**Status:** Accepted  
**Decision:** Prisma remains the primary data-access layer and PostgreSQL the system of record.  
**Reason:** Existing schema already models catalogue, resources, roles, educators, bookmarks and progress coherently.

## ADR-003 — Server-first rendering

**Status:** Accepted  
**Decision:** Use Server Components for page data and small Client Components for interaction.  
**Reason:** Reduces client JavaScript and keeps credentials/data access on the server.

## ADR-004 — Stable scoped resource URLs

**Status:** Accepted  
**Decision:** Preserve `/student/resources/[track]/[level]/[subject]/[chapter]/[resource]`.  
**Reason:** The path communicates catalogue context, supports breadcrumbs and prevents ambiguous resource slugs.

## ADR-005 — Object storage abstraction

**Status:** Proposed for Sprint 01  
**Decision:** Add a storage interface and S3-compatible production implementation rather than coupling UI/actions to one vendor.  
**Consequence:** Slight initial abstraction cost; easier provider migration and private-content support.

## ADR-006 — Archive instead of destructive deletion

**Status:** Proposed for Sprint 01  
**Decision:** Published resources are archived, not hard-deleted through normal admin UI.  
**Reason:** Protects links, auditability and student history.

## ADR-007 — No premature microservices or repository-pattern ceremony

**Status:** Accepted  
**Decision:** Introduce services/repositories only where they centralise real rules or reused queries.  
**Reason:** Architecture must reduce complexity, not create empty layers.
