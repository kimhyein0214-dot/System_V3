import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('inventory survey page exposes separated quantities as an unapproved reference', () => {
  const html = read('mockups/operations-hub/index.html');
  assert.match(html, /id="inventory-metric-picked"/);
  assert.match(html, /id="inventory-metric-drawer"/);
  assert.match(html, /재고조사 방식 미확정/);
  assert.match(html, /기존 데이터는 참고용으로만 조회/);
  assert.match(html, /현재 화면의 계산값은 저장·내보내기·판매처 재고에 반영되지 않습니다/);
  assert.match(html, /id="inventory-metric-actual"/);
  assert.match(html, /참고 계산값/);
  assert.match(html, /inventory\.css\?v=[^"']+/);
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

test('inventory page does not expose uploads or automatic operational refresh before approval', () => {
  const html = read('mockups/operations-hub/index.html');
  const app = read('mockups/operations-hub/app.js');
  assert.match(html, /<option value="survey" disabled>재고조사 완료 파일 · 방식 검토 중<\/option>/);
  assert.match(html, /id="inventory-upload-open"[^>]*disabled/);
  assert.match(html, /재고조사 설계 검토/);
  assert.doesNotMatch(app, /inventory-upload-open'\)\.addEventListener/);
  assert.doesNotMatch(app, /active-page'\)\) loadInventorySurvey\(\{silent:true\}\)/);
  assert.match(app, /inventory-refresh'\)\.addEventListener\('click',[\s\S]*?loadInventorySurvey\(\)/);
  assert.match(app, /liveData\?\.uploadInventorySurvey/);
});
