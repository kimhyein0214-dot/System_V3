import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const data=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const app=fs.readFileSync('mockups/operations-hub/app.js','utf8');
const flow=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.js','utf8');
const current=fs.readFileSync('mockups/operations-hub/current-price-export.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260914032904_matrix_export_snapshot_v4_live_drafts.sql','utf8');

test('matrix direct export reads a snapshot and never stages inventory',()=>{
  assert.match(data,/rpc\('hub_matrix_export_snapshot_v1'/);
  assert.match(data,/loadMatrixExportSnapshot[\s\S]*?while\(true\)/);
  assert.match(app,/directMatrixStock\s*=\s*true/);
  assert.match(current,/includeMatrixStock[\s\S]*?refreshMatrixSnapshotItems/);
  assert.match(current,/매트릭스 스냅샷 내보내기 기능을 불러오지 못했습니다/);
  assert.doesNotMatch(flow,/prepareReliableInventory|beginReliableExportJob|stageSellerInventoryDraftBatch/);
  assert.doesNotMatch(flow,/data-standard-stock=/);
  assert.match(migration,/operations_hub_active_seller_drafts sd/);
  assert.match(migration,/source_file_name/);
  assert.match(migration,/source_row_no/);
});
