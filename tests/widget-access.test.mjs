import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../public/mirrai-widget.js", import.meta.url), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const nodes = [];
  const element = tag => {
    const node = { tag, style: {}, dataset: {}, children: [], setAttribute() {}, addEventListener() {}, focus() {}, remove() {}, appendChild(child) { this.children.push(child); } };
    nodes.push(node); return node;
  };
  const body = element("body");
  let response = { subscriptionActive: true, items: { ALBA: { available: true, model: "/alba.glb" } } };
  let checks = 0;
  const window = { location: { origin: "https://shop.example" }, addEventListener() {}, dispatchEvent() {} };
  const document = { currentScript: { src: "https://mirrai.example/mirrai-widget.js", dataset: { auto: "false" } }, body, createElement: element, addEventListener() {} };
  vm.runInNewContext(source, { window, document, navigator: { userAgent: "desktop" }, URL, CustomEvent: class {}, fetch: async url => {
    if (url.pathname !== "/api/widget/config") return { ok: true };
    checks++;
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  } });
  return { mount: () => window.MirraiWidget.mount({ shopId: "shop", sku: "ALBA", model: "/stale.glb", target: body }), nodes, set: value => { response = value; }, checks: () => checks };
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
