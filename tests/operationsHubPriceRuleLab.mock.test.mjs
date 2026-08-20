import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('mockups/operations-hub/index.html', 'utf8');
const dataService = fs.readFileSync('mockups/operations-hub/data-service.js', 'utf8');
const lab = fs.readFileSync('mockups/operations-hub/price-rule-lab.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260820200000_price_rule_tags_qa_sandbox.sql', 'utf8');

test('price rule lab exposes atomic, composite and virtual QA UI', () => {
  assert.match(html, /id="price-rule-lab-open"/);
  assert.match(html, /id="price-rule-tag-form"/);
  assert.match(html, /id="price-rule-set-form"/);
  assert.match(html, /id="price-rule-qa-list"/);
  assert.match(html, /price-rule-lab\.js\?v=20260820-pricetag2/);
});

test('data service keeps tag saves behind dedicated RPCs', () => {
  assert.match(dataService, /async function loadPriceRuleQaCases\(/);
  assert.match(dataService, /save_operations_hub_price_rule_tag/);
  assert.match(dataService, /save_operations_hub_price_rule_set/);
  assert.match(lab, /state\.selectedTagIds/);
  assert.match(lab, /data-move="up"/);
});

test('QA records are isolated and include bundle plus ordered stacked cases', () => {
  assert.match(migration, /virtual_product_code text not null check \(virtual_product_code like 'QA-%'\)/);
  assert.match(migration, /operations_hub_price_rule_qa_live/);
  assert.match(migration, /QA_CASE_BUNDLE/);
  assert.match(migration, /QA_CASE_STACKED/);
  assert.match(migration, /'QA_SET_STACKED','QA_DISCOUNT_10',1/);
  assert.match(migration, /'QA_SET_STACKED','QA_FIXED_19900',2/);
  assert.match(migration, /'QA_SET_STACKED','QA_ADD_3000',3/);
  assert.doesNotMatch(migration, /insert into public\.operations_hub_change_queue/i);
});
