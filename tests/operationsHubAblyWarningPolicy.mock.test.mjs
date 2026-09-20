import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const workflow=fs.readFileSync(new URL('../mockups/operations-hub/seller-file-workflow-v2.js',import.meta.url),'utf8');
const helpers=workflow.slice(workflow.indexOf(' const ablyPhases='),workflow.indexOf('\n async function loadStatuses('));
const previewSource=workflow.slice(workflow.indexOf(' async function preview(role)'),workflow.indexOf('\n function previewRowsForFilter('));
const mathSource=fs.readFileSync(new URL('../mockups/operations-hub/discount-price-math.js',import.meta.url),'utf8');
const priceSource=fs.readFileSync(new URL('../mockups/operations-hub/current-price-export.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

function harness({items,targets=[],role='playauto_option'}){
 const fields=new Map(['title','detail','bar','cancel'].map(key=>[key,{textContent:'',style:{},disabled:false}]));
 const progress={hidden:true,dataset:{},querySelector:selector=>fields.get(selector.match(/progress-(\w+)/)?.[1])};
 const previewNode={hidden:true};
 const document={querySelector(selector){if(selector==='[data-ably-progress]')return progress;if(selector==='[data-ably-progress-detail]')return fields.get('detail');return null;},getElementById:id=>id==='export-preview-v2'?previewNode:null};
 let nextTimer=0,rendered=0;
 const timers=new Map(),messages=[],state={carrierFiles:new Map(),ablyJob:null,ablyJobSequence:0};
 const global={console,performance:{now:()=>0},setInterval(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),setTimeout:fn=>setImmediate(fn)};
 vm.createContext(global);
 vm.runInContext(mathSource,global);
 vm.runInContext(priceSource,global);
 const n=value=>Number(value||0).toLocaleString('ko-KR'),setStatus=(text,kind)=>messages.push({text,kind});
 const createAblyJob=Function('global','state','document','n','renderExportStatuses','setStatus',`${helpers};return createAblyJob;`)(global,state,document,n,()=>{},setStatus);
 const roles={playauto_option:{label:'옵션가 + 재고',type:'option_price_stock'},playauto_product:{label:'판매가 + 옵션가',type:'product_price_option'}};
 const file={name:'carrier.xlsx',arrayBuffer:async()=>new ArrayBuffer(1)};
 const A=()=>({readTemplate:async()=>({type:roles[role].type,items}),resolveRows:rows=>rows.map(item=>({...item,resolution:item.resolution||{sku:item.sku,method:'direct_sku'}}))});
 const calls=[];
 const D=()=>({loadCarrierSellerMappings:async()=>({rows:[]}),loadCarrierMatrixTargets:async options=>{calls.push(options);return {rows:targets};}});
 const preview=Function('state','roles','setStatus','createAblyJob','document','global','blobFile','A','D','catalog','scopeSkus','renderPreview','n',`${previewSource};return preview;`)(state,roles,setStatus,createAblyJob,document,global,async()=>file,A,D,async()=>[],async()=>null,()=>{rendered++;},n);
 state.carrierFiles.set(role,file);
 return {run:()=>preview(role),state,calls,timers,messages,rendered:()=>rendered};
}
function row(sku,sourceRowNo=6,extra={}){
 return {sku,sellpia_product_code:sku.split('-')[0],source_row_no:sourceRowNo,option_index:Number(sku.split('-')[1])||0,base_price:2800,option_price:0,sales_quantity:3,available_stock:888,...extra};
}
function target(sku,extra={}){return {sku,active_price_rule:false,seller_stock:0,...extra};}
function calculated(generation=27){
 return {active_price_rule:true,current_effective_price:{platformBase:3000,platformDiscount:0,platformOption:100,platformFinal:3100,platformTerms:[],versions:[{id:'current-rule',version:generation}]}};
}
function assertNoOp(item){
 assert.equal(item._status,'warn_keep_original');
 assert.deepEqual(plain(item._changedFields),[]);
 assert.equal(item._current,item._target);
 for(const field of ['target_base_price','target_option_price','target_stock'])assert.equal(Object.hasOwn(item,field),false,`${field} cannot remain on a warning row`);
 assert.ok(item._error);
}

test('Ably option carrier: per-SKU generations are independent while missing/error rows stay protected',async()=>{
 const items=[row('SAFE-1',6),row('MISSING-1',7),row('ERROR-1',8),row('STALE-1',9),row('LATEST-1',10)];
 const targets=[target('SAFE-1'),target('MISSING-1',{active_price_rule:true,current_effective_error:'현재 target 없음'}),target('ERROR-1',{active_price_rule:true,current_effective_error:'현재 Rule 계산 실패',registration_status:'error',registration_error:'과거 statement timeout'}),target('STALE-1',calculated(26)),target('LATEST-1',calculated(27))];
 const h=harness({items,targets}),preview=await h.run();
 assert.ok(preview,h.messages.at(-1)?.text);
 assert.equal(preview.counts.warned,2);
 assert.equal(preview.counts.blocked,0);
 assert.equal(preview.counts.changed,3);
 assert.equal(preview.output[0]._status,'ready');
 assert.equal(preview.output[0].target_stock,0);
 assert.deepEqual(plain(preview.output[0]._changedFields),['stock']);
 for(const index of [1,2])assertNoOp(preview.output[index]);
 assert.deepEqual(preview.output.slice(1,4).map(item=>item._priceState.code),['timeout_error','timeout_error','calculated_complete']);
 assert.equal(preview.output[3].target_option_price,100);
 assert.equal(preview.output[3].target_stock,0);
 assert.equal(preview.output[4].target_option_price,100);
 assert.equal(preview.output[4].target_stock,0);
 assert.equal(preview.output[0].available_stock,888,'W available stock is preserved');
 assert.equal(h.rendered(),1);
 assert.equal(h.state.ablyJob.running,false);
 assert.equal(h.timers.size,0);
});

test('Ably product carrier: a price warning quarantines every option on its shared physical row',async()=>{
 const h=harness({role:'playauto_product',items:[row('SHARED-1',6),row('SHARED-2',6),row('OTHER-1',7)],targets:[target('SHARED-1',calculated()),target('SHARED-2',{active_price_rule:true}),target('OTHER-1',calculated())]});
 const preview=await h.run();
 assert.ok(preview,h.messages.at(-1)?.text);
 assert.equal(preview.counts.warned,2);
 assert.equal(preview.counts.blocked,0);
 assert.equal(preview.counts.changed,1);
 assertNoOp(preview.output[0]);
 assertNoOp(preview.output[1]);
 assert.match(preview.output[0]._error,/공유 판매가/);
 assert.equal(preview.output[2]._status,'ready');
 assert.equal(preview.output[2].target_base_price,3000);
 assert.equal(preview.output[2].target_option_price,100);
});

test('Ably product carrier: identity ambiguity takes precedence over warning fallback for a shared row',async()=>{
 const h=harness({role:'playauto_product',items:[row('SHARED-1',6),row('SHARED-2',6),row('SHARED-3',6,{resolution:{sku:null,method:'mapping_ambiguous',error:'SKU 후보 다수'}})],targets:[target('SHARED-1',calculated()),target('SHARED-2',{active_price_rule:true})]});
 const preview=await h.run();
 assert.ok(preview,h.messages.at(-1)?.text);
 assert.equal(preview.counts.blocked,3);
 assert.equal(preview.counts.warned,0);
 assert.equal(preview.counts.changed,0);
 assert.ok(preview.output.every(item=>item._status==='conflict'));
 for(const item of preview.output)for(const field of ['target_base_price','target_option_price','target_stock'])assert.equal(Object.hasOwn(item,field),false);
});

test('Ably option carrier: a uniquely unresolved identity can safely preserve the original',async()=>{
 const h=harness({items:[row('NO-MATCH',6,{resolution:{sku:null,method:'unresolved',error:'exact match 없음'}})]});
 const preview=await h.run();
 assert.ok(preview,h.messages.at(-1)?.text);
 assert.equal(preview.counts.matched,0);
 assert.equal(preview.counts.warned,1);
 assert.equal(preview.counts.blocked,0);
 assertNoOp(preview.output[0]);
 assert.deepEqual(h.calls[0].skus,[],'unmatched rows must not invent SKU target queries');
});

for(const method of ['mapping_ambiguous','direct_sku_invalid','direct_sku_conflict']){
 test(`Ably option carrier: ${method} is a hard identity blocker rather than a warning`,async()=>{
  const h=harness({items:[row('BAD-1',6,{resolution:{sku:null,method,error:'identity 검증 실패'}}),row('GOOD-1',7)],targets:[target('GOOD-1')]});
  const preview=await h.run();
  assert.ok(preview,h.messages.at(-1)?.text);
  assert.equal(preview.counts.blocked,1);
  assert.equal(preview.counts.warned,0);
  assert.equal(preview.output[0]._status,'ambiguous');
  for(const field of ['target_base_price','target_option_price','target_stock'])assert.equal(Object.hasOwn(preview.output[0],field),false);
  assert.equal(preview.output[1].target_stock,0);
 });
}

test('Ably explicit parser identity error blocks even if a resolved SKU also exists',async()=>{
 const h=harness({items:[row('GOOD-1',6,{carrier_identity_error:'두 direct SKU code 충돌'})],targets:[target('GOOD-1')]});
 const preview=await h.run();
 assert.equal(preview.counts.blocked,1);
 assert.equal(preview.counts.warned,0);
 assert.equal(preview.output[0]._status,'ambiguous');
 assert.match(preview.output[0]._error,/direct SKU code 충돌/);
});

test('Ably missing writable stock target is a whole-row warning, not a partial option-price mutation',async()=>{
 const h=harness({items:[row('NO-STOCK-1')],targets:[target('NO-STOCK-1',{seller_stock:null})]});
 const preview=await h.run();
 assert.equal(preview.counts.warned,1);
 assert.equal(preview.counts.blocked,0);
 assertNoOp(preview.output[0]);
 assert.match(preview.output[0]._error,/재고 target 없음/);
});

test('Ably blank X stock keeps the existing blank policy without creating a spurious warning',async()=>{
 const h=harness({items:[row('BLANK-1',6,{sales_quantity:null})],targets:[target('BLANK-1',{seller_stock:9})]});
 const preview=await h.run();
 assert.equal(preview.counts.warned,0);
 assert.equal(preview.counts.blocked,0);
 assert.equal(preview.counts.preserved,1);
 assert.equal(preview.output[0]._blankStockPreserved,true);
 assert.equal(preview.output[0].target_stock,undefined);
 assert.equal(preview.output[0].available_stock,888);
});
