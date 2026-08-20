import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('inventory survey page exposes live separated quantities', () => {
  const html = read('mockups/operations-hub/index.html');
  assert.match(html, /id="inventory-metric-picked"/);
  assert.match(html, /id="inventory-metric-drawer"/);
  assert.match(html, /조사수량 \+ 오늘 피킹완료 \+ 현재 미송서랍 완료수량/);
  assert.match(html, /inventory\.css\?v=20260820-skucache1/);
});

test('survey upload parser persists snapshots and joins picking activity', () => {
  const service = read('mockups/operations-hub/data-service.js');
  assert.match(service, /async function uploadInventorySurvey/);
  assert.match(service, /operations_hub_inventory_survey_snapshots/);
  assert.match(service, /operations_hub_inventory_survey_rows/);
  assert.match(service, /rpc\('get_system_v3_inventory_activity'\)/);
  assert.match(service, /actual_stock:countedQty \+ pickedQty \+ drawerQty/);
  assert.match(service, /중복 셀피아 SKU가 있습니다/);
});

test('picking cache keeps completed picking and drawer quantities separate', () => {
  const migration = read('supabase/pr_system_migrations/20260820133000_create_system_v3_inventory_activity_cache.sql');
  assert.match(migration, /event_type in \('picked', 'pick_unchecked'\)/);
  assert.match(migration, /where event_type = 'picked'/);
  assert.match(migration, /status = '서랍입력'/);
  assert.match(migration, /coalesce\(short_qty, 0\) = 0/);
  assert.match(migration, /refresh materialized view concurrently/);
  assert.doesNotMatch(migration, /security\s+definer/i);
  const privateMigration = read('supabase/pr_system_migrations/20260820140000_privatize_system_v3_inventory_activity_cache.sql');
  assert.match(privateMigration, /set schema operations_private/);
  assert.match(privateMigration, /security invoker/);
  assert.doesNotMatch(privateMigration, /security\s+definer/i);
});

test('inventory page refreshes while it is visible', () => {
  const app = read('mockups/operations-hub/app.js');
  assert.match(app, /loadInventorySurvey\(\{silent:true\}\)/);
  assert.match(app, /}, 60000\);/);
  assert.match(app, /sourceSelect\.value = 'survey'/);
  assert.match(app, /liveData\?\.uploadInventorySurvey/);
});
