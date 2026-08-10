/* eslint-disable @typescript-eslint/no-explicit-any */
import { canAdminEditResourceMapping, canAdminEditResourceMetadata } from "./resource-metadata-policy";
import { planResourceMetadata } from "./resource-metadata-plan";
import type { ValidatedResourceImportRow } from "./resource-import-validation";

export function planResourceImport(rows: ValidatedResourceImportRow[], inputs: any, collisions: any[] = []) {
  const resources = new Map<string, any>(inputs.resources.map((x: any) => [x.id, x]));
  const types = new Set(inputs.resourceTypes.map((x: any) => x.id)); const chapters = new Set(inputs.chapters.map((x: any) => x.id)); const topics = new Set(inputs.examTopics.map((x: any) => x.id));const chapterMap=new Map(inputs.chapters.flatMap((x:any)=>x.boardClassSubject&&x.slug?[[x.id,{kind:"CHAPTER",board:x.boardClassSubject.board.slug,level:x.boardClassSubject.classLevel.slug,subject:x.boardClassSubject.subject.slug,unit:x.slug}]]:[]));const topicMap=new Map(inputs.examTopics.flatMap((x:any)=>x.examSubject&&x.slug?[[x.id,{kind:"EXAM",exam:x.examSubject.exam.slug,subject:x.examSubject.subject.slug,topic:x.slug}]]:[]));
  const collisionKeys = new Set(collisions.map((x) => `${x.slug}:${x.chapterId ?? ""}:${x.examTopicId ?? ""}`));
  const targetKeys = new Map<string,string>();
  const planned = rows.map((row) => {
    const current = resources.get(row.resourceId); const validationErrors=[...row.validationErrors]; const referenceErrors:string[]=[];
    if(!current) referenceErrors.push("The resource does not exist.");
    if(row.resourceTypeId&&!types.has(row.resourceTypeId)) referenceErrors.push("The resource type is inactive or unavailable.");
    if(row.chapterId&&!chapters.has(row.chapterId)) referenceErrors.push("The chapter hierarchy is inactive or unavailable.");
    if(row.examTopicId&&!topics.has(row.examTopicId)) referenceErrors.push("The exam-topic hierarchy is inactive or unavailable.");
    if(current&&!canAdminEditResourceMetadata(current.status)) validationErrors.push("Archived resources are read-only.");
    const mappingChanged=Boolean(current&&(current.chapterId!==row.chapterId||current.examTopicId!==row.examTopicId));
    const mappingChangeWarning=current?.status==="PUBLISHED"&&mappingChanged?"Published resource mapping cannot be changed.":null;
    if(mappingChangeWarning||(current&&mappingChanged&&!canAdminEditResourceMapping(current.status))) validationErrors.push("The academic mapping is locked for this resource status.");
    const key=current?`${current.slug}:${row.chapterId??""}:${row.examTopicId??""}`:"";
    let slugCollisionWarning=current&&mappingChanged&&collisionKeys.has(key)?"The proposed mapping already contains this resource slug.":null;
    if(current&&mappingChanged){const prior=targetKeys.get(key);if(prior&&prior!==row.resourceId)slugCollisionWarning="The batch contains a duplicate mapping and slug.";targetKeys.set(key,row.resourceId);}
    if(slugCollisionWarning)validationErrors.push("The proposed academic mapping has a slug collision.");
    const proposed={title:row.title,titleHindi:row.titleHindi,description:row.description,resourceTypeId:row.resourceTypeId,language:row.language,access:row.access,chapterId:row.chapterId,examTopicId:row.examTopicId};
    const priorMapping=current?(current.chapterId?chapterMap.get(current.chapterId):topicMap.get(current.examTopicId)):null;const resultingMapping=row.chapterId?chapterMap.get(row.chapterId):topicMap.get(row.examTopicId);const metadataPlan=current?planResourceMetadata(current,proposed,{previous:priorMapping as any??null,resulting:resultingMapping as any??null}):null;if(metadataPlan?.changedFields.length&&row.reason.length<10)validationErrors.push("reason must contain 10 to 1000 characters."); const conflict=Boolean(current&&current.version!==row.expectedVersion); const invalid=validationErrors.length>0||referenceErrors.length>0;
    const outcome=invalid?"INVALID":conflict?"CONFLICT":metadataPlan!.changedFields.length?"VALID_CHANGE":"NO_OP";
    return {rowNumber:row.rowNumber,resourceId:row.resourceId,currentTitle:current?.title??null,proposedTitle:row.title,currentVersion:current?.version??null,expectedVersion:Number.isSafeInteger(row.expectedVersion)?row.expectedVersion:null,currentStatus:current?.status??null,resultingStatus:metadataPlan?.resultingStatus??null,changedFields:metadataPlan?.metadataChangedFields??[],validationErrors,referenceErrors,mappingChangeWarning,slugCollisionWarning,publicVisibilityRemoval:metadataPlan?.publicVisibilityRemoval??false,outcome,safeToApply:outcome==="VALID_CHANGE"||outcome==="NO_OP",row,current,metadataPlan};
  });
  const rowsPublic=planned.map(x=>({rowNumber:x.rowNumber,resourceId:x.resourceId,currentTitle:x.currentTitle,proposedTitle:x.proposedTitle,currentVersion:x.currentVersion,expectedVersion:x.expectedVersion,currentStatus:x.currentStatus,resultingStatus:x.resultingStatus,changedFields:x.changedFields,validationErrors:x.validationErrors,referenceErrors:x.referenceErrors,mappingChangeWarning:x.mappingChangeWarning,slugCollisionWarning:x.slugCollisionWarning,publicVisibilityRemoval:x.publicVisibilityRemoval,outcome:x.outcome,safeToApply:x.safeToApply})); return {planned,rows:rowsPublic,summary:{totalRows:planned.length,validChanges:planned.filter(x=>x.outcome==="VALID_CHANGE").length,noOpRows:planned.filter(x=>x.outcome==="NO_OP").length,invalidRows:planned.filter(x=>x.outcome==="INVALID").length,conflicts:planned.filter(x=>x.outcome==="CONFLICT").length},orderedResourceIds:[...rows.map(x=>x.resourceId)].sort()};
}
