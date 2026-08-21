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
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const dataService = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');

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
assert.match(dataService, /saveSellerProductDiscountDrafts[\s\S]*?operations_hub_matrix_cached[\s\S]*?saveSellerDiscountDraft/, 'product-level discounts must stage every connected option, not only the visible SKU');
assert.match(app, /renderNativeDiscountEditor[\s\S]*?readDrawerDiscountTerms[\s\S]*?saveSellerProductDiscountDrafts/, 'the drawer must expose native fields and persist product-level edits');
assert.match(exportAdapter, /patchSmartstoreDiscounts[\s\S]*?'basic','BF','BG'[\s\S]*?'mobile','BH','BI'[\s\S]*?target_discount_terms/, 'Smartstore export must patch its original discount value and unit columns');

console.log('Operations hub seller discount pricing V2 contract: passed');
