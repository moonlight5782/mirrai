import test from "node:test";
import assert from "node:assert/strict";
import { cloudflareWorkerSecrets, cloudflareWorkerVars } from "../lib/saas-deploy-config.mjs";
import { passwordAuthAllowed, resolveAuthMode } from "../lib/auth-mode.mjs";

test("Cloudflare deploy forwards optional generation URLs as variables and credentials as secrets", () => {
  const environment = {
    MIRRAI_APP_ORIGIN: "https://mirrai-saas-staging.example.workers.dev",
    MIRRAI_OPERATOR_EMAIL: " OWNER@EXAMPLE.COM ",
    MAIL_FROM: "MIRRAI <hello@example.com>",
    HUGGINGFACE_SPACE_URL: "https://tencent-hunyuan3d-2-1.hf.space",
    HUGGINGFACE_TOKEN: "hf-sensitive-token",
    RECONSTRUCTION_API_URL: "https://gpu.example.com",
    RECONSTRUCTION_API_TOKEN: "gateway-sensitive-token",
  };

  const vars = cloudflareWorkerVars(environment);
  const secrets = cloudflareWorkerSecrets(environment);

  assert.equal(vars.MIRRAI_OPERATOR_EMAIL, "owner@example.com");
  assert.equal(vars.HUGGINGFACE_SPACE_URL, environment.HUGGINGFACE_SPACE_URL);
  assert.equal(vars.RECONSTRUCTION_API_URL, environment.RECONSTRUCTION_API_URL);
  assert.equal("HUGGINGFACE_TOKEN" in vars, false);
  assert.equal("RECONSTRUCTION_API_TOKEN" in vars, false);
  assert.equal(secrets.HUGGINGFACE_TOKEN, environment.HUGGINGFACE_TOKEN);
  assert.equal(secrets.RECONSTRUCTION_API_TOKEN, environment.RECONSTRUCTION_API_TOKEN);
});

test("unconfigured optional generation services are omitted", () => {
  assert.deepEqual(cloudflareWorkerVars({ MIRRAI_APP_ORIGIN: "https://example.workers.dev" }), {
    APP_ORIGIN: "https://example.workers.dev",
    AUTH_MODE: "password",
    MIRRAI_OPERATOR_EMAIL: undefined,
    MAIL_FROM: "",
  });
  assert.deepEqual(cloudflareWorkerSecrets({}), {});
});

test("Google-only deployments need Google credentials, not a mail provider", () => {
  const environment = {
    MIRRAI_AUTH_MODE: "google",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
  };
  assert.equal(resolveAuthMode(environment), "google");
  assert.equal(cloudflareWorkerVars(environment).AUTH_MODE, "google");
  assert.equal(passwordAuthAllowed("google"), false);
  assert.equal(passwordAuthAllowed("password"), true);
  assert.throws(() => resolveAuthMode({ MIRRAI_AUTH_MODE: "google", GOOGLE_CLIENT_ID: "client-id" }), /GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/);
  assert.throws(() => resolveAuthMode({ MIRRAI_AUTH_MODE: "password" }), /RESEND_API_KEY and MAIL_FROM/);
});
