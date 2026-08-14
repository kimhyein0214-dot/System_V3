import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const data = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const adapterSource = fs.readFileSync(new URL('../mockups/operations-hub/seller-export-adapter.js', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20260814131808_operations_hub_seller_export.sql', import.meta.url), 'utf8');
const failureMigration = fs.readFileSync(new URL('../supabase/migrations/20260814140500_operations_hub_export_failure_finalize.sql', import.meta.url), 'utf8');
const partialMigration = fs.readFileSync(new URL('../supabase/migrations/20260814143500_operations_hub_export_partial_success.sql', import.meta.url), 'utf8');
const draftMigration = fs.readFileSync(new URL('../supabase/migrations/20260814153000_operations_hub_seller_drafts_and_originals.sql', import.meta.url), 'utf8');
const aliasMigration = fs.readFileSync(new URL('../supabase/migrations/20260814154500_operations_hub_export_source_alias.sql', import.meta.url), 'utf8');
const bulkMigration = fs.readFileSync(new URL('../supabase/migrations/20260814173000_operations_hub_export_bulk_prepare.sql', import.meta.url), 'utf8');
const conflictMigration = fs.readFileSync(new URL('../supabase/migrations/20260814183000_operations_hub_export_row_conflicts.sql', import.meta.url), 'utf8');
const inventoryBatchMigration = fs.readFileSync(new URL('../supabase/migrations/20260814190000_operations_hub_inventory_match_batches.sql', import.meta.url), 'utf8');

for (const table of ['operations_hub_export_batches', 'operations_hub_export_items']) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`), `${table} must persist the export audit trail`);
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enable RLS`);
}
for (const rpc of ['prepare_operations_hub_export', 'complete_operations_hub_export', 'confirm_operations_hub_changes_applied']) {
  assert.match(migration + failureMigration, new RegExp(`create or replace function public\\.${rpc}`), `${rpc} must exist`);
}
assert.doesNotMatch(migration + failureMigration, /security definer/i, 'export RPCs must not bypass RLS');
assert.match(migration, /status in \('pending', 'validated', 'processing', 'exported', 'applied'/, 'queue must distinguish file export from marketplace apply');
assert.match(migration, /else[\s\S]*?sellpia_current_stock is distinct from t\.seller_stock/, 'inventory reconciliation must export only stock differences');
assert.match(partialMigration, /blocking_reason is null[\s\S]*?then 'exported' else 'failed'/, 'valid rows must export while unresolved original rows remain failed');

for (const id of ['matrix-match-stock-btn','matrix-export-btn','queue-export','queue-confirm-applied','seller-export-modal','seller-export-run']) {
  assert.match(html, new RegExp(`id="${id}"`), `export UI must include ${id}`);
}
assert.match(html, /seller-source-parsers\.js[\s\S]*?seller-export-adapter\.js[\s\S]*?data-service\.js/, 'the export adapter must load before application startup');
assert.match(html, /20260814-inventorybatch1/g, 'all local assets must share the export deployment version');
assert.doesNotMatch(html, /class="seller-export-files"/, 'export must reuse the latest stored originals instead of asking for files again');
assert.match(draftMigration, /source_storage_files jsonb[^]*?seller-originals/, 'seller snapshots must retain immutable original file references');
assert.match(draftMigration, /save_operations_hub_seller_value_draft[^]*?stage_operations_hub_seller_inventory_match/, 'seller cells and bulk stock matching must create reviewable drafts');
assert.match(aliasMigration, /source\.source_channel as export_source_channel[^]*?r\.export_source_channel/, 'queue source and expanded export source must never share an ambiguous alias');
assert.match(bulkMigration, /prepare_operations_hub_change_export[^]*?set statement_timeout = '45s'/, 'bulk export preparation must have a function-scoped timeout');
assert.match(bulkMigration, /source_specific as materialized[^]*?seller_product_code[^]*?global_changes/, 'source-specific drafts must use their stored seller codes without rescanning the matrix');
assert.match(bulkMigration, /returns table\(item_count integer, blocked_count integer, batch_status text\)/, 'bulk preparation must return only a compact summary');
assert.match(bulkMigration, /alter function public\.complete_operations_hub_export[^]*?statement_timeout = '45s'/, 'bulk export completion must allow the queue status update to finish');
assert.match(conflictMigration, /p_skipped_items jsonb[^]*?jsonb_to_recordset[^]*?blocking_reason[^]*?status = 'failed'/, 'runtime source conflicts must be finalized as item-level failures');
assert.doesNotMatch(conflictMigration, /security definer/i, 'runtime conflict finalization must not bypass RLS');
assert.match(data, /downloadLatestSellerOriginals[^]*?storage\.from\('seller-originals'\)\.download/, 'export must download the latest stored originals');
assert.match(app, /stageSellerInventoryDraftBatch[^]*?loadLiveMatrix/, 'inventory matching must stop at a reviewable matrix draft');
assert.match(data, /stageSellerInventoryDraftBatch[^]*?p_after_sku:[^]*?p_batch_size:/, 'the frontend must stage large inventory matches through cursor batches');
assert.match(app, /while \(hasMore\)[^]*?processed \/ total[^]*?수정안 생성 중/, 'bulk inventory matching must show real SKU progress for each committed batch');
assert.match(inventoryBatchMigration, /operations_hub_change_queue_inventory_active_idx[^]*?field_key = 'sellpia_current_stock'/, 'active inventory drafts need a focused replacement index');
assert.match(inventoryBatchMigration, /with candidates as materialized[^]*?sku_page as materialized[^]*?limit v_batch_size/, 'inventory staging must bound each database transaction');
assert.equal((inventoryBatchMigration.match(/from public\.operations_hub_matrix_live matrix/g) || []).length, 1, 'each batch must scan the live matrix only once');
assert.match(inventoryBatchMigration, /cancelled as \([^]*?inserted as \([^]*?processed_count < batch_stats\.total_count/, 'each batch must replace stale drafts and return a real continuation signal');
assert.doesNotMatch(inventoryBatchMigration, /security definer/i, 'inventory batching must not bypass RLS');
assert.match(data, /prepareSellerExport[\s\S]*?range\(from, from \+ pageSize - 1\)/, 'large export plans must be read through pagination');
assert.match(data, /rpc\('prepare_operations_hub_change_export'/, 'the frontend must use the optimized bulk preparation RPC');
assert.match(data, /completeSellerExport[\s\S]*?confirmChangesApplied/, 'the frontend adapter must expose export and manual apply confirmation');
assert.match(data, /p_skipped_items:[\s\S]*?export_item_id[\s\S]*?reason/, 'runtime export conflicts must be sent back to the database');
assert.match(app, /buildExportArchive[\s\S]*?completeSellerExport\(\{batchId, success:true/, 'files must be built before the queue is marked exported');
assert.match(app, /skippedItems:result\.skippedItems[\s\S]*?제외목록 CSV/, 'successful exports must report row conflicts without aborting the whole archive');
assert.match(adapterSource, /SystemV3_내보내기_제외목록\.csv/, 'the archive must include a CSV describing skipped conflicts');
assert.match(app, /confirmChangesApplied/, 'marketplace upload confirmation must be a separate action');

const context = {console, setTimeout, URL:{createObjectURL(){}, revokeObjectURL(){}}, Blob};
vm.createContext(context);
vm.runInContext(adapterSource, context);
const adapter = context.SystemV3SellerExport;

const smartRow = '<row r="3"><c r="F3"><v>5200</v></c><c r="P3" t="inlineStr"><is><t xml:space="preserve">op1\nop2</t></is></c><c r="Q3" t="inlineStr"><is><t xml:space="preserve">실버\n골드</t></is></c><c r="R3" t="inlineStr"><is><t xml:space="preserve">0\n200</t></is></c><c r="S3" t="inlineStr"><is><t xml:space="preserve">2\n3</t></is></c></row>';
const smartPatched = adapter.patchSmartstoreRow(smartRow, [
  {source_row_no:3, source_channel:'smartstore', sellpia_sku_code:'1014-2', seller_option_code:'op2', field_key:'sellpia_current_stock', expected_source_value:3, after_value:9},
  {source_row_no:3, source_channel:'smartstore', sellpia_sku_code:'1014-2', seller_option_code:'op2', field_key:'sellpia_sale_price', expected_source_value:5400, after_value:5700},
], []);
assert.equal(adapter.cellValue(smartPatched, 'S3', []), '2\n9');
assert.equal(adapter.cellValue(smartPatched, 'R3', []), '0\n500');

const makeRow = '<row r="4"><c r="AD4" t="inlineStr"><is><t>골드</t></is></c><c r="AF4"><v>200</v></c><c r="AG4"><v>3</v></c><c r="AR4"><v>425</v></c></row>';
const makePatched = adapter.patchMakeshopRow(makeRow, [
  {source_row_no:4, source_channel:'makeshop', sellpia_sku_code:'1014-2', seller_option_code:'425', field_key:'sellpia_current_stock', expected_source_value:3, after_value:8},
  {source_row_no:4, source_channel:'makeshop', sellpia_sku_code:'1014-2', seller_option_code:'425', field_key:'sellpia_sale_price', expected_source_value:5400, after_value:5600, base_price:5200, option_price:200},
], []);
assert.equal(adapter.cellValue(makePatched, 'AG4', []), '8');
assert.equal(adapter.cellValue(makePatched, 'AF4', []), '400');
assert.equal(adapter.outputName('원본.xlsx'), '원본_SystemV3반영.xlsx');

const conflicts = [];
const applied = [];
const partialMakePatched = adapter.patchMakeshopRow(makeRow, [
  {export_item_id:41, source_row_no:4, source_channel:'makeshop', sellpia_sku_code:'11334-1', seller_option_code:'425', field_key:'sellpia_current_stock', expected_source_value:102, after_value:100},
  {export_item_id:42, source_row_no:4, source_channel:'makeshop', sellpia_sku_code:'1014-2', seller_option_code:'425', field_key:'sellpia_sale_price', expected_source_value:5400, after_value:5600, base_price:5200, option_price:200},
], [], conflict => conflicts.push(conflict), item => applied.push(item));
assert.equal(adapter.cellValue(partialMakePatched, 'AG4', []), '3', 'a conflicting stock item must leave the original cell untouched');
assert.equal(adapter.cellValue(partialMakePatched, 'AF4', []), '400', 'a valid sibling item must still be applied');
assert.equal(conflicts.length, 1, 'only the conflicting item must be skipped');
assert.equal(conflicts[0].item.export_item_id, 41);
assert.equal(applied.length, 1);

console.log('Operations hub seller original export and inventory reconciliation: passed');
