import assert from "node:assert/strict";
import test from "node:test";

import { assertEmailShape } from "../lib/auth/email-mailbox";

test("signup mailbox shape rejects disposable, short, and placeholder Gmail IDs", () => {
  assert.equal(assertEmailShape("ajeet.kumar@gmail.com").ok, true);
  assert.equal(assertEmailShape("student@example.test").ok, true);
  assert.equal(assertEmailShape("abc@gmail.com").ok, false);
  assert.equal(assertEmailShape("test123@gmail.com").ok, false);
  assert.equal(assertEmailShape("asdf@yahoo.com").ok, false);
  assert.equal(assertEmailShape("not-an-email").ok, false);
  assert.equal(assertEmailShape("user@localhost").ok, false);
  assert.equal(assertEmailShape("user@mailinator.com").ok, false);
  assert.equal(assertEmailShape("user@yopmail.com").ok, false);
});
