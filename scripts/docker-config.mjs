import { spawnSync } from "node:child_process";

const candidates = [
  ["docker", ["compose"]],
  ["docker-compose", []],
];

function run(command, args, stdio = "inherit") {
  return spawnSync(command, args, {
    stdio,
  });
}

function findCompose() {
  for (const [command, prefix] of candidates) {
    const result = run(command, [...prefix, "version"], "ignore");
    if (result.status === 0) return [command, prefix];
  }

  throw new Error(
    "Docker Compose is not available. Install Docker Compose v2 or docker-compose.",
  );
}

const [command, prefix] = findCompose();
const checks = [
  [...prefix, "config", "--quiet"],
  [...prefix, "-f", "docker-compose.prod.yml", "config", "--quiet"],
];

for (const args of checks) {
  const result = run(command, args);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
