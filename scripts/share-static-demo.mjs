/** Upload only the public demo ZIP to a release in the existing private repo.
 * Uses the existing Git credential helper in memory. Never logs/writes credentials.
 * Run with --check first; publishing requires an explicit --publish argument.
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const repo = "moonlight5782/mirrai";
const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };
const filled = execFileSync("git", ["-c", "credential.interactive=false", "credential", "fill"], {
  input: "protocol=https\nhost=github.com\npath=moonlight5782/mirrai.git\n\n", encoding: "utf8", env, stdio: ["pipe", "pipe", "ignore"],
});
const token = filled.split(/\r?\n/).find(line => line.startsWith("password="))?.slice(9);
if (!token) throw new Error("No GitHub credential available; sign in using your Git client");
const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status} for ${path}`);
  return response.json();
}
const info = await api("");
console.log(JSON.stringify({ repository: info.full_name, private: info.private, push: info.permissions?.push }));
if (process.argv.includes("--publish")) {
if (info.full_name !== repo || !info.private) throw new Error("Expected existing private repository; refusing to change its visibility");
const tag = "demo-neutral-2026-10-07";
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const exists = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { headers });
if (exists.status !== 404) throw new Error("Release already exists or cannot be checked; refusing to overwrite");
const release = await api("/releases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
  tag_name: tag, target_commitish: sha, name: "MIRRAI demo — ZIP для Cloudflare Pages", draft: true, prerelease: true,
  body: "Скачайте mirrai-demo.zip из Assets (не Source code). Нейтральная статическая сборка: 16 товаров, 16 текстурированных GLB, фото, RU/RO/EN, 3D/AR. Загрузите ZIP в Cloudflare Pages → Direct Upload. Без сервера, регистрации, оплат и аналитики. Каталог — снимок, не живая синхронизация. Требуется HTTPS. Проверка нативного AR на физическом телефоне после публикации остаётся обязательной. Инструкция: docs/STATIC_DEMO.md.",
}) });
const zip = await readFile(new URL("../outputs/static-demo/mirrai-demo.zip", import.meta.url));
const uploadUrl = new URL(release.upload_url.split("{")[0]);
if (uploadUrl.hostname !== "uploads.github.com") throw new Error("Unexpected GitHub upload host");
uploadUrl.searchParams.set("name", "mirrai-demo.zip");
const uploaded = await fetch(uploadUrl, { method: "POST", headers: { ...headers, "content-type": "application/zip" }, body: zip });
if (!uploaded.ok) throw new Error(`Release is still a draft: upload HTTP ${uploaded.status}`);
const asset = await uploaded.json();
if (asset.size !== zip.length || asset.state !== "uploaded") throw new Error("Upload size/state mismatch; release remains draft");
await api(`/releases/${release.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft: false }) });
console.log(JSON.stringify({ release: release.html_url, download: asset.browser_download_url, bytes: asset.size }));
}
