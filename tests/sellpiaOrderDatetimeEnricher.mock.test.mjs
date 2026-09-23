import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [scraper, adapter, app] = await Promise.all([
  read("tools/sellpia_scraper.html"),
  read("src/adapters/currentDbPickingAdapter.mjs"),
  read("src/app/pickingApp.mjs"),
]);

assert.match(scraper, /id="sp-order-datetime"/);
assert.match(scraper, /주문일시만 보강/);
assert.match(scraper, /0923 주문일 보강 패치/);
assert.match(scraper, /function enrichOrderDateTimes/);
assert.doesNotMatch(scraper, /loadCurrentSellpiaRowsForOrderDateTime/);
assert.match(scraper, /rows=await loadCurrentSellpiaRows\(targetDate,session,invFilter\)/);
assert.match(scraper, /c_ord_date/);
assert.match(scraper, /sellpia_ordered_at/);
assert.match(scraper, /await dbPatch\('orders'/);
assert.match(scraper, /await dbPatch\('order_items'/);
assert.match(scraper, /주문\/상품 수집·삭제, 배송보류, 피킹\/미송 상태/);
assert.match(scraper, /document\.getElementById\("sp-order-datetime"\)\.onclick/);

const scripts = [...scraper.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const elements = new Map();
const getElementById = (id) => {
  if (!elements.has(id)) elements.set(id, { href: "", textContent: "" });
  return elements.get(id);
};
const context = vm.createContext({
  console: { error() {}, warn() {}, log() {} },
  document: { getElementById },
});
scripts.forEach((script) => vm.runInContext(script, context));
const generated = decodeURIComponent(getElementById("bookmarklet-link").href.replace(/^javascript:/, ""));
new Function(generated);
assert.match(generated, /id="sp-order-datetime"/);
assert.equal([...generated.matchAll(/function enrichOrderDateTimes\(/g)].length, 1);
assert.doesNotMatch(generated, /loadCurrentSellpiaRowsForOrderDateTime/);
assert.match(generated, /rows=await loadCurrentSellpiaRows\(targetDate,session,invFilter\)/);
assert.match(generated, /조회 접수일: '\+targetDate/);
assert.match(generated, /setSellpiaDateTypeToReceipt\(\)/);
assert.match(generated, /btn\.click\(\);await sleep\(1500\)/);
assert.match(generated, /currentRows\.every\(function\(row\)/);
assert.match(generated, /assertSellpiaReceiptDateMatches\(rows,targetDate\)/);
assert.match(generated, /document\.getElementById\("sp-order-datetime"\)\.onclick/);
assert.match(generated, /0923 주문일 보강 패치/);

assert.match(adapter, /orderDateTime:\s*firstText\(order\.sellpia_ordered_at\)/);
assert.match(app, /function invoiceOrderDateTimeLabel/);
assert.match(app, /workflow-row-order-date/);
assert.match(app, /주문 \$\{escapeHtml\(selectedOrderDateTime\)\}/);

console.log("sellpiaOrderDatetimeEnricher.mock.test: OK");
