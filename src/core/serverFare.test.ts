import test from "node:test";
import assert from "node:assert/strict";
import { calculateServerFare } from "./serverFare";

test("server fare is deterministic from live distance", () => {
  assert.deepEqual(calculateServerFare("knight", 1), {
    serviceId: "knight", distanceKm: 1, baseFareBaht: 15, serviceSurchargeBaht: 0, fareBaht: 20
  });
  assert.equal(calculateServerFare("express", 3.25).fareBaht, 45);
});

test("server fare rejects invalid distance", () => {
  assert.throws(() => calculateServerFare("knight", -1), /INVALID_DISTANCE/);
  assert.throws(() => calculateServerFare("knight", 501), /INVALID_DISTANCE/);
});
