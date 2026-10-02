import assert from "node:assert/strict";
import test from "node:test";
import {
  dimensionsInMetres,
  dimensionsMatch,
  previewCameraRadius,
} from "../lib/viewer-geometry.mjs";

test("catalogue width/height/depth map to glTF x/y/z in metres", () => {
  assert.deepEqual(dimensionsInMetres({ width: 240, height: 75, depth: 97 }), {
    x: 2.4,
    y: 0.75,
    z: 0.97,
  });
});

test("dimension verification tolerates rounding, not wrong scale or axis order", () => {
  const target = { x: 2.4, y: 0.75, z: 0.97 };
  assert.equal(dimensionsMatch(target, target), true);
  assert.equal(dimensionsMatch({ x: 2.41, y: 0.754, z: 0.974 }, target), true);
  assert.equal(dimensionsMatch({ ...target, x: 2.42 }, target), false);
  assert.equal(dimensionsMatch({ x: 240, y: 75, z: 97 }, target), false);
  assert.equal(dimensionsMatch({ x: 2.4, y: 0.97, z: 0.75 }, target), false);
});

test("invalid geometry never passes the AR size gate", () => {
  const valid = { x: 1, y: 1, z: 1 };
  assert.equal(dimensionsMatch(undefined, valid), false);
  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    for (const axis of ["x", "y", "z"]) {
      assert.equal(dimensionsMatch({ ...valid, [axis]: invalid }, valid), false);
      assert.equal(dimensionsMatch(valid, { ...valid, [axis]: invalid }), false);
    }
  }
});

test("wide furniture gets extra mobile framing without changing its dimensions", () => {
  const table = Object.freeze({ width: 240, height: 75, depth: 97 });
  const chair = Object.freeze({ width: 62, height: 90, depth: 86 });
  assert.ok(previewCameraRadius(table, 0.6) > previewCameraRadius(chair, 0.6));
  assert.ok(previewCameraRadius(table, 0.6) > previewCameraRadius(table, 1.8));
  for (const aspect of [0, 0.1, 0.6, 1, 1.8, 10]) {
    const radius = previewCameraRadius(table, aspect);
    assert.ok(Number.isInteger(radius) && radius >= 120 && radius <= 260);
  }
  assert.deepEqual(table, { width: 240, height: 75, depth: 97 });
});
