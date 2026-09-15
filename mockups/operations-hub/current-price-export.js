(function(g){
 'use strict';
 const sources=['smartstore','makeshop','ably'];
 const price=item=>item.field_key==='sellpia_sale_price';
 const group=item=>JSON.stringify([item.source_channel,item.seller_product_code]);
 function finite(value){return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));}
 function validSourceLocation(row){return Boolean(String(row?.source_file_name||'').trim())&&row?.source_row_no!==null&&row?.source_row_no!==undefined&&row?.source_row_no!==''&&Number.isInteger(Number(row.source_row_no))&&Number(row.source_row_no)>0;}
 function normalizedTerms(value,fallback=[]){return Array.isArray(value)?value:Array.isArray(fallback)?fallback:[];}
 function termsKey(terms){return JSON.stringify((terms||[]).map(({title,input_source,term_type,...term})=>Object.fromEntries(Object.entries(term).sort(([a],[b])=>a.localeCompare(b)))).sort((a,b)=>String(a.term_key||'').localeCompare(String(b.term_key||''))));}
 function matrixPriceTarget(row){
  const draft=row.price_draft;
  const statuses=[row.registration_status,row.discount_status,row.option_status,row.final_status];
  const generations=[row.registration_generation_id,row.discount_generation_id,row.option_generation_id,row.final_generation_id];
  const calculatedValid=statuses.every(status=>status==='calculated')
    && [row.registration_price,row.discount_price,row.option_price,row.final_price].every(finite)
    && generations.every(value=>value!==null&&value!==undefined&&value!=='')
    && new Set(generations.map(String)).size===1;
  const details=row.final_details||row.discount_details||{};
  const calculatedPrice=calculatedValid?{
    platformBase:Number(row.registration_price),
    platformDiscount:Number(row.registration_price)-Number(row.discount_price),
    platformOption:Number(row.option_price),
    platformFinal:Number(row.final_price),
    platformTerms:Array.isArray(details.discount_terms)?details.discount_terms:[],
    error:null
  }:null;
  const visible=g.SystemV3DiscountPriceMath.matrixVisibleValues({
    sourceBasePrice:row.source_base_price,
    sourceDiscountedBasePrice:row.source_discounted_base_price,
    sourceOptionPrice:row.source_option_price??0,
    sourceFinalPrice:row.source_final_price,
    sourceDiscountTerms:normalizedTerms(row.source_discount_terms),
    priceDraft:draft,
    draftBasePrice:draft?.price_base_after??null,
    draftDiscountedBasePrice:draft?.price_discounted_base_after??null,
    draftOptionPrice:draft?.price_option_after??null,
    draftFinalPrice:draft?.price_final_after??draft?.after_value??null,
    draftDiscountTerms:draft?.price_discount_terms_after??null,
    calculatedPrice
  });
  if(!visible.priceVisible||visible.priceOrigin==='source')return null;
  const values=[visible.effectiveBasePrice,visible.effectiveDiscountedBasePrice,visible.effectiveOptionPrice,visible.effectiveFinalPrice];
  if(!values.every(finite))return {invalid:true,origin:visible.priceOrigin,reason:'화면에 표시된 가격 구성값이 완전하지 않습니다.'};
  return {base:Number(values[0]),discounted:Number(values[1]),option:Number(values[2]),final:Number(values[3]),terms:normalizedTerms(visible.effectiveDiscountTerms),origin:visible.priceOrigin,ruleVersions:visible.priceOrigin==='calculated'&&Array.isArray(row.rule_versions)?row.rule_versions:[]};
 }
 function carrierPriceState(row,latestGeneration=null){
  const draft=row?.price_draft;
  const draftValues=[draft?.price_base_after,draft?.price_discounted_base_after,draft?.price_option_after,draft?.price_final_after??draft?.after_value];
  if(draft&&draftValues.every(finite))return {code:'calculated_complete',label:'정상 표시값 · 현재 수정안',detail:'완전한 가격 수정안(draft)을 계산 결과보다 우선 사용합니다.',safe:true,usesOriginal:false};
  const statuses=[row?.registration_status,row?.discount_status,row?.option_status,row?.final_status];
  const errors=[row?.registration_error,row?.discount_error,row?.option_error,row?.final_error].filter(value=>String(value||'').trim());
  const generations=[row?.registration_generation_id,row?.discount_generation_id,row?.option_generation_id,row?.final_generation_id];
  const populatedGenerations=generations.filter(value=>value!==null&&value!==undefined&&value!=='').map(String);
  const latest=latestGeneration??row?.latest_generation_id??row?.latest_price_generation_id??null;
  const hasFailure=statuses.some(status=>['error','failed','timeout'].includes(String(status||'').toLowerCase()))||errors.length>0;
  if(hasFailure)return {code:'timeout_error',label:'가격 계산 timeout/error · 원본 유지',detail:errors[0]||'가격 계산 중 오류가 확인되었습니다.',safe:false,usesOriginal:true};
  const calculatedComplete=statuses.every(status=>status==='calculated')
   && [row?.registration_price,row?.discount_price,row?.option_price,row?.final_price].every(finite)
   && populatedGenerations.length===4&&new Set(populatedGenerations).size===1;
  const latestMissing=latest!==null&&latest!==undefined&&latest!==''&&populatedGenerations.some(value=>value!==String(latest));
  if(calculatedComplete&&!latestMissing)return {code:'calculated_complete',label:'정상 계산 완료',detail:`generation ${populatedGenerations[0]}`,safe:true,usesOriginal:false};
  const hasPartialCalculation=statuses.some(status=>status!==null&&status!==undefined&&status!=='')||populatedGenerations.length>0;
  if(latestMissing||hasPartialCalculation)return {code:'latest_generation_unreflected',label:'latest generation 미반영 · 원본 유지',detail:latestMissing?`latest generation ${latest} 결과가 모든 가격 구성값에 반영되지 않았습니다.`:'가격 구성값의 generation 또는 완료 상태가 서로 일치하지 않습니다.',safe:false,usesOriginal:true};
   return {code:'original_fallback',label:'가격 계산 미완료 · 원본 유지',detail:'완결된 가격 계산 결과가 없어 공식 수정파일의 원본 가격을 유지합니다.',safe:false,usesOriginal:true};
  }
  function planVersionToken({source,fileName,snapshotId,preview,operations}){
   const compact={source,fileName,snapshotId:snapshotId||null,preview:(preview||[]).map(row=>({
    row:row.source_row_no,sku:row.sku||'',product:row.product_code||'',option:row.option_code||'',status:row.status,
    changed:row.changed_fields||[],priceState:row.price_state?.code||'',reason:row.reason||'',diff:row.diff||null
   })),operations:(operations||[]).map(item=>({
    sku:item.sellpia_sku_code||'',field:item.field_key,row:item.source_row_no,before:item.before_value,after:item.after_value,
    base:item.target_base_price,discounted:item.target_discounted_base_price,option:item.target_option_price,final:item.target_final_price,
    terms:item.target_discount_terms||[]
   }))};
   const text=JSON.stringify(compact);let first=2166136261,second=2246822519;
   for(let index=0;index<text.length;index++){const code=text.charCodeAt(index);first=Math.imul(first^code,16777619);second=Math.imul(second^code,3266489917);}
   return `${(first>>>0).toString(16).padStart(8,'0')}${(second>>>0).toString(16).padStart(8,'0')}`;
  }
 async function refreshMatrixSnapshotItems(items,filesBySource,{sources:selected,skus=null,onProgress}={}){
  const selectedSources=[...new Set((selected||[]).filter(source=>source==='smartstore'||source==='makeshop'))];
  const requested=skus===null?null:[...new Set(skus)];
  let output=[...items],excludedItems=[],nextId=items.reduce((minimum,item)=>Math.min(minimum,Number(item.export_item_id)||0),0)-1;
  const exclude=(row,reason,fieldKey='sellpia_current_stock')=>{
    const id=nextId--;
    excludedItems.push({export_item_id:id,item:{export_item_id:id,sellpia_sku_code:row.sku||'',source_channel:row.source||'',seller_product_code:row.product_code||'',seller_option_code:row.option_code||'',field_key:fieldKey},reason});
  };
  for(const source of selectedSources){
    onProgress?.(`${source} · 화면에 보이는 저장값 스냅샷을 읽습니다.`);
    const snapshot=await g.SystemV3Data.loadMatrixExportSnapshot({
      source,skus:requested,
      onProgress:p=>onProgress?.(`${source} · 매트릭스 ${Number(p.loaded||0).toLocaleString('ko-KR')}개 SKU 확인`)
    });
    const priceItems=[];
    for(const row of snapshot.rows){
      const hasLocation=validSourceLocation(row);
      const stockDraft=row.stock_draft;
      const stockTarget=stockDraft&&finite(stockDraft.after_value)?Number(stockDraft.after_value):null;
      const stockVisible=row.source_stock!==null&&row.source_stock!==undefined;
      if(stockVisible&&stockTarget!==null&&(!finite(row.source_stock)||Number(row.source_stock)!==stockTarget)){
        if(!hasLocation)exclude({...row,source},'재고 수정안은 보이지만 최신 원본 행 위치가 없습니다.','sellpia_current_stock');
        else output.push({
          export_item_id:nextId--,sellpia_sku_code:row.sku,source_channel:source,field_key:'sellpia_current_stock',
          seller_product_code:row.product_code,seller_option_code:row.option_code||'',source_file_name:row.source_file_name,source_row_no:Number(row.source_row_no),
          expected_source_value:row.source_stock,before_value:row.source_stock,after_value:stockTarget,matrix_visible_stock:true,target_component_skus:[row.sku]
        });
      }

      const target=matrixPriceTarget(row);
      if(!target)continue;
      if(target.invalid){exclude({...row,source},target.reason,'sellpia_sale_price');continue;}
      const changed=[
        ['base',row.source_base_price],
        ['discounted',row.source_discounted_base_price],
        ['option',row.source_option_price],
        ['final',row.source_final_price]
      ].some(([key,current])=>!finite(current)||Number(current)!==Number(target[key]))
        ||termsKey(target.terms)!==termsKey(row.source_discount_terms||[]);
      if(!changed)continue;
      if(![row.source_base_price,row.source_discounted_base_price,row.source_option_price,row.source_final_price].every(finite)){
        exclude({...row,source},'최신 원본 가격 구성값이 없어 화면 표시값을 안전하게 반영할 수 없습니다.','sellpia_sale_price');
        continue;
      }
      if(!hasLocation){
        exclude({...row,source},'화면에 가격 수정값은 보이지만 최신 원본 행 위치가 없습니다.','sellpia_sale_price');
        continue;
      }
      priceItems.push({
        export_item_id:nextId--,sellpia_sku_code:row.sku,source_channel:source,field_key:'sellpia_sale_price',
        seller_product_code:row.product_code,seller_option_code:row.option_code||'',source_file_name:row.source_file_name,source_row_no:Number(row.source_row_no),
        expected_source_value:row.source_final_price,before_value:row.source_final_price,after_value:target.final,
        base_price:row.source_base_price,option_price:row.source_option_price,
        target_base_price:target.base,target_discounted_base_price:target.discounted,target_option_price:target.option,target_final_price:target.final,
        source_discount_terms:normalizedTerms(row.source_discount_terms),target_discount_terms:target.terms,
        stored_matrix_price:true,matrix_visible_price:true,rule_versions:target.ruleVersions,
        generation_id:row.generation_id,target_component_skus:[row.sku]
      });
    }

    if(priceItems.length){
      const files=filesBySource.get(source)||[];
      if(!files.length)throw Error(source+': 최신 보관 원본 파일이 없습니다.');
      const parsed=await g.SystemV3SellerParsers.parseSellerFiles(source,files,{price:true,discount:true});
      const identity=row=>JSON.stringify([row.product_code||'',row.option_code||'']);
      const mapped=new Set(priceItems.map(item=>JSON.stringify([item.seller_product_code||'',item.seller_option_code||''])));
      const targets=new Map(priceItems.map(item=>[item.seller_product_code,item]));
      const changedProducts=new Set(
        priceItems
          .filter(item=>Number(item.target_base_price)!==Number(item.base_price)||termsKey(item.source_discount_terms)!==termsKey(item.target_discount_terms))
          .map(item=>item.seller_product_code)
      );
      const originals=new Map();
      for(const row of parsed.normalizedRows){
        const key=identity(row);
        if(!originals.has(key))originals.set(key,[]);
        originals.get(key).push(row);
      }
      const productsWithOptions=new Set(parsed.normalizedRows.filter(row=>row.option_code).map(row=>row.product_code));
      const unsafe=new Map();
      for(const original of parsed.normalizedRows){
        const id=identity(original);
        if(!changedProducts.has(original.product_code)||mapped.has(id))continue;
        if(source==='makeshop'&&!original.option_code&&productsWithOptions.has(original.product_code))continue;
        const target=targets.get(original.product_code);
        const raw=original.final_price??original.price;
        const final=Number(raw);
        const option=final-Number(target.target_discounted_base_price);
        if(raw===null||raw===undefined||raw===''||!Number.isSafeInteger(final)||final<0||!Number.isSafeInteger(option)||(originals.get(id)||[]).length!==1){
          unsafe.set(original.product_code,'미연결 옵션의 원본 최종가 또는 원본 위치를 확인할 수 없습니다.');
          continue;
        }
        priceItems.push({
          ...target,export_item_id:nextId--,sellpia_sku_code:null,target_component_skus:[],preserve_unmapped:true,
          seller_option_code:original.option_code||'',source_file_name:original.raw_payload?.source_file_name,source_row_no:original.source_row_no,
          expected_source_value:final,before_value:final,after_value:final,base_price:original.base_price,option_price:original.option_price,
          target_option_price:option,target_final_price:final,source_discount_terms:original.discount_terms||[]
        });
        mapped.add(id);
      }
      for(const item of priceItems){
        if(unsafe.has(item.seller_product_code)){
          exclude({sku:item.sellpia_sku_code,source,product_code:item.seller_product_code,option_code:item.seller_option_code},unsafe.get(item.seller_product_code),'sellpia_sale_price');
        }else output.push(item);
      }
    }
  }
  return {items:output,excludedItems};
 }

 function prepareCarrierItems(source,fileName,carrierRows,snapshotRows,{snapshotId=null}={}){
  const identity=row=>JSON.stringify([String(row?.product_code||'').trim(),String(row?.option_code||'').trim()]);
  const snapshotGenerations=(snapshotRows||[]).flatMap(row=>[row?.registration_generation_id,row?.discount_generation_id,row?.option_generation_id,row?.final_generation_id]).filter(finite).map(Number);
  const latestGeneration=snapshotGenerations.length?snapshotGenerations.reduce((latest,value)=>Math.max(latest,value),Number.NEGATIVE_INFINITY):null;
  const snapshotByIdentity=new Map();
  for(const row of snapshotRows||[]){const key=identity(row);if(!snapshotByIdentity.has(key))snapshotByIdentity.set(key,[]);snapshotByIdentity.get(key).push(row);}
  const carrierCounts=new Map();for(const row of carrierRows||[]){const key=identity(row);carrierCounts.set(key,(carrierCounts.get(key)||0)+1);}
  const items=[],excludedItems=[],preview=[];let nextId=-1;
  const exclude=(row,reason,details={})=>{const export_item_id=nextId--;const item={export_item_id,sellpia_sku_code:'',source_channel:source,seller_product_code:row.product_code||'',seller_option_code:row.option_code||'',field_key:'carrier_row',source_file_name:fileName,source_row_no:row.source_row_no};excludedItems.push({export_item_id,item,reason});preview.push({source_row_no:row.source_row_no,sku:details.sku||'',product_code:row.product_code,option_code:row.option_code,status:'blocked',reason,price_state:details.priceState||carrierPriceState(null,latestGeneration),diff:details.diff||null});};
  for(const original of carrierRows||[]){
   const key=identity(original),matches=snapshotByIdentity.get(key)||[];
   if(carrierCounts.get(key)!==1){exclude(original,'공식 수정파일 안에 같은 판매처 상품·옵션 행이 중복됩니다.');continue;}
   if(matches.length!==1){exclude(original,matches.length?'판매처 상품·옵션이 여러 SKU에 연결되어 있어 자동으로 쓸 수 없습니다.':'현재 매트릭스에서 판매처 상품·옵션을 찾지 못했습니다.');continue;}
   const row={...matches[0],source_file_name:fileName,source_row_no:Number(original.source_row_no),source_stock:original.stock,
    source_base_price:original.base_price,source_discounted_base_price:original.discounted_base_price,
    source_option_price:original.option_price,source_final_price:original.final_price,source_discount_terms:original.discount_terms||[]};
   const changedFields=[],rowItems=[],priceState=carrierPriceState(row,latestGeneration);
   const stockDraft=row.stock_draft,stockTarget=stockDraft&&finite(stockDraft.after_value)?Number(stockDraft.after_value):null;
   if(original.stock!==null&&original.stock!==undefined&&original.stock!==''&&stockTarget!==null&&Number(original.stock)!==stockTarget){
    rowItems.push({export_item_id:nextId--,sellpia_sku_code:row.sku,source_channel:source,field_key:'sellpia_current_stock',seller_product_code:row.product_code,seller_option_code:row.option_code||'',source_file_name:fileName,source_row_no:Number(original.source_row_no),expected_source_value:original.stock,before_value:original.stock,after_value:stockTarget,matrix_visible_stock:true,target_component_skus:[row.sku]});changedFields.push('stock');
   }
   const target=matrixPriceTarget(row);
   const currentPrice={base:original.base_price,discounted:original.discounted_base_price,option:original.option_price,final:original.final_price};
   const candidatePrice=target&&!target.invalid?{base:target.base,discounted:target.discounted,option:target.option,final:target.final}:currentPrice;
   const targetPrice=priceState.safe?candidatePrice:currentPrice;
   const diff={stock:{before:original.stock,after:stockTarget??original.stock,changed:changedFields.includes('stock')},price:{before:currentPrice,after:targetPrice,changed:false}};
   if(target?.invalid){exclude(original,target.reason,{sku:row.sku,priceState:{code:'original_fallback',label:'가격 계산 미완료/오류 · 원본 유지',detail:target.reason,safe:false,usesOriginal:true},diff});continue;}
   if(target){
    const current=[original.base_price,original.discounted_base_price,original.option_price,original.final_price];
    if(current.every(finite)){
     const changed=current.some((value,index)=>Number(value)!==[target.base,target.discounted,target.option,target.final][index])||termsKey(target.terms)!==termsKey(original.discount_terms||[]);
     if(changed){
      diff.price.candidate_after=candidatePrice;diff.price.candidate_changed=true;
      if(priceState.safe){rowItems.push({export_item_id:nextId--,sellpia_sku_code:row.sku,source_channel:source,field_key:'sellpia_sale_price',seller_product_code:row.product_code,seller_option_code:row.option_code||'',source_file_name:fileName,source_row_no:Number(original.source_row_no),expected_source_value:original.final_price,before_value:original.final_price,after_value:target.final,base_price:original.base_price,option_price:original.option_price,target_base_price:target.base,target_discounted_base_price:target.discounted,target_option_price:target.option,target_final_price:target.final,source_discount_terms:original.discount_terms||[],target_discount_terms:target.terms,stored_matrix_price:true,matrix_visible_price:true,rule_versions:target.ruleVersions,target_component_skus:[row.sku]});changedFields.push('price');diff.price.changed=true;}
     }
    }else{exclude(original,'공식 수정파일의 현재 가격 구성값이 완전하지 않아 안전하게 비교할 수 없습니다.',{sku:row.sku,priceState:{code:'original_fallback',label:'가격 계산 미완료/오류 · 원본 유지',detail:'공식 수정파일의 현재 가격 구성값이 완전하지 않습니다.',safe:false,usesOriginal:true},diff});continue;}
   }
   items.push(...rowItems);preview.push({source_row_no:original.source_row_no,sku:row.sku,product_code:row.product_code,option_code:row.option_code,status:'ready',changed:changedFields.length>0,changed_fields:changedFields,price_state:priceState,diff});
  }
  const priceStates={calculated_complete:0,latest_generation_unreflected:0,timeout_error:0,original_fallback:0};
  for(const row of preview){const code=row.price_state?.code||'original_fallback';priceStates[code]=(priceStates[code]||0)+1;}
  const summary={total:preview.length,matched:preview.filter(row=>row.sku).length,changed:preview.filter(row=>row.diff?.stock?.changed||row.diff?.price?.changed).length,candidate_changed:preview.filter(row=>row.diff?.stock?.changed||row.diff?.price?.candidate_changed).length,unchanged:preview.filter(row=>row.status==='ready'&&!row.changed).length,blocked:preview.filter(row=>row.status!=='ready').length,price_states:priceStates};
   const priceSafe=preview.length>0&&preview.every(row=>row.price_state?.safe===true||row.price_state?.code==='original_fallback');
   const canGenerate=priceSafe&&summary.blocked===0;
   const versionToken=planVersionToken({source,fileName,snapshotId,preview,operations:items});
   return {kind:'TransformationPlan',version:2,source,source_type:'carrier',file_name:fileName,created_at:new Date().toISOString(),snapshot_id:snapshotId,latest_generation_id:latestGeneration,preview_only:false,xlsx_connected:true,items,operations:items,excludedItems,preview,summary,version_token:versionToken,canGenerate,safety:{can_generate_xlsx:canGenerate,price_complete:priceSafe,requires_revalidation:true,reason:canGenerate?'가격 상태와 행 매칭이 안전합니다. 생성 직전에 동일 대상만 재검증합니다.':'가격 미완료·stale·오류 또는 차단 행이 있어 XLSX 생성을 허용하지 않습니다.'}};
 }

 async function refreshItems(items,filesBySource,{sources:selected=sources,skus=null,includeRules=true,includeMatrixStock=false,onProgress}={}){
  if(includeMatrixStock){
   if(!g.SystemV3Data?.loadMatrixExportSnapshot)throw Error('매트릭스 스냅샷 내보내기 기능을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
   return refreshMatrixSnapshotItems(items,filesBySource,{sources:selected,skus,onProgress});
  }
  if(!includeRules)return {items:[...items],excludedItems:[]};
  const selectedSources=[...new Set(selected.filter(source=>sources.includes(source)))],requested=skus===null?null:[...new Set(skus)];
  if(!selectedSources.length||requested&& !requested.length)return {items:[...items],excludedItems:[]};
  if(!g.SystemV3Data?.loadStoredMatrixPrices)throw Error('저장된 매트릭스 가격 조회 모듈을 불러오지 못했습니다.');
  onProgress?.('저장된 매트릭스 가격을 읽습니다.');
  const stored=await g.SystemV3Data.loadStoredMatrixPrices({sources:selectedSources,skus:requested,includeMatrixDrafts:true,onProgress});
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
  // A SKU without a calculated tuple has no stored price change. The latest
  // original row must stay untouched instead of being reported as an error.
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
 g.HubCurrentPriceExport={refreshItems,buildArchive,matrixPriceTarget,refreshMatrixSnapshotItems,prepareCarrierItems,validSourceLocation,carrierPriceState,planVersionToken};
})(typeof window==='undefined'?globalThis:window);
