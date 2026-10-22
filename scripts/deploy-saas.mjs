import { spawnSync } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareWorkerVars, cloudflareWorkerSecrets } from "../lib/saas-deploy-config.mjs";
import { resolveAuthMode } from "../lib/auth-mode.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.env.MIRRAI_DEPLOY_ENV;
const targets = {
  staging: { worker: "mirrai-saas-staging", database: "mirrai-saas-staging", storage: "kv" },
  production: { worker: "mirrai-saas", database: "mirrai-saas-production", bucket: "mirrai-saas-production" },
};

function fail(message) {
  throw new Error(`[deploy:saas] ${message}`);
}

const selected = targets[target];
if (!selected) fail("Set MIRRAI_DEPLOY_ENV to staging or production.");
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.MIRRAI_D1_DATABASE_ID;
const storageMode = process.env.MIRRAI_STORAGE_MODE || selected.storage || "r2";
const kvNamespaceId = process.env.MIRRAI_KV_NAMESPACE_ID;
const bucketName = process.env.MIRRAI_R2_BUCKET_NAME;
const appOrigin = process.env.MIRRAI_APP_ORIGIN;
const operatorEmail = process.env.MIRRAI_OPERATOR_EMAIL?.trim().toLowerCase();
if (!/^[a-f0-9]{32}$/i.test(accountId ?? "")) fail("CLOUDFLARE_ACCOUNT_ID must be a 32-character account ID.");
if (!/^[a-f0-9-]{36}$/i.test(databaseId ?? "")) fail("MIRRAI_D1_DATABASE_ID must be a D1 database UUID.");
if (storageMode !== "kv" && storageMode !== "r2") fail("MIRRAI_STORAGE_MODE must be kv or r2.");
if (target === "staging" && storageMode !== "kv") fail("Free staging is configured for KV; use MIRRAI_STORAGE_MODE=kv.");
if (storageMode === "kv" && !/^[a-f0-9]{32}$/i.test(kvNamespaceId ?? "")) fail("MIRRAI_KV_NAMESPACE_ID must be a 32-character KV namespace ID.");
if (storageMode === "r2" && bucketName !== selected.bucket) fail(`MIRRAI_R2_BUCKET_NAME must equal ${selected.bucket} for ${target}.`);
if (!appOrigin) fail("MIRRAI_APP_ORIGIN must be set to this deployment's canonical HTTPS origin.");
try {
  const parsed = new URL(appOrigin);
  if (parsed.protocol !== "https:" || parsed.origin !== appOrigin || parsed.username || parsed.password) throw new Error();
} catch {
  fail("MIRRAI_APP_ORIGIN must be a canonical HTTPS origin without a path.");
}
if (!operatorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operatorEmail)) fail("MIRRAI_OPERATOR_EMAIL must be set for operator access.");
let authMode;
try {
  authMode = resolveAuthMode(process.env);
} catch (error) {
  fail(error.message);
}

const configPath = path.join(root, "wrangler.jsonc");
const config = {
  "$schema": "node_modules/wrangler/config-schema.json",
  name: selected.worker,
  account_id: accountId,
  compatibility_date: "2026-10-10",
  compatibility_flags: ["nodejs_compat"],
  main: "./worker/index.ts",
  assets: { directory: "dist/client", binding: "ASSETS", not_found_handling: "none" },
  d1_databases: [{ binding: "DB", database_name: selected.database, database_id: databaseId, migrations_dir: "drizzle" }],
  ...(storageMode === "kv"
    ? { kv_namespaces: [{ binding: "UPLOADS_KV", id: kvNamespaceId }] }
    : { r2_buckets: [{ binding: "UPLOADS", bucket_name: bucketName }] }),
  workers_dev: true,
  observability: { enabled: true, logs: { enabled: true, head_sampling_rate: 1 } },
  vars: { ...cloudflareWorkerVars(process.env), AUTH_MODE: authMode },
};

const configExists = await access(configPath).then(() => true, () => false);
if (configExists) fail("wrangler.jsonc already exists; refusing to overwrite a local configuration.");

const tempDir = await mkdtemp(path.join(tmpdir(), "mirrai-deploy-"));
const secretsPath = path.join(tempDir, "worker-secrets.json");
const secrets = cloudflareWorkerSecrets(process.env);
let configCreated = false;

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, MIRRAI_DEPLOY_TARGET: "cloudflare" },
  });
  if (result.error) fail(`Could not start ${command}: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} exited with status ${result.status ?? "unknown"}.`);
}

try {
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
  configCreated = true;
  if (Object.keys(secrets).length) await writeFile(secretsPath, `${JSON.stringify(secrets)}\n`, { mode: 0o600 });

  console.log(`[deploy:saas] Building a dry-run Worker for ${selected.worker}.`);
  run("npx", ["@vinext/cloudflare", "deploy", "--dry-run"]);
  console.log(`[deploy:saas] Applying D1 migrations to ${selected.database} (${target}).`);
  run("npx", ["wrangler", "d1", "migrations", "apply", selected.database, "--remote"]);
  console.log(`[deploy:saas] Building and publishing Worker ${selected.worker}.`);
  run("npx", ["@vinext/cloudflare", "deploy"]);
  if (Object.keys(secrets).length) {
    console.log(`[deploy:saas] Uploading configured Worker secrets to ${selected.worker}.`);
    run("npx", ["wrangler", "secret", "bulk", secretsPath, "--name", selected.worker]);
  }
  console.log(`[deploy:saas] Deployment command completed for ${appOrigin}.`);
} finally {
  if (configCreated) await rm(configPath, { force: true });
  await rm(tempDir, { recursive: true, force: true });
}
