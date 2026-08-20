import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20260820150000_sellpia_authoritative_matrix.sql', import.meta.url), 'utf8');
const dataService = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');

assert.match(migration, /from public\.sellpia_stock_latest stock[\s\S]*left join catalog\.sellpia_products/, 'latest Sellpia snapshot must own the active matrix row set');
assert.doesNotMatch(migration, /with all_skus as/, 'historical catalog and mapping rows must not create active matrix rows');
assert.match(migration, /review\.final_excel_mapping_import[\s\S]*review\.sheet_manual_mappings/, 'mapping history must remain separate and reattach by SKU');
assert.match(migration, /sellpia_snapshot_id uuid[\s\S]*is not distinct from v_recorded_sellpia_snapshot_id/, 'the refresh state must detect a newly-ready Sellpia snapshot');
assert.match(migration, /operations_hub_sellpia_matrix_sync_status[\s\S]*rebuild_pending/, 'the frontend needs a read-only rebuild completion signal');

for (const column of [
  'supplier_code',
  'supplier_name',
  'supplier_group',
  'supplier_address',
  'supplier_market_name',
  'supplier_phone',
  'purchase_product_name',
  'purchase_option_name'
]) {
  assert.match(migration, new RegExp(`add column if not exists ${column} text`), `${column} must be stored in the Sellpia snapshot table`);
  assert.match(dataService, new RegExp(`${column}: cleanText\\(row\\[`), `${column} must be parsed from the uploaded workbook`);
}

assert.match(dataService, /expectedHeaders[\s\S]*매입처코드[\s\S]*매입옵션명/, 'Sellpia supplier headers must be validated before upload');
assert.match(dataService, /operations_hub_sellpia_matrix_sync_status[\s\S]*waitForSellpiaMatrixRebuild/, 'the data adapter must poll the database rebuild status');
assert.match(app, /await liveData\.waitForSellpiaMatrixRebuild\(result\.snapshotId, showUploadProgress\)/, 'the upload flow must wait for the new matrix version before reloading data');

console.log('operations hub Sellpia authoritative rebuild mock checks passed');
