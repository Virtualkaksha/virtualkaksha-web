# Resource operations

## Current lifecycle

Resources move through `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, and `ARCHIVED`. Teachers can edit only resources they created while those resources are draft or rejected. Admin moderation can approve, reject, archive, and securely preview eligible PDFs.

## Stage A: read-only inventory

`/admin/resources/inventory` is an ADMIN-only, read-only view of resource metadata, catalogue mapping, aggregate bookmark/progress counts, and asset health. It cannot edit metadata, replace files, upload, delete, publish, reject, or archive resources.

The CSV export is also read-only. It is a baseline for review and future concurrency-safe operations. **There is no CSV import endpoint; do not edit and attempt to re-upload this file.** It excludes email addresses, raw URLs, storage providers, object keys, credentials, moderation notes, and session data.

CSV fields are: `resource_id`, `title`, `title_hindi`, `description`, `board`, `class`, `subject`, `chapter_or_topic`, `resource_type`, `format`, `language`, `access_level`, `status`, `version`, `updated_at`, `asset_source`, `asset_state`, `checksum_present`, `page_count`, `file_size_bytes`, `bookmark_count`, `progress_count`, `missing_description`, `duplicate_title`, `duplicate_checksum`, and `legacy_source`.

Every CSV cell is quoted and escaped. Values beginning with `=`, `+`, `-`, `@`, tab, or carriage return are prefixed with an apostrophe to prevent spreadsheet formula execution.

## Warning meanings

- **Missing description:** no usable description is present.
- **Duplicate title:** the normalized title occurs on multiple resources.
- **Duplicate checksum:** the same checksum appears on assets for multiple resources.
- **Legacy PDF source:** the PDF depends on the old `contentUrl` field and has no primary asset.
- **Missing native asset:** a native PDF has no primary asset.
- **Non-ready asset:** the primary asset is uploading, failed, or deleted.
- **No usable source:** neither a ready primary asset nor a declared content source exists.

The current local inventory contains two legacy PDFs. They require compatibility review before migration to native protected assets.

## Replacement warning

The existing upload service must not be used to replace an asset. It creates another primary asset without atomically retiring the old one, does not provide rollback/version history, and does not reconcile reading progress.

## Future stages

## Stage B: version-aware ADMIN metadata editing

The ADMIN editor allows only title, Hindi title, description, resource type, language, access, and—when the resource is not published—academic mapping corrections. Every meaningful edit uses the displayed resource version as an optimistic-concurrency condition, increments it once, and writes a sanitized immutable audit event in the same transaction. A stale form cannot overwrite newer work.

Published metadata edits return the resource to `PENDING_REVIEW` and temporarily remove it from public/student access. Archived resources remain read-only. No-op submissions create no new version or audit event. Slugs, ownership, status input, source URLs, thumbnails, format, page/file metadata, assets, storage objects, bookmarks, and progress are not editable.

## Future stages

1. Staged, versioned PDF replacement with rollback.
2. Route aliases before published academic-mapping changes.
3. CSV dry-run, preview, validation, and transactional import.
4. Bulk PDF import with durable job state and cleanup.
5. Content-quality, accessibility, provenance, and copyright checklist.
# CSV metadata preview (D1/D2)

The operational inventory export remains available unchanged. A separate ADMIN-only import template is available from the inventory page or with `GET /admin/resources/export?mode=import-template`.

The template columns, in deterministic order, are:

`resource_id`, `expected_version`, `title`, `title_hindi`, `description`, `resource_type_id`, `language`, `access_level`, `chapter_id`, `exam_topic_id`, `reason`, `current_status`, `board`, `class`, `subject`, `chapter_or_topic`, `resource_type`, `current_updated_at`, `current_slug`, `asset_source`, `asset_state`.

The first eleven columns identify the resource, expected version, proposed metadata, stable catalogue IDs, and the required reason. Exactly one mapping ID must be populated. The remaining columns are read-only context and are ignored when planning differences. Every cell is spreadsheet-formula protected. The template never contains uploader identities, URLs, object keys, checksums, provider metadata, moderation notes, or authentication data.

`/admin/resources/import` provides preview only. It has no mutation endpoint and cannot change resources, versions, statuses, audit records, assets, bookmarks, progress, storage, or page caches. Direct status, file, asset, URL, slug, and uploader changes are forbidden. A meaningful edit to a published resource is shown as resulting in `PENDING_REVIEW`, with a public-visibility warning; published mapping changes are rejected.

The preview accepts one strict UTF-8 RFC 4180-style CSV up to 2 MiB and 250 logical resource rows (with a parser hard ceiling of 500). It accepts an initial BOM, CRLF or LF, escaped quotes, quoted commas, and quoted multiline values. It rejects malformed quoting, invalid UTF-8, control characters, extra BOMs, duplicate resource IDs, unknown/missing/duplicate headers, mismatched columns, and exceeded row/cell/field limits. Outcomes are `VALID_CHANGE`, `NO_OP`, `INVALID`, and `CONFLICT`.

Preview access requires a fresh ACTIVE ADMIN identity, same-origin request, trusted client IP, and fail-closed limits of 5 previews per user per 10 minutes and 15 per IP per hour. Applying a reviewed preview is deliberately deferred to a separately reviewed D3 stage.
