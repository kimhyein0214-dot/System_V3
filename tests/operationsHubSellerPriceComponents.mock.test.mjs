import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const data = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const parser = fs.readFileSync(new URL('../mockups/operations-hub/seller-source-parsers.js', import.meta.url), 'utf8');
const csv = fs.readFileSync(new URL('../mockups/operations-hub/matrix-csv-export.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../supabase/migrations/20260821014626_operations_hub_seller_price_components.sql', import.meta.url), 'utf8');
const exporter = fs.readFileSync(new URL('../supabase/migrations/20260821020657_operations_hub_export_price_components.sql', import.meta.url), 'utf8');

assert.equal((html.match(/<th>판매가<\/th><th>옵션가<\/th><th>최종판가<\/th>/g) || []).length, 3, 'every seller group must expose base, option, and final prices');
assert.match(app, /priceComponent\.source_base_price[\s\S]*?priceComponent\.source_option_price[\s\S]*?priceComponent\.source_final_price/, 'matrix rows must read all three source components');
assert.match(app, /data-price-component="option"[\s\S]*?data-price-component="final"/, 'matrix option and final prices must be directly editable');
assert.match(app, /data-drawer-price-component="option"[\s\S]*?data-drawer-price-component="final"[\s\S]*?판매가 \$\{formatNullableNumber\(basePriceValue\)\} \+ 옵션가/, 'drawer must preview the inverse price equation');
assert.match(app, /saveSellerPriceDraft\([\s\S]*?targetFinalPrice[\s\S]*?optionPrice/, 'frontend price writes must be atomic');
assert.doesNotMatch(app.slice(app.indexOf('async function flushPendingSellpiaChanges'), app.indexOf('function editableMatrixGrid')), /refreshLiveData\(/, 'Sellpia autosave must not reload the full matrix');
assert.match(data, /load_operations_hub_seller_price_components[\s\S]*?save_operations_hub_seller_price_draft/, 'data service must expose component load and save RPCs');
assert.match(parser, /base_price:selectedBasePrice[\s\S]*?option_price:selectedOptionPrice[\s\S]*?final_price:finalPrice/, 'seller parsers must persist source price components');
assert.match(csv, /판매가[\s\S]*?옵션가[\s\S]*?최종판가/, 'matrix CSV must preserve the three user-visible price columns');
assert.match(schema, /v_target_base := p_target_final_price - v_target_option[\s\S]*?price_base_after[\s\S]*?price_option_after[\s\S]*?price_final_after/, 'database drafts must derive and persist every component');
assert.match(exporter, /target_base_price[\s\S]*?target_option_price[\s\S]*?target_final_price[\s\S]*?같은 상품의 옵션별 목표 판매가/, 'export preparation must include the three targets and shared-base validation');

console.log('Operations hub seller price component workflow: passed');
