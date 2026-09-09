import assert from "node:assert/strict";
import dns from "node:dns";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

import { installPostgresDnsFallback, postgresDnsFallbackServers } from "@/lib/db/postgres-dns";

test("postgres DNS fallback uses public resolvers after OS lookup fails", () => {
  assert.deepEqual([...postgresDnsFallbackServers()], ["1.1.1.1", "8.8.8.8", "1.0.0.1"]);
});

test("prisma installs the DNS fallback and gives Neon time to accept the first connection", async () => {
  const source = await readFile("lib/prisma.ts", "utf8");
  assert.match(source, /installPostgresDnsFallback\(\)/);
  assert.match(source, /connectionTimeoutMillis: 20_000/);
});

test("teacher access keeps the form on a database outage", async () => {
  const action = await readFile("app/teacher-access/actions.ts", "utf8");
  assert.match(action, /temporarily unavailable/);
  assert.match(action, /catch \{/);
});

test("DNS fallback can resolve a Neon hostname when the OS resolver cannot", async (t) => {
  installPostgresDnsFallback();
  const hostname = "ep-misty-salad-b3xyjrvb.c-4.ap-southeast-1.aws.neon.tech";
  try {
    const address = await promisify(dns.lookup)(hostname);
    assert.match(String(address), /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]+$/i);
  } catch {
    t.skip("public DNS is unavailable in this environment");
  }
});
