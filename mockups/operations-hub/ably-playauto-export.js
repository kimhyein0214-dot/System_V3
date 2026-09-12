(function(global){
  'use strict';

  const PRODUCT_SHEET='쇼핑몰상품';
  const OPTION_SHEET='옵션기본';
  const PRODUCT_REQUIRED=['판매자관리코드','쇼핑몰(계정)','온라인 상품명','판매가','옵션','SKU','옵션 추가금액'];
  const OPTION_REQUIRED=['*쇼핑몰','*계정','*판매자관리코드','온라인 상품명','옵션1 명칭','옵션1 값','추가 금액','판매가능재고','*판매수량'];
  const PRODUCT_BASE_PRICE_COLUMN='I';
  const PRODUCT_OPTION_PRICE_COLUMN='T';
  const OPTION_PRICE_COLUMN='V';
  const OPTION_MEMO_STOCK_COLUMN='W';
  const OPTION_STOCK_COLUMN='X';

  const clean=value=>String(value??'').trim();
  const normalize=value=>clean(value).replace(/\s+/g,' ').toLowerCase();
  const splitLines=value=>String(value??'').split(/\r?\n/).map(clean);
  const nonEmptyLines=value=>splitLines(value).filter(Boolean);
  const stripSellpiaPrefix=value=>clean(value).replace(/^sellpia_/i,'');
  const sellerProductCode=value=>{const match=clean(value).match(/^sellpia_(.+)$/i);return match?match[1]:'';};
  const headerMap=headers=>new Map((headers||[]).map((value,index)=>[clean(value),index]));
  const assertHeaders=(headers,required,label)=>{const map=headerMap(headers),missing=required.filter(name=>!map.has(name));if(missing.length)throw Error(`${label} 필수 헤더가 없습니다: ${missing.join(', ')}`);return map;};
  const valueAt=(row,map,name)=>row?.[map.get(name)]??'';
  const finite=value=>Number.isFinite(Number(value));

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
          direct_sellpia_sku_code:directSku,option_candidates:[option.option_name].filter(Boolean),primary_option_name:option.option_name,
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
    return rows.slice(1).map((row,rowIndex)=>{
      const sellerCode=clean(valueAt(row,map,'*판매자관리코드'));
      const optionPairs=[1,2,3].map(index=>({name:clean(valueAt(row,map,`옵션${index} 명칭`)),value:clean(valueAt(row,map,`옵션${index} 값`))})).filter(pair=>pair.name||pair.value);
      const values=optionPairs.map(pair=>pair.value).filter(Boolean),joined=values.join('/');
      return {
        template_type:'option_price_stock',source_row_no:rowIndex+2,
        shop:clean(valueAt(row,map,'*쇼핑몰')),account:clean(valueAt(row,map,'*계정')),seller_management_code:sellerCode,
        sellpia_product_code:sellerProductCode(sellerCode),product_name:clean(valueAt(row,map,'온라인 상품명')),
        seller_product_code:clean(valueAt(row,map,'쇼핑몰상품코드')),base_price:finite(valueAt(row,map,'판매가'))?Number(valueAt(row,map,'판매가')):null,
        option_pairs:optionPairs,option_candidates:[...values,...(joined?[joined]:[])],primary_option_name:values[0]||'',
        option_price:finite(valueAt(row,map,'추가 금액'))?Number(valueAt(row,map,'추가 금액')):null,
        memo_stock:valueAt(row,map,'판매가능재고'),
        actual_stock:finite(valueAt(row,map,'*판매수량'))?Number(valueAt(row,map,'*판매수량')):null
      };
    }).filter(item=>item.seller_management_code);
  }

  function resolveSellpiaSku(item,catalog){
    const rows=(catalog||[]).filter(row=>clean(row.sellpia_product_code)===clean(item.sellpia_product_code));
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
    if(rows.length===1)return {sku:rows[0].sellpia_sku_code,method:'single_product_sku',row:rows[0]};
    return {error:rows.length?'옵션명으로 SKU를 하나로 결정하지 못했습니다.':'셀피아 상품코드를 찾지 못했습니다.',method:'unresolved'};
  }

  function resolveRows(items,catalog){return (items||[]).map(item=>({...item,resolution:resolveSellpiaSku(item,catalog)}));}

  async function readTemplate(file){
    if(!global.XLSX)throw Error('XLSX 모듈을 불러오지 못했습니다.');
    const book=global.XLSX.read(await file.arrayBuffer(),{type:'array',raw:true});
    const rowsBySheet={};for(const name of book.SheetNames)rowsBySheet[name]=global.XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:'',raw:true});
    const detected=detect(rowsBySheet);if(!detected)throw Error('에이블리 PlayAuto 판매가+옵션가 또는 옵션가+재고 양식을 인식하지 못했습니다.');
    const items=detected.type==='product_price_option'?parseProductRows(rowsBySheet[detected.sheet]):parseOptionRows(rowsBySheet[detected.sheet]);
    return {...detected,items,rowsBySheet};
  }

  async function sheetParts(file,sheetName){
    if(!global.JSZip||!global.XLSX||!global.AblyStockExport?.patchCell)throw Error('원본 보존 XLSX 모듈을 불러오지 못했습니다.');
    const bytes=await file.arrayBuffer(),book=global.XLSX.read(bytes,{type:'array',raw:true}),sheet=book.Sheets[sheetName];if(!sheet)throw Error(`${sheetName} 시트를 찾지 못했습니다.`);
    const zip=await global.JSZip.loadAsync(bytes),parser=new DOMParser();
    const workbook=parser.parseFromString(await zip.file('xl/workbook.xml').async('string'),'application/xml');
    const descriptor=[...workbook.getElementsByTagName('sheet')].find(el=>el.getAttribute('name')===sheetName);
    const rels=parser.parseFromString(await zip.file('xl/_rels/workbook.xml.rels').async('string'),'application/xml');
    const target=[...rels.getElementsByTagName('Relationship')].find(el=>el.getAttribute('Id')===descriptor?.getAttribute('r:id'))?.getAttribute('Target');
    if(!target)throw Error(`${sheetName} 시트 연결을 찾지 못했습니다.`);
    const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
    const entry=zip.file(path);if(!entry)throw Error(`${sheetName} 원본 XML을 찾지 못했습니다.`);
    return {zip,path,xml:await entry.async('string'),sheet};
  }

  async function buildProductPriceOption(file,items){
    const {zip,path,sheet}=await sheetParts(file,PRODUCT_SHEET);let {xml}=await sheetParts(file,PRODUCT_SHEET);
    const byRow=new Map();for(const item of items||[]){if(!byRow.has(item.source_row_no))byRow.set(item.source_row_no,[]);byRow.get(item.source_row_no).push(item);}
    for(const [rowNo,rowItems] of byRow){
      const baseTargets=[...new Set(rowItems.filter(item=>finite(item.target_base_price)).map(item=>Number(item.target_base_price)))];
      if(baseTargets.length>1)throw Error(`${rowNo}행 상품 판매가 목표값이 옵션마다 다릅니다.`);
      if(baseTargets.length===1)xml=global.AblyStockExport.patchCell(xml,rowNo,PRODUCT_BASE_PRICE_COLUMN,baseTargets[0]);
      const ref=`${PRODUCT_OPTION_PRICE_COLUMN}${rowNo}`,current=splitLines(sheet[ref]?.v??'');
      let changed=false;for(const item of rowItems){if(!finite(item.target_option_price))continue;while(current.length<=item.option_index)current.push('');current[item.option_index]=String(Number(item.target_option_price));changed=true;}
      if(changed)xml=global.AblyStockExport.patchCell(xml,rowNo,PRODUCT_OPTION_PRICE_COLUMN,current.join('\n'));
    }
    zip.file(path,xml,{createFolders:false});return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
  }

  async function buildOptionPriceStock(file,items){
    const parts=await sheetParts(file,OPTION_SHEET);let xml=parts.xml;
    for(const item of items||[]){
      if(finite(item.target_option_price))xml=global.AblyStockExport.patchCell(xml,item.source_row_no,OPTION_PRICE_COLUMN,Number(item.target_option_price));
      // W(판매가능재고)는 메모용이라 절대 수정하지 않는다. 실제 판매 수량/재고 반영은 X(*판매수량)이다.
      if(finite(item.target_stock))xml=global.AblyStockExport.patchCell(xml,item.source_row_no,OPTION_STOCK_COLUMN,Number(item.target_stock));
    }
    parts.zip.file(parts.path,xml,{createFolders:false});return parts.zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
  }

  global.AblyPlayautoExport={
    PRODUCT_SHEET,OPTION_SHEET,PRODUCT_REQUIRED,OPTION_REQUIRED,
    PRODUCT_BASE_PRICE_COLUMN,PRODUCT_OPTION_PRICE_COLUMN,OPTION_PRICE_COLUMN,OPTION_MEMO_STOCK_COLUMN,OPTION_STOCK_COLUMN,
    detect,productOptionLines,parseProductRows,parseOptionRows,resolveSellpiaSku,resolveRows,readTemplate,
    buildProductPriceOption,buildOptionPriceStock,sellerProductCode,stripSellpiaPrefix,normalize
  };
})(typeof window==='undefined'?globalThis:window);
