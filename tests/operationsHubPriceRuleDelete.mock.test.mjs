import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync('supabase/migrations/20260821041000_price_rule_soft_delete.sql', 'utf8');

test('price rule deletion is recoverable and blocks live references', () => {
  assert.match(migration, /set is_active = false/);
  assert.match(migration, /operations_hub_price_rule_set_items/);
  assert.match(migration, /operations_hub_price_rule_assignments/);
  assert.match(migration, /operations_hub_price_rule_qa_cases/);
  assert.doesNotMatch(migration, /delete from public\.operations_hub_price_rule_(tags|sets)/);
});
