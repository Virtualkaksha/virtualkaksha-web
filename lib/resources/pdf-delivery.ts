import "server-only";

import {
  PRESIGNED_URL_TTL_SECONDS,
  supportsPresignedTransfer,
  type ResourceStorageProvider,
} from "./storage";
import { createResourceStorageProvider } from "./storage-provider-factory";

/**
 * The signed URL must never be cached or leak through a referrer, since it grants
 * direct object access for its lifetime.
 */
export const PRESIGNED_PDF_REDIRECT_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const);

type PresignedPdfOptions = {
  /** Set when the caller supplies the bytes itself, so no URL should be signed. */
  skip?: boolean;
  createProvider?: (providerName: string) => ResourceStorageProvider;
};

/**
 * Redirects an authorized PDF request to a short-lived direct storage URL.
 *
 * Hosts such as Vercel cap function request and response bodies well below the
 * upload limit, so a PDF cannot be streamed through the application at all.
 * Authorization still happens here first; only the byte transfer moves.
 *
 * Returns null when the provider cannot presign, leaving the caller on its
 * existing buffered path.
 */
export async function presignedPdfResponse(
  asset: { provider: string; objectKey: string },
  options: PresignedPdfOptions = {},
): Promise<Response | null> {
  if (options.skip) return null;

  const createProvider = options.createProvider ?? createResourceStorageProvider;
  let signedUrl: string;
  try {
    const provider = createProvider(asset.provider);
    if (!supportsPresignedTransfer(provider)) return null;
    signedUrl = await provider.createReadUrl(asset.objectKey, PRESIGNED_URL_TTL_SECONDS);
  } catch {
    // Signing failed; the caller's buffered path stays correct for small files.
    return null;
  }

  return new Response(null, {
    status: 307,
    headers: { ...PRESIGNED_PDF_REDIRECT_HEADERS, Location: signedUrl },
  });
}
