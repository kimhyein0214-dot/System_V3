(function(g){
 'use strict';
 const sources=['smartstore','makeshop','ably'];
 const price=item=>item.field_key==='sellpia_sale_price';
 const group=item=>JSON.stringify([item.source_channel,item.seller_product_code]);
 async function refreshItems(items,filesBySource,{sources:selected=sources,skus=null,includeRules=true,onProgress}={}){
  if(!includeRules)return {items:await g.HubPlatformRules.refreshExportItems(items,filesBySource),excludedItems:[]};
  const D=g.SystemV3Data,M=g.HubRuleRegistry,P=g.HubPlatformRules;
  const registry=await D.ruleRegistry('list');
  const configs=Object.fromEntries(await Promise.all(selected.map(async source=>[source,await P.settings(source)])));
  const requested=[...new Set(skus??(await D.loadAllFilteredSkus({status:'all'})).skus)];
  if(!requested.length)return {items:[...items],excludedItems:[]};
  const applicable=Object.fromEntries(selected.map(source=>[source,new Set(registry.assignments.filter(a=>a.target_field!=='calculated_stock'&&(!a.scope||a.scope===source)).map(a=>a.sku))]));
  const candidates=Object.fromEntries(selected.map(source=>[source,requested.filter(sku=>configs[source].id||applicable[source].has(sku))]));
  if(!Object.values(candidates).some(list=>list.length))return {items:[...items],excludedItems:[]};
  onProgress?.('계산 대상 상품의 전체 옵션을 확인합니다.');
  const siblings=Object.fromEntries(await Promise.all(selected.map(async source=>[source,candidates[source].length?await D.loadRulePlatformSiblings(candidates[source],source):[]])));
  const all=M.expandSkus([...new Set(Object.values(siblings).flat().concat(Object.values(candidates).flat()))],registry.dependencies,false,{maxSkus:50000});
  const products=Object.fromEntries((await D.loadFormulaProducts(all,{onProgress:(done,total)=>onProgress?.(`최신 가격 데이터 ${done.toLocaleString('ko-KR')} / ${total.toLocaleString('ko-KR')} SKU`)})).map(p=>[p.sellpia_sku_code,p]));
  let output=[...items],excludedItems=[],nextId=-1;
  for(const source of selected){
   const linked=sku=>products[sku]?.__sellerPriceComponents?.[source]?.seller_product_code;
   const targets=candidates[source].filter(linked);
   // Missing source data is an error; an existing SKU without this seller connection is out of scope.
   const missing=candidates[source].filter(sku=>!products[sku]);
   if(missing.length)throw Error(`최신 SKU 원본을 읽지 못했습니다: ${missing.slice(0,10).join(', ')}`);
   if(!targets.length)continue;
   const productCodes=new Set(targets.map(linked)),groupSkus=siblings[source].filter(sku=>productCodes.has(linked(sku)));
   onProgress?.(`${source} · 최신 수식 가격과 수동 수정값을 계산합니다.`);
   const result=await P.calculate(targets,source,{registry,config:configs[source],products,siblings:groupSkus});
   const files=filesBySource.get(source)||[];if(!files.length)throw Error(source+': 최신 보관 원본 파일이 없습니다.');
   const parsed=await g.SystemV3SellerParsers.parseSellerFiles(source,files,{price:true,discount:true});
   const partition=P.partitionExportGroups(result,parsed.normalizedRows);
   const affected=new Set([...partition.items,...partition.excludedItems.map(e=>e.item)].map(group));
   const originals=new Map(output.filter(i=>i.source_channel===source&&price(i)).map(i=>[i.sellpia_sku_code,i]));
   output=output.filter(i=>!(price(i)&&affected.has(group(i))));
   const calculated=new Map(result.rows.map(r=>[r.sku,r]));
   output.push(...partition.items.map(item=>({...originals.get(item.sellpia_sku_code),...item,
    export_item_id:originals.get(item.sellpia_sku_code)?.export_item_id??nextId--,
    rule_generated:true,rule_versions:calculated.get(item.sellpia_sku_code)?.versions||[]})));
   excludedItems.push(...partition.excludedItems.map(entry=>{const original=originals.get(entry.item.sellpia_sku_code),id=original?.export_item_id??nextId--;return {...entry,export_item_id:id,item:{...original,...entry.item,export_item_id:id}};}));
  }
  return {items:output,excludedItems};
 }
 async function buildArchive(files,items,onProgress,excludedItems=[]){
  let remaining=[...items],excluded=[...excludedItems];
  while(true){
   const archive=await g.SystemV3SellerExport.buildExportArchive(files,remaining,onProgress,excluded);
   const ruleGroups=new Set(remaining.filter(i=>i.rule_generated).map(group));
   const remainingIds=new Set(remaining.map(item=>Number(item.export_item_id)));
   // Initial calculation exclusions are already settled. Only a new serializer
   // conflict on an item attempted in this pass can roll its shared-price group back.
   const blocked=new Map(archive.skippedItems.filter(e=>remainingIds.has(Number(e.export_item_id??e.item?.export_item_id))&&price(e.item)&&ruleGroups.has(group(e.item))).map(e=>[group(e.item),e.reason]));
   if(!blocked.size)return archive;
   excluded.push(...remaining.filter(i=>price(i)&&blocked.has(group(i))).map(item=>({item,export_item_id:item.export_item_id,reason:'상품 묶음 전체 제외: '+blocked.get(group(item))})));
   remaining=remaining.filter(i=>!(price(i)&&blocked.has(group(i))));
  }
 }
 g.HubCurrentPriceExport={refreshItems,buildArchive};
})(typeof window==='undefined'?globalThis:window);
