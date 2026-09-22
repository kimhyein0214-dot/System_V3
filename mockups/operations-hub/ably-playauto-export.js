(function(global){
  'use strict';

  const PRODUCT_SHEET='쇼핑몰상품';
  const OPTION_SHEET='옵션기본';
  const PRODUCT_REQUIRED=['판매자관리코드','쇼핑몰(계정)','온라인 상품명','판매가','옵션','SKU','옵션 추가금액'];
  const OPTION_REQUIRED=['*쇼핑몰','*계정','*판매자관리코드','온라인 상품명','옵션1 명칭','옵션1 값','추가 금액','판매가능재고','*판매수량'];
  const PRODUCT_BASE_PRICE_COLUMN='I';
  const PRODUCT_OPTION_PRICE_COLUMN='T';
  const OPTION_PRICE_COLUMN='V';
  const OPTION_STOCK_COLUMN='X';
  const OPTION_SALES_QUANTITY_COLUMN='X';

  const clean=value=>String(value??'').trim();
  const normalize=value=>clean(value).replace(/\s+/g,' ').toLowerCase();
  const splitLines=value=>String(value??'').split(/\r?\n/).map(clean);
  const nonEmptyLines=value=>splitLines(value).filter(Boolean);
  const stripSellpiaPrefix=value=>clean(value).replace(/^sellpia_/i,'');
  const explicitSellpiaSku=value=>/^sellpia_.+-\d+$/i.test(clean(value))?stripSellpiaPrefix(value):'';
  const sellerProductCode=value=>{const match=clean(value).match(/^sellpia_(.+)$/i);return match?match[1]:'';};
  const headerMap=headers=>new Map((headers||[]).map((value,index)=>[clean(value),index]));
  const assertHeaders=(headers,required,label)=>{const map=headerMap(headers),missing=required.filter(name=>!map.has(name));if(missing.length)throw Error(`${label} 필수 헤더가 없습니다: ${missing.join(', ')}`);return map;};
  const valueAt=(row,map,name)=>row?.[map.get(name)]??'';
  const finite=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
  const xmlDecode=value=>String(value??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  const xmlAttributes=value=>{const result={};String(value||'').replace(/([\w:]+)="([^"]*)"/g,(_,key,item)=>{result[key]=xmlDecode(item);return '';});return result;};

  function detect(rowsBySheet){
    const productRows=rowsBySheet?.[PRODUCT_SHEET];
    if(Array.isArray(productRows)&&productRows.length){try{assertHeaders(productRows[0],PRODUCT_REQUIRED,PRODUCT_SHEET);return {type:'product_price_option',sheet:PRODUCT_SHEET};}catch{}}
    const optionRows=rowsBySheet?.[OPTION_SHEET];
    if(Array.isArray(optionRows)&&optionRows.length){try{assertHeaders(optionRows[0],OPTION_REQUIRED,OPTION_SHEET);return {type:'option_price_stock',sheet:OPTION_SHEET};}catch{}}
    return null;
  }

  function productOptionLines(value){
    return nonEmptyLines(value).filter(line=>!/^\[.*\]$/.test(line)).map(line=>{
      const separator=line.indexOf('=');
      return {raw:line,option_name:clean(separator>=0?line.slice(0,separator):line),secondary_value:clean(separator>=0?line.slice(separator+1):'')};
    });
  }

  function parseProductRows(rows){
    if(!Array.isArray(rows)||rows.length<2)return [];
    const map=assertHeaders(rows[0],PRODUCT_REQUIRED,PRODUCT_SHEET),items=[];
    rows.slice(1).forEach((row,rowIndex)=>{
      const sellerCode=clean(valueAt(row,map,'판매자관리코드'));if(!sellerCode)return;
      const options=productOptionLines(valueAt(row,map,'옵션'));
      const skuLines=nonEmptyLines(valueAt(row,map,'SKU'));
      const optionPrices=splitLines(valueAt(row,map,'옵션 추가금액'));
      const optionStocks=map.has('옵션 판매수량')?splitLines(valueAt(row,map,'옵션 판매수량')):[];
      const optionCount=Math.max(options.length,skuLines.length,optionPrices.length,optionStocks.length,1);
      for(let index=0;index<optionCount;index++){
        const skuToken=skuLines[index]||'';
        const directSku=/^sellpia_.+-[^\s]+$/i.test(skuToken)&&/-\d+$/i.test(skuToken)?stripSellpiaPrefix(skuToken):'';
        const option=options[index]||{raw:'',option_name:'',secondary_value:''};
        items.push({
          template_type:'product_price_option',source_row_no:rowIndex+2,option_index:index,
          shop:clean(valueAt(row,map,'쇼핑몰(계정)')),seller_management_code:sellerCode,sellpia_product_code:sellerProductCode(sellerCode),
          seller_product_code:clean(valueAt(row,map,'쇼핑몰 상품번호')),product_name:clean(valueAt(row,map,'온라인 상품명')),
          direct_sellpia_sku_code:directSku,direct_sellpia_sku_error:skuToken&&!directSku?'P열 SKU를 셀피아 SKU 형식으로 읽을 수 없습니다.':'',option_candidates:[option.option_name].filter(Boolean),primary_option_name:option.option_name,
          secondary_option_value:option.secondary_value,base_price:finite(valueAt(row,map,'판매가'))?Number(valueAt(row,map,'판매가')):null,
          option_price:finite(optionPrices[index])?Number(optionPrices[index]):null,
          option_stock:finite(optionStocks[index])?Number(optionStocks[index]):null
        });
      }
    });
    return items;
  }

  function parseOptionRows(rows){
    if(!Array.isArray(rows)||rows.length<2)return [];
    const map=assertHeaders(rows[0],OPTION_REQUIRED,OPTION_SHEET);
    const items=rows.slice(1).map((row,rowIndex)=>{
      const sellerCode=clean(valueAt(row,map,'*판매자관리코드'));
      const optionPairs=[1,2,3].map(index=>({name:clean(valueAt(row,map,`옵션${index} 명칭`)),value:clean(valueAt(row,map,`옵션${index} 값`))})).filter(pair=>pair.name||pair.value);
      const values=optionPairs.map(pair=>pair.value).filter(Boolean),joined=values.join('/');
      const sellerOptionCode=clean(valueAt(row,map,'옵션관리코드')),optionSkuCode=clean(valueAt(row,map,'옵션 SKU 코드'));
      const directSkuCodes=[...new Set([sellerOptionCode,optionSkuCode].map(explicitSellpiaSku).filter(Boolean))];
      return {
        template_type:'option_price_stock',source_row_no:rowIndex+2,
        shop:clean(valueAt(row,map,'*쇼핑몰')),account:clean(valueAt(row,map,'*계정')),seller_management_code:sellerCode,
        sellpia_product_code:sellerProductCode(sellerCode),product_name:clean(valueAt(row,map,'온라인 상품명')),
        seller_product_code:clean(valueAt(row,map,'쇼핑몰상품코드')),base_price:finite(valueAt(row,map,'판매가'))?Number(valueAt(row,map,'판매가')):null,
        seller_option_code:sellerOptionCode,option_sku_code:optionSkuCode,
        direct_sellpia_sku_code:directSkuCodes.length===1?directSkuCodes[0]:'',
        direct_sellpia_sku_error:directSkuCodes.length>1?'옵션관리코드와 옵션 SKU 코드가 서로 다른 셀피아 SKU를 가리킵니다.':'',
        option_pairs:optionPairs,option_candidates:[...values,...(joined?[joined]:[])],primary_option_name:values[0]||'',
        option_price:finite(valueAt(row,map,'추가 금액'))?Number(valueAt(row,map,'추가 금액')):null,
        available_stock:finite(valueAt(row,map,'판매가능재고'))?Number(valueAt(row,map,'판매가능재고')):null,
        sales_quantity:finite(valueAt(row,map,'*판매수량'))?Number(valueAt(row,map,'*판매수량')):null,
        carrier_identity:JSON.stringify([sellerCode,...optionPairs.map(pair=>pair.value)])
      };
    }).filter(item=>item.seller_management_code);
    const counts=new Map();for(const item of items)counts.set(item.carrier_identity,(counts.get(item.carrier_identity)||0)+1);
    return items.map(item=>counts.get(item.carrier_identity)>1?{...item,carrier_identity_error:'같은 판매자관리코드와 옵션값이 파일에 중복됩니다.'}:item);
  }

  function resolveSellpiaSku(item,catalog,mappings=[],{preferDirectProductSku=false}={}){
    const optionCarrier=item.template_type==='option_price_stock';
    if(optionCarrier&&item.direct_sellpia_sku_error)return {error:item.direct_sellpia_sku_error,method:'direct_sku_ambiguous'};
    const sellerProduct=clean(item.seller_product_code);
    const optionKeys=[clean(item.seller_option_code),clean(item.option_sku_code)].filter(value=>value&&!explicitSellpiaSku(value));
    const productMappings=sellerProduct?(mappings||[]).filter(row=>clean(row.product_code)===sellerProduct):[];
    const exactMappings=productMappings.length?(optionKeys.length?productMappings.filter(row=>optionKeys.includes(clean(row.option_code))):(productMappings.length===1?productMappings:[])):[];
    const uniqueMappings=[...new Map(exactMappings.map(row=>[clean(row.sku),row])).values()].filter(row=>clean(row.sku));
    const rows=(catalog||[]).filter(row=>clean(row.sellpia_product_code)===clean(item.sellpia_product_code));
    if(preferDirectProductSku&&item.template_type==='product_price_option'&&item.direct_sellpia_sku_error)
      return {error:item.direct_sellpia_sku_error,method:'direct_sku_invalid'};
    if(preferDirectProductSku&&item.template_type==='product_price_option'&&item.direct_sellpia_sku_code){
      const directSku=clean(item.direct_sellpia_sku_code),direct=rows.filter(row=>clean(row.sellpia_sku_code)===directSku);
      if(direct.length>1)return {error:'P열 직접 SKU가 셀피아 카탈로그에 중복됩니다.',method:'direct_sku_invalid'};
      if(!direct.length)return {error:'P열 직접 SKU가 해당 셀피아 상품의 카탈로그에 없습니다.',method:'direct_sku_invalid'};
      const mappedSku=uniqueMappings.length===1?clean(uniqueMappings[0].sku):'';
      return {sku:directSku,method:'direct_sku',row:direct[0],mapping_override:!!mappedSku&&mappedSku!==directSku,mapped_sku:mappedSku};
    }
    if(optionCarrier&&item.direct_sellpia_sku_code){
      const directSku=clean(item.direct_sellpia_sku_code),direct=rows.filter(row=>clean(row.sellpia_sku_code)===directSku);
      if(direct.length>1)return {error:'직접 SKU가 카탈로그에 중복됩니다.',method:'direct_sku'};
      if(direct.length===0){
        const existsElsewhere=(catalog||[]).some(row=>clean(row.sellpia_sku_code)===directSku);
        return {error:existsElsewhere?'직접 SKU가 해당 셀피아 상품에 속하지 않습니다.':'직접 SKU를 카탈로그에서 찾지 못했습니다.',method:'direct_sku_invalid'};
      }
      if(uniqueMappings.length>1)return {error:'기존 에이블리 판매처 연결이 여러 SKU를 가리킵니다.',method:'seller_mapping_ambiguous'};
      if(uniqueMappings.length===1&&clean(uniqueMappings[0].sku)!==directSku)return {error:'직접 SKU와 기존 에이블리 판매처 연결이 충돌합니다.',method:'direct_sku_mapping_conflict'};
      return {sku:direct[0].sellpia_sku_code,method:'direct_sku',row:direct[0]};
    }
    if(productMappings.length){
      if(uniqueMappings.length===1)return {sku:uniqueMappings[0].sku,method:'seller_mapping_exact',row:uniqueMappings[0]};
      if(uniqueMappings.length>1)return {error:'기존 에이블리 판매처 연결이 여러 SKU를 가리킵니다.',method:'seller_mapping_ambiguous'};
    }
    if(item.direct_sellpia_sku_code){
      const direct=rows.filter(row=>clean(row.sellpia_sku_code)===clean(item.direct_sellpia_sku_code));
      if(direct.length===1)return {sku:direct[0].sellpia_sku_code,method:'direct_sku',row:direct[0]};
      if(direct.length>1)return {error:'직접 SKU가 중복됩니다.',method:'direct_sku'};
    }
    const candidateNames=[...new Set((item.option_candidates||[]).map(normalize).filter(Boolean))];
    const exact=[];
    for(const candidate of candidateNames){for(const row of rows){if(normalize(row.sellpia_option_name)===candidate)exact.push(row);}}
    const unique=[...new Map(exact.map(row=>[clean(row.sellpia_sku_code),row])).values()];
    if(unique.length===1)return {sku:unique[0].sellpia_sku_code,method:'product_option_exact',row:unique[0]};
    if(unique.length>1)return {error:'같은 상품 안에서 옵션명이 둘 이상 일치합니다.',method:'product_option_exact'};
    if(item.template_type!=='option_price_stock'&&rows.length===1)return {sku:rows[0].sellpia_sku_code,method:'single_product_sku',row:rows[0]};
    if(productMappings.length>1)return {error:'판매처 상품 연결이 여러 SKU를 가리키며 옵션 식별자와 옵션명으로 하나를 결정하지 못했습니다.',method:'seller_mapping_ambiguous'};
    return {error:rows.length?'옵션명으로 SKU를 하나로 결정하지 못했습니다.':'셀피아 상품코드를 찾지 못했습니다.',method:'unresolved'};
  }

  function resolveRows(items,catalog,mappings=[],options={}){return (items||[]).map(item=>({...item,resolution:resolveSellpiaSku(item,catalog,mappings,options)}));}

  function isNoBallAnchor(value){
    return /(?:^|[^\p{L}\p{N}])(?:no[\s_-]*ball|노볼)(?=$|[^\p{L}\p{N}])/iu.test(clean(value));
  }

  // Only the opt-in PlayAuto source-price preview uses this carrier-local variant plan.
  // A repeated SKU is one Sellpia identity with an anchor and add-ons, never a new DB link.
  function prepareSellpiaSourceProductRows(items,sourcePrices){
    const byRow=new Map(),skuRows=new Map(),identityCounts=new Map();
    for(const item of items||[]){
      const rowNo=item.source_row_no,sku=clean(item.resolution?.sku);
      if(!byRow.has(rowNo))byRow.set(rowNo,[]);
      byRow.get(rowNo).push(item);
      if(sku){if(!skuRows.has(sku))skuRows.set(sku,new Set());skuRows.get(sku).add(rowNo);}
      const identity=JSON.stringify([normalize(item.seller_management_code),normalize(item.primary_option_name),normalize(item.secondary_option_value)]);
      identityCounts.set(identity,(identityCounts.get(identity)||0)+1);
    }
    for(const group of byRow.values()){
      if(!group.some(item=>item._inScope))continue;
      try{
        const rowNo=group[0].source_row_no;
        for(const item of group){
          if(item._status!=='ready'||(!item.resolution?.sku&&item.resolution?.method!=='unresolved'))
            throw Error(item._error||item.resolution?.error||`${rowNo}행: 판매처 옵션 identity가 불명확합니다.`);
          const direct=clean(item.direct_sellpia_sku_code);
          if(direct&&direct!==clean(item.resolution?.sku))
            throw Error(`${direct}: P열 직접 SKU와 카탈로그 또는 기존 판매처 연결이 충돌합니다.`);
          const sku=clean(item.resolution?.sku);
          if(sku&&skuRows.get(sku)?.size>1)throw Error(`${sku}: 동일 SKU가 서로 다른 PlayAuto 상품 행에 중복됩니다.`);
          const identity=JSON.stringify([normalize(item.seller_management_code),normalize(item.primary_option_name),normalize(item.secondary_option_value)]);
          if(identityCounts.get(identity)>1)throw Error(`${rowNo}행: 같은 판매자관리코드와 옵션값이 파일에 중복됩니다.`);
          if(item.option_price===null||item.option_price===undefined||item.option_price===''||!Number.isSafeInteger(Number(item.option_price)))
            throw Error(`${rowNo}행: 동일 SKU 추가 옵션의 원본 추가금액을 읽을 수 없습니다.`);
        }
        if(group.some(item=>item.base_price===null||item.base_price===undefined||item.base_price===''))
          throw Error(`${rowNo}행: PlayAuto 원본 공통 판매가가 불완전합니다.`);
        const originalBases=[...new Set(group.map(item=>Number(item.base_price)))];
        if(originalBases.length!==1||!Number.isSafeInteger(originalBases[0])||originalBases[0]<0)
          throw Error(`${rowNo}행: PlayAuto 원본 공통 판매가가 불완전합니다.`);
        const bySku=new Map();
        for(const item of group){const sku=clean(item.resolution?.sku);if(!sku)continue;if(!bySku.has(sku))bySku.set(sku,[]);bySku.get(sku).push(item);}
        for(const [sku,variants] of bySku){
          if(variants.length===1){variants[0].carrier_variant_role='anchor';variants[0].carrier_anchor_sku=sku;variants[0].carrier_addon_delta=0;continue;}
          const anchors=variants.filter(item=>isNoBallAnchor(item.secondary_option_value));
          if(!anchors.length)throw Error(`${sku}: 동일 SKU의 기준 노볼 옵션을 찾을 수 없습니다.`);
          if(anchors.length>1)throw Error(`${sku}: 동일 SKU의 기준 노볼 옵션이 중복됩니다.`);
          const anchorOption=Number(anchors[0].option_price);
          for(const item of variants){
            const delta=Number(item.option_price)-anchorOption;
            if(!Number.isSafeInteger(delta)||delta<0)throw Error(`${sku}: 동일 SKU 추가 옵션의 원본 추가금액 차이가 비정상입니다.`);
            item.carrier_variant_role=item===anchors[0]?'anchor':'addon';
            item.carrier_anchor_sku=sku;item.carrier_addon_delta=delta;
          }
        }
        const targets=group.map(item=>{
          const sku=clean(item.resolution?.sku);
          const sourcePrice=item._inScope?Number(sourcePrices?.get(sku)):null;
          const desired=item._inScope?sourcePrice+Number(item.carrier_addon_delta||0):originalBases[0]+Number(item.option_price);
          if(item._inScope&&(!Number.isSafeInteger(sourcePrice)||sourcePrice<=0))throw Error(`${sku}: 최신 셀피아 원본 판매가가 없습니다.`);
          if(!Number.isSafeInteger(desired)||desired<=0)throw Error(`${sku||rowNo}: 목표 최종가가 비정상입니다.`);
          return desired;
        });
        const rowAnchor=Math.min(...targets);
        group.forEach((item,index)=>{
          const option=targets[index]-rowAnchor;
          if(!Number.isSafeInteger(option)||option<0)throw Error(`${rowNo}행: 목표 옵션가가 비정상입니다.`);
          item.target_base_price=rowAnchor;item.target_option_price=option;
          item._priceState={safe:true,code:'sellpia_source',label:!item._inScope?'미선택 옵션 원본 최종가 보존':item.carrier_variant_role==='addon'?'셀피아 최신 원본 판매가 + 기존 추가 옵션 차액':'셀피아 최신 원본 판매가'};
          item._preserveUnselected=!item._inScope;
        });
      }catch(error){
        for(const item of group){item._status='conflict';item._error=`같은 상품 행 원본 유지: ${error?.message||error}`;delete item.target_base_price;delete item.target_option_price;}
      }
    }
    return items;
  }

  async function readTemplate(file){
    if(!global.XLSX)throw Error('XLSX 모듈을 불러오지 못했습니다.');
    const book=global.XLSX.read(await file.arrayBuffer(),{type:'array',raw:true});
    const rowsBySheet={};for(const name of book.SheetNames)rowsBySheet[name]=global.XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:'',raw:true});
    const detected=detect(rowsBySheet);if(!detected)throw Error('에이블리 PlayAuto 판매가+옵션가 또는 옵션가+재고 양식을 인식하지 못했습니다.');
    const items=detected.type==='product_price_option'?parseProductRows(rowsBySheet[detected.sheet]):parseOptionRows(rowsBySheet[detected.sheet]);
    return {...detected,items,rowsBySheet};
  }

  async function sheetParts(file,sheetName){
    if(!global.JSZip||!global.AblyStockExport?.patchCell)throw Error('원본 보존 XLSX 모듈을 불러오지 못했습니다.');
    const bytes=await file.arrayBuffer(),zip=await global.JSZip.loadAsync(bytes);
    const workbookXml=await zip.file('xl/workbook.xml')?.async('string');
    const relationshipXml=await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if(!workbookXml||!relationshipXml)throw Error('XLSX 통합문서 구조를 읽지 못했습니다.');
    let relationshipId='';
    String(workbookXml).replace(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g,(_,attrs)=>{const parsed=xmlAttributes(attrs);if(parsed.name===sheetName)relationshipId=parsed['r:id']||parsed.id||'';return '';});
    let target='';
    String(relationshipXml).replace(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g,(_,attrs)=>{const parsed=xmlAttributes(attrs);if(parsed.Id===relationshipId)target=parsed.Target||'';return '';});
    if(!target)throw Error(`${sheetName} 시트 연결을 찾지 못했습니다.`);
    const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
    const entry=zip.file(path);if(!entry)throw Error(`${sheetName} 원본 XML을 찾지 못했습니다.`);
    const stylesPath='xl/styles.xml',stylesEntry=zip.file(stylesPath);
    if(!stylesEntry)throw Error('원본 XLSX 스타일 정보를 읽지 못했습니다.');
    return {zip,path,xml:await entry.async('string'),stylesPath,stylesXml:await stylesEntry.async('string'),bytes};
  }

  function highlightChanges(parts,xml,changes,options){
    const apply=global.SystemV3SellerExport?.applyChangeHighlights;
    if(typeof apply!=='function')throw Error('XLSX 변경 셀 강조 모듈을 불러오지 못했습니다.');
    const highlighted=apply(xml,parts.stylesXml,changes,options);
    parts.stylesXml=highlighted.stylesXml;
    parts.zip.file(parts.stylesPath,highlighted.stylesXml,{createFolders:false});
    return highlighted.sheetXml;
  }

  async function buildProductPriceOption(file,items){
    if(!global.XLSX)throw Error('XLSX 모듈을 불러오지 못했습니다.');
    const parts=await sheetParts(file,PRODUCT_SHEET),{zip,path,bytes}=parts;let {xml}=parts;
    const book=global.XLSX.read(bytes,{type:'array',raw:true}),sheet=book.Sheets[PRODUCT_SHEET];if(!sheet)throw Error(`${PRODUCT_SHEET} 시트를 찾지 못했습니다.`);
    const byRow=new Map();for(const item of items||[]){if(!byRow.has(item.source_row_no))byRow.set(item.source_row_no,[]);byRow.get(item.source_row_no).push(item);}
    const changes=[];
    for(const [rowNo,rowItems] of byRow){
      const baseTargets=[...new Set(rowItems.filter(item=>finite(item.target_base_price)).map(item=>Number(item.target_base_price)))];
      if(baseTargets.length>1)throw Error(`${rowNo}행 상품 판매가 목표값이 옵션마다 다릅니다.`);
      if(baseTargets.length===1){xml=global.AblyStockExport.patchCell(xml,rowNo,PRODUCT_BASE_PRICE_COLUMN,baseTargets[0]);changes.push(`${PRODUCT_BASE_PRICE_COLUMN}${rowNo}`);}
      const ref=`${PRODUCT_OPTION_PRICE_COLUMN}${rowNo}`,current=splitLines(sheet[ref]?.v??'');
      let changed=false;for(const item of rowItems){if(!finite(item.target_option_price))continue;while(current.length<=item.option_index)current.push('');current[item.option_index]=String(Number(item.target_option_price));changes.push({reference:ref,lineIndex:item.option_index});changed=true;}
      if(changed)xml=global.AblyStockExport.patchCell(xml,rowNo,PRODUCT_OPTION_PRICE_COLUMN,current.join('\n'));
    }
    if(changes.length)xml=highlightChanges(parts,xml,changes);
    const warnings=(items||[]).filter(item=>item._status&&item._status!=='ready').flatMap(item=>[`${PRODUCT_BASE_PRICE_COLUMN}${item.source_row_no}`,`${PRODUCT_OPTION_PRICE_COLUMN}${item.source_row_no}`]);
    if(warnings.length)xml=highlightChanges(parts,xml,warnings,{fillColor:'FFFFC7CE',preserveText:true});
    zip.file(path,xml,{createFolders:false});return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
  }

  async function buildOptionPriceStock(file,items){
    const parts=await sheetParts(file,OPTION_SHEET);let xml=parts.xml;
    const changes=[];
    for(const item of items||[]){
      if(finite(item.target_option_price)){xml=global.AblyStockExport.patchCell(xml,item.source_row_no,OPTION_PRICE_COLUMN,Number(item.target_option_price));changes.push(`${OPTION_PRICE_COLUMN}${item.source_row_no}`);}
      // 운영 계약: X(*판매수량)가 실재고 write 대상이고 W(판매가능재고)는 보존한다.
      if(finite(item.target_stock)){xml=global.AblyStockExport.patchCell(xml,item.source_row_no,OPTION_STOCK_COLUMN,Number(item.target_stock));changes.push(`${OPTION_STOCK_COLUMN}${item.source_row_no}`);}
    }
    if(changes.length)xml=highlightChanges(parts,xml,changes);
    const warnings=(items||[]).filter(item=>item._status&&item._status!=='ready').flatMap(item=>[`${OPTION_PRICE_COLUMN}${item.source_row_no}`,`${OPTION_STOCK_COLUMN}${item.source_row_no}`]);
    if(warnings.length)xml=highlightChanges(parts,xml,warnings,{fillColor:'FFFFC7CE',preserveText:true});
    parts.zip.file(parts.path,xml,{createFolders:false});return parts.zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
  }

  global.AblyPlayautoExport={
    PRODUCT_SHEET,OPTION_SHEET,PRODUCT_REQUIRED,OPTION_REQUIRED,
    PRODUCT_BASE_PRICE_COLUMN,PRODUCT_OPTION_PRICE_COLUMN,OPTION_PRICE_COLUMN,OPTION_STOCK_COLUMN,OPTION_SALES_QUANTITY_COLUMN,
    detect,productOptionLines,parseProductRows,parseOptionRows,resolveSellpiaSku,resolveRows,isNoBallAnchor,prepareSellpiaSourceProductRows,readTemplate,
    buildProductPriceOption,buildOptionPriceStock,sellerProductCode,stripSellpiaPrefix,normalize
  };
})(typeof window==='undefined'?globalThis:window);
