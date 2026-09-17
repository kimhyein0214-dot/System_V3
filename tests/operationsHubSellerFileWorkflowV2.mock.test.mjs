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
  assert.match(js,/장기 원본은 별도로 유지/);
  assert.match(js,/판매가 \+ 옵션가 파일 선택/);
  assert.match(js,/옵션가 \+ 재고 파일 선택/);
  assert.match(js,/data-carrier-input="playauto_product"/);
  assert.match(js,/data-carrier-input="playauto_option"/);
  assert.match(js,/에이블리 할인은 공식 파일에 지원 컬럼이 없어 자동 반영하지 않습니다/);
  assert.match(js,/V 추가 금액과 X \*판매수량\(실재고\)만/);
  assert.match(js,/W 판매가능재고와 나머지 셀은 보존/);
  assert.match(js,/out\.target_stock=item\.sales_quantity/,'preview must resolve stock from X, not W');
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
  assert.match(data,/async function loadCarrierSellerMappings/);
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

test('Smartstore and Makeshop share paged TransformationPlan preview and serializer contract',()=>{
  for(const marker of ['TransformationPlan','transformation-plan-preview','transformation-plan-summary','transformation-plan-table','latest generation 미반영','timeout/error','원본 fallback','가격 계산 미완료/오류 · 원본 유지'])assert.ok(js.includes(marker),marker);
  assert.match(js,/pageSize=100/);
  assert.match(js,/button\.dataset\.planCanGenerate/);
  assert.match(js,/renderTransformationPlan\(source,file,result\)/);
  assert.doesNotMatch(js,/if\(source==='smartstore'\).*renderTransformationPlan/);
  assert.match(js,/data-standard-carrier-run="smartstore" aria-disabled="true"/);
  assert.doesNotMatch(js,/data-standard-carrier-run="smartstore" disabled/,'a disabled button swallows clicks and cannot explain why generation is blocked');
  assert.match(js,/button\.setAttribute\('aria-disabled',String\(!plan\.canGenerate\)\)/);
  assert.match(js,/공식 수정파일 변환 차단:/,'an unsafe preview must report its reason instead of silently ignoring the click');
  assert.match(js,/standardProgress\(source,5,'공식 수정파일 변환 시작'/);
  assert.match(js,/standardProgress\(source,100,'공식 수정파일 변환 완료'/);
  assert.match(js,/standardProgress\(source,100,'공식 수정파일 변환 중단'/);
  assert.match(js,/bridge\.runCarrier\(\{source,file,plan\}\)/);
  assert.match(app,/transformSellerFile\(plan\.file,plan\.operations\|\|plan\.items/);
  assert.match(app,/loadCarrierSellerMappings\(\{source,identities:parsed\.normalizedRows,onQuery\}\)/);
  assert.match(app,/loadCarrierMatrixTargets\(\{source,skus:matchedSkus,onQuery\}\)/);
  assert.match(app,/가격\/재고 상태가 변경되었습니다\. 미리보기를 다시 확인해주세요/);
});

test('carrier generate click always reports a blocked reason or runs the connected serializer',async()=>{
  const functionSource=js.slice(js.indexOf('async function runStandardCarrier('),js.indexOf('\n function renderExportStatuses('));
  const messages=[],progress=[],button={disabled:false,attrs:new Map(),setAttribute(name,value){this.attrs.set(name,value);},removeAttribute(name){this.attrs.delete(name);}};
  const document={querySelector(){return button;}};
  const file={name:'smartstore.xlsx'};
  const blockedPlan={kind:'TransformationPlan',canGenerate:false,safety:{reason:'latest generation 미반영'}};
  const state={standardCarrierFiles:new Map([['smartstore',file]]),standardCarrierPlans:new Map([['smartstore',blockedPlan]])};
  let serializerCalls=0;
  const global={SystemV3SellerExportBridge:{async runCarrier(){serializerCalls++;return {title:'완료',progressDetail:'반영 1건'};}}};
  const standardResult=(source,text,kind)=>messages.push({source,text,kind});
  const setStatus=(text,kind)=>messages.push({text,kind});
  const standardProgress=(...args)=>progress.push(args);
  const runStandardCarrier=Function('global','state','document','standardResult','setStatus','standardProgress',`${functionSource}; return runStandardCarrier;`)(global,state,document,standardResult,setStatus,standardProgress);

  await runStandardCarrier('smartstore');
  assert.equal(serializerCalls,0);
  assert.ok(messages.some(message=>String(message.text).includes('latest generation 미반영')),'blocked click must explain the safety reason');

  state.standardCarrierPlans.set('smartstore',{kind:'TransformationPlan',canGenerate:true,safety:{can_generate_xlsx:true}});
  messages.length=0;
  await runStandardCarrier('smartstore');
  assert.equal(serializerCalls,1,'safe click reaches the existing serializer bridge');
  assert.deepEqual(progress.map(entry=>[entry[1],entry[2]]),[[5,'공식 수정파일 변환 시작'],[100,'공식 수정파일 변환 완료']]);
  assert.ok(messages.some(message=>message.text==='공식 수정파일 변환 완료'&&message.kind==='success'));
  assert.equal(button.disabled,false);
  assert.equal(button.attrs.get('aria-disabled'),'false');
});
