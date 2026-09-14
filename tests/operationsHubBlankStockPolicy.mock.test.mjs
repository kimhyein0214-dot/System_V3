
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const data=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const workflow=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260912231500_seller_inventory_blank_stock_policy_v2.sql','utf8');

test('blank seller stock is preserved and carrier export never invents an overwrite',()=>{
  assert.match(data,/stage_operations_hub_seller_inventory_match_batch_v2/);
  assert.match(data,/p_overwrite_blank:!!overwriteBlank/);
  assert.doesNotMatch(workflow,/data-standard-overwrite-blank/);
  assert.doesNotMatch(workflow,/data-ably-overwrite-blank/);
  assert.match(workflow,/item\.available_stock==null/);
  assert.match(workflow,/out\._blankStockPreserved=true/);
  assert.match(workflow,/draftStock!==null&&draftStock!==undefined&&draftStock!==''/);
  assert.match(workflow,/빈셀 유지/);
  assert.match(workflow,/X \*판매수량과 나머지 셀은 보존/);
  assert.match(migration,/target_safety_state='preserved_blank'/);
  assert.match(migration,/blank_seller_stock_overwrite_enabled/);
  assert.match(migration,/sellerStock'='null'::jsonb/);
});
