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
assert.match(html, /id="drawer-attributes-content"/, "attribute and tag editing must own a live render target");
assert.match(data, /function loadProductHistory[\s\S]*?operations_hub_change_queue[\s\S]*?operations_hub_link_history[\s\S]*?operations_hub_change_events/, "drawer history must combine queue, link, and event audit data");
assert.match(data, /loadProductHistory,[\s\S]*?saveSellerValueDraft/, "the public data adapter must expose history and seller value drafts together");
assert.match(app, /function setDrawerTab[\s\S]*?loadDrawerHistory[\s\S]*?function openProductDrawer/, "drawer tabs must switch panels and lazily load SKU history");
assert.match(app, /function renderDrawerInventoryChannel[\s\S]*?data-drawer-value="sellpia_current_stock"[\s\S]*?data-drawer-value="sellpia_sale_price"/, "drawer inventory must expose stock and price draft inputs per seller");
assert.match(app, /function renderDrawerPricePolicy[\s\S]*?15_스마트스토어_가격정책/, "drawer prices must reference the verified Smartstore formula source");
assert.match(app, /function renderDrawerPricePolicy[\s\S]*?현재 확인식[\s\S]*?수식 설정·정책 편집/, "drawer prices must expose the live comparison and formula settings");
assert.match(app, /function renderDrawerAttributesPanel[\s\S]*?상품 공통 태그[\s\S]*?현재 SKU 예외 태그[\s\S]*?drawer-save-attributes/, "drawer attributes must separate product-level values from SKU exceptions");
assert.match(data, /operations_hub_product_profiles[\s\S]*?ensure_operations_hub_product_profile[\s\S]*?save_operations_hub_product_profile/, "product profiles must load and save through the durable Supabase profile API");
assert.match(app, /drawer-value-save[\s\S]*?saveSellerValueDraft\(\{sku, source, fieldKey:change\.fieldKey, after:change\.after, batchId\}\)/, "drawer stock and price writes must reuse the durable draft RPC with one batch ID");
assert.match(app, /function renderDrawerHistory[\s\S]*?CHANNEL_LABELS[\s\S]*?drawerStatusLabel/, "drawer history must render source, field, status, and time context");
assert.match(css, /\.drawer-tab-panel\[hidden\]/, "inactive drawer panels must be hidden");
assert.match(css, /\.drawer-inventory-channel\.drawer-dirty/, "edited inventory sections must expose a dirty state");
assert.match(css, /\.drawer-history-item/, "history entries must have a dedicated visual treatment");
assert.match(css, /\.drawer-price-policy[\s\S]*?\.attribute-tag-choice/, "price formulas and tag choices must have dedicated compact drawer styles");

console.log("Operations hub live product drawer contract: passed");
