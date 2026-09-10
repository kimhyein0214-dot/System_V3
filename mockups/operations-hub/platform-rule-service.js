(function(g){
 'use strict';
 const model=()=>g.HubRuleRegistry, data=()=>g.SystemV3Data;
 const ruleFor=(registry,id,field,source)=>{if(!id)return null;const r=registry.rules.find(r=>r.id===id);if(!r||!r.is_active||r.target_field!==field||r.scope!==source)throw Error('판매처 규칙의 단계·판매처를 확인하세요.');model().validateRule(r);return r;};
 function compose(rows,settings,registry){
  const registration=ruleFor(registry,settings.registration_rule_id,'platform_registration_price',settings.source);
  const discountIds=[...new Set(rows.map(r=>r.discount_rule_id||settings.discount_rule_id||''))];
  if(discountIds.length>1)throw Error('같은 판매처 상품에 서로 다른 할인 Rule이 있습니다.');
  const discount=ruleFor(registry,discountIds[0],'platform_discount_price',settings.source);
  if(discount&&(discount.input_origin!=='self'||discount.source_field!=='platform_registration_price'))throw Error('플랫폼 상품 할인 Rule은 해당 상품 등록가격을 입력값으로 선택하세요.');
  if(!rows.length)return [];
  if(!['forward','reverse'].includes(settings.mode)||!['lowest','middle'].includes(settings.anchor))throw Error('플랫폼 계산 방식을 선택하세요.');
  const registrationRules=rows.map(r=>ruleFor(registry,r.registration_rule_id||settings.registration_rule_id,'platform_registration_price',settings.source));
  const amounts=rows.map((r,i)=>r.registrationValue??(registrationRules[i]?model().transform(r.registrationInput??r.value,registrationRules[i].config):r.value));
  const sorted=[...amounts].sort((a,b)=>a-b),anchor=sorted[settings.anchor==='middle'?Math.floor((sorted.length-1)/2):0];
  const original=rows[0].discountTerms||[];
  let base=anchor, discounted;
  if(discount){
   if(settings.mode==='reverse')base=model().inverse(anchor,discount.config);
   discounted=model().transform(base,discount.config);
   if(discounted>base)throw Error('할인 Rule의 계산 결과가 등록가격보다 큽니다.');
  }else{
   if(settings.mode==='reverse'){const inv=g.SystemV3DiscountPriceMath.grossBaseForTarget(anchor,original);if(!inv.exact)throw Error(inv.reason);base=inv.basePrice;}
   discounted=g.SystemV3DiscountPriceMath.discountedBase(base,original);
  }
  const discountKey=settings.source==='makeshop'?'period':'basic';
  const terms=discount?[...original.filter(t=>!t.is_baseline&&t.term_key!==discountKey),...(base===discounted?[]:[{term_key:discountKey,term_type:discountKey,title:discount.name,input_source:'manual',unit:'amount',value:base-discounted,is_baseline:true,rounding_mode:'nearest',rounding_unit:1}])]:original;
  return rows.map((r,i)=>({...r,platformBase:base,platformOption:amounts[i]-anchor,platformDiscount:base-discounted,platformFinal:discounted+amounts[i]-anchor,platformTerms:terms,versions:[...(r.versions||[]),...[registrationRules[i],discount].filter(Boolean).map(x=>({id:x.id,version:x.version}))]}));
 }
 async function settings(source){const docs=await data().workDocument('list','formula');const found=docs.find(d=>d.title==='registry-platform:'+source);return found?await data().workDocument('get','formula',{id:found.id}):{title:'registry-platform:'+source,body:{source,mode:'reverse',anchor:'lowest',registration_rule_id:null,discount_rule_id:null}};}
 async function calculate(skus,source){
  const [registry,config]=await Promise.all([data().ruleRegistry('list'),settings(source)]);
  const requested=[...new Set(skus)];if(!requested.length)throw Error('대상 SKU를 선택하세요.');
  const siblings=await data().loadRulePlatformSiblings(requested,source);
  const targets=[...new Set([...requested,...siblings])];
  const all=model().expandSkus(targets,registry.dependencies);
  const products=Object.fromEntries((await data().loadFormulaProducts(all)).map(p=>[p.sellpia_sku_code,p]));
  const evaluator=model().createEvaluator({...registry,products});
  const groups=new Map(), errors=[];
  for(const sku of targets){try{
   const p=products[sku];if(!p)throw Error('SKU 원본 없음');const component=p.__sellerPriceComponents?.[source];if(!component?.seller_product_code)throw Error('판매처 연결 없음');
   const row={sku,product:p,component,discountTerms:component.source_discount_terms||[],...evaluator.evaluate(sku)};
   for(const kind of ['registration','discount']){
    const assignment=registry.assignments.find(a=>a.sku===sku&&a.target_field==='platform_'+kind+'_price'&&a.scope===source);
    const defaultId=config.body[kind+'_rule_id'];if(assignment&&defaultId&&assignment.rule_id!==defaultId)throw Error('같은 플랫폼 단계에 SKU Rule과 판매처 Rule이 충돌합니다.');
    row[kind+'_rule_id']=assignment?.rule_id||defaultId;
    if(kind==='registration'&&row.registration_rule_id){const rule=ruleFor(registry,row.registration_rule_id,'platform_registration_price',source);let computed;
     if(assignment){computed=evaluator.evaluate(sku,'platform_registration_price',source);row.registrationValue=computed.value;}
     else{if(rule.input_origin!=='self')throw Error('상위 입력 등록 Rule은 SKU 종속관계에 연결하세요.');computed=evaluator.evaluate(sku,rule.source_field,model().isPlatform(rule.source_field)?rule.source_scope||source:'');row.registrationInput=computed.value;}
     row.versions.push(...computed.versions);
    }
   }
   const key=component.seller_product_code;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  }catch(e){errors.push({sku,error:e.message});}}
  const rows=[];for(const group of groups.values()){try{rows.push(...compose(group,{...config.body,source},registry));}catch(e){errors.push(...group.map(r=>({sku:r.sku,error:e.message})));}}
  const resolved=new Map();
  const freeze=(row,field,value)=>resolved.set(model().key(row.sku,field,source),{value,base:value,versions:row.versions,trace:[{sku:row.sku,field,value}],formula:model().fields[field]});
  for(const row of rows){freeze(row,'platform_registration_price',row.platformBase);freeze(row,'platform_discount_price',row.platformBase-row.platformDiscount);freeze(row,'platform_option_input',row.platformOption);}
  const stages=model().createEvaluator({...registry,products,resolvedValues:resolved});
  const assigned=(row,field)=>registry.assignments.some(a=>a.sku===row.sku&&a.scope===source&&a.target_field===field);
  for(const row of rows)if(!assigned(row,'platform_option_price'))freeze(row,'platform_option_price',row.platformOption);
  for(const row of rows){try{
   if(assigned(row,'platform_option_price')){const value=stages.evaluate(row.sku,'platform_option_price',source);row.platformOption=value.value;row.versions.push(...value.versions);}
   freeze(row,'platform_option_price',row.platformOption);row.platformFinal=row.platformBase-row.platformDiscount+row.platformOption;freeze(row,'platform_final_input',row.platformFinal);
   if(!assigned(row,'platform_final_price')&&!assigned(row,'platform_price')){freeze(row,'platform_final_price',row.platformFinal);freeze(row,'platform_price',row.platformFinal);}
  }catch(e){row.error=e.message;errors.push({sku:row.sku,error:e.message});}}
  // Complete every option input before traversing the final-price dependency DAG.
  for(const row of rows){if(row.error)continue;try{
   const has=field=>assigned(row,field);
   if(has('platform_final_price')&&has('platform_price'))throw Error('플랫폼 최종가 단계에 호환 Rule과 새 Rule이 충돌합니다.');
   const finalField=has('platform_final_price')?'platform_final_price':has('platform_price')?'platform_price':null;
   if(finalField){const value=stages.evaluate(row.sku,finalField,source);row.platformFinal=value.value;row.platformOption=row.platformFinal-(row.platformBase-row.platformDiscount);row.versions.push(...value.versions);}
   if(!Number.isSafeInteger(row.platformFinal)||row.platformFinal<0)throw Error('최종가격이 유효하지 않습니다.');freeze(row,'platform_final_price',row.platformFinal);freeze(row,'platform_price',row.platformFinal);
  }catch(e){row.error=e.message;errors.push({sku:row.sku,error:e.message});}}
  return {rows,errors,registry,config,requested,source};
 }
 async function exportLatest(skus,source,{fileNames=[],onProgress}={}){
  // Never reuse UI previews or fixed drafts: all five inputs are read for this generation.
  const filesBySource=await data().downloadLatestSellerOriginals([source]);
  const files=(filesBySource.get(source)||[]).filter(f=>!fileNames.length||fileNames.includes(f.name));
  if(!files.length)throw Error('선택한 최신 원본 파일이 없습니다.');
  const parsed=await g.SystemV3SellerParsers.parseSellerFiles(source,files,{price:true,discount:true});
  const result=await calculate(skus,source);
  if(result.errors.length)throw Error(result.errors.map(r=>r.sku+': '+r.error).join(' / '));
  const items=itemsFromCalculation(result,parsed.normalizedRows);
  const archive=await g.SystemV3SellerExport.buildExportArchive(new Map([[source,files]]),items,onProgress);
  const versions=[...new Map(result.rows.flatMap(r=>r.versions||[]).map(v=>[v.id,v])).values()];
  await data().workDocument('save','formula',{title:'registry-export:'+g.crypto.randomUUID(),body:{source,created_at:new Date().toISOString(),rule_versions:versions,platform_version:result.config.version||0,sku_count:result.rows.length,manifest:archive.manifest,skipped_count:archive.skippedItems.length,actual_items:archive.appliedItems}});
  return {...archive,calculation:result};
 }
 function itemsFromCalculation(result,originalRows){
  const source=result.source,sourceMap=new Map(originalRows.map(r=>[JSON.stringify([r.product_code,r.option_code||'']),r]));
  const items=result.rows.map((r,i)=>{
   const c=r.component,s=sourceMap.get(JSON.stringify([c.seller_product_code,c.seller_option_code||'']));
   if(!s)throw Error(r.sku+': 선택 원본에서 판매처 상품·옵션을 찾지 못했습니다.');
   return {export_item_id:i+1,sellpia_sku_code:r.sku,source_channel:source,field_key:'sellpia_sale_price',seller_product_code:c.seller_product_code,seller_option_code:c.seller_option_code||'',source_file_name:s.raw_payload?.source_file_name,source_row_no:s.source_row_no,expected_source_value:s.final_price??s.price,before_value:s.final_price??s.price,after_value:r.platformFinal,base_price:s.base_price,option_price:s.option_price,target_base_price:r.platformBase,target_discounted_base_price:r.platformBase-r.platformDiscount,target_option_price:r.platformOption,target_final_price:r.platformFinal,source_discount_terms:s.discount_terms||[],target_discount_terms:r.platformTerms};
  });
  const mapped=new Map();for(const item of items){const key=JSON.stringify([item.seller_product_code,item.seller_option_code]);if(mapped.has(key))throw Error('동일 판매처 상품·옵션에 여러 SKU가 연결되어 있습니다: '+key);mapped.set(key,item);}
  if(source!=='ably'){
   const changedProducts=new Set(items.filter(i=>i.target_base_price!==Number(i.base_price)||g.SystemV3SellerExport.discountTermsFingerprint(i.source_discount_terms)!==g.SystemV3SellerExport.discountTermsFingerprint(i.target_discount_terms)).map(i=>i.seller_product_code));
   const missing=originalRows.filter(r=>changedProducts.has(r.product_code)&&!mapped.has(JSON.stringify([r.product_code,r.option_code||''])));
   if(missing.length)throw Error('상품 공통가격 변경에 필요한 미연결 옵션이 있습니다: '+missing.slice(0,10).map(r=>r.product_code+'/'+(r.option_code||'기본')).join(', '));
  }
  return items;
 }
 async function refreshExportItems(items,filesBySource){
  const registry=await data().ruleRegistry('list');let output=[...items];
  for(const source of new Set(items.map(i=>i.source_channel))){
   const platform=await settings(source);
   const skus=[...new Set(items.filter(i=>i.source_channel===source&&i.field_key==='sellpia_sale_price'&&(platform.id||registry.assignments.some(a=>a.sku===i.sellpia_sku_code&&(!a.scope||a.scope===source)))).map(i=>i.sellpia_sku_code))];
   if(!skus.length)continue;
   const result=await calculate(skus,source);if(result.errors.length)throw Error(result.errors.map(e=>e.sku+': '+e.error).join(' / '));
   const parsed=await g.SystemV3SellerParsers.parseSellerFiles(source,filesBySource.get(source)||[],{price:true,discount:true});
   const generated=itemsFromCalculation(result,parsed.normalizedRows);
   const original=new Map(output.filter(i=>i.source_channel===source&&i.field_key==='sellpia_sale_price').map(i=>[i.sellpia_sku_code,i]));
   const replaced=new Set(generated.map(i=>i.sellpia_sku_code));
   output=output.filter(i=>!(i.source_channel===source&&i.field_key==='sellpia_sale_price'&&replaced.has(i.sellpia_sku_code)));
   output.push(...generated.map((i,n)=>({...original.get(i.sellpia_sku_code),...i,export_item_id:original.get(i.sellpia_sku_code)?.export_item_id||-(n+1),rule_versions:result.rows.find(r=>r.sku===i.sellpia_sku_code)?.versions||[]})));
  }
  return output;
 }
 g.HubPlatformRules={compose,settings,calculate,exportLatest,refreshExportItems,itemsFromCalculation};
})(typeof window==='undefined'?globalThis:window);
