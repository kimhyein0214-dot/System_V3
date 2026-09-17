import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const mathSource=fs.readFileSync('mockups/operations-hub/discount-price-math.js','utf8');
const exportSource=fs.readFileSync('mockups/operations-hub/current-price-export.js','utf8');
const dataSource=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const appSource=fs.readFileSync('mockups/operations-hub/app.js','utf8');
const flowSource=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260914032904_matrix_export_snapshot_v4_live_drafts.sql','utf8');

function exportHarness(rows){
  const calls=[];
  const context={console,SystemV3Data:{
    loadMatrixExportSnapshot:async options=>{calls.push(options);return {snapshotId:'snapshot-1',rows:structuredClone(rows)};},
    loadStoredMatrixPrices(){throw Error('legacy price read must not run');},
    loadMatrixStocksForExport(){throw Error('system-stock export must not run');}
  },SystemV3SellerParsers:{parseSellerFiles:async()=>({normalizedRows:rows.filter(row=>row.source_row_no).map(row=>({
    product_code:row.product_code,option_code:row.option_code,source_row_no:row.source_row_no,
    base_price:row.source_base_price,discounted_base_price:row.source_discounted_base_price,
    option_price:row.source_option_price,final_price:row.source_final_price,
    discount_terms:row.source_discount_terms,raw_payload:{source_file_name:row.source_file_name}
  }))})}};
  vm.createContext(context);
  vm.runInContext(mathSource,context);
  vm.runInContext(exportSource,context);
  return {api:context.HubCurrentPriceExport,calls};
}

function row(extra={}){
  return {
    sku:'SKU-1',product_code:'P-1',option_code:'O-1',source_file_name:'smart.xlsx',source_row_no:3,
    system_stock:99,source_stock:8,source_base_price:5000,source_discounted_base_price:5000,
    source_option_price:0,source_final_price:5000,source_discount_terms:[],stock_draft:null,price_draft:null,
    registration_price:null,registration_status:null,registration_generation_id:null,
    discount_price:null,discount_status:null,discount_generation_id:null,
    option_price:null,option_status:null,option_generation_id:null,
    final_price:null,final_status:null,final_generation_id:null,rule_versions:[],...extra
  };
}

const files=new Map([['smartstore',[{name:'smart.xlsx'}]]]);
const plain=value=>JSON.parse(JSON.stringify(value));

test('matrix and direct export share draft-first visible values',async()=>{
  const draft={after_value:5500,price_base_after:5200,price_discounted_base_after:5000,price_option_after:500,price_final_after:5500,price_discount_terms_after:[{term_key:'basic',is_baseline:true,value:200,unit:'amount'}]};
  const calculated={registration_price:9000,registration_status:'calculated',registration_generation_id:4,discount_price:9000,discount_status:'calculated',discount_generation_id:4,option_price:0,option_status:'calculated',option_generation_id:4,final_price:9000,final_status:'calculated',final_generation_id:4};
  const h=exportHarness([row({...calculated,price_draft:draft,stock_draft:{after_value:12}})]);
  const resolved=h.api.matrixPriceTarget(row({...calculated,price_draft:draft}));
  assert.deepEqual([resolved.origin,resolved.base,resolved.discounted,resolved.option,resolved.final],['draft',5200,5000,500,5500]);
  const result=await h.api.refreshItems([],files,{sources:['smartstore'],includeMatrixStock:true});
  assert.deepEqual(plain(result.items.map(item=>[item.field_key,item.after_value])),[['sellpia_current_stock',12],['sellpia_sale_price',5500]]);
  assert.equal(result.items[0].source_file_name,'smart.xlsx');
  assert.equal(result.items[0].source_row_no,3);
  assert.equal(result.excludedItems.length,0);
  assert.equal(h.calls.length,1);
  assert.match(appSource,/matrixVisibleValues\(\{/);
});

test('no stock draft preserves seller stock even when system stock differs',async()=>{
  const h=exportHarness([row({system_stock:100,source_stock:8})]);
  const result=await h.api.refreshItems([],files,{sources:['smartstore'],includeMatrixStock:true});
  assert.deepEqual(plain(result.items),[]);
  assert.deepEqual(plain(result.excludedItems),[]);
});

test('stock draft zero is exported, while a blank source cell stays untouched',async()=>{
  const h=exportHarness([
    row({sku:'ZERO',stock_draft:{after_value:0}}),
    row({sku:'BLANK',source_stock:null,stock_draft:{after_value:7},source_row_no:4})
  ]);
  const result=await h.api.refreshItems([],files,{sources:['smartstore'],includeMatrixStock:true});
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].sellpia_sku_code,'ZERO');
  assert.equal(result.items[0].after_value,0);
  assert.deepEqual(plain(result.excludedItems),[]);
});

test('timeout, error and mixed-generation calculated tuples preserve original price',async()=>{
  const timeout=row({registration_status:'error',registration_error:'canceling statement due to statement timeout',discount_status:'error',option_status:'error',final_status:'error'});
  const mixed=row({sku:'MIXED',registration_price:5100,registration_status:'calculated',registration_generation_id:1,discount_price:5100,discount_status:'calculated',discount_generation_id:1,option_price:0,option_status:'calculated',option_generation_id:2,final_price:5100,final_status:'calculated',final_generation_id:2});
  const h=exportHarness([timeout,mixed]);
  const result=await h.api.refreshItems([],files,{sources:['smartstore'],includeMatrixStock:true});
  assert.deepEqual(plain(result.items),[]);
  assert.deepEqual(plain(result.excludedItems),[]);
});

test('official carrier scope uses exact identity and only visible draft or calculated targets',()=>{
  const h=exportHarness([]),draft={after_value:5500,price_base_after:5200,price_discounted_base_after:5000,price_option_after:500,price_final_after:5500,price_discount_terms_after:[]};
  const carrier=[
    {product_code:'P-1',option_code:'O-1',source_row_no:7,base_price:5000,discounted_base_price:5000,option_price:0,final_price:5000,stock:8,discount_terms:[]},
    {product_code:'P-2',option_code:'O-2',source_row_no:8,base_price:6000,discounted_base_price:6000,option_price:0,final_price:6000,stock:null,discount_terms:[]}
  ];
  const snapshot=[
    row({sku:'DRAFT',price_draft:draft,stock_draft:{after_value:0}}),
    row({sku:'BLANK',product_code:'P-2',option_code:'O-2',source_row_no:4,system_stock:99,source_stock:3})
  ];
  const result=h.api.prepareCarrierItems('smartstore','carrier.xlsx',carrier,snapshot);
  assert.equal(result.kind,'TransformationPlan');
  assert.equal(result.preview_only,false);
  assert.equal(result.xlsx_connected,true);
  assert.equal(result.source_type,'carrier');
  assert.equal(result.latest_generation_id,null);
  assert.match(result.created_at,/^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(plain(result.items.map(item=>[item.sellpia_sku_code,item.field_key,item.after_value,item.source_row_no])),[
    ['DRAFT','sellpia_current_stock',0,7],['DRAFT','sellpia_sale_price',5500,7]
  ]);
  assert.equal(result.preview[0].changed,true);
  assert.equal(result.preview[1].changed,false,'blank carrier stock and no visible price target must stay untouched');
  assert.equal(result.excludedItems.length,0);
  assert.equal(result.preview[0].price_state.code,'calculated_complete','a complete visible draft is safe and takes priority over calculation state');
  assert.equal(result.preview[1].price_state.code,'original_fallback');
  assert.equal(result.canGenerate,true,'an explicit original fallback is safe when no price target exists');
  assert.equal(result.operations,result.items,'preview and serializer must share the same operation array');
  assert.match(result.version_token,/^[0-9a-f]{16}$/);
  assert.deepEqual(plain(result.summary.price_states),{calculated_complete:1,latest_generation_unreflected:0,timeout_error:0,original_fallback:1});
  assert.equal(result.preview[0].diff.price.after.final,5500,'complete visible draft remains the safe preview target');
  assert.equal(result.preview[0].diff.price.candidate_after.final,5500);

  const duplicate=h.api.prepareCarrierItems('smartstore','carrier.xlsx',[carrier[0],{...carrier[0],source_row_no:9}],snapshot);
  assert.equal(duplicate.items.length,0);
  assert.equal(duplicate.excludedItems.length,2,'duplicate carrier identities must fail closed rather than fuzzy-write');
});

test('carrier TransformationPlan distinguishes complete, stale, timeout and original fallback prices',()=>{
  const calculated={registration_price:5100,registration_status:'calculated',registration_generation_id:12,discount_price:5000,discount_status:'calculated',discount_generation_id:12,option_price:100,option_status:'calculated',option_generation_id:12,final_price:5100,final_status:'calculated',final_generation_id:12};
  const carrier=(product,rowNo)=>({product_code:product,option_code:'O-1',source_row_no:rowNo,base_price:5000,discounted_base_price:5000,option_price:0,final_price:5000,stock:8,discount_terms:[]});
  const result=exportHarness([]).api.prepareCarrierItems('smartstore','carrier.xlsx',[carrier('OK',1),carrier('STALE',2),carrier('TIMEOUT',3),carrier('FALLBACK',4)],[
    row({sku:'OK',product_code:'OK',...calculated}),
    row({sku:'STALE',product_code:'STALE',...calculated,registration_generation_id:11,discount_generation_id:11,option_generation_id:11,final_generation_id:11}),
    row({sku:'TIMEOUT',product_code:'TIMEOUT',registration_status:'error',registration_error:'canceling statement due to statement timeout'}),
    row({sku:'FALLBACK',product_code:'FALLBACK'})
  ]);
  assert.deepEqual(plain(result.preview.map(item=>item.price_state.code)),['calculated_complete','latest_generation_unreflected','timeout_error','original_fallback']);
  assert.equal(result.latest_generation_id,12);
  assert.deepEqual(plain(result.summary.price_states),{calculated_complete:1,latest_generation_unreflected:1,timeout_error:1,original_fallback:1});
  assert.equal(result.canGenerate,false);
  assert.equal(result.safety.price_complete,false);
  assert.equal(result.preview[1].diff.price.after.final,5000,'stale price keeps the carrier original');
  assert.equal(result.preview[2].diff.price.after.final,5000,'timeout price keeps the carrier original');
  assert.equal(result.items.filter(item=>['STALE','TIMEOUT','FALLBACK'].includes(item.sellpia_sku_code)&&item.field_key==='sellpia_sale_price').length,0,'unsafe price candidates must never enter serializer items');
});

test('complete price draft wins over stale or failed calculation metadata',()=>{
  const draft={after_value:5500,price_base_after:5200,price_discounted_base_after:5000,price_option_after:500,price_final_after:5500,price_discount_terms_after:[]};
  const result=exportHarness([]).api.prepareCarrierItems('smartstore','carrier.xlsx',[{product_code:'P-1',option_code:'O-1',source_row_no:7,base_price:5000,discounted_base_price:5000,option_price:0,final_price:5000,stock:8,discount_terms:[]}],[row({price_draft:draft,registration_status:'error',registration_error:'statement timeout',registration_generation_id:11,discount_generation_id:11,option_generation_id:11,final_generation_id:11})]);
  assert.equal(result.preview[0].price_state.code,'calculated_complete');
  assert.equal(result.preview[0].price_state.safe,true);
  assert.equal(result.preview[0].diff.price.after.final,5500);
  assert.equal(result.canGenerate,true);
});

test('fully calculated carrier plan is eligible for the connected XLSX serializer',()=>{
  const calculated={registration_price:5100,registration_status:'calculated',registration_generation_id:12,discount_price:5000,discount_status:'calculated',discount_generation_id:12,option_price:100,option_status:'calculated',option_generation_id:12,final_price:5100,final_status:'calculated',final_generation_id:12};
  const result=exportHarness([]).api.prepareCarrierItems('smartstore','carrier.xlsx',[{product_code:'P-1',option_code:'O-1',source_row_no:7,base_price:5000,discounted_base_price:5000,option_price:0,final_price:5000,stock:8,discount_terms:[]}],[row(calculated)]);
  assert.equal(result.canGenerate,true);
  assert.equal(result.safety.can_generate_xlsx,true);
  assert.equal(result.xlsx_connected,true);
  assert.equal(result.preview_only,false);
  assert.equal(result.operations,result.items);
});

test('location is required only for an actual visible write',async()=>{
  const h=exportHarness([
    row({sku:'NOOP',source_file_name:null,source_row_no:null,stock_draft:{after_value:8}}),
    row({sku:'WRITE',source_file_name:null,source_row_no:null,stock_draft:{after_value:9}}),
    row({sku:'ROWZERO',source_file_name:'smart.xlsx',source_row_no:0,stock_draft:{after_value:9}})
  ]);
  const result=await h.api.refreshItems([],files,{sources:['smartstore'],includeMatrixStock:true});
  assert.equal(result.items.length,0);
  assert.deepEqual(plain(result.excludedItems.map(item=>item.item.sellpia_sku_code)),['WRITE','ROWZERO']);
  assert.equal(h.api.validSourceLocation({source_file_name:'a.xlsx',source_row_no:null}),false);
  assert.equal(h.api.validSourceLocation({source_file_name:'a.xlsx',source_row_no:1}),true);
});

test('direct export fails closed when snapshot RPC support is unavailable',async()=>{
  const context={console,SystemV3Data:{loadStoredMatrixPrices(){throw Error('must not run');}}};
  vm.createContext(context);vm.runInContext(mathSource,context);vm.runInContext(exportSource,context);
  await assert.rejects(context.HubCurrentPriceExport.refreshItems([],new Map(),{sources:['smartstore'],includeMatrixStock:true}),/스냅샷/);
});

test('snapshot reader paginates 14000 rows without legacy reads or staging',async()=>{
  const functionSource=dataSource.slice(dataSource.indexOf('  async function loadMatrixExportSnapshot('),dataSource.indexOf('  async function summarizeMatrixStocksForExport('));
  const calls=[];
  const context={ruleRegistry:async()=>({rules:[],assignments:[]}),cleanText:value=>String(value??'').trim(),requireOperationsHubSessionToken:()=> 'session',readableDatabaseError:error=>error,db:{rpc:async(name,args)=>{
    assert.equal(name,'hub_matrix_export_snapshot_v1');calls.push(args);
    const start=calls.length-1,from=start*1000,count=Math.min(1000,14000-from);
    const rows=Array.from({length:count},(_,index)=>({sku:`SKU-${String(from+index).padStart(5,'0')}`}));
    return {data:{snapshot_id:'same-snapshot',rows,next_cursor:rows.at(-1)?.sku||null,has_more:from+count<14000},error:null};
  }}};
  vm.createContext(context);vm.runInContext(functionSource+'\nthis.load=loadMatrixExportSnapshot;',context);
  const result=await context.load({source:'smartstore'});
  assert.equal(result.rows.length,14000);
  assert.equal(calls.length,14);
  assert.equal(calls.every(call=>call.p_limit===1000),true);
  assert.equal(calls[0].p_after_sku,null);
  assert.equal(calls[13].p_after_sku,'SKU-12999');
});

test('carrier mapping lookup reads only requested seller product identities before snapshot',async()=>{
  const functionSource=dataSource.slice(dataSource.indexOf('  async function loadCarrierSellerMappings('),dataSource.indexOf('  async function loadSystemStocks('));
  const calls=[];
  const context={cleanText:value=>String(value??'').trim(),readableDatabaseError:error=>error,db:{from:table=>({select:fields=>({in:(field,values)=>({order:()=>({range:async(from,to)=>{calls.push({table,fields,field,values,from,to});return {data:[{sellpia_sku_code:'SKU-1',smartstore_product_code:'P-1',smartstore_option_code:'O-1'}],error:null};}})})})})}};
  vm.createContext(context);vm.runInContext(functionSource+'\nthis.load=loadCarrierSellerMappings;',context);
  const result=await context.load({source:'smartstore',identities:[{product_code:'P-1',option_code:'O-1'},{product_code:'P-1',option_code:'O-2'}]});
  assert.deepEqual(plain(result.rows),[{sku:'SKU-1',product_code:'P-1',option_code:'O-1'}]);
  assert.equal(calls.length,1);
  assert.deepEqual(plain(calls[0].values),['P-1']);
  assert.equal(calls[0].table,'operations_hub_matrix_cached');
  assert.equal(calls[0].field,'smartstore_product_code');
});

test('carrier serializer receives the exact TransformationPlan operations',async()=>{
  const functionSource=appSource.slice(appSource.indexOf('async function transformStandardCarrierExport('),appSource.indexOf('\nasync function prepareChangedOnlyExport('));
  const operations=[{export_item_id:1,field_key:'sellpia_sale_price'}],otherItems=[{export_item_id:2,field_key:'sellpia_current_stock'}],calls=[];
  const sellerExport={transformSellerFile:async(file,items)=>{calls.push({file,items});return {blob:{},appliedItems:items,skippedItems:[]};},downloadBlob(){throw Error('download must stay off');},conflictCsv(){return '';},outputName(name){return name;}};
  const transform=Function('sellerExport',`${functionSource}; return transformStandardCarrierExport;`)(sellerExport);
  const plan={source:'smartstore',file:{name:'carrier.xlsx'},operations,items:otherItems,excludedItems:[]};
  const result=await transform(plan,{download:false});
  assert.equal(calls.length,1);
  assert.equal(calls[0].items,operations);
  assert.equal(result.appliedItems,operations);
});

test('UI is display-only and RPC reads live drafts with same-generation metadata',()=>{
  for(const marker of ['판매처 반영','수정안 있음','미반영','기준재고 없음','원본 위치 없음'])assert.ok(flowSource.includes(marker),marker);
  assert.doesNotMatch(flowSource,/prepareReliableInventory|beginReliableExportJob|stageSellerInventoryDraftBatch/);
  assert.match(migration,/operations_hub_active_seller_drafts sd/);
  assert.match(migration,/operations_hub_active_seller_drafts pd/);
  for(const marker of ['registration_generation_id','discount_generation_id','option_generation_id','final_generation_id'])assert.ok(migration.includes(marker),marker);
});
