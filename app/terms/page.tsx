import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import { PUBLIC_SITE_CONFIG } from "@/lib/public-site-config";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2 className="text-2xl font-bold text-slate-950">{title}</h2><div className="mt-3 space-y-3">{children}</div></section>;

export default function TermsPage() {
  const { legalEffectiveDate, supportEmail } = PUBLIC_SITE_CONFIG;
  return <LegalDocument title="Terms of Service" effectiveDate={legalEffectiveDate}>
    <Section title="Educational purpose"><p>VirtualKaksha provides educational resource discovery, reading, bookmarking, progress, upload, and moderation features. Content is informational and does not replace qualified instruction.</p></Section>
    <Section title="Eligibility and minors"><p>You must provide accurate account information. Users under 18 must have permission from a parent or guardian. The current beta acknowledgement is not a fully verified guardian-consent mechanism.</p></Section>
    <Section title="Account security"><p>You are responsible for safeguarding your credentials and activity through your account. Contact {supportEmail} if you believe an account has been compromised.</p></Section>
    <Section title="Acceptable use"><p>Do not misuse the service, evade access controls, disrupt availability, upload malware, impersonate others, infringe rights, or submit unlawful, abusive, deceptive, or harmful material.</p></Section>
    <Section title="Uploaded content"><p>Teachers and other uploaders must own their content or have permission to use and share it. By submitting material, the uploader grants VirtualKaksha a limited licence to store, review, reproduce, and display it only as needed to operate and moderate the service.</p></Section>
    <Section title="Copyright and takedown"><p>Copyright or takedown requests may be sent to <a className="font-semibold text-blue-700" href={`mailto:${supportEmail}`}>{supportEmail}</a>. Include enough information to identify the material and explain the claimed rights.</p></Section>
    <Section title="Moderation, suspension and deletion"><p>Resources may be reviewed, rejected, archived, or removed. Accounts may be limited, suspended, or deactivated for safety, policy, legal, or operational reasons. Account deletion requests can be submitted through support, subject to records that must be retained.</p></Section>
    <Section title="Outcomes and availability"><p>VirtualKaksha does not guarantee any exam, academic, admission, employment, ranking, or financial outcome. Features and content may be unavailable, changed, or withdrawn, and uninterrupted operation cannot be guaranteed.</p></Section>
    <Section title="External links"><p>External services are operated under their own terms and policies. A link does not guarantee their accuracy, safety, availability, or endorsement.</p></Section>
    <Section title="Governing law and jurisdiction"><p>The governing-law, jurisdiction, and dispute terms require final legal confirmation before public launch. No dispute-resolution clause is established by this draft.</p></Section>
  </LegalDocument>;
}
