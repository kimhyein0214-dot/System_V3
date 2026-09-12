import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const js=fs.readFileSync('mockups/operations-hub/tag-management-v2.js','utf8');
const css=fs.readFileSync('mockups/operations-hub/tag-management-v2.css','utf8');
const data=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const html=fs.readFileSync('mockups/operations-hub/index.html','utf8');

test('tag-centric manager exposes saved-assignment download and member editing',()=>{
  assert.match(js,/태그별 관리/);
  assert.match(js,/현재 적용 목록 XLSX/);
  assert.match(js,/전체 적용 해제/);
  assert.match(js,/선택 해제/);
  assert.match(js,/loadTagMembers/);
  assert.match(js,/removeTagMembers/);
  assert.match(js,/syncTagAssignments/);
  assert.match(js,/XLSX\.writeFile/);
  assert.match(css,/tag-manager-v2/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto!important/);
  assert.match(data,/async function loadTagCatalog/);
  assert.match(data,/async function loadTagMembers/);
  assert.match(data,/async function removeTagMembers/);
  assert.match(html,/tag-management-v2\.css/);
  assert.match(html,/tag-management-v2\.js/);
});
