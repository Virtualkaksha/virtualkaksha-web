import "server-only";
import type { ValidatedResourceImportRow } from "./resource-import-validation";
export function applyResourceImport(rows:ValidatedResourceImportRow[],actorUserId:string,transact=import("@/repositories/admin-resource-import-apply.repository").then(m=>m.transactResourceImportApply)){
 return Promise.resolve(transact).then(fn=>fn(rows,actorUserId));
}
