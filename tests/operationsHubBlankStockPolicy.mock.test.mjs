
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const data=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const workflow=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260912231500_seller_inventory_blank_stock_policy_v2.sql','utf8');

test('blank seller stock is preserved by default and overwrite is explicit',()=>{
  assert.match(data,/stage_operations_hub_seller_inventory_match_batch_v2/);
  assert.match(data,/p_overwrite_blank:!!overwriteBlank/);
  assert.match(workflow,/원본의 빈 재고셀도 시스템 재고로 채우기/);
  assert.match(workflow,/data-standard-overwrite-blank/);
  assert.match(workflow,/data-ably-overwrite-blank/);
  assert.match(workflow,/item\.actual_stock==null&&!overwriteBlank/);
  assert.match(workflow,/빈셀 유지/);
  assert.match(migration,/target_safety_state='preserved_blank'/);
  assert.match(migration,/blank_seller_stock_overwrite_enabled/);
  assert.match(migration,/sellerStock'='null'::jsonb/);
});
