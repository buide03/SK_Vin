import { realpath, rm } from "node:fs/promises";
import path from "node:path";

if (process.env.SK_E2E !== "1") throw Error("Refuse reset outside browser tests");
const workspace = await realpath(process.cwd());
const target = path.resolve(workspace, ".data", "e2e-pg");
try {
  const resolved = await realpath(target);
  if (path.relative(workspace, resolved) !== path.join(".data", "e2e-pg"))
    throw Error("Refuse reset outside the dedicated e2e database");
  await rm(target, { recursive: true, force: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
