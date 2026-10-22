const OPTIONAL_WORKER_URLS = ["RECONSTRUCTION_API_URL", "HUGGINGFACE_SPACE_URL"];
const WORKER_SECRET_NAMES = [
  "RESEND_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RECONSTRUCTION_API_TOKEN",
  "HUGGINGFACE_TOKEN",
];

/** Build non-secret Cloudflare Worker variables from the deployment environment. */
export function cloudflareWorkerVars(environment) {
  const vars = {
    APP_ORIGIN: environment.MIRRAI_APP_ORIGIN,
    AUTH_MODE: environment.MIRRAI_AUTH_MODE || "password",
    MIRRAI_OPERATOR_EMAIL: environment.MIRRAI_OPERATOR_EMAIL?.trim().toLowerCase(),
    MAIL_FROM: environment.MAIL_FROM ?? "",
  };

  for (const name of OPTIONAL_WORKER_URLS) {
    if (environment[name]) vars[name] = environment[name];
  }

  return vars;
}

/** Return only configured secrets; tokens must never be placed in plain Worker vars. */
export function cloudflareWorkerSecrets(environment) {
  return Object.fromEntries(
    WORKER_SECRET_NAMES.flatMap((name) => environment[name] ? [[name, environment[name]]] : []),
  );
}
