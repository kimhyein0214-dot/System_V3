(function(g){
 'use strict';
 const sources=['smartstore','makeshop','ably'];
 const price=item=>item.field_key==='sellpia_sale_price';
 const group=item=>JSON.stringify([item.source_channel,item.seller_product_code]);
 async function refreshItems(items,filesBySource,{sources:selected=sources,skus=null,includeRules=true,onProgress}={}){
  if(!includeRules)return {items:[...items],excludedItems:[]};
  const selectedSources=[...new Set(selected.filter(source=>sources.includes(source)))],requested=skus===null?null:[...new Set(skus)];
  if(!selectedSources.length||requested&& !requested.length)return {items:[...items],excludedItems:[]};
  if(!g.SystemV3Data?.loadStoredMatrixPrices)throw Error('저장된 매트릭스 가격 조회 모듈을 불러오지 못했습니다.');
  onProgress?.('저장된 매트릭스 가격을 읽습니다.');
  const stored=await g.SystemV3Data.loadStoredMatrixPrices({sources:selectedSources,skus:requested,onProgress});
  if(!Array.isArray(stored?.rows)||!Array.isArray(stored?.missing))throw Error('저장된 매트릭스 가격 응답이 유효하지 않습니다.');
  const scope=new Set(selectedSources),requestedSet=requested&&new Set(requested),inScope=item=>scope.has(item.source_channel)&&(!requestedSet||requestedSet.has(item.sellpia_sku_code));
  let output=items.filter(item=>!price(item)||!inScope(item)),excludedItems=[],nextId=items.reduce((minimum,item)=>Math.min(minimum,Number(item.export_item_id)||0),0)-1;
  const excludedKeys=new Set(),exclude=(row,reason)=>{const key=JSON.stringify([row.source_channel||'',row.sellpia_sku_code||row.sku||'',row.seller_product_code||'',row.seller_option_code||'']);if(excludedKeys.has(key))return;excludedKeys.add(key);const id=nextId--;excludedItems.push({export_item_id:id,item:{export_item_id:id,sellpia_sku_code:row.sellpia_sku_code||row.sku||'',source_channel:row.source_channel||'',seller_product_code:row.seller_product_code||'',seller_option_code:row.seller_option_code||'',field_key:'sellpia_sale_price'},reason});};
  const key=row=>JSON.stringify([row.seller_product_code||row.product_code,row.seller_option_code??row.option_code??'']);
  const termKey=terms=>JSON.stringify((terms||[]).map(({title,input_source,term_type,...term})=>Object.fromEntries(Object.entries(term).sort(([a],[b])=>a.localeCompare(b)))).sort((a,b)=>String(a.term_key).localeCompare(String(b.term_key))));
  for(const source of selectedSources){
   const rows=stored.rows.filter(row=>row.source_channel===source&&(!requestedSet||requestedSet.has(row.sellpia_sku_code))),valid=[];
   for(const row of rows){
    if(row.error||['error','failed','missing','stale'].includes(row.status)){exclude(row,'저장된 매트릭스 가격 오류: '+(row.error||row.status));continue;}
    if(!row.seller_product_code)continue;
    const values=[row.base_price,row.discounted_base_price,row.option_price,row.final_price];
    if(values.some(value=>!['number','string'].includes(typeof value)||String(value).trim()===''||!Number.isSafeInteger(Number(value)))||[0,1,3].some(index=>Number(values[index])<0)||Number(row.discounted_base_price)+Number(row.option_price)!==Number(row.final_price)||!Array.isArray(row.discount_terms)){
     exclude(row,'저장된 매트릭스 가격값이 유효하지 않습니다.');continue;
    }
    valid.push(row);
   }
   if(!valid.length)continue;
   const files=filesBySource.get(source)||[];if(!files.length)throw Error(source+': 최신 보관 원본 파일이 없습니다.');
   onProgress?.(`${source} · 저장된 가격을 원본 위치에 연결합니다.`);
   const parsed=await g.SystemV3SellerParsers.parseSellerFiles(source,files,{price:true,discount:true}),originals=new Map();
   for(const row of parsed.normalizedRows){const identity=key(row);if(!originals.has(identity))originals.set(identity,[]);originals.get(identity).push(row);}
   const candidates=new Map();
   for(const row of valid){const identity=key(row),matches=originals.get(identity)||[];
    if(matches.length!==1){exclude(row,matches.length?'수정할 원본 상품·옵션이 여러 행에 있습니다.':'선택 원본에서 판매처 상품·옵션을 찾지 못했습니다.');continue;}
    if(!candidates.has(identity))candidates.set(identity,[]);candidates.get(identity).push(row);
   }
   const generated=[];
   for(const [identity,rows] of candidates){
    const signature=row=>JSON.stringify([Number(row.base_price),Number(row.discounted_base_price),Number(row.option_price),Number(row.final_price),termKey(row.discount_terms)]);
    if(new Set(rows.map(signature)).size>1){for(const row of rows)exclude(row,'같은 원본 옵션의 저장된 매트릭스 가격이 서로 다릅니다.');continue;}
    const row=rows[0],original=originals.get(identity)[0],id=nextId--;
    generated.push({export_item_id:id,sellpia_sku_code:row.sellpia_sku_code,source_channel:source,field_key:'sellpia_sale_price',seller_product_code:row.seller_product_code,seller_option_code:row.seller_option_code||'',source_file_name:original.raw_payload?.source_file_name,source_row_no:original.source_row_no,expected_source_value:original.final_price??original.price,before_value:original.final_price??original.price,after_value:Number(row.final_price),base_price:original.base_price,option_price:original.option_price,target_base_price:Number(row.base_price),target_discounted_base_price:Number(row.discounted_base_price),target_option_price:Number(row.option_price),target_final_price:Number(row.final_price),source_discount_terms:original.discount_terms||[],target_discount_terms:row.discount_terms,stored_matrix_price:true,rule_versions:rows.flatMap(row=>row.rule_versions||[]),price_version:row.price_version,generation_id:row.generation_id,target_component_skus:rows.map(row=>row.sellpia_sku_code)});
   }
   // Preserve an unmapped option's original final price when writing a stored shared base.
   const mapped=new Set(generated.map(key)),targets=new Map(generated.map(item=>[item.seller_product_code,item])),changedProducts=new Set(),unsafe=new Map();
   if(source!=='ably')for(const item of generated)if(item.target_base_price!==Number(item.base_price)||termKey(item.source_discount_terms)!==termKey(item.target_discount_terms))changedProducts.add(item.seller_product_code);
   const productsWithOptions=new Set(parsed.normalizedRows.filter(row=>row.option_code).map(row=>row.product_code));
   for(const original of parsed.normalizedRows){
    const identity=key(original);if(!changedProducts.has(original.product_code)||mapped.has(identity))continue;
    if(source==='makeshop'&&!original.option_code&&productsWithOptions.has(original.product_code))continue;
    const target=targets.get(original.product_code),raw=original.final_price??original.price,final=Number(raw),option=final-target.target_discounted_base_price;
    if(raw===null||raw===undefined||raw===''||!Number.isSafeInteger(final)||final<0||!Number.isSafeInteger(option)||originals.get(identity).length!==1){unsafe.set(original.product_code,'미연결 옵션의 원본 최종가 또는 원본 위치를 확인할 수 없습니다.');continue;}
    generated.push({...target,export_item_id:nextId--,sellpia_sku_code:null,target_component_skus:[],preserve_unmapped:true,seller_option_code:original.option_code||'',source_file_name:original.raw_payload?.source_file_name,source_row_no:original.source_row_no,expected_source_value:final,before_value:final,after_value:final,base_price:original.base_price,option_price:original.option_price,target_option_price:option,target_final_price:final,source_discount_terms:original.discount_terms||[]});mapped.add(identity);
   }
   for(const item of generated)if(unsafe.has(item.seller_product_code))exclude(item,unsafe.get(item.seller_product_code));else output.push(item);
  }
  for(const missing of stored.missing){const row=typeof missing==='string'?{sellpia_sku_code:missing,source_channel:selectedSources.length===1?selectedSources[0]:''}:missing;exclude(row,'저장된 매트릭스 가격 없음: '+(row.reason||row.error||'저장값을 찾지 못했습니다.'));}
  return {items:output,excludedItems};
 }
 async function buildArchive(files,items,onProgress,excludedItems=[]){
  let remaining=[...items],excluded=[...excludedItems];
  while(true){
   const archive=await g.SystemV3SellerExport.buildExportArchive(files,remaining,onProgress,excluded);
   const ruleGroups=new Set(remaining.filter(i=>i.stored_matrix_price||i.rule_generated).map(group));
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
