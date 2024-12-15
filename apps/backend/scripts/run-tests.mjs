import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const testRoot = join(process.cwd(), "test");

function collectTests(directory) {
  return readdirSync(directory)
    .flatMap((entry) => {
      const fullPath = join(directory, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        return collectTests(fullPath);
      }

      return entry.endsWith(".test.ts") ? [fullPath] : [];
    })
    .sort((a, b) => a.localeCompare(b));
}

const testFiles = collectTests(testRoot).map((filePath) =>
  relative(process.cwd(), filePath),
);

if (testFiles.length === 0) {
  console.error("No backend test files found in apps/backend/test.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--test", "-r", "ts-node/register", ...testFiles],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
