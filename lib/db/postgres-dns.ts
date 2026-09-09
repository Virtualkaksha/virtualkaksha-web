import dns from "node:dns";

const PUBLIC_DNS_SERVERS = ["1.1.1.1", "8.8.8.8", "1.0.0.1"] as const;
const FALLBACK_CODES = new Set(["ENOTFOUND", "ESERVFAIL", "EAI_AGAIN", "ENODATA"]);

let installed = false;

function fallbackResolve(hostname: string, callback: dns.LookupOneCallback) {
  const resolver = new dns.Resolver();
  resolver.setServers([...PUBLIC_DNS_SERVERS]);
  resolver.resolve4(hostname, (ipv4Error, ipv4) => {
    if (!ipv4Error && ipv4[0]) {
      callback(null, ipv4[0], 4);
      return;
    }
    resolver.resolve6(hostname, (ipv6Error, ipv6) => {
      if (!ipv6Error && ipv6[0]) {
        callback(null, ipv6[0], 6);
        return;
      }
      const failure =
        ipv4Error ??
        ipv6Error ??
        Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: "ENOTFOUND" });
      callback(failure as NodeJS.ErrnoException);
    });
  });
}

/**
 * Some ISP resolvers refuse Neon hostnames. Fall back to public DNS only after
 * the operating-system lookup fails with a resolution error.
 */
export function installPostgresDnsFallback() {
  if (installed) return;
  installed = true;

  const originalLookup = dns.lookup;

  dns.lookup = ((hostname: string, options?: unknown, callback?: unknown) => {
    const cb = typeof options === "function" ? options : callback;
    const opts = typeof options === "function" ? undefined : options;

    if (typeof cb !== "function") {
      return originalLookup(hostname, options as never);
    }

    if (opts && typeof opts === "object" && "all" in opts && (opts as { all?: boolean }).all) {
      return originalLookup(hostname, opts as never, cb as never);
    }

    const continueWith = (error: NodeJS.ErrnoException | null, address?: string, family?: number) => {
      if (!error) {
        (cb as dns.LookupOneCallback)(null, address as string, family ?? 4);
        return;
      }
      if (!error.code || !FALLBACK_CODES.has(error.code)) {
        (cb as dns.LookupOneCallback)(error);
        return;
      }
      fallbackResolve(String(hostname), cb as dns.LookupOneCallback);
    };

    if (opts === undefined) {
      originalLookup(hostname, continueWith as dns.LookupOneCallback);
      return;
    }

    originalLookup(hostname, opts as never, continueWith as dns.LookupOneCallback);
  }) as typeof dns.lookup;
}

export function postgresDnsFallbackServers() {
  return PUBLIC_DNS_SERVERS;
}
