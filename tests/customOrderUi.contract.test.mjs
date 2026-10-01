import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app/pickingApp.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles/picking.css", import.meta.url), "utf8");

for (const tab of ["dashboard", "picking", "shortage", "inspection", "cs", "custom-orders", "completed"]) {
  assert.match(html, new RegExp(`data-app-tab=["']${tab}["']`), `tab must remain wired: ${tab}`);
}
assert.match(html, /id="custom-orders-panel"/);
assert.match(html, /id="custom-orders-status"/);
assert.match(html, /id="custom-orders-supplier"/);
assert.match(html, /id="custom-orders-date-criterion"/);
assert.match(html, /id="custom-orders-date-from"/);
assert.match(html, /id="custom-orders-date-to"/);
assert.match(html, /id="custom-orders-search"/);
assert.match(html, /data-custom-orders-view="workflow"/);
assert.match(html, /data-custom-orders-view="inbound"/);
assert.match(html, /id="custom-orders-inbound-source"/);
assert.match(html, /id="custom-orders-inbound-supplier"/);
assert.match(html, /id="custom-orders-inbound-date-from"/);
assert.match(html, /id="custom-orders-inbound-date-to"/);
assert.match(html, /id="custom-orders-inbound-search"/);

const tabStart = app.indexOf("function setActiveTab");
const tabEnd = app.indexOf("function scrollToTrayItem", tabStart);
const tabSource = app.slice(tabStart, tabEnd);
assert.match(tabSource, /state\.activeTab === "custom-orders"/);
assert.match(tabSource, /!state\.customOrders\.loaded/);
assert.match(tabSource, /loadCustomOrdersData\(\)/, "custom orders must lazy-load on first tab entry");

assert.match(app, /data-action="custom-order-toggle"/);
assert.match(app, /data-action="custom-order-memo-save"/);
assert.match(app, /canClearCustomRequired\(existing\)/);
assert.match(app, /주문제작 탭에서 취소 처리/);
assert.match(app, /internal_memo: memo \|\| null/);
assert.match(app, /data-custom-order-action="ordered-today"/);
assert.match(app, /data-custom-order-action="received-today"/);
assert.match(app, /data-custom-order-action="cancel"/);
assert.match(app, /custom_cancelled_at: new Date\(\)\.toISOString\(\)/);
assert.match(app, /inbound_expected_source: "manual"/);
assert.match(app, /loadCustomOrderWorkspace/);
assert.match(app, /buildInboundExpectedRows/);
assert.match(app, /data-inbound-expected-field="inbound_expected_date"/);
assert.match(app, /upsertOperationForCurrentOrderItem\(currentItem/);
assert.doesNotMatch(app, /from\("order_item_operations"\)\.delete/, "UI must never delete operation rows");
assert.match(css, /\.custom-orders-toolbar/);
assert.match(css, /\.custom-order-row/);
assert.match(css, /\.custom-orders-subtabs/);
assert.match(css, /\.inbound-expected-row/);
assert.match(css, /\.picking-custom-order/);

console.log("customOrderUi.contract.test: OK");
