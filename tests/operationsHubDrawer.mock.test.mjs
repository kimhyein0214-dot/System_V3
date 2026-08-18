import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../mockups/operations-hub/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../mockups/operations-hub/app.js", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../mockups/operations-hub/data-service.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../mockups/operations-hub/style.css", import.meta.url), "utf8");

for (const tab of ["connections", "inventory", "attributes", "history"]) {
  assert.match(html, new RegExp(`data-drawer-tab="${tab}"[\\s\\S]*?data-drawer-panel="${tab}"`), `drawer tab ${tab} must own a real panel`);
}
assert.match(html, /id="drawer-inventory-list"[\s\S]*?id="drawer-history-list"/, "inventory and history panels must have live render targets");
assert.match(data, /function loadProductHistory[\s\S]*?operations_hub_change_queue[\s\S]*?operations_hub_link_history[\s\S]*?operations_hub_change_events/, "drawer history must combine queue, link, and event audit data");
assert.match(data, /loadProductHistory,[\s\S]*?saveSellerValueDraft/, "the public data adapter must expose history and seller value drafts together");
assert.match(app, /function setDrawerTab[\s\S]*?loadDrawerHistory[\s\S]*?function openProductDrawer/, "drawer tabs must switch panels and lazily load SKU history");
assert.match(app, /function renderDrawerInventoryChannel[\s\S]*?data-drawer-value="sellpia_current_stock"[\s\S]*?data-drawer-value="sellpia_sale_price"/, "drawer inventory must expose stock and price draft inputs per seller");
assert.match(app, /drawer-value-save[\s\S]*?saveSellerValueDraft\(\{sku, source, fieldKey:change\.fieldKey, after:change\.after, batchId\}\)/, "drawer stock and price writes must reuse the durable draft RPC with one batch ID");
assert.match(app, /function renderDrawerHistory[\s\S]*?CHANNEL_LABELS[\s\S]*?drawerStatusLabel/, "drawer history must render source, field, status, and time context");
assert.match(css, /\.drawer-tab-panel\[hidden\]/, "inactive drawer panels must be hidden");
assert.match(css, /\.drawer-inventory-channel\.drawer-dirty/, "edited inventory sections must expose a dirty state");
assert.match(css, /\.drawer-history-item/, "history entries must have a dedicated visual treatment");

console.log("Operations hub live product drawer contract: passed");
