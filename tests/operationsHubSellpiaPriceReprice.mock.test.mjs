import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../supabase/migrations/20260825060000_system_owned_price_stock_and_pricing_reset.sql', import.meta.url),
  'utf8'
);
const data = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const csv = fs.readFileSync(new URL('../mockups/operations-hub/matrix-csv-export.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

assert.match(migration, /create table if not exists public\.operations_hub_sku_operational_master[\s\S]*?base_price numeric[\s\S]*?stock_quantity integer/, 'system base price and stock must live in a dedicated canonical table');
assert.match(migration, /operations_hub_sku_operational_events[\s\S]*?system_base_price[\s\S]*?system_stock/, 'canonical master changes must retain an audit event stream');
assert.match(migration, /operations_hub_matrix_system_live[\s\S]*?sellpia_source_sale_price[\s\S]*?sellpia_source_stock[\s\S]*?system_base_price[\s\S]*?system_stock/, 'the matrix overlay must expose immutable source comparisons beside system values');
assert.match(migration, /save_operations_hub_sku_operational_value[\s\S]*?on conflict \(sellpia_sku_code\) do update[\s\S]*?operations_hub_sku_operational_events/, 'system edits must save immediately and atomically append audit history');
assert.match(migration, /Source uploads[\s\S]*?never write this table[\s\S]*?operations_hub_sellpia_overrides/, 'only explicit system saves may update the compatibility mirror used by existing seller exporters');
assert.match(migration, /operations_hub_pricing_reset_archives[\s\S]*?price_rule_assignment[\s\S]*?update public\.operations_hub_price_rule_assignments[\s\S]*?is_active = false/, 'the inferred pricing catalog must be archived before being retired');
assert.match(migration, /enforce_operations_hub_price_assignment_system_base[\s\S]*?base_price is not null[\s\S]*?시스템 기준가격을 먼저 저장/, 'a price combination cannot be assigned before its system base exists');

assert.match(data, /operations_hub_matrix_system_live/, 'interactive and export matrix reads must use the canonical system overlay');
assert.match(data, /saveSellpiaChanges[\s\S]*?system_base_price','system_stock[\s\S]*?save_operations_hub_sku_operational_value/, 'system stock and price edits must route to the immediate canonical-save RPC');
assert.match(data, /previewPriceRuleSet[\s\S]*?시스템 기준가격을 먼저 저장해주세요/, 'price calculations must reject missing canonical base prices instead of treating them as zero');

assert.match(app, /systemOperationalCell\(product, 'system_stock'[\s\S]*?systemOperationalCell\(product, 'system_base_price'/, 'the matrix must show editable system stock and price cells');
assert.match(app, /원본 \$\{hasSource \? formatNullableNumber\(sourceValue\)/, 'each canonical value must keep its source comparison visible in the same cell');
assert.match(app, /basePrice:product\.system_base_price/, 'price combinations must calculate from the canonical system base price');
assert.doesNotMatch(app, /basePrice:product\??\.sellpia_sale_price/, 'price combinations must never calculate from the uploaded Sellpia price snapshot');
assert.match(app, /계산 태그[\s\S]*?가격 조합/, 'user-facing pricing terminology must separate atomic calculation tags from ordered combinations');

assert.match(html, /시스템 기준 · 셀피아 원본 비교[\s\S]*?상품코드 \/ 상품명[\s\S]*?옵션코드 \/ 옵션명[\s\S]*?기준재고[\s\S]*?기준가격/, 'the matrix header must expose combined identities and canonical values');
assert.match(csv, /시스템 기준재고[\s\S]*?셀피아 원본재고[\s\S]*?시스템 기준가격[\s\S]*?셀피아 원본 판매가/, 'CSV output must preserve both canonical and source comparison columns');
assert.match(css, /sellpia-product-col[\s\S]*?sellpia-option-col[\s\S]*?system-master-cell/, 'combined identities and canonical values must have dedicated frozen-cell styling');

console.log('Operations hub system-owned price and stock contract: passed');
