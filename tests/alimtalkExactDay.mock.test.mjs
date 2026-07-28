import assert from "node:assert/strict";
import { alimtalkElapsedLabel, alimtalkSendNaturalKey, resolveAlimtalkTemplate } from "../src/domain/alimtalk.mjs";

const normal = (elapsedDays, selectedTemplate = "") => resolveAlimtalkTemplate({ elapsedDays, selectedTemplate });
const gold = (elapsedDays) => resolveAlimtalkTemplate({ elapsedDays, isGold: true });

assert.equal(normal(1).templateKey, "d1");
assert.equal(normal(0).templateKey, "d0");
assert.equal(normal(3, "d3_pf").templateKey, "d3_pf");
assert.equal(resolveAlimtalkTemplate({ elapsedDays: 3, isMakeshop: true }).templateKey, "d3_ms");
assert.equal(normal(5).templateKey, "");
assert.deepEqual(normal(5).allowedTemplateKeys, ["d5_hi", "d5_lo"]);
assert.equal(normal(5, "d5_hi").templateKey, "d5_hi");
assert.equal(normal(5, "d5_lo").templateKey, "d5_lo");
assert.equal(normal(5, "d1").templateKey, "");
assert.equal(normal(10).templateKey, "d10");

for (const days of [2, 4, 6, 7, 8, 9, 11, 24]) {
  assert.equal(normal(days).templateKey, "", `${days}일차 must not inherit another day template`);
}
assert.equal(normal(11).label, "11일차 이후 · 템플릿 없음");
assert.equal(alimtalkElapsedLabel(11), "11일차 이후");
assert.equal(gold(1).templateKey, "14k_1");
assert.equal(gold(5).templateKey, "14k_5");
assert.equal(gold(3).templateKey, "");
assert.equal(resolveAlimtalkTemplate({ isReady: true }).templateKey, "d0");
assert.equal(alimtalkSendNaturalKey("order-1", "d1"), alimtalkSendNaturalKey(" order-1 ", "d1"));
assert.notEqual(alimtalkSendNaturalKey("order-1", "d1"), alimtalkSendNaturalKey("order-1", "d3_pf"));

console.log("Alimtalk exact-day rules: passed");
