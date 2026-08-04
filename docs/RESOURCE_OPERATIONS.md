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
