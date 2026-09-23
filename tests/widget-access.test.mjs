import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../public/mirrai-widget-2.1.0.js", import.meta.url), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(version = "2.1.0") {
  const nodes = [];
  const element = tag => {
    const node = { tag, style: {}, dataset: {}, children: [], setAttribute() {}, addEventListener() {}, focus() {}, remove() {}, appendChild(child) { this.children.push(child); } };
    nodes.push(node); return node;
  };
  const body = element("body");
  let response = { subscriptionActive: true, items: { ALBA: { available: true, model: "/alba.glb" } } };
  let checks = 0;
  const requests = [];
  const targets = [];
  const window = { location: { origin: "https://shop.example" }, addEventListener() {}, dispatchEvent() {} };
  const document = { currentScript: { src: "https://mirrai.example/mirrai-widget.js", dataset: { auto: "false", shopId: "shop" } }, body, createElement: element, addEventListener() {}, querySelectorAll: () => targets };
  const context = { window, document, navigator: { userAgent: "desktop" }, URL, CustomEvent: class {}, fetch: async (url, options) => {
    if (url.pathname !== "/api/widget/config") return { ok: true };
    checks++;
    requests.push(JSON.parse(options.body));
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  } };
  vm.runInNewContext(version === "2.1.0" ? source : readFileSync(new URL(`../public/mirrai-widget-${version}.js`, import.meta.url), "utf8"), context);
  return { context, targets, requests, element, mount: () => window.MirraiWidget.mount({ shopId: "shop", sku: "ALBA", model: "/stale.glb", target: body }), nodes, set: value => { response = value; }, checks: () => checks };
}

test("a supplied model still requires access, and expiry blocks the next opening", async () => {
  const h = harness(), widget = h.mount();
  await tick();
  assert.equal(h.checks(), 1);
  h.set({ subscriptionActive: false, items: {} });
  widget.open(); await tick();
  assert.equal(h.checks(), 2);
  assert.equal(widget.button.disabled, true);
  assert.equal(h.nodes.some(node => node.tag === "iframe"), false);
});

test("SDK 2.2 reads the documented data-mirrai-sku container and avoids duplicate buttons", async () => {
  const h = harness("2.2.0"), target = h.element("div");
  target.dataset.mirraiSku = "ALBA";
  const attributes = {};
  target.getAttribute = key => attributes[key]; target.setAttribute = (key, value) => { attributes[key] = value; };
  h.targets.push(target);
  h.context.window.MirraiWidget.scan(); await tick();
  assert.deepEqual(h.requests[0].skus, ["ALBA"]);
  assert.equal(target.children.length, 1);
  assert.equal(target.children[0].style.display, "block");
  h.context.window.MirraiWidget.scan(); await tick();
  assert.equal(target.children.length, 1);
  assert.equal(h.context.window.MirraiWidget.version, "2.2.0");
});

test("SDK 2.2 preserves the requested variant SKU when server returns its parent SKU", async () => {
  const h = harness("2.2.0");
  h.set({ subscriptionActive: true, items: { ALBA: { available: true, sku: "PARENT", model: "/variant.glb" } } });
  const widget = h.mount(); await tick();
  widget.open(); await tick();
  assert.deepEqual(h.requests[1].skus, ["ALBA"]);
  assert.ok(h.nodes.find(node => node.tag === "iframe").src.includes("variant.glb"));
});

test("compatibility SDK is identical to the new immutable release", () => {
  assert.equal(readFileSync(new URL("../public/mirrai-widget.js", import.meta.url), "utf8"), readFileSync(new URL("../public/mirrai-widget-2.2.0.js", import.meta.url), "utf8"));
});

test("the immutable SDK reports its public semantic version", () => {
  const h = harness();
  assert.equal(vm.runInNewContext("window.MirraiWidget.version", h.context), "2.1.0");
});

test("network errors never open a stale model and retry can recover", async () => {
  const h = harness(), widget = h.mount();
  await tick();
  h.set(new Error("offline"));
  widget.open(); await tick();
  assert.equal(h.nodes.some(node => node.tag === "iframe"), false);
  h.set({ subscriptionActive: true, items: { ALBA: { available: true, model: "/current.glb" } } });
  widget.open(); await tick();
  assert.ok(h.nodes.find(node => node.tag === "iframe").src.includes("current.glb"));
});
