import assert from 'node:assert/strict';
import {test} from 'node:test';
await import('../mockups/operations-hub/rule-registry.js');
await import('../mockups/operations-hub/discount-price-math.js');
await import('../mockups/operations-hub/seller-export-adapter.js');
await import('../mockups/operations-hub/platform-rule-service.js');
const api=globalThis.HubPlatformRules;
const row=(sku,product,option,base=200)=>({sku,component:{seller_product_code:product,seller_option_code:option},platformBase:base,platformDiscount:0,platformOption:0,platformFinal:base,platformTerms:[],versions:[]});
const original=(product,option,base=100)=>({product_code:product,option_code:option,base_price:base,final_price:base,option_price:0,discount_terms:[],source_row_no:2,raw_payload:{source_file_name:'original.xlsx'}});
test('bulk export excludes whole invalid groups and never recalculates an incomplete group',()=>{
 const result={source:'makeshop',rows:[row('good','G','1'),row('duplicate1','D','1'),row('duplicate2','D','1'),row('missing1','M','1'),row('missing2','M','2'),row('unmapped','U','1'),row('errorSibling','E','1'),row('sourceDuplicate','S','1')],errors:[{sku:'errorSku',product_code:'E',error:'invalid cost'}]};
 const originals=[original('G','1'),original('D','1'),original('M','1'),original('U','1'),original('U','2'),original('E','1'),original('E','2'),original('S','1'),original('S','1')];
 const partition=api.partitionExportGroups(result,originals);
 assert.deepEqual(partition.items.map(i=>i.sellpia_sku_code),['good']);assert.equal(partition.items[0].target_base_price,200);
 assert.equal(partition.excludedItems.length,8);assert.equal(new Set(partition.excludedItems.map(i=>i.item.export_item_id)).size,8);
 assert.ok(partition.excludedItems.every(i=>i.item.seller_product_code&&i.item.sellpia_sku_code&&i.reason));
 assert.throws(()=>api.itemsFromCalculation({...result,rows:result.rows.slice(1,3)},originals),/여러 SKU/,'strict manual queue mapper must still reject duplicates');
});
test('unmapped originals are allowed only when shared base and discounts remain unchanged',()=>{
 const result={source:'makeshop',rows:[row('same','P','1',100)],errors:[]};
 assert.equal(api.partitionExportGroups(result,[original('P','1'),original('P','2')]).items.length,1);
 result.rows[0].platformTerms=[{term_key:'period',value:10,unit:'amount',is_baseline:true}];
 assert.equal(api.partitionExportGroups(result,[original('P','1'),original('P','2')]).items.length,0);
});
test('exportLatest passes exclusions into archive, records only applied rows, and rejects zero valid groups',async()=>{
 const reg={rules:[],assignments:[],dependencies:[]},config={id:'config',version:1,body:{source:'makeshop',anchor:'lowest',mode:'forward'}};
 let includeGood=true,saves=0,received;
 globalThis.SystemV3Data={ruleRegistry:async()=>reg,workDocument:async(action,kind,payload)=>{if(action==='list')return [{id:'config',title:'registry-platform:makeshop'}];if(action==='get')return config;saves++;assert.equal(payload.body.sku_count,1);return payload;},loadRulePlatformSiblings:async()=>[],loadFormulaProducts:async()=>[
  ...(includeGood?[{sellpia_sku_code:'good',system_base_price:200,__sellerPriceComponents:{makeshop:{seller_product_code:'G',seller_option_code:'1'}}}]:[]),
  {sellpia_sku_code:'bad1',system_base_price:200,__sellerPriceComponents:{makeshop:{seller_product_code:'D',seller_option_code:'1'}}},
  {sellpia_sku_code:'bad2',system_base_price:300,__sellerPriceComponents:{makeshop:{seller_product_code:'D',seller_option_code:'1'}}}],downloadLatestSellerOriginals:async()=>new Map([['makeshop',[{name:'original.xlsx'}]]])};
 globalThis.SystemV3SellerParsers={parseSellerFiles:async()=>({normalizedRows:[original('G','1'),original('D','1')]})};
 const actual=globalThis.SystemV3SellerExport;
 globalThis.SystemV3SellerExport={...actual,buildExportArchive:async(files,items,progress,excluded)=>{received=excluded;return {appliedItems:items,skippedItems:excluded,manifest:[],blob:new Blob()};}};
 try{
  const result=await api.exportLatest(['good','bad1','bad2'],'makeshop');assert.equal(result.appliedItems.length,1);assert.equal(received.length,2);assert.equal(saves,1);
  includeGood=false;
  await assert.rejects(api.exportLatest(['bad1','bad2'],'makeshop'),error=>error.preflightFailure&&error.skippedItems.length===2&&/내보낼 수/.test(error.message));assert.equal(saves,1,'empty exports must not save success history');
  globalThis.SystemV3Data.loadFormulaProducts=async()=>[{sellpia_sku_code:'bad',system_base_price:200,__sellerPriceComponents:{makeshop:{seller_product_code:'known-product',seller_option_code:'1',draft_change_id:1,pricing_input_mode:'option',option_price_source:'manual',draft_option_price:'invalid'}}}];
  const failure=await api.calculate(['bad'],'makeshop');assert.equal(failure.errors[0].product_code,'known-product','calculation failures must retain product identity before row construction succeeds');
 }finally{globalThis.SystemV3SellerExport=actual;}
});
test('late serializer conflict rebuilds untouched originals without any member of the failed product',async()=>{
 const products=[['a1','A','1'],['a2','A','2'],['b','B','1']].map(([sku,product,option])=>({sellpia_sku_code:sku,system_base_price:200,__sellerPriceComponents:{ably:{seller_product_code:product,seller_option_code:option}}}));
 const originalFile={name:'original.xlsx'};let builds=0,saves=0;
 globalThis.SystemV3Data={ruleRegistry:async()=>({rules:[],assignments:[],dependencies:[]}),workDocument:async(action,kind,payload)=>{if(action==='list')return [];if(action==='save'){saves++;assert.equal(payload.body.sku_count,1);return payload;}},loadRulePlatformSiblings:async()=>[],loadFormulaProducts:async()=>products,downloadLatestSellerOriginals:async()=>new Map([['ably',[originalFile]]])};
 globalThis.SystemV3SellerParsers={parseSellerFiles:async()=>({normalizedRows:[original('A','1'),original('A','2'),original('B','1')]})};
 const actual=globalThis.SystemV3SellerExport;
 globalThis.SystemV3SellerExport={...actual,buildExportArchive:async(files,items,progress,excluded)=>{
  assert.equal(files.get('ably')[0],originalFile,'every rebuild starts from the original file');builds++;
  if(builds===1)return {appliedItems:items.filter(i=>i.sellpia_sku_code!=='a2'),skippedItems:[{item:items.find(i=>i.sellpia_sku_code==='a2'),reason:'baseline conflict'}],manifest:[]};
  assert.deepEqual(items.map(i=>i.sellpia_sku_code),['b']);assert.deepEqual(excluded.map(i=>i.item.sellpia_sku_code),['a1','a2']);
  return {appliedItems:items,skippedItems:excluded,manifest:[]};
 }};
 try{const output=await api.exportLatest(['a1','a2','b'],'ably');assert.equal(builds,2);assert.equal(saves,1);assert.equal(output.skippedItems.length,2);}finally{globalThis.SystemV3SellerExport=actual;}
});
