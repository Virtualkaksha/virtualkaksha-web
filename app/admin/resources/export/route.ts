import { NextResponse } from "next/server";

import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
  type CurrentIdentityResult,
} from "@/lib/auth/current-identity";
import { buildResourceInventoryCsv } from "@/lib/admin/resource-export";
import { getResourceInventoryExportRows, parseResourceInventoryFilters } from "@/lib/admin/resource-inventory";

type Dependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  getRows?: typeof getResourceInventoryExportRows;
};

export async function handleResourceInventoryExport(request: Request, dependencies: Dependencies = {}) {
  const identity = await (dependencies.resolveIdentity ?? (() => resolveCurrentIdentityForApi(["ADMIN"])))();
  if (!identity.ok) {
    return NextResponse.json(
      { error: identity.message },
      { status: currentIdentityFailureStatus(identity.code), headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
    );
  }
  try {
    const url = new URL(request.url);
    const filters = parseResourceInventoryFilters(Object.fromEntries(url.searchParams));
    const rows = await (dependencies.getRows ?? getResourceInventoryExportRows)(filters);
    return new NextResponse(buildResourceInventoryCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="virtualkaksha-resource-inventory.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Resource inventory export is temporarily unavailable." },
      { status: 503, headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
    );
  }
}

export async function GET(request: Request) {
  return handleResourceInventoryExport(request);
}
