/** Verify that every published HUGGE GLB is authored in meters at its catalog size. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";

const root = resolve(import.meta.dirname, "..");
const products = {
  "98232": [0.47, 0.82, 0.59], "100326": [2.40, 0.75, 0.97],
  "111240": [1.96, 0.91, 0.98], "109553": [1.50, 0.78, 0.84],
  "108501": [0.595, 0.99, 0.615], "107376": [1.91, 0.78, 0.84],
  "102923": [0.40, 0.51, 0.40], "100489": [1.00, 0.75, 0.50],
  "98600": [1.15, 0.75, 1.15], "90157": [0.585, 0.885, 0.59],
  "89099": [0.585, 0.885, 0.59], "71939": [0.69, 0.905, 0.785],
  "35348": [1.20, 0.75, 0.60], "90315": [0.40, 0.51, 0.40],
  "85345": [1.10, 0.771, 0.50],
};

function jsonChunk(path) {
  const data = readFileSync(path);
  if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2) throw new Error(`${path}: invalid GLB`);
  let offset = 12;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset); const type = data.readUInt32LE(offset + 4); offset += 8;
    if (type === 0x4e4f534a) return JSON.parse(data.subarray(offset, offset + length).toString("utf8").replace(/\0+$/g, ""));
    offset += length;
  }
  throw new Error(`${path}: JSON chunk missing`);
}

function localMatrix(node) {
  if (node.matrix) return new Matrix4().fromArray(node.matrix);
  return new Matrix4().compose(
    new Vector3(...(node.translation ?? [0, 0, 0])),
    new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
    new Vector3(...(node.scale ?? [1, 1, 1])),
  );
}

function bounds(path) {
  const gltf = jsonChunk(path); const result = new Box3();
  const scene = gltf.scenes?.[gltf.scene ?? 0];
  function visit(index, parent) {
    const node = gltf.nodes[index]; const world = parent.clone().multiply(localMatrix(node));
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      if (!accessor?.min || !accessor?.max) throw new Error(`${path}: POSITION bounds missing`);
      for (const x of [accessor.min[0], accessor.max[0]]) for (const y of [accessor.min[1], accessor.max[1]]) for (const z of [accessor.min[2], accessor.max[2]]) result.expandByPoint(new Vector3(x, y, z).applyMatrix4(world));
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  for (const node of scene?.nodes ?? []) visit(node, new Matrix4());
  if (result.isEmpty()) throw new Error(`${path}: empty model`);
  return result;
}

let failed = false;
for (const [sku, expected] of Object.entries(products)) {
  const path = resolve(root, "public", "catalog", `hugge-${sku}-trellis2-q8-pbr.glb`);
  const box = bounds(path); const size = box.getSize(new Vector3()).toArray();
  const accurate = size.every((value, axis) => Math.abs(value - expected[axis]) <= Math.max(.005, expected[axis] * .005));
  const grounded = Math.abs(box.min.y) <= .005;
  console.log(`${accurate && grounded ? "PASS" : "FAIL"} HUGGE-${sku}: ${size.map(value => value.toFixed(3)).join(" × ")} m; floor ${box.min.y.toFixed(3)} m`);
  failed ||= !accurate || !grounded;
}

const albaPath = resolve(root, "public", "catalog", "alba-chair-trellis2-q8-pbr.glb");
const albaBox = bounds(albaPath); const albaSize = albaBox.getSize(new Vector3()).toArray(); const albaExpected = [.62, .90, .86];
const albaAccurate = albaSize.every((value, axis) => Math.abs(value - albaExpected[axis]) <= .005);
const albaGrounded = Math.abs(albaBox.min.y) <= .005;
console.log(`${albaAccurate && albaGrounded ? "PASS" : "FAIL"} HUGGE-89990: ${albaSize.map(value => value.toFixed(3)).join(" × ")} m; floor ${albaBox.min.y.toFixed(3)} m`);
failed ||= !albaAccurate || !albaGrounded;
if (failed) process.exitCode = 1;
