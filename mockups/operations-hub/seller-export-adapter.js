(function initSellerExportAdapter(global) {
  'use strict';

  const SOURCE_LABELS = {smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리'};
  const FIELD_LABELS = {sellpia_current_stock:'재고', sellpia_sale_price:'판매가', seller_product_name:'상품명', seller_option_name:'옵션명'};

  function clean(value) { return String(value ?? '').trim(); }
  function scalar(value) {
    if (value && typeof value === 'object') return value;
    return value === null || value === undefined ? '' : value;
  }
  function xmlEscape(value) {
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function xmlDecode(value) {
    const node = global.document?.createElement?.('textarea');
    if (node) { node.innerHTML = String(value || ''); return node.value; }
    return String(value || '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  }
  function extractXmlAttributes(source) {
    const attrs = {}; String(source || '').replace(/([\w:]+)="([^"]*)"/g,(_,key,value)=>{ attrs[key]=value; return ''; }); return attrs;
  }
  function richTextValue(xml) {
    const parts=[]; String(xml||'').replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g,(_,text)=>{parts.push(xmlDecode(text));return '';}); return parts.join('');
  }
  function columnIndex(reference) {
    const letters=String(reference||'').match(/^[A-Z]+/i)?.[0]?.toUpperCase()||''; let index=0;
    for(const letter of letters) index=index*26+letter.charCodeAt(0)-64; return index-1;
  }
  function cellValue(rowXml, reference, sharedStrings=[]) {
    const match=String(rowXml||'').match(new RegExp(`<c\\b([^>]*\\br="${reference}"[^>]*)>([\\s\\S]*?)<\\/c>`));
    if(!match) return '';
    const attrs=extractXmlAttributes(match[1]); const body=match[2]; const raw=body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
    if(attrs.t==='s') return sharedStrings[Number(raw)]??'';
    if(attrs.t==='inlineStr') return richTextValue(body);
    return raw===undefined?'':xmlDecode(raw);
  }
  function setCellValue(rowXml, reference, value, type='number') {
    const matcher=new RegExp(`<c\\b([^>]*\\br="${reference}"[^>]*)>[\\s\\S]*?<\\/c>`);
    const current=String(rowXml||'').match(matcher);
    const style=current?.[1]?.match(/\bs="[^"]+"/)?.[0];
    const attrs=[`r="${reference}"`,style].filter(Boolean).join(' ');
    const cell=type==='string'
      ? `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
      : `<c ${attrs}><v>${Number(value)}</v></c>`;
    return current ? rowXml.replace(matcher,cell) : rowXml.replace('</row>',`${cell}</row>`);
  }
  function xmlNodes(sectionXml, tagName) {
    return [...String(sectionXml || '').matchAll(new RegExp(`<${tagName}\\b[^>]*?\\/>|<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'g'))].map(match => match[0]);
  }
  function xmlAttribute(source, name, fallback = '') {
    return String(source || '').match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? fallback;
  }
  function setXmlAttribute(source, name, value) {
    const matcher = new RegExp(`\\b${name}="[^"]*"`);
    if (matcher.test(source)) return source.replace(matcher, `${name}="${value}"`);
    return source.replace(/^<([\w:]+)/, `<$1 ${name}="${value}"`);
  }
  function appendStyleNodes(stylesXml, tagName, nodes, count) {
    if (!nodes.length) return stylesXml;
    const matcher = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`);
    return String(stylesXml).replace(matcher, (_, attrs, body) => {
      const nextAttrs = `${attrs.replace(/\s*count="[^"]*"/g, '')} count="${count}"`;
      return `<${tagName}${nextAttrs}>${body}${nodes.join('')}</${tagName}>`;
    });
  }
  function boldFont(fontXml) {
    if (/<b\b[^>]*\/>/.test(fontXml)) return fontXml.replace(/<b\b[^>]*\/>/, '<b/>');
    if (/<b\b[^>]*>[\s\S]*?<\/b>/.test(fontXml)) return fontXml.replace(/<b\b[^>]*>[\s\S]*?<\/b>/, '<b/>');
    return fontXml.replace(/<font\b([^>]*)>/, '<font$1><b/>');
  }
  function fontIsBold(fontXml) {
    const match = String(fontXml || '').match(/<b\b([^>]*)\/>/);
    if (!match) return false;
    const value = xmlAttribute(match[0], 'val', '1').toLowerCase();
    return value !== '0' && value !== 'false';
  }
  function setCellStyle(sheetXml, reference, styleId) {
    const matcher = new RegExp(`<c\\b([^>]*\\br="${reference}"[^>]*)>`);
    return String(sheetXml).replace(matcher, (_, attrs) => {
      const cleanAttrs = attrs.replace(/\s+s="[^"]*"/, '').replace(/\s+$/, '');
      return `<c${cleanAttrs} s="${styleId}">`;
    });
  }
  function normalizeHighlights(changes) {
    const byReference = new Map();
    for (const change of changes || []) {
      const reference = typeof change === 'string' ? change : change?.reference;
      if (!reference) continue;
      if (!byReference.has(reference)) byReference.set(reference, {reference, full:false, lineIndexes:new Set()});
      const highlight = byReference.get(reference);
      const rawLineIndex = typeof change === 'object' ? change?.lineIndex : null;
      const lineIndex = rawLineIndex === null || rawLineIndex === undefined || rawLineIndex === '' ? NaN : Number(rawLineIndex);
      if (!Number.isInteger(lineIndex) || lineIndex < 0) highlight.full = true;
      else highlight.lineIndexes.add(lineIndex);
    }
    return [...byReference.values()];
  }
  function boldInlineText(sheetXml, highlight) {
    const reference = highlight.reference;
    const matcher = new RegExp(`<c\\b([^>]*\\br="${reference}"[^>]*)>([\\s\\S]*?)<\\/c>`);
    let applied = false;
    const nextSheetXml = String(sheetXml).replace(matcher, (cellXml, attrs, body) => {
      if (xmlAttribute(attrs, 't') !== 'inlineStr') return cellXml;
      const lines = richTextValue(body).split(/\r?\n/);
      const runs = lines.map((line, index) => {
        const text = `${line}${index < lines.length - 1 ? '\n' : ''}`;
        const bold = highlight.full || highlight.lineIndexes.has(index);
        return `<r>${bold ? '<rPr><b/></rPr>' : ''}<t xml:space="preserve">${xmlEscape(text)}</t></r>`;
      }).join('');
      applied = true;
      return `<c${attrs}><is>${runs}</is></c>`;
    });
    return {sheetXml:nextSheetXml, applied};
  }
  function applyChangeHighlights(sheetXml, stylesXml, changes) {
    const highlights = normalizeHighlights(changes);
    if (!highlights.length) return {sheetXml, stylesXml};
    const fontsSection = String(stylesXml).match(/<fonts\b[^>]*>[\s\S]*?<\/fonts>/)?.[0];
    const fillsSection = String(stylesXml).match(/<fills\b[^>]*>[\s\S]*?<\/fills>/)?.[0];
    const xfsSection = String(stylesXml).match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/)?.[0];
    if (!fontsSection || !fillsSection || !xfsSection) throw new Error('원본 XLSX 스타일 정보를 읽지 못했습니다.');

    const fonts = xmlNodes(fontsSection, 'font');
    const fills = xmlNodes(fillsSection, 'fill');
    const xfs = xmlNodes(xfsSection, 'xf');
    const addedFonts = [];
    const boldFontBySource = new Map();
    const addedXfs = [];
    const highlightedStyleByBase = new Map();
    const yellowFillId = fills.length;

    function highlightedStyle(baseStyleId, boldCell) {
      const safeBaseId = xfs[baseStyleId] ? baseStyleId : 0;
      const styleKey = `${safeBaseId}:${boldCell ? 'bold' : 'fill'}`;
      if (highlightedStyleByBase.has(styleKey)) return highlightedStyleByBase.get(styleKey);
      const baseXf = xfs[safeBaseId] || '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>';
      const sourceFontId = Number(xmlAttribute(baseXf, 'fontId', '0')) || 0;
      let boldFontId = sourceFontId;
      if (boldCell && !fontIsBold(fonts[sourceFontId])) {
        if (!boldFontBySource.has(sourceFontId)) {
          boldFontBySource.set(sourceFontId, fonts.length + addedFonts.length);
          addedFonts.push(boldFont(fonts[sourceFontId] || '<font/>'));
        }
        boldFontId = boldFontBySource.get(sourceFontId);
      }
      let nextXf = boldCell ? setXmlAttribute(baseXf, 'fontId', boldFontId) : baseXf;
      nextXf = setXmlAttribute(nextXf, 'fillId', yellowFillId);
      if (boldCell) nextXf = setXmlAttribute(nextXf, 'applyFont', '1');
      nextXf = setXmlAttribute(nextXf, 'applyFill', '1');
      const nextStyleId = xfs.length + addedXfs.length;
      addedXfs.push(nextXf);
      highlightedStyleByBase.set(styleKey, nextStyleId);
      return nextStyleId;
    }

    let nextSheetXml = String(sheetXml);
    for (const highlight of highlights) {
      const reference = highlight.reference;
      const cellAttrs = nextSheetXml.match(new RegExp(`<c\\b([^>]*\\br="${reference}"[^>]*)>`))?.[1] || '';
      const baseStyleId = Number(xmlAttribute(cellAttrs, 's', '0')) || 0;
      const richText = boldInlineText(nextSheetXml, highlight);
      nextSheetXml = richText.sheetXml;
      nextSheetXml = setCellStyle(nextSheetXml, reference, highlightedStyle(baseStyleId, !richText.applied));
    }
    const yellowFill = '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>';
    let nextStylesXml = appendStyleNodes(stylesXml, 'fonts', addedFonts, fonts.length + addedFonts.length);
    nextStylesXml = appendStyleNodes(nextStylesXml, 'fills', [yellowFill], fills.length + 1);
    nextStylesXml = appendStyleNodes(nextStylesXml, 'cellXfs', addedXfs, xfs.length + addedXfs.length);
    return {sheetXml:nextSheetXml, stylesXml:nextStylesXml};
  }
  function replaceLine(value,index,next) {
    const lines=String(value??'').split(/\r?\n/); while(lines.length<=index) lines.push(''); lines[index]=String(next??''); return lines.join('\n');
  }
  function sameValue(left,right,field) {
    if(field==='sellpia_current_stock'||field==='sellpia_sale_price') return Number(left)===Number(right);
    return clean(left)===clean(right);
  }
  function exportConflict(item,message) {
    const error=new Error(message); error.exportConflict=true; error.exportItem=item; return error;
  }
  function verifyExpected(actual,item) {
    const expected=scalar(item.expected_source_value);
    if(expected===''||expected===null) return;
    if(!sameValue(actual,expected,item.field_key)) throw exportConflict(item,`${SOURCE_LABELS[item.source_channel]} ${item.sellpia_sku_code}: DB 스냅샷 값(${expected})과 보관 원본 값(${actual})이 다릅니다.`);
  }

  function applyNativeDiscount(basePrice, value, unit, roundingMode='nearest', roundingUnit=1) {
    let discounted=Number(basePrice);
    const amount=Math.abs(Number(value));
    if(!Number.isFinite(discounted)||!Number.isFinite(amount)) return discounted;
    if(String(unit).includes('%')) discounted*=1-amount/100;
    else if(String(unit).includes('원')) discounted-=amount;
    const step=Math.max(1,Number(roundingUnit)||1);
    if(roundingMode==='down') discounted=Math.floor(discounted/step)*step;
    else if(roundingMode==='up') discounted=Math.ceil(discounted/step)*step;
    else discounted=Math.round(discounted/step)*step;
    return Math.max(0,discounted);
  }
  function smartstoreDiscountedBase(rowXml,row,sharedStrings,basePrice) {
    const value=cellValue(rowXml,`BF${row}`,sharedStrings);
    const unit=clean(cellValue(rowXml,`BG${row}`,sharedStrings));
    return value===''||!unit?Number(basePrice):applyNativeDiscount(basePrice,value,unit);
  }
  function makeshopDiscountedBase(rowXml,row,sharedStrings,basePrice) {
    const raw=clean(cellValue(rowXml,`DD${row}`,sharedStrings));
    const match=raw.match(/(-?[\d,.]+)\s*(%|원)/);
    if(!match) return Number(basePrice);
    const roundingUnit=raw.includes('백원')?100:raw.includes('십원')?10:1;
    const roundingMode=raw.includes('올림')?'up':raw.includes('반올림')?'nearest':raw.includes('절사')?'down':'nearest';
    return applyNativeDiscount(basePrice,String(match[1]).replace(/,/g,''),match[2],roundingMode,roundingUnit);
  }

  function priceTargets(item) {
    const base=Number(item.target_base_price);
    const discountedBase=Number(item.target_discounted_base_price ?? item.target_base_price);
    const option=Number(item.target_option_price ?? 0);
    const finalPrice=Number(item.target_final_price ?? scalar(item.after_value));
    if(!Number.isFinite(base)||!Number.isFinite(discountedBase)||!Number.isFinite(option)||!Number.isFinite(finalPrice)) throw exportConflict(item,`${SOURCE_LABELS[item.source_channel]} ${item.sellpia_sku_code}: 판매가·할인 적용 판매가·옵션가·최종구매가 계산값이 없습니다.`);
    if(base<0||discountedBase<0||finalPrice<0||discountedBase+option!==finalPrice) throw exportConflict(item,`${SOURCE_LABELS[item.source_channel]} ${item.sellpia_sku_code}: 할인 적용 판매가 ${discountedBase} + 옵션가 ${option}가 최종구매가 ${finalPrice}와 일치하지 않습니다.`);
    return {base,discountedBase,option,finalPrice,discountTerms:Array.isArray(item.target_discount_terms)?item.target_discount_terms:[]};
  }

  function discountTermMap(terms) { return new Map((Array.isArray(terms)?terms:[]).map(term=>[clean(term.term_key),term])); }
  function discountUnitLabel(unit) { return unit==='percent'?'%':unit==='amount'?'원':''; }
  function discountTermsChanged(item) { return JSON.stringify(item.source_discount_terms||[])!==JSON.stringify(item.target_discount_terms||[]); }
  function patchSmartstoreDiscounts(rowXml,row,item) {
    if(!discountTermsChanged(item)) return {rowXml,references:[]};
    let output=rowXml; const terms=discountTermMap(item.target_discount_terms); const references=[];
    for(const [key,valueRef,unitRef] of [['basic','BF','BG'],['mobile','BH','BI'],['reservation','BJ','BK'],['multi_buy','BO','BP']]) {
      const term=terms.get(key); const value=term?.value??''; const unit=term?discountUnitLabel(term.unit):'';
      output=setCellValue(output,`${valueRef}${row}`,value,value===''?'string':'number');
      output=setCellValue(output,`${unitRef}${row}`,unit,'string');
      references.push({reference:`${valueRef}${row}`},{reference:`${unitRef}${row}`});
    }
    return {rowXml:output,references};
  }
  function makeshopPeriodText(term) {
    if(!term) return '';
    const rounding={down:'절사',up:'올림',nearest:'반올림'}[term.rounding_mode]||'';
    const roundingUnit=Number(term.rounding_unit||1)===100?'백원':Number(term.rounding_unit||1)===10?'십원':'';
    return `${term.value}${discountUnitLabel(term.unit)}${roundingUnit||rounding?` ${roundingUnit}${rounding}`:''}`.trim();
  }

  function patchSmartstoreRow(rowXml, items, sharedStrings, onConflict, onApplied) {
    let output=rowXml;
    for(const item of items) {
      try {
        const row=Number(item.source_row_no); const optionCode=clean(item.seller_option_code); let optionIndex=-1;
        if(optionCode) {
          const codes=String(cellValue(output,`P${row}`,sharedStrings)).split(/\r?\n/).map(clean); optionIndex=codes.indexOf(optionCode);
          if(optionIndex<0) throw exportConflict(item,`스마트스토어 ${item.sellpia_sku_code}: ${row}행에서 옵션번호 ${optionCode}를 찾지 못했습니다.`);
        }
        const after=scalar(item.after_value);
        let changedRef='';
        if(item.field_key==='sellpia_current_stock') {
          const ref=optionCode?`S${row}`:`M${row}`; const current=optionCode?String(cellValue(output,ref,sharedStrings)).split(/\r?\n/)[optionIndex]:cellValue(output,ref,sharedStrings);
          verifyExpected(current,item); output=setCellValue(output,ref,optionCode?replaceLine(cellValue(output,ref,sharedStrings),optionIndex,after):after,optionCode?'string':'number'); changedRef=ref;
        } else if(item.field_key==='sellpia_sale_price') {
          const targets=priceTargets(item);
          const originalBase=Number(cellValue(rowXml,`F${row}`,sharedStrings)||item.base_price||0);
          const originalOption=optionCode?Number(String(cellValue(rowXml,`R${row}`,sharedStrings)).split(/\r?\n/)[optionIndex]||0):0;
          verifyExpected(smartstoreDiscountedBase(rowXml,row,sharedStrings,originalBase)+originalOption,item);
          output=setCellValue(output,`F${row}`,targets.base,'number');
          if(optionCode) output=setCellValue(output,`R${row}`,replaceLine(cellValue(output,`R${row}`,sharedStrings),optionIndex,targets.option),'string');
          changedRef=optionCode?[{reference:`F${row}`},{reference:`R${row}`,lineIndex:optionIndex}]:[{reference:`F${row}`}];
          const discountPatch=patchSmartstoreDiscounts(output,row,item);
          output=discountPatch.rowXml;
          changedRef=[...changedRef,...discountPatch.references];
        } else if(item.field_key==='seller_product_name') {
          changedRef=`D${row}`; verifyExpected(cellValue(output,changedRef,sharedStrings),item); output=setCellValue(output,changedRef,after,'string');
        } else if(item.field_key==='seller_option_name') {
          const current=String(cellValue(output,`Q${row}`,sharedStrings)).split(/\r?\n/)[optionIndex]??''; verifyExpected(current,item);
          changedRef=`Q${row}`; output=setCellValue(output,changedRef,replaceLine(cellValue(output,changedRef,sharedStrings),optionIndex,after),'string');
        }
        const changedLineIndex = optionCode && ['sellpia_current_stock','seller_option_name'].includes(item.field_key) ? optionIndex : null;
        if(changedRef) onApplied?.(item,changedRef,{lineIndex:changedLineIndex});
      } catch(error) {
        if(error?.exportConflict && onConflict) onConflict({item,reason:error.message}); else throw error;
      }
    }
    return output;
  }

  function makeshopProductRows(sheetXml,sharedStrings) {
    const map=new Map(); String(sheetXml).replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(rowXml,rowNo)=>{ const code=clean(cellValue(rowXml,`E${rowNo}`,sharedStrings)); if(code) map.set(code,Number(rowNo)); return rowXml; }); return map;
  }
  function sheetRowXml(sheetXml,row) {
    return String(sheetXml||'').match(new RegExp(`<row\\b[^>]*\\br="${Number(row)}"[^>]*>[\\s\\S]*?<\\/row>`))?.[0]||'';
  }
  function preflightSharedPriceGroups(sheetXml,items,sharedStrings,onConflict) {
    const source=items[0]?.source_channel;
    if(!['smartstore','makeshop'].includes(source)) return {items,workingSheetXml:sheetXml};
    const productRows=source==='makeshop'?makeshopProductRows(sheetXml,sharedStrings):new Map();
    const groups=new Map();
    for(const item of items.filter(value=>value.field_key==='sellpia_sale_price')) {
      const key=clean(item.seller_product_code)||`row:${Number(item.source_row_no)}`;
      if(!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(item);
    }
    let workingSheetXml=sheetXml;
    for(const [productCode,group] of groups) {
      try {
        const targets=group.map(priceTargets);
        if(new Set(targets.map(value=>value.base)).size!==1) throw exportConflict(group[0],`${SOURCE_LABELS[source]} ${productCode}: 같은 상품의 목표 판매가가 서로 다릅니다.`);
        if(new Set(targets.map(value=>JSON.stringify(value.discountTerms||[]))).size!==1) throw exportConflict(group[0],`${SOURCE_LABELS[source]} ${productCode}: 같은 상품의 목표 할인조건이 서로 다릅니다.`);
        let productRow=null;
        let originalBase=null;
        if(source==='makeshop') {
          productRow=productRows.get(clean(group[0].seller_product_code));
          if(!productRow) throw exportConflict(group[0],`${SOURCE_LABELS[source]} ${productCode}: 상품 기본 판매가 행을 찾지 못했습니다.`);
          originalBase=Number(cellValue(sheetRowXml(sheetXml,productRow),`AS${productRow}`,sharedStrings));
          if(!Number.isFinite(originalBase)) throw exportConflict(group[0],`${SOURCE_LABELS[source]} ${productCode}: 원본 기본 판매가를 읽지 못했습니다.`);
        }
        for(const item of group) {
          const row=Number(item.source_row_no);
          const rowXml=sheetRowXml(sheetXml,row);
          if(!rowXml) throw exportConflict(item,`${SOURCE_LABELS[source]} ${item.sellpia_sku_code}: 보관 원본에서 ${row}행을 찾지 못했습니다.`);
          const optionCode=clean(item.seller_option_code);
          if(source==='smartstore') {
            const base=Number(cellValue(rowXml,`F${row}`,sharedStrings)||0);
            let option=0;
            if(optionCode) {
              const codes=String(cellValue(rowXml,`P${row}`,sharedStrings)).split(/\r?\n/).map(clean);
              const optionIndex=codes.indexOf(optionCode);
              if(optionIndex<0) throw exportConflict(item,`${SOURCE_LABELS[source]} ${item.sellpia_sku_code}: ${row}행에서 옵션번호 ${optionCode}를 찾지 못했습니다.`);
              option=Number(String(cellValue(rowXml,`R${row}`,sharedStrings)).split(/\r?\n/)[optionIndex]||0);
            }
            verifyExpected(smartstoreDiscountedBase(rowXml,row,sharedStrings,base)+option,item);
          } else {
            if(Number.isFinite(Number(item.base_price))&&originalBase!==Number(item.base_price)) throw exportConflict(item,`${SOURCE_LABELS[source]} ${item.sellpia_sku_code}: DB 기본 판매가(${item.base_price})와 보관 원본 값(${originalBase})이 다릅니다.`);
            if(optionCode&&clean(cellValue(rowXml,`AR${row}`,sharedStrings))!==optionCode) throw exportConflict(item,`${SOURCE_LABELS[source]} ${item.sellpia_sku_code}: ${row}행 옵션코드가 DB와 다릅니다.`);
            const option=optionCode?Number(cellValue(rowXml,`AF${row}`,sharedStrings)||0):0;
            verifyExpected(makeshopDiscountedBase(sheetRowXml(sheetXml,productRow),productRow,sharedStrings,originalBase)+option,item);
            item._product_row_no=productRow;
          }
        }
        if(source==='makeshop') {
          workingSheetXml=setCellValue(workingSheetXml,`AS${productRow}`,targets[0].base,'number');
          if(discountTermsChanged(group[0])) {
            const terms=discountTermMap(group[0].target_discount_terms);
            workingSheetXml=setCellValue(workingSheetXml,`DD${productRow}`,makeshopPeriodText(terms.get('period')),'string');
            workingSheetXml=setCellValue(workingSheetXml,`AT${productRow}`,terms.get('membership')?.value??0,'number');
            for(const item of group) item._shared_discount_refs=[{reference:`DD${productRow}`},{reference:`AT${productRow}`}];
          }
        }
      } catch(error) {
        if(!error?.exportConflict||!onConflict) throw error;
        for(const item of group) {
          item._preflight_conflict=true;
          onConflict({item,reason:`${error.message} 공유 판매가가 있는 옵션 묶음 전체를 제외했습니다.`});
        }
      }
    }
    return {items,workingSheetXml};
  }
  function patchMakeshopRow(rowXml,items,sharedStrings,onConflict,onApplied) {
    let output=rowXml;
    for(const item of items) {
      try {
        const row=Number(item.source_row_no); const optionCode=clean(item.seller_option_code); const after=scalar(item.after_value);
        if(optionCode && clean(cellValue(output,`AR${row}`,sharedStrings))!==optionCode) throw exportConflict(item,`메이크샵 ${item.sellpia_sku_code}: ${row}행 옵션코드가 DB와 다릅니다.`);
        let changedRef='';
        if(item.field_key==='sellpia_current_stock') {
          changedRef=optionCode?`AG${row}`:`AV${row}`; const current=cellValue(output,changedRef,sharedStrings); verifyExpected(current,item); output=setCellValue(output,changedRef,after,'number');
        } else if(item.field_key==='sellpia_sale_price') {
          const targets=priceTargets(item); const current=Number(scalar(item.expected_source_value)); verifyExpected(current,item);
          if(optionCode) {
            changedRef=[{reference:`AS${Number(item._product_row_no)}`},{reference:`AF${row}`},...(item._shared_discount_refs||[])];
            output=setCellValue(output,`AF${row}`,targets.option,'number');
          } else {
            changedRef=[{reference:`AS${row}`},...(item._shared_discount_refs||[])];
            output=setCellValue(output,`AS${row}`,targets.base,'number');
          }
        } else if(item.field_key==='seller_option_name') {
          changedRef=`AD${row}`; verifyExpected(cellValue(output,changedRef,sharedStrings),item); output=setCellValue(output,changedRef,after,'string');
        } else if(item.field_key==='seller_product_name') {
          changedRef=`M${row}`; verifyExpected(cellValue(output,changedRef,sharedStrings),item); output=setCellValue(output,changedRef,after,'string');
        }
        if(changedRef) onApplied?.(item,changedRef);
      } catch(error) {
        if(error?.exportConflict && onConflict) onConflict({item,reason:error.message}); else throw error;
      }
    }
    return output;
  }

  async function xlsxParts(file) {
    if(!global.JSZip) throw new Error('원본 보존 모듈을 불러오지 못했습니다.');
    const zip=await global.JSZip.loadAsync(new Uint8Array(await file.arrayBuffer()));
    const workbookXml=await zip.file('xl/workbook.xml')?.async('string'); const rels=await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    const sheetAttrs=extractXmlAttributes(workbookXml?.match(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/i)?.[1]); let target='';
    String(rels||'').replace(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/gi,(_,source)=>{const attrs=extractXmlAttributes(source);if(attrs.Id===sheetAttrs['r:id'])target=attrs.Target||'';return '';});
    const sheetPath=target.startsWith('/')?target.slice(1):`xl/${target.replace(/^\.\//,'')}`; const sheetXml=await zip.file(sheetPath)?.async('string');
    if(!sheetXml) throw new Error(`${file.name}: 첫 번째 시트 XML을 읽지 못했습니다.`);
    const sharedXml=await zip.file('xl/sharedStrings.xml')?.async('string'); const shared=[];
    String(sharedXml||'').replace(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g,(_,xml)=>{shared.push(richTextValue(xml));return '';});
    const stylesPath='xl/styles.xml'; const stylesXml=await zip.file(stylesPath)?.async('string');
    if(!stylesXml) throw new Error(`${file.name}: 원본 스타일 XML을 읽지 못했습니다.`);
    return {zip,sheetPath,sheetXml,shared,stylesPath,stylesXml};
  }

  async function patchXlsxFile(file,items,onConflict,onApplied) {
    const {zip,sheetPath,sheetXml,shared,stylesPath,stylesXml}=await xlsxParts(file);
    let workingSheetXml=sheetXml;
    if(items[0]?.source_channel==='makeshop') {
      const productRows=makeshopProductRows(sheetXml,shared);
      for(const item of items.filter(value=>value.field_key==='seller_product_name')) item.source_row_no=productRows.get(clean(item.seller_product_code))||item.source_row_no;
    }
    workingSheetXml=preflightSharedPriceGroups(sheetXml,items,shared,onConflict).workingSheetXml;
    const rowNumbers=new Set([...String(workingSheetXml).matchAll(/<row\b[^>]*\br="(\d+)"/g)].map(match=>Number(match[1])));
    const byRow=new Map();
    for(const item of items){if(item._preflight_conflict)continue;const row=Number(item.source_row_no);if(!rowNumbers.has(row)){const reason=`${SOURCE_LABELS[item.source_channel]} ${item.sellpia_sku_code}: 보관 원본에서 ${row}행을 찾지 못했습니다.`;if(onConflict)onConflict({item,reason});else throw exportConflict(item,reason);continue;}if(!byRow.has(row))byRow.set(row,[]);byRow.get(row).push(item);}
    const appliedHighlights=[];
    const recordApplied=(item,reference,highlight)=>{const refs=Array.isArray(reference)?reference:[reference?{reference,...(highlight||{})}:null];for(const entry of refs.filter(Boolean))appliedHighlights.push(entry);onApplied?.(item);};
    const patched=workingSheetXml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(rowXml,rowNo)=>{
      const changes=byRow.get(Number(rowNo)); if(!changes) return rowXml;
      return items[0].source_channel==='smartstore'?patchSmartstoreRow(rowXml,changes,shared,onConflict,recordApplied):patchMakeshopRow(rowXml,changes,shared,onConflict,recordApplied);
    });
    const highlighted=applyChangeHighlights(patched,stylesXml,appliedHighlights);
    zip.file(sheetPath,highlighted.sheetXml); zip.file(stylesPath,highlighted.stylesXml); return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
  }

  async function patchCsvFile(file,items,onConflict,onApplied) {
    if(!global.XLSX) throw new Error('CSV 처리 모듈을 불러오지 못했습니다.');
    const workbook=global.XLSX.read(await file.text(),{type:'string',raw:true}); const sheet=workbook.Sheets[workbook.SheetNames[0]];
    const rows=global.XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:''});
    for(const item of items){try{const index=Number(item.source_row_no)-1;const row=rows[index];if(!row)throw exportConflict(item,`에이블리 ${item.sellpia_sku_code}: ${item.source_row_no}행이 없습니다.`);
      if(clean(row[0])!==clean(item.seller_product_code)||clean(row[10])!==clean(item.seller_option_code))throw exportConflict(item,`에이블리 ${item.sellpia_sku_code}: 원본 코드가 DB와 다릅니다.`);
      const column={sellpia_current_stock:15,sellpia_sale_price:6,seller_product_name:2,seller_option_name:14}[item.field_key];
      verifyExpected(row[column],item);
      if(item.field_key==='sellpia_sale_price') {
        const targets=priceTargets(item);
        row[4]=targets.base;
        row[5]=targets.discountedBase;
        row[6]=targets.finalPrice;
      } else {
        const after=scalar(item.after_value);
        row[column]=item.field_key.includes('stock')?Number(after):String(after);
      }
      onApplied?.(item);
      }catch(error){if(error?.exportConflict&&onConflict)onConflict({item,reason:error.message});else throw error;}
    }
    const output=global.XLSX.utils.sheet_to_csv(global.XLSX.utils.aoa_to_sheet(rows),{FS:',',RS:'\r\n'}); return new Blob([new Uint8Array([0xEF,0xBB,0xBF]),output],{type:'text/csv;charset=utf-8'});
  }

  function outputName(name) { const dot=name.lastIndexOf('.'); return dot<0?`${name}_SystemV3반영`:`${name.slice(0,dot)}_SystemV3반영${name.slice(dot)}`; }
  function csvCell(value){const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
  function auditCsv(items){const rows=[['판매처','셀피아 SKU','변경항목','판매처 상품코드','옵션코드','변경 전','변경 후','원본 판매가','원본 옵션가','목표 판매가','할인 적용 판매가','목표 옵션가','목표 최종구매가','원본 할인조건','목표 할인조건','입력 기준','가격 태그','원본파일','원본행']];for(const item of items)rows.push([SOURCE_LABELS[item.source_channel],item.sellpia_sku_code,FIELD_LABELS[item.field_key]||item.field_key,item.seller_product_code,item.seller_option_code,scalar(item.expected_source_value),scalar(item.after_value),item.base_price,item.option_price,item.target_base_price,item.target_discounted_base_price,item.target_option_price,item.target_final_price,JSON.stringify(item.source_discount_terms||[]),JSON.stringify(item.target_discount_terms||[]),item.pricing_input_mode||'legacy_final',item.price_rule_set_id||'',item.source_file_name,item.source_row_no]);return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
  function conflictCsv(conflicts){const rows=[['판매처','셀피아 SKU','변경항목','판매처 상품코드','옵션코드','제외 사유','원본파일','원본행']];for(const conflict of conflicts){const item=conflict.item;rows.push([SOURCE_LABELS[item.source_channel],item.sellpia_sku_code,FIELD_LABELS[item.field_key]||item.field_key,item.seller_product_code,item.seller_option_code,conflict.reason,item.source_file_name,item.source_row_no]);}return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}

  async function buildExportArchive(filesBySource,items,onProgress) {
    if(!items?.length) throw new Error('내보낼 항목이 없습니다.');
    const blocked=items.filter(item=>item.blocking_reason); if(blocked.length) throw new Error(`원본 위치를 확인할 수 없는 항목이 ${blocked.length}건 있습니다.`);
    const files=[...filesBySource.values()].flat(); const byName=new Map(files.map(file=>[file.name,file])); const grouped=new Map();
    for(const item of items){if(!grouped.has(item.source_file_name))grouped.set(item.source_file_name,[]);grouped.get(item.source_file_name).push({...item});}
    const missing=[...grouped.keys()].filter(name=>!byName.has(name)); if(missing.length)throw new Error(`최근 DB 스냅샷과 같은 원본 파일을 선택해주세요: ${missing.join(', ')}`);
    const archive=new global.JSZip(); const manifest=[]; const appliedItems=[]; const skippedItems=[]; let index=0;
    for(const [name,fileItems] of grouped){index+=1;onProgress?.(Math.round((index-1)/grouped.size*85),`${name} 검증·반영 중`);const file=byName.get(name);
      const fileApplied=[];const recordApplied=item=>{fileApplied.push(item);appliedItems.push(item);};const recordConflict=conflict=>skippedItems.push({...conflict,export_item_id:Number(conflict.item.export_item_id)});
      const blob=name.toLowerCase().endsWith('.csv')?await patchCsvFile(file,fileItems,recordConflict,recordApplied):await patchXlsxFile(file,fileItems,recordConflict,recordApplied);if(fileApplied.length){const nextName=outputName(name); archive.file(nextName,blob); manifest.push({source:fileItems[0].source_channel,source_name:name,output_name:nextName,item_count:fileApplied.length,skipped_count:fileItems.length-fileApplied.length,size:blob.size});}}
    if(!appliedItems.length)throw new Error(skippedItems[0]?.reason||'원본 검증을 통과한 항목이 없습니다.');
    archive.file('SystemV3_내보내기_검증.csv',auditCsv(appliedItems));if(skippedItems.length)archive.file('SystemV3_내보내기_제외목록.csv',conflictCsv(skippedItems));onProgress?.(90,'ZIP 파일 압축 중');
    const blob=await archive.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});return{blob,manifest,appliedItems,skippedItems};
  }
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

  global.SystemV3SellerExport=Object.freeze({cellValue,setCellValue,applyChangeHighlights,preflightSharedPriceGroups,patchSmartstoreRow,patchMakeshopRow,patchCsvFile,buildExportArchive,downloadBlob,outputName});
})(typeof window!=='undefined'?window:globalThis);
