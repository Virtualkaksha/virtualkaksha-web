import "server-only";

export const PUBLIC_SITE_CONFIG = {
  name: "VirtualKaksha",
  canonicalUrl: "https://virtualkaksha.com",
  supportEmail: "support@virtualkaksha.com",
  operatingLocation: "Noida, Uttar Pradesh, India",
  legalEffectiveDate: "OWNER_CONFIRM_PUBLIC_LAUNCH_DATE",
} as const;

export function validatePublicSiteConfigForProduction() {
  const canonicalUrl = new URL(PUBLIC_SITE_CONFIG.canonicalUrl);
  if (canonicalUrl.protocol !== "https:" || canonicalUrl.origin !== PUBLIC_SITE_CONFIG.canonicalUrl) {
    throw new Error("Public site validation failed: canonical URL must be an HTTPS origin.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(PUBLIC_SITE_CONFIG.supportEmail)) {
    throw new Error("Public site validation failed: support email is invalid.");
  }
  if (PUBLIC_SITE_CONFIG.legalEffectiveDate.includes("OWNER_CONFIRM")) {
    throw new Error("Public site validation failed: legal effective date requires owner confirmation.");
  }
}
