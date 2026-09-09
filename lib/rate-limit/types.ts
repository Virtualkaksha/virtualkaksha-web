export type RateLimitPolicy =
  | "login-ip"
  | "login-identity"
  | "login-email"
  | "signup-ip"
  | "signup-email"
  | "resource-create-user"
  | "resource-create-ip"
  | "pdf-upload-user"
  | "pdf-upload-ip"
  | "bookmark-user"
  | "progress-user"
  | "progress-resource"
  | "teacher-mutation-user"
  | "teacher-resource-action"
  | "admin-mutation-user"
  | "admin-resource-action"
  | "admin-import-preview-user"
  | "admin-import-preview-ip"
  | "admin-import-apply-user"
  | "admin-import-apply-ip"
  | "teacher-access-request-ip"
  | "teacher-access-request-email"
  | "student-test-start-user"
  | "student-test-submit-user";

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  reason?: "limited" | "backend-unavailable";
};

export interface RateLimitAdapter {
  check(policy: RateLimitPolicy, identifier: string, cost?: number): Promise<RateLimitDecision>;
  reset(policy: RateLimitPolicy, identifier: string): Promise<void>;
}
