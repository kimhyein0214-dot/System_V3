import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const js=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.js','utf8');
const css=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.css','utf8');
const data=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const app=fs.readFileSync('mockups/operations-hub/app.js','utf8');
const html=fs.readFileSync('mockups/operations-hub/index.html','utf8');

test('Ably workflow separates catalog original from PlayAuto export templates',()=>{
  assert.match(app,/에이블리 전체 원본 \(GOODS_LIST\)/);
  assert.match(js,/playauto_product/);
  assert.match(js,/playauto_option/);
  assert.match(js,/GOODS_LIST는 조회\/매칭에만 사용/);
  assert.match(js,/판매가 \+ 옵션가 미리보기/);
  assert.match(js,/옵션가 \+ 재고 파일 선택/);
  assert.match(js,/V 추가 금액과 W 판매가능재고만/);
  assert.match(js,/X \*판매수량과 나머지 셀은 보존/);
  assert.match(js,/브라우저 메모리/);
  assert.match(js,/Storage 저장 안 함/);
  assert.match(js,/미리보기 실패/);
  assert.match(data,/async function uploadAuxiliarySellerFile/);
  assert.match(data,/sourceRole!=='playauto_product'/);
  assert.match(data,/옵션가·재고 carrier는 Storage에 저장하지 않습니다/);
  assert.match(data,/const storagePath=`ably\/aux\/\$\{sourceRole\}\/\$\{id\}\/source\.xlsx`/);
  assert.match(data,/p_file_name:baseName,p_storage_path:storagePath/);
  assert.doesNotMatch(data,/const safeName=baseName/);
  assert.match(data,/async function loadAuxiliarySellerFiles/);
  assert.match(data,/async function downloadAuxiliarySellerFile/);
  assert.match(data,/async function loadPlayautoSellpiaCatalog/);
  assert.match(data,/async function loadCarrierMatrixTargets/);
  assert.match(js,/loadCarrierMatrixTargets\(\{source:'ably'/);
  assert.doesNotMatch(js,/loadSystemStocks/);
  assert.match(js,/previewChangedOnly/);
  assert.match(js,/runChangedOnly/);
  assert.match(js,/previewStandardCarrier/);
  assert.match(js,/runStandardCarrier/);
  assert.match(html,/seller-file-workflow-v2\.css/);
  assert.match(html,/seller-file-workflow-v2\.js/);
  assert.match(css,/export-preview-v2/);
});

test('preview count chips filter only the visible rows and never mutate export output',()=>{
  const functionSource=js.slice(js.indexOf('function previewRowsForFilter('),js.indexOf('\n function previewFilterButton('));
  const preview={output:[
    {_status:'ready',_changed:true},
    {_status:'ready',_changed:false,_blankStockPreserved:true},
    {_status:'unresolved'},
    {_status:'ambiguous'},
    {_status:'conflict'}
  ]};
  const before=JSON.stringify(preview.output);
  const previewRowsForFilter=Function(`${functionSource}; return previewRowsForFilter;`)();
  assert.equal(previewRowsForFilter(preview,'all').length,5);
  assert.equal(previewRowsForFilter(preview,'ready').length,2);
  assert.equal(previewRowsForFilter(preview,'changed').length,1);
  assert.equal(previewRowsForFilter(preview,'unresolved').length,2);
  assert.equal(previewRowsForFilter(preview,'preserved').length,1);
  assert.equal(previewRowsForFilter(preview,'blocked').length,3);
  assert.equal(JSON.stringify(preview.output),before);
  assert.match(js,/data-preview-filter/);
  assert.match(css,/\.export-preview-filter\.active/);
});

test('Smartstore carrier renders a preview-only TransformationPlan and keeps XLSX disconnected',()=>{
  for(const marker of ['TransformationPlan','preview-only','transformation-plan-preview','transformation-plan-summary','transformation-plan-table','latest generation 미반영','timeout/error','원본 fallback','가격 계산 미완료/오류 · 원본 유지'])assert.ok(js.includes(marker),marker);
  assert.match(js,/rows=.*\.slice\(0,150\)/);
  assert.match(js,/button\.dataset\.planCanGenerate/);
  assert.match(js,/source==='smartstore'.*renderTransformationPlan/);
  assert.match(js,/source==='smartstore'.*preview-only 단계/);
  assert.match(js,/data-standard-carrier-run="smartstore" disabled/);
  assert.doesNotMatch(js,/source==='smartstore'.*bridge\.runCarrier/);
});
