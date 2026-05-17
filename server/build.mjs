import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { readFile, rm, copyFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(artifactDir, "../shared");

// esbuild alias doesn't accept relative paths as keys — use a plugin instead
const sharedResolverPlugin = {
  name: "shared-resolver",
  setup(build) {
    const map = {
      "../../shared/db":         path.join(sharedDir, "db/index.ts"),
      "../../shared/api-zod":    path.join(sharedDir, "api-zod/index.ts"),
      "../../shared/api-client": path.join(sharedDir, "api-client/index.ts"),
      "@shared/db":              path.join(sharedDir, "db/index.ts"),
      "@shared/api-zod":         path.join(sharedDir, "api-zod/index.ts"),
      "@shared/api-client":      path.join(sharedDir, "api-client/index.ts"),
    };
    build.onResolve({ filter: /^(\.\.\/\.\.\/shared\/|@shared\/)/ }, (args) => {
      const resolved = map[args.path];
      if (resolved) return { path: resolved };
    });
  },
};

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node",
      "better-sqlite3",
      "sharp",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "bufferutil",
      "utf-8-validate",
    ],
    sourcemap: "linked",
    nodePaths: [path.resolve(artifactDir, "node_modules")],
    plugins: [
      sharedResolverPlugin,
    ],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });

  await copyFile(
    path.resolve(artifactDir, "src/ai-skills.md"),
    path.resolve(distDir, "ai-skills.md")
  );
}

buildAll()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
