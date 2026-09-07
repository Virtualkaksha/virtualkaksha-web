/**
 * Maps a resource type to the content it is allowed to carry.
 *
 * The student catalogue filters by resource type, so a "Video Lectures" entry
 * holding a PDF would surface under the wrong section. Type and format are
 * therefore derived from one place instead of being chosen independently.
 *
 * Types are matched on their stable code. An unrecognised code falls back to a
 * document, which is the correct default for chapter-wise study material.
 */

export type ResourceContentKind = "video" | "document";

export type ResourceTypeContentProfile = {
  kind: ResourceContentKind;
  /** The only format a resource of this type may be stored as. */
  format: "PDF" | "VIDEO";
  sourceLabel: string;
  sourceHint: string;
  /** Whether the teacher may upload a file rather than link to one. */
  supportsUpload: boolean;
};

const VIDEO_PROFILE: ResourceTypeContentProfile = {
  kind: "video",
  format: "VIDEO",
  sourceLabel: "Video URL",
  sourceHint: "Paste a YouTube, Vimeo or hosted lesson link. Videos are linked, not uploaded.",
  supportsUpload: false,
};

const DOCUMENT_PROFILE: ResourceTypeContentProfile = {
  kind: "document",
  format: "PDF",
  sourceLabel: "PDF",
  sourceHint: "Upload the PDF, or link to one already hosted elsewhere.",
  supportsUpload: true,
};

const VIDEO_TYPE_CODES: ReadonlySet<string> = new Set(["VIDEO_LECTURES"]);

export function getResourceTypeContentProfile(typeCode: string | null | undefined): ResourceTypeContentProfile {
  return typeCode && VIDEO_TYPE_CODES.has(typeCode) ? VIDEO_PROFILE : DOCUMENT_PROFILE;
}

export function expectedFormatForResourceType(typeCode: string | null | undefined) {
  return getResourceTypeContentProfile(typeCode).format;
}

/** True when the submitted format is the one the resource type requires. */
export function isFormatAllowedForResourceType(
  typeCode: string | null | undefined,
  format: string,
) {
  return format === expectedFormatForResourceType(typeCode);
}
