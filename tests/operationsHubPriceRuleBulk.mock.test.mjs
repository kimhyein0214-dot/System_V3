import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('mockups/operations-hub/index.html', 'utf8');
const app = fs.readFileSync('mockups/operations-hub/app.js', 'utf8');
const dataService = fs.readFileSync('mockups/operations-hub/data-service.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260821040000_bulk_price_rule_assignment.sql', 'utf8');

test('matrix exposes a scoped seller-channel price rule assignment flow', () => {
  assert.match(html, /id="price-rule-bulk-modal"/);
  assert.match(html, /value="selected"/);
  assert.match(html, /value="code_list"/);
  assert.match(html, /value="filtered"/);
  assert.match(html, /id="price-rule-bulk-set"/);
  assert.match(html, /id="price-rule-bulk-composer-name"[\s\S]*?id="price-rule-bulk-composer-add"[\s\S]*?id="price-rule-bulk-composer-steps"[\s\S]*?id="price-rule-bulk-composer-save"/);
  assert.match(app, /savePriceRuleAssignmentsBulk/);
  assert.match(app, /priceRuleBulkState\.composerTagIds[\s\S]*?savePriceRuleSet\([\s\S]*?fillPriceRuleBulkSetSelect\(savedSet\.price_rule_set_id\)/);
  assert.match(app, /selectedSourceSkus[\s\S]*?resolvePriceRuleBulkTargetGroups[\s\S]*?sources:\[source\]/, 'selected cells must preserve exact seller-channel targets');
  assert.match(dataService, /save_operations_hub_price_rule_assignments_bulk/);
});

test('bulk assignment RPC persists rules without creating seller change drafts', () => {
  assert.match(migration, /save_operations_hub_price_rule_assignments_bulk/);
  assert.match(migration, /operations_hub_price_rule_assignments/);
  assert.match(migration, /p_rule_set_id/);
  assert.match(migration, /p_sources text\[\]/);
  assert.doesNotMatch(migration, /operations_hub_change_queue/);
  assert.match(migration, /grant execute .* to anon, authenticated/);
});
