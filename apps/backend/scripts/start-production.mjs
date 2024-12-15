import { spawn, spawnSync } from "node:child_process";

const migrate = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit" },
);

if (migrate.status !== 0) {
  console.error(`[startup] Prisma migrate failed with exit code ${migrate.status}`);
  process.exit(migrate.status ?? 1);
}

console.log("[startup] Prisma migrations complete. Starting API.");
const api = spawn(process.execPath, ["dist/main.js"], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    api.kill(signal);
  });
}

api.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[startup] API process exited from signal ${signal}`);
    process.kill(process.pid, signal);
    return;
  }

  console.error(`[startup] API process exited with code ${code ?? 1}`);
  process.exit(code ?? 1);
});
