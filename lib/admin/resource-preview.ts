export type AdminResourcePreview =
  | { kind: "article" }
  | { kind: "native-pdf"; url: string }
  | { kind: "native-pdf-unavailable"; status: string }
  | { kind: "external"; url: string; hostname: string }
  | { kind: "unavailable" };

function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return { url: url.toString(), hostname: url.hostname };
  } catch {
    return null;
  }
}

export function resolveAdminResourcePreview(resource: {
  id: string;
  format: string;
  externalUrl: string | null;
  nativePdf: {
    isNativePdf: boolean;
    hasPrimaryAsset: boolean;
    assetStatus: string | null;
  };
}): AdminResourcePreview {
  if (resource.format === "ARTICLE") return { kind: "article" };
  if (resource.nativePdf.isNativePdf) {
    if (resource.nativePdf.hasPrimaryAsset && resource.nativePdf.assetStatus === "READY") {
      return { kind: "native-pdf", url: `/api/admin/resources/${encodeURIComponent(resource.id)}/asset` };
    }
    return {
      kind: "native-pdf-unavailable",
      status: resource.nativePdf.assetStatus ?? "MISSING",
    };
  }
  const externalUrl = safeHttpsUrl(resource.externalUrl);
  return externalUrl ? { kind: "external", ...externalUrl } : { kind: "unavailable" };
}
