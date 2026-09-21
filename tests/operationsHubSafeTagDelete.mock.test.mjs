import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260921143346_hub_product_tag_safe_delete_v1.sql','utf8');
const ui=fs.readFileSync('mockups/operations-hub/tag-management-v2.js','utf8');
const service=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');

test('tag delete is visible but only retires an unused tag after server-side session and reference checks',()=>{
  assert.match(ui,/id="tag-delete-unused"[^>]*>태그 삭제/);
  assert.match(ui,/deleteButton\.disabled=!tag\|\|inUse/);
  assert.match(ui,/global\.confirm\(`'\$\{tag\.tag_name\}' 태그를 삭제할까요/);
  assert.match(service,/async function deleteUnusedProductTag[\s\S]*?hub_product_tag_safe_delete_v1/);
  assert.match(sql,/require_operations_hub_operator_session\(p_session_token\)/);
  assert.match(sql,/from public\.sellpia_tag_assignments a[\s\S]*?a\.is_active/);
  assert.match(sql,/from operations_private\.hub_rules r[\s\S]*?r\.is_active/);
  assert.match(sql,/from operations_private\.hub_rule_assignments a[\s\S]*?a\.assigned_tag_id=p_tag_id/);
  assert.match(sql,/set is_active=false/);
  assert.doesNotMatch(sql,/delete from public\.sellpia_tag_assignments|delete from operations_private\.hub_rules/i);
});
