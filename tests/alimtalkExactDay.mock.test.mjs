import assert from "node:assert/strict";
import { alimtalkElapsedLabel, alimtalkSendLogCode, alimtalkSendNaturalKey, appendAlimtalkSendLog, resolveAlimtalkTemplate } from "../src/domain/alimtalk.mjs";

const normal = (elapsedDays, selectedTemplate = "") => resolveAlimtalkTemplate({ elapsedDays, selectedTemplate });
const gold = (elapsedDays) => resolveAlimtalkTemplate({ elapsedDays, isGold: true });

assert.equal(normal(1).templateKey, "d1");
assert.equal(normal(0).templateKey, "d0");
assert.equal(normal(3, "d3_pf").templateKey, "d3_pf");
assert.equal(resolveAlimtalkTemplate({ elapsedDays: 3, isMakeshop: true }).templateKey, "d3_ms");
assert.equal(normal(5).templateKey, "");
assert.deepEqual(normal(5).allowedTemplateKeys, ["d5_hi", "d5_lo"]);
assert.equal(normal(5).selectionRequired, true);
assert.equal(normal(5).label, "5일차 · 템플릿 선택 필요");
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

assert.equal(alimtalkSendLogCode("d0"), "0");
assert.equal(alimtalkSendLogCode("d1"), "1");
assert.equal(alimtalkSendLogCode("14k_1"), "1_14");
assert.equal(alimtalkSendLogCode("d3_pf"), "3");
assert.equal(alimtalkSendLogCode("d3_ms"), "3ㅁ");
assert.equal(alimtalkSendLogCode("d5_hi"), "5ㅂ");
assert.equal(alimtalkSendLogCode("d5_lo"), "5ㅊ");
assert.equal(alimtalkSendLogCode("14k_5"), "5_14k");
assert.equal(alimtalkSendLogCode("d10"), "10");
assert.equal(alimtalkSendLogCode("manual"), "ㅂㅂ");
assert.equal(appendAlimtalkSendLog("1\n3", "5ㅂ"), "1,3,5ㅂ");
assert.equal(appendAlimtalkSendLog("1, 3, 5ㅂ", "10"), "1,3,5ㅂ,10");

console.log("Alimtalk exact-day rules: passed");
