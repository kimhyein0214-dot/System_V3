import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [tool, adapter, app] = await Promise.all([
  read("tools/sellpia_order_datetime_enricher.html"),
  read("src/adapters/currentDbPickingAdapter.mjs"),
  read("src/app/pickingApp.mjs"),
]);

assert.match(tool, /c_ord_date/);
assert.match(tool, /sellpia_ordered_at/);
assert.match(tool, /await patch\("orders", target\)/);
assert.match(tool, /await patch\("order_items", target\)/);
assert.match(tool, /method: "PATCH"/);
assert.match(tool, /return=minimal,count=exact/);
assert.match(tool, /해당 주문번호를 찾지 못했습니다/);
assert.doesNotMatch(tool, /method:\s*"DELETE"/);
assert.doesNotMatch(tool, /upsert/i);

assert.match(adapter, /orderDateTime:\s*firstText\(order\.sellpia_ordered_at\)/);
assert.match(app, /function invoiceOrderDateTimeLabel/);
assert.match(app, /workflow-row-order-date/);
assert.match(app, /주문 \$\{escapeHtml\(selectedOrderDateTime\)\}/);

console.log("sellpiaOrderDatetimeEnricher.mock.test: OK");
