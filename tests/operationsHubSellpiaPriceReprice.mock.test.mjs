import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../supabase/migrations/20260825013259_reprice_on_sellpia_price_change.sql', import.meta.url),
  'utf8'
);
const data = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

assert.match(migration, /reprice_operations_hub_sellpia_price_change[\s\S]*?security invoker/i, 'Sellpia-triggered repricing must run with caller permissions');
assert.match(migration, /operations_hub_matrix_live[\s\S]*?calculate_operations_hub_price_rule_set/, 'same-transaction repricing must read the uncached Sellpia override');
assert.match(migration, /source_channel in \('smartstore', 'makeshop'\)/, 'only Smartstore and MakeShop assignments may trigger automatic repricing');
assert.match(migration, /v_assignment_count <> v_product_count[\s\S]*?v_assignment_rule_count <> 1/, 'partial or mixed product rules must block the whole Sellpia save');
assert.match(migration, /status in \('processing', 'exported'\)[\s\S]*?raise exception/, 'in-flight or exported price drafts must block automatic replacement');
assert.match(migration, /v_discount_signature_count <> 1/, 'product options with mixed discount terms must not be repriced partially');
assert.match(migration, /save_operations_hub_seller_discount_draft\([\s\S]*?'discount_anchor'/, 'automatic repricing must reuse the audited inverse-discount engine');
assert.match(migration, /if v_has_price_change then[\s\S]*?reprice_operations_hub_sellpia_price_change\(p_sku, v_batch_id\)/, 'Sellpia price saves and seller drafts must share one transaction and batch');
assert.doesNotMatch(migration.slice(0, migration.indexOf('create or replace function public.apply_operations_hub_sellpia_changes')), /source_channel.*ably/i, 'the repricing helper must leave Ably untouched');

assert.match(data, /async function attachPriceRuleAssignments[\s\S]*?operations_hub_price_rule_assignments[\s\S]*?operations_hub_price_rule_sets[\s\S]*?__priceRuleAssignments/, 'matrix rows must include active rule names and colors');
assert.match(data, /saveSellpiaChanges[\s\S]*?change_batch_id[\s\S]*?repricedRows[\s\S]*?repriceRefreshError/, 'a saved price batch must refresh the generated drafts');
assert.match(data, /RPC above has already committed[\s\S]*?repriceRefreshError/, 'post-commit metadata failures must not cause duplicate Sellpia submissions');

assert.match(app, /priceRuleSummary = prefix === 'ably' \? ''[\s\S]*?fx \$\{escapeHtml\(priceRuleName \|\| '규칙 없음'\)\}[\s\S]*?→ 최종/, 'Smartstore and MakeShop base cells must show rule, discount, and final price while Ably stays unchanged');
assert.match(app, /sellerBaseMergeSignature[\s\S]*?assignment\?\.price_rule_set_id[\s\S]*?assignment\?\.set_name/, 'base cells with different price rules must not merge');
assert.match(app, /applySavedSellpiaChanges\(savedChanges, result = \{\}\)[\s\S]*?repricedRows[\s\S]*?renderLiveMatrixRows/, 'generated seller drafts must repaint the current page immediately');
assert.match(app, /가격규칙 자동 재계산[\s\S]*?적용 가격규칙 없음, 판매처 가격 유지/, 'save feedback must distinguish automatic repricing from untagged price preservation');
assert.doesNotMatch(app, /판매처별 가격 규칙에서 최종가를 적용해주세요/, 'the obsolete manual-apply instruction must be removed');
assert.match(css, /price-rule-summary[\s\S]*?price-rule-badge\.assigned[\s\S]*?price-rule-final/, 'price-rule metadata must have a compact readable sale-cell layout');

console.log('Operations hub Sellpia-triggered price repricing contract: passed');
