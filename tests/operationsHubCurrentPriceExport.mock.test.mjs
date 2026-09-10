import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import JSZip from 'jszip';
import '../mockups/operations-hub/rule-registry.js';
import '../mockups/operations-hub/discount-price-math.js';
import '../mockups/operations-hub/platform-rule-service.js';
import '../mockups/operations-hub/seller-export-adapter.js';
import '../mockups/operations-hub/current-price-export.js';
const api=globalThis.HubCurrentPriceExport,clone=value=>structuredClone(value),sources=['smartstore','makeshop','ably'];
function fixture(){
 const calls={products:[],siblings:[],registry:0,all:0,parse:[]};
 const rules=[{id:'half',name:'14k일괄2배테스트',target_field:'calculated_base_price',input_origin:'self',source_field:'purchase_price',scope:'',config:{steps:[{op:'divide',value:2}]},version:7,is_active:true}];
 const products=Object.fromEntries(['A','B','C','D','U'].map((sku,i)=>[sku,{sellpia_sku_code:sku,sellpia_source_purchase_price:10000+i*4000,system_base_price:99999,__sellerDrafts:{},__sellerPriceComponents:sku==='U'?{}:Object.fromEntries(sources.map(source=>[source,{seller_product_code:['A','B'].includes(sku)?'P':'Q',seller_option_code:sku,source_base_price:9000,source_option_price:0,source_final_price:9000,source_discount_terms:[]}]))}]));
 const registry={rules,assignments:Object.keys(products).map(sku=>({sku,rule_id:'half',target_field:'calculated_base_price',scope:''})),dependencies:[]};
 const originals=Object.fromEntries(sources.map(source=>[source,['A','B','C','D'].map((sku,i)=>({product_code:products[sku].__sellerPriceComponents[source].seller_product_code,option_code:sku,base_price:9000,option_price:0,final_price:9000,discount_terms:[],source_row_no:i+2,raw_payload:{source_file_name:source+'.csv'}}))]));
 const files=new Map(sources.map(source=>[source,[{name:source+'.csv'}]]));
 globalThis.SystemV3Data={ruleRegistry:async action=>{assert.equal(action,'list');calls.registry++;return clone(registry);},workDocument:async action=>{assert.equal(action,'list');return [];},loadAllFilteredSkus:async filter=>{assert.equal(filter.status,'all');calls.all++;return {skus:Object.keys(products)};},loadRulePlatformSiblings:async(skus,source)=>{calls.siblings.push({skus:[...skus],source});const codes=new Set(skus.map(sku=>products[sku]?.__sellerPriceComponents?.[source]?.seller_product_code).filter(Boolean));return Object.keys(products).filter(sku=>codes.has(products[sku].__sellerPriceComponents?.[source]?.seller_product_code));},loadFormulaProducts:async skus=>{calls.products.push([...skus]);return skus.map(sku=>products[sku]).filter(Boolean).map(clone);}};
 globalThis.SystemV3SellerParsers={parseSellerFiles:async(source,files,options)=>{calls.parse.push(source);assert.equal(files[0].name,source+'.csv');assert.equal(options.price,true);return {normalizedRows:clone(originals[source])};}};
 const stock={export_item_id:91,sellpia_sku_code:'A',source_channel:'ably',field_key:'sellpia_current_stock',seller_product_code:'P',seller_option_code:'A',source_file_name:'ably.csv',source_row_no:2,expected_source_value:40,after_value:7};
 return {calls,products,registry,originals,files,stock};
}
{
 const f=fixture(),r=await api.refreshItems([f.stock],f.files,{sources:['ably'],skus:['A']});
 assert.deepEqual(r.excludedItems,[]);assert.equal(r.items.find(i=>i.field_key==='sellpia_current_stock'),f.stock,'original stock item identity retained');
 const price=r.items.filter(i=>i.field_key==='sellpia_sale_price');assert.deepEqual(price.map(i=>[i.sellpia_sku_code,i.target_base_price,i.target_option_price,i.target_final_price]),[['A',5000,0,5000],['B',5000,2000,7000]]);assert.ok(price.every(i=>i.rule_generated&&i.rule_versions.some(v=>v.id==='half'&&v.version===7)));assert.equal(new Set(price.map(i=>i.export_item_id)).size,2);
 assert.deepEqual(f.calls.products,[['A','B']]);assert.deepEqual(f.calls.siblings,[{source:'ably',skus:['A']}]);assert.deepEqual(f.calls.parse,['ably']);assert.equal(f.calls.all,0);
 f.products.A.sellpia_source_purchase_price=12000;const fresh=await api.refreshItems([],f.files,{sources:['ably'],skus:['A']});assert.equal(fresh.items.find(i=>i.sellpia_sku_code==='A').target_final_price,6000,'fresh data, not cached UI/manual drafts');
}
{
 const f=fixture(),r=await api.refreshItems([],f.files,{skus:['A']});assert.equal(r.items.length,6);assert.deepEqual(new Set(r.items.map(i=>i.source_channel)),new Set(sources));assert.equal(f.calls.products.length,1,'one shared latest product load across3 platforms');assert.deepEqual(f.calls.products[0],['A','B']);assert.equal(f.calls.registry,1,'context avoids repeated registry reads');
 const unlinked=await api.refreshItems([f.stock],new Map(),{sources:['ably'],skus:['U']});assert.deepEqual(unlinked.items,[f.stock]);assert.deepEqual(unlinked.excludedItems,[]);assert.equal(f.calls.parse.length,3,'unlinked seller scope ignored without requiring source files');
}
{
 const f=fixture();f.originals.ably.push(clone(f.originals.ably[0]));f.products.D.sellpia_source_purchase_price=null;
 const stalePrice={...f.stock,export_item_id:92,field_key:'sellpia_sale_price',after_value:99999};
 const r=await api.refreshItems([f.stock,stalePrice],f.files,{sources:['ably']});assert.equal(r.items[0],f.stock);assert.deepEqual(r.items.slice(1).map(i=>i.sellpia_sku_code),['C'],'valid sibling survives another SKU calculation error');assert.equal(r.excludedItems.length,3);assert.ok(r.excludedItems.some(e=>/동일 판매처 상품·옵션/.test(e.reason)));assert.ok(r.excludedItems.some(e=>/매입가 없음/.test(e.reason)));assert.deepEqual(new Set(r.excludedItems.map(e=>e.item.seller_product_code)),new Set(['P','Q']));assert.equal(f.calls.all,1);
}
{
 const f=fixture();f.registry.assignments=f.registry.assignments.map(a=>({...a,target_field:'platform_registration_price',scope:'smartstore'}));const r=await api.refreshItems([f.stock],f.files,{sources:['ably'],skus:['A']});assert.deepEqual(r.items,[f.stock]);assert.equal(f.calls.products.length,0,'other platform assignments do not expand scope');
}
// Real serializer integration: one bad option rolls its entire price group back,
// while the original stock change and another product remain in the final ZIP.
{
 const source=await readFile(process.env.XLSX_BROWSER_SCRIPT||new URL('../../xlsx.full.min.js',import.meta.url),'utf8');const sandbox={module:{exports:{}},exports:{},require:createRequire(import.meta.url)};sandbox.exports=sandbox.module.exports;vm.runInNewContext(source,sandbox);globalThis.XLSX=sandbox.module.exports;
 // JSZip's Node runtime cannot read Blob directly; adapt transport only, retaining its real ZIP implementation.
 class NodeZip extends JSZip{file(name,value,...args){return super.file(name,value instanceof Blob?value.arrayBuffer().then(b=>new Uint8Array(b)):value,...args);}}
 globalThis.JSZip=NodeZip;
 const rows=[Array.from({length:16},(_,i)=>'header'+i),...['A','B','C'].map(sku=>{const row=Array(16).fill('');row[0]=sku==='C'?'Q':'P';row[2]='원본 상품';row[4]=9000;row[5]=9000;row[6]=9000;row[10]=sku;row[14]='원본 옵션';row[15]=40;return row;})];
 const csv=XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));const file=new File([csv],'ably.csv',{type:'text/csv'}),files=new Map([['ably',[file]]]);
 const item=(sku,index)=>({export_item_id:index,sellpia_sku_code:sku,source_channel:'ably',field_key:'sellpia_sale_price',seller_product_code:sku==='C'?'Q':'P',seller_option_code:sku,source_file_name:'ably.csv',source_row_no:index+1,expected_source_value:sku==='B'?12345:9000,after_value:5000,target_base_price:5000,target_discounted_base_price:5000,target_option_price:0,target_final_price:5000,target_discount_terms:[],rule_generated:true});
 const stock={...item('A',1),export_item_id:91,field_key:'sellpia_current_stock',expected_source_value:40,after_value:7,rule_generated:false};
 const archive=await api.buildArchive(files,[stock,item('A',1),item('B',2),item('C',3)]);
 assert.deepEqual(archive.appliedItems.map(i=>[i.sellpia_sku_code,i.field_key]),[['A','sellpia_current_stock'],['C','sellpia_sale_price']]);assert.equal(archive.skippedItems.length,2);assert.ok(archive.skippedItems.every(e=>/상품 묶음 전체 제외/.test(e.reason)));
 const zip=await JSZip.loadAsync(await archive.blob.arrayBuffer()),output=await zip.file('ably_SystemV3반영.csv').async('string'),book=XLSX.read(output,{type:'string',raw:true}),actual=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
 assert.equal(Number(actual[1][6]),9000,'already serialized A price restored from original after sibling failure');assert.equal(Number(actual[2][6]),9000);assert.equal(Number(actual[3][6]),5000,'unrelated valid group retained');assert.equal(Number(actual[1][15]),7,'stock change survives group price rollback');assert.equal(await file.text(),csv,'original source file unchanged');

 const alreadyExcluded={item:item('B',2),export_item_id:2,reason:'SKU 계산 오류: 테스트 제외'};
 const prefiltered=await api.buildArchive(files,[item('A',1),item('C',3)],undefined,[alreadyExcluded]);
 assert.deepEqual(prefiltered.appliedItems.map(i=>i.sellpia_sku_code),['A','C'],'a pre-calculation exclusion must not roll back its valid sibling');
 assert.equal(prefiltered.skippedItems.filter(e=>e.export_item_id===2).length,1);
}
console.log('PASS actual rule/platform/current-export: zero price drafts → latest purchase÷2; originalstock identity; selected scope + requiredsiblings; unlinked ignored; duplicates and invalid products fullyexcluded;3 platforms one productload; actual CSV/ZIP serializer rolls entire conflicted price group back and preservesstock.');
