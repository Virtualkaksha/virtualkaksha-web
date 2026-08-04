import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import { PUBLIC_SITE_CONFIG } from "@/lib/public-site-config";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2 className="text-2xl font-bold text-slate-950">{title}</h2><div className="mt-3 space-y-3">{children}</div></section>;

export default function PrivacyPage() {
  const { legalEffectiveDate, supportEmail } = PUBLIC_SITE_CONFIG;
  return <LegalDocument title="Privacy Policy" effectiveDate={legalEffectiveDate}>
    <Section title="Who operates this platform"><p>VirtualKaksha is the platform and operator display name. Privacy questions and requests can be sent to <a className="font-semibold text-blue-700" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p></Section>
    <Section title="Information we handle"><p>Account information may include your name, email address, authentication and session information, roles, and account status. Learning information may include bookmarks and PDF reading progress.</p><p>Teacher-uploaded resources, associated resource details, and moderation records are handled to operate the publishing workflow. We also process limited technical and security information needed for abuse prevention, trusted request handling, and rate limiting.</p></Section>
    <Section title="Why we use information"><p>We use information to create and secure accounts, provide learning features, remember reading progress and bookmarks, review uploaded material, publish eligible resources, respond to requests, and protect the service.</p></Section>
    <Section title="Storage and service providers"><p>The service relies on hosting, database, private object-storage, and rate-limiting provider categories. The deployed providers may change, so this policy does not represent any unconfirmed vendor as permanent.</p></Section>
    <Section title="Retention and deletion"><p>Information is retained only as long as reasonably needed for the service, security, moderation, legal obligations, and dispute handling. Retention varies by record type. To request account deletion, email {supportEmail}. Some records may need to be retained where required for security or legal reasons.</p></Section>
    <Section title="Security"><p>VirtualKaksha uses access controls, protected resource delivery, session revocation, rate limiting, and other safeguards. No online service can promise absolute security.</p></Section>
    <Section title="Children and minors"><p>Students under 18 should create an account only with permission from a parent or guardian. The current beta acknowledgement is not a fully verified guardian-consent mechanism. A dedicated workflow is still required before broad child-account onboarding.</p></Section>
    <Section title="External links"><p>Published resources may refer to external websites. Their operators control their own privacy and security practices.</p></Section>
    <Section title="Policy updates"><p>We may update this policy as the service or legal requirements change. The effective date shown above will identify the applicable version.</p></Section>
  </LegalDocument>;
}
