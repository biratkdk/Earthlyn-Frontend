import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = join(root, ".next", "standalone");

function copyDirectory(source, destination) {
  if (!existsSync(source)) return;

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
}

copyDirectory(
  join(root, ".next", "static"),
  join(standaloneRoot, ".next", "static"),
);
copyDirectory(join(root, "public"), join(standaloneRoot, "public"));
