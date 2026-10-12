import { resolveMx } from "node:dns/promises";

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "sharklasers.com",
  "grr.la",
  "discard.email",
  "mailnesia.com",
  "getnada.com",
  "inboxkitten.com",
  "trashmail.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mintemail.com",
  "moakt.com",
  "tempail.com",
]);

export type MailboxCheckResult = { ok: true } | { ok: false; reason: "format" | "disposable" | "no-mx" };

const CONSUMER_MAIL = {
  "gmail.com": { min: 6, max: 30 },
  "googlemail.com": { min: 6, max: 30 },
  "outlook.com": { min: 5, max: 64 },
  "hotmail.com": { min: 5, max: 64 },
  "live.com": { min: 5, max: 64 },
  "yahoo.com": { min: 4, max: 32 },
  "yahoo.co.in": { min: 4, max: 32 },
  "icloud.com": { min: 3, max: 20 },
  "rediffmail.com": { min: 4, max: 30 },
} as const;

const THROWAWAY_LOCAL_PARTS = new Set([
  "abc",
  "abcd",
  "asdf",
  "qwerty",
  "test",
  "testing",
  "user",
  "admin",
  "demo",
  "fake",
  "temp",
  "xyz",
  "aaa",
  "abc123",
  "test123",
  "user123",
  "noreply",
  "no-reply",
]);

function emailParts(email: string) {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return {
    local: email.slice(0, at).trim().toLowerCase(),
    domain: email.slice(at + 1).trim().toLowerCase(),
  };
}

function emailDomain(email: string) {
  return emailParts(email)?.domain ?? null;
}

function consumerLocalLooksPlaceholder(local: string) {
  const core = local.replace(/\./g, "");
  if (THROWAWAY_LOCAL_PARTS.has(core)) return true;
  if (/^(.)\1{2,}$/.test(core)) return true;
  if (/^(abc|xyz|asdf|qwe|test)+[0-9]*$/.test(core)) return true;
  return false;
}

export function assertEmailShape(email: string): MailboxCheckResult {
  const parts = emailParts(email);
  if (!parts || parts.domain.includes("..") || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parts.domain)) {
    return { ok: false, reason: "format" };
  }
  if (DISPOSABLE_DOMAINS.has(parts.domain)) return { ok: false, reason: "disposable" };

  const rules = CONSUMER_MAIL[parts.domain as keyof typeof CONSUMER_MAIL];
  if (rules) {
    if (parts.local.startsWith(".") || parts.local.endsWith(".") || parts.local.includes("..")) {
      return { ok: false, reason: "format" };
    }
    if (!/^[a-z0-9.]+$/.test(parts.local)) return { ok: false, reason: "format" };
    if (parts.local.length < rules.min || parts.local.length > rules.max) {
      return { ok: false, reason: "format" };
    }
    if (consumerLocalLooksPlaceholder(parts.local)) return { ok: false, reason: "format" };
  }
  return { ok: true };
}

export async function assertDeliverableMailbox(email: string): Promise<MailboxCheckResult> {
  const shape = assertEmailShape(email);
  if (!shape.ok) return shape;
  const domain = emailDomain(email);
  if (!domain) return { ok: false, reason: "format" };
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("mx-timeout")), 2500);
      }),
    ]);
    if (!records.length) return { ok: false, reason: "no-mx" };
    return { ok: true };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ? String(error.code) : String(error);
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return { ok: false, reason: "no-mx" };
    }
    // Timeouts and resolver outages should not block a real student.
    return { ok: true };
  }
}
