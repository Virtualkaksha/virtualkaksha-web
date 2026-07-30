import { NextResponse } from "next/server";

import type { RateLimitDecision } from "./types";

const RATE_LIMIT_MESSAGE = "Too many requests. Please try again later.";

function retryAfter(decision: Pick<RateLimitDecision, "retryAfterSeconds">) {
  return Math.max(1, Math.ceil(decision.retryAfterSeconds));
}

export function rateLimitResponse(decision: Pick<RateLimitDecision, "retryAfterSeconds">) {
  return NextResponse.json(
    { error: RATE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter(decision)),
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export type RateLimitedActionResult = {
  ok: false;
  code: "RATE_LIMITED";
  message: string;
  retryAfterSeconds: number;
};

export function rateLimitedActionResult(
  decision: Pick<RateLimitDecision, "retryAfterSeconds">,
): RateLimitedActionResult {
  return {
    ok: false,
    code: "RATE_LIMITED",
    message: RATE_LIMIT_MESSAGE,
    retryAfterSeconds: retryAfter(decision),
  };
}

