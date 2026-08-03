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
const serverOnlyTestStubUrl = pathToFileURL(resolve("node_modules/server-only/empty.js")).href;

moduleWithHooks.registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: serverOnlyTestStubUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
