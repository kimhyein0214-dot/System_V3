import assert from "node:assert/strict";
import { alimtalkElapsedLabel, alimtalkSendLogCode, alimtalkSendNaturalKey, appendAlimtalkSendLog, hasTomorrowShippingManagementMemo, resolveAlimtalkTemplate } from "../src/domain/alimtalk.mjs";

const normal = (elapsedDays, selectedTemplate = "") => resolveAlimtalkTemplate({ elapsedDays, selectedTemplate });
const gold = (elapsedDays) => resolveAlimtalkTemplate({ elapsedDays, isGold: true });

assert.equal(normal(0).templateKey, "d1");
assert.equal(resolveAlimtalkTemplate({ elapsedDays: 0, isTomorrowShipping: true }).templateKey, "d0");
assert.equal(resolveAlimtalkTemplate({ elapsedDays: 7, isTomorrowShipping: true }).templateKey, "d0");
assert.equal(resolveAlimtalkTemplate({ elapsedDays: 0, isReady: true }).templateKey, "d1");
assert.equal(hasTomorrowShippingManagementMemo("내일 출고"), false);
assert.equal(hasTomorrowShippingManagementMemo(".."), true);
assert.equal(hasTomorrowShippingManagementMemo("  ..  "), true);
assert.equal(hasTomorrowShippingManagementMemo("  !!  "), true);
assert.equal(hasTomorrowShippingManagementMemo("메모 .."), false);
assert.equal(hasTomorrowShippingManagementMemo("!! 확인"), false);
assert.equal(hasTomorrowShippingManagementMemo("!"), false);
assert.equal(hasTomorrowShippingManagementMemo("   "), false);
assert.equal(hasTomorrowShippingManagementMemo(null), false);
assert.equal(normal(2).templateKey, "d3_pf");
assert.equal(resolveAlimtalkTemplate({ elapsedDays: 2, isMakeshop: true }).templateKey, "d3_ms");
assert.equal(normal(4).templateKey, "");
assert.deepEqual(normal(4).allowedTemplateKeys, ["d5_hi", "d5_lo"]);
assert.equal(normal(4).selectionRequired, true);
assert.equal(normal(4).label, "5일차 · 템플릿 선택 필요");
assert.equal(normal(4, "d5_hi").templateKey, "d5_hi");
assert.equal(normal(4, "d5_lo").templateKey, "d5_lo");
assert.equal(normal(4, "d1").templateKey, "d1");
assert.equal(normal(9).templateKey, "d10");

for (const days of [1, 3, 5, 6, 7, 8, 10, 11, 24]) {
  assert.equal(normal(days).templateKey, "", `${days}일차 must not inherit another day template`);
}
assert.equal(normal(10).label, "11일차 이후 · 템플릿 없음");
assert.equal(alimtalkElapsedLabel(11), "11일차 이후");
assert.equal(gold(0).templateKey, "14k_1");
assert.equal(gold(4).templateKey, "14k_5");
assert.equal(gold(3).templateKey, "");
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
