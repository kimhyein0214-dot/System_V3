import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../supabase/migrations/20260821110000_operations_hub_seller_discount_terms_v2.sql', import.meta.url),
  'utf8'
);
const exportBridge = fs.readFileSync(
  new URL('../supabase/migrations/20260821113000_operations_hub_export_discount_bridge_v2.sql', import.meta.url),
  'utf8'
);
const exportAdapter = fs.readFileSync(
  new URL('../mockups/operations-hub/seller-export-adapter.js', import.meta.url),
  'utf8'
);
const editableDiscounts = fs.readFileSync(
  new URL('../supabase/migrations/20260821190000_operations_hub_editable_seller_discounts.sql', import.meta.url),
  'utf8'
);
const productDiscountEditor = fs.readFileSync(
  new URL('../supabase/migrations/20260824033753_operations_hub_product_discount_editor.sql', import.meta.url),
  'utf8'
);
const discountAnchor = fs.readFileSync(
  new URL('../supabase/migrations/20260824132227_preserve_target_price_when_editing_discounts.sql', import.meta.url),
  'utf8'
);
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const dataService = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');

assert.match(migration, /discount_terms jsonb[\s\S]*?discounted_base_price numeric[\s\S]*?source_discount_fingerprint/, 'source discount terms and derived prices must be durable');
assert.match(migration, /price_calculation_version[\s\S]*?pricing_input_mode[\s\S]*?legacy_final/, 'existing V1 drafts must be distinguishable from V2 drafts');
assert.match(migration, /calculate_operations_hub_discounted_base[\s\S]*?is_baseline[\s\S]*?percent[\s\S]*?amount[\s\S]*?rounding_mode/, 'native discount calculation must ignore conditional terms and retain rounding');
assert.match(migration, /v_price_selected[\s\S]*?v_discount_selected[\s\S]*?previous_row\.discount_terms/, 'partial uploads must preserve unselected price and discount fields independently');
assert.match(migration, /save_operations_hub_seller_price_draft_v2[\s\S]*?p_input_mode[\s\S]*?if p_input_mode = 'option'[\s\S]*?v_target_final := v_target_discounted \+ v_target_option[\s\S]*?v_target_option := v_target_final - v_target_discounted/, 'V2 must support option-driven and final-driven input modes');
assert.match(migration, /price_discounted_base_before[\s\S]*?price_discounted_base_after[\s\S]*?source_snapshot_id[\s\S]*?source_discount_fingerprint/, 'drafts must be auditable against the exact source discount snapshot');
assert.doesNotMatch(migration, /drop function if exists public\.save_operations_hub_seller_price_draft\(/, 'V1 save RPC must remain available while old clients and drafts exist');
assert.match(exportBridge, /target_discounted_base_price[\s\S]*?price_calculation_version[\s\S]*?pricing_input_mode/, 'existing export preparation must be enriched with V2 price components');
assert.match(exportBridge, /source_discount_fingerprint is distinct from[\s\S]*?price_base_before is distinct from[\s\S]*?price_option_before is distinct from[\s\S]*?price_final_before is distinct from/, 'V2 export must block source prices or discounts that changed after review');
assert.match(exportAdapter, /smartstoreDiscountedBase[\s\S]*?`BF\$\{row\}`[\s\S]*?`BG\$\{row\}`/, 'Smartstore export verification must use its native discount value and unit');
assert.match(exportAdapter, /makeshopDiscountedBase[\s\S]*?`DD\$\{row\}`[\s\S]*?roundingMode/, 'MakeShop export verification must use its saved discount expression and rounding mode');
assert.match(exportAdapter, /row\[4\]=targets\.base;[\s\S]*?row\[5\]=targets\.discountedBase;[\s\S]*?row\[6\]=targets\.finalPrice;/, 'Ably export must preserve base, discounted, and customer-final price columns separately');
assert.match(editableDiscounts, /price_discount_terms_before jsonb[\s\S]*?price_discount_terms_after jsonb[\s\S]*?save_operations_hub_seller_discount_draft/, 'edited discount terms must remain durable in the reviewed price draft');
assert.match(editableDiscounts, /target_discount_terms[\s\S]*?source_discount_fingerprint is distinct from/, 'export items must carry reviewed discount terms while retaining stale-source protection');
assert.match(productDiscountEditor, /save_operations_hub_seller_product_discount_draft[\s\S]*?security invoker[\s\S]*?for v_item in[\s\S]*?save_operations_hub_seller_discount_draft/, 'one product RPC must save every connected option in one invoker transaction');
assert.doesNotMatch(productDiscountEditor, /security definer/i, 'product discount editing must not bypass the caller RLS context');
assert.match(productDiscountEditor, /smartstore[\s\S]*?term ->> 'unit' <> 'amount'/, 'Smartstore basic discounts must be validated as fixed won amounts');
for (const code of ['NONE','M10','M15','M20']) assert.match(productDiscountEditor, new RegExp(`'${code}'`), `MakeShop code ${code} must be validated server-side`);
assert.match(productDiscountEditor, /affected_sku_count[\s\S]*?v_batch_id uuid :=[\s\S]*?v_batch_id/, 'all option drafts must share one batch and report the affected product size');
assert.match(discountAnchor, /gross_operations_hub_discount_base[\s\S]*?calculate_operations_hub_discounted_base[\s\S]*?v_result <> v_target/, 'discount editing must gross up a whole-won base price to the anchored discounted price');
assert.match(discountAnchor, /discount_anchor[\s\S]*?v_existing\.price_final_after[\s\S]*?v_source_final[\s\S]*?v_target_final - v_target_option/, 'an active formula or manual draft must take priority over the source final price');
assert.match(discountAnchor, /v_valid_count = 0[\s\S]*?원본에 상품코드[\s\S]*?v_valid_count <> v_count/, 'product discount saves must preflight every linked option against the latest seller source');
assert.match(discountAnchor, /save_operations_hub_seller_product_discount_draft_v2[\s\S]*?p_anchor_sku[\s\S]*?v_anchor_discounted[\s\S]*?v_item\.target_final_price - v_anchor_discounted/, 'one clicked option must anchor a shared product base while each option target final price is preserved');
assert.match(discountAnchor, /save_operations_hub_seller_discount_draft\([\s\S]*?'discount_anchor'/, 'Smartstore and MakeShop product edits must use target-price anchoring');
assert.match(dataService, /normalizedSource !== 'ably'[\s\S]*?save_operations_hub_seller_product_discount_draft_v2[\s\S]*?p_anchor_sku/, 'Smartstore and MakeShop product discounts must use the anchored atomic RPC');
assert.match(dataService, /normalizedSource !== 'ably'[\s\S]*?operations_hub_matrix_cached[\s\S]*?saveSellerDiscountDraft/, 'Ably must retain the existing per-SKU fanout path');
assert.match(html, /id="discount-editor-modal"[\s\S]*?id="discount-editor-amount"[\s\S]*?<b>원<\/b>[\s\S]*?value="M10"[\s\S]*?value="M15"[\s\S]*?value="M20"/, 'the matrix editor must expose Smartstore won input and MakeShop code choices');
assert.match(html, /discount-price-math\.js[\s\S]*?data-service\.js[\s\S]*?app\.js/, 'discount inverse pricing must load before the application');
assert.match(html, /discount-editor-anchor-source[\s\S]*?discount-editor-anchor-final-price[\s\S]*?자동 보정 판매가/, 'the editor must explain which target price is preserved and preview the grossed base price');
assert.match(app, /prefix === 'ably' \? discountContent[\s\S]*?data-discount-edit/, 'only Smartstore and MakeShop discount cells may expose the direct edit button');
assert.match(app, /matrixBody\.addEventListener\('mousedown'[\s\S]*?\[data-discount-edit\]/, 'discount edit buttons must not be swallowed by matrix drag selection');
assert.match(app, /saveDiscountEditor[\s\S]*?saveSellerProductDiscountDrafts[\s\S]*?for \(const item of saved\.items\) applyLocalSellerPriceDraft/, 'the direct editor must persist and repaint every option result');
assert.match(app, /source === 'smartstore' \|\| source === 'makeshop'[\s\S]*?매트릭스 할인정보 열/, 'the drawer must route scoped discount changes to the matrix column');
assert.match(app, /const priceDraft = product\?\.__sellerDrafts[\s\S]*?const savedDiscountTerms = priceDraft\?\.price_discount_terms_after/, 'the drawer must initialize its active price draft before reading editable discounts');
assert.match(exportAdapter, /patchSmartstoreDiscounts[\s\S]*?'basic','BF','BG'[\s\S]*?'mobile','BH','BI'[\s\S]*?target_discount_terms/, 'Smartstore export must patch its original discount value and unit columns');
assert.match(exportAdapter, /canonicalDiscountTerms[\s\S]*?discountTermsFingerprint/, 'discount comparison must ignore term and object-key ordering');
assert.match(exportAdapter, /'할인코드'[\s\S]*?discountRuleCode/, 'the export audit CSV must include the MakeShop discount code');

console.log('Operations hub seller discount pricing V2 contract: passed');
