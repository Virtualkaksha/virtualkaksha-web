import type { PublicationStatus } from "@/app/generated/prisma/enums";
import { statusAfterAdminMetadataEdit } from "./resource-metadata-policy";

export const RESOURCE_METADATA_FIELDS = ["title", "titleHindi", "description", "resourceTypeId", "language", "access", "chapterId", "examTopicId"] as const;
export type AcademicPathInput={kind:"CHAPTER";board:string;level:string;subject:string;unit:string}|{kind:"EXAM";exam:string;subject:string;topic:string};
export function deriveAcademicPaths(mapping:AcademicPathInput|null,resourceSlug:string){if(!mapping)return[];const parts=mapping.kind==="CHAPTER"?[mapping.board,mapping.level,mapping.subject,mapping.unit]:[mapping.exam,"exam",mapping.subject,mapping.topic];const result=["/student/resources"];for(let i=1;i<=parts.length;i+=1)result.push(`/student/resources/${parts.slice(0,i).join("/")}`);result.push(`${result.at(-1)}/${resourceSlug}`);return[...new Set(result)].sort();}
export function planResourceMetadata(current: Record<string, unknown> & { status: PublicationStatus; publishedAt?: Date | null;slug?:string }, proposed: Record<string, unknown>,paths?:{previous:AcademicPathInput|null;resulting:AcademicPathInput|null}) {
  const before = Object.fromEntries(RESOURCE_METADATA_FIELDS.map((field) => [field, current[field]]));
  const after = Object.fromEntries(RESOURCE_METADATA_FIELDS.map((field) => [field, proposed[field]]));
  const metadataChangedFields = RESOURCE_METADATA_FIELDS.filter((field) => before[field] !== after[field]).map(String);
  const changedFields = [...metadataChangedFields];
  const resultingStatus = changedFields.length ? statusAfterAdminMetadataEdit(current.status) : current.status;
  const resultingPublishedAt = current.status === "PUBLISHED" && changedFields.length ? null : current.publishedAt ?? null;
  if (resultingStatus !== current.status) changedFields.push("status", "publishedAt");
  return { metadataBefore: before, metadataAfter: after, metadataChangedFields, changedFields, resultingStatus, resultingPublishedAt,previousAcademicPaths:deriveAcademicPaths(paths?.previous??null,String(current.slug??"")),resultingAcademicPaths:deriveAcademicPaths(paths?.resulting??null,String(current.slug??"")),
    publicVisibilityRemoval: current.status === "PUBLISHED" && resultingStatus === "PENDING_REVIEW",
    beforeValues: { ...before, status: current.status, publishedAt: current.publishedAt?.toISOString() ?? null },
    afterValues: { ...after, status: resultingStatus, publishedAt: resultingPublishedAt?.toISOString() ?? null } };
}
