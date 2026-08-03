import * as nodeModule from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type ResolveHook = (
  specifier: string,
  context: unknown,
  nextResolve: (specifier: string, context: unknown) => unknown,
) => unknown;

const moduleWithHooks = nodeModule as typeof nodeModule & {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};
const serverOnlyModuleUrl = pathToFileURL(resolve("node_modules/server-only/empty.js")).href;

moduleWithHooks.registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: serverOnlyModuleUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const SAFE_VALIDATION_MESSAGE = /^(?:Common|Database|Auth|Storage|Rate limit) environment validation failed: [A-Z0-9_]+ [A-Za-z0-9 ()/.,_-]+$/;

function sanitizedFailureMessage(error: unknown) {
  if (error instanceof Error && SAFE_VALIDATION_MESSAGE.test(error.message)) {
    return error.message;
  }
  return "Environment validation failed: invalid server configuration.";
}

async function main() {
  try {
    const {
      getAuthEnvironment,
      getCommonEnvironment,
      getDatabaseEnvironment,
      getRateLimitEnvironment,
      getStorageEnvironment,
    } = await import("../lib/env/index");

    const common = getCommonEnvironment();
    if (!common.isProduction) {
      throw new Error("Common environment validation failed: NODE_ENV must be production for deployment validation.");
    }
    getDatabaseEnvironment();
    getAuthEnvironment();
    getStorageEnvironment();
    getRateLimitEnvironment();
    console.log("Environment validation succeeded for production deployment.");
  } catch (error) {
    console.error(sanitizedFailureMessage(error));
    process.exitCode = 1;
  }
}

void main();
