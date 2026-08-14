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
  function replaceLine(value,index,next) {
    const lines=String(value??'').split(/\r?\n/); while(lines.length<=index) lines.push(''); lines[index]=String(next??''); return lines.join('\n');
  }
  function sameValue(left,right,field) {
    if(field==='sellpia_current_stock'||field==='sellpia_sale_price') return Number(left)===Number(right);
    return clean(left)===clean(right);
  }
  function verifyExpected(actual,item) {
    const expected=scalar(item.expected_source_value);
    if(expected===''||expected===null) return;
    if(!sameValue(actual,expected,item.field_key)) throw new Error(`${SOURCE_LABELS[item.source_channel]} ${item.sellpia_sku_code}: DB 스냅샷 값(${expected})과 선택한 원본 값(${actual})이 다릅니다.`);
  }

  function patchSmartstoreRow(rowXml, items, sharedStrings) {
    let output=rowXml;
    for(const item of items) {
      const row=Number(item.source_row_no); const optionCode=clean(item.seller_option_code); let optionIndex=-1;
      if(optionCode) {
        const codes=String(cellValue(output,`P${row}`,sharedStrings)).split(/\r?\n/).map(clean); optionIndex=codes.indexOf(optionCode);
        if(optionIndex<0) throw new Error(`스마트스토어 ${item.sellpia_sku_code}: ${row}행에서 옵션번호 ${optionCode}를 찾지 못했습니다.`);
      }
      const after=scalar(item.after_value);
      if(item.field_key==='sellpia_current_stock') {
        const ref=optionCode?`S${row}`:`M${row}`; const current=optionCode?String(cellValue(output,ref,sharedStrings)).split(/\r?\n/)[optionIndex]:cellValue(output,ref,sharedStrings);
        verifyExpected(current,item); output=setCellValue(output,ref,optionCode?replaceLine(cellValue(output,ref,sharedStrings),optionIndex,after):after,optionCode?'string':'number');
      } else if(item.field_key==='sellpia_sale_price') {
        const base=Number(cellValue(output,`F${row}`,sharedStrings)||item.base_price||0);
        const current=optionCode?base+Number(String(cellValue(output,`R${row}`,sharedStrings)).split(/\r?\n/)[optionIndex]||0):base;
        verifyExpected(current,item);
        output=optionCode?setCellValue(output,`R${row}`,replaceLine(cellValue(output,`R${row}`,sharedStrings),optionIndex,Number(after)-base),'string'):setCellValue(output,`F${row}`,after,'number');
      } else if(item.field_key==='seller_product_name') {
        verifyExpected(cellValue(output,`D${row}`,sharedStrings),item); output=setCellValue(output,`D${row}`,after,'string');
      } else if(item.field_key==='seller_option_name') {
        const current=String(cellValue(output,`Q${row}`,sharedStrings)).split(/\r?\n/)[optionIndex]??''; verifyExpected(current,item);
        output=setCellValue(output,`Q${row}`,replaceLine(cellValue(output,`Q${row}`,sharedStrings),optionIndex,after),'string');
      }
    }
    return output;
  }

  function makeshopProductRows(sheetXml,sharedStrings) {
    const map=new Map(); String(sheetXml).replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(rowXml,rowNo)=>{ const code=clean(cellValue(rowXml,`E${rowNo}`,sharedStrings)); if(code) map.set(code,Number(rowNo)); return rowXml; }); return map;
  }
  function patchMakeshopRow(rowXml,items,sharedStrings) {
    let output=rowXml;
    for(const item of items) {
      const row=Number(item.source_row_no); const optionCode=clean(item.seller_option_code); const after=scalar(item.after_value);
      if(optionCode && clean(cellValue(output,`AR${row}`,sharedStrings))!==optionCode) throw new Error(`메이크샵 ${item.sellpia_sku_code}: ${row}행 옵션코드가 DB와 다릅니다.`);
      if(item.field_key==='sellpia_current_stock') {
        const ref=optionCode?`AG${row}`:`AV${row}`; const current=cellValue(output,ref,sharedStrings); verifyExpected(current,item); output=setCellValue(output,ref,after,'number');
      } else if(item.field_key==='sellpia_sale_price') {
        const base=Number(item.base_price||0); const current=base+Number(item.option_price||0); verifyExpected(current,item);
        output=optionCode?setCellValue(output,`AF${row}`,Number(after)-base,'number'):setCellValue(output,`AS${row}`,after,'number');
      } else if(item.field_key==='seller_option_name') {
        verifyExpected(cellValue(output,`AD${row}`,sharedStrings),item); output=setCellValue(output,`AD${row}`,after,'string');
      } else if(item.field_key==='seller_product_name') {
        verifyExpected(cellValue(output,`M${row}`,sharedStrings),item); output=setCellValue(output,`M${row}`,after,'string');
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
    return {zip,sheetPath,sheetXml,shared};
  }

  async function patchXlsxFile(file,items) {
    const {zip,sheetPath,sheetXml,shared}=await xlsxParts(file);
    if(items[0]?.source_channel==='makeshop') {
      const productRows=makeshopProductRows(sheetXml,shared);
      for(const item of items.filter(value=>value.field_key==='seller_product_name')) item.source_row_no=productRows.get(clean(item.seller_product_code))||item.source_row_no;
    }
    const byRow=new Map();
    for(const item of items){const row=Number(item.source_row_no);if(!byRow.has(row))byRow.set(row,[]);byRow.get(row).push(item);}
    const patched=sheetXml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(rowXml,rowNo)=>{
      const changes=byRow.get(Number(rowNo)); if(!changes) return rowXml;
      return items[0].source_channel==='smartstore'?patchSmartstoreRow(rowXml,changes,shared):patchMakeshopRow(rowXml,changes,shared);
    });
    zip.file(sheetPath,patched); return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
  }

  async function patchCsvFile(file,items) {
    if(!global.XLSX) throw new Error('CSV 처리 모듈을 불러오지 못했습니다.');
    const workbook=global.XLSX.read(await file.text(),{type:'string',raw:true}); const sheet=workbook.Sheets[workbook.SheetNames[0]];
    const rows=global.XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:''});
    for(const item of items){const index=Number(item.source_row_no)-1;const row=rows[index];if(!row)throw new Error(`에이블리 ${item.sellpia_sku_code}: ${item.source_row_no}행이 없습니다.`);
      if(clean(row[0])!==clean(item.seller_product_code)||clean(row[10])!==clean(item.seller_option_code))throw new Error(`에이블리 ${item.sellpia_sku_code}: 원본 코드가 DB와 다릅니다.`);
      const after=scalar(item.after_value); const column={sellpia_current_stock:15,sellpia_sale_price:6,seller_product_name:2,seller_option_name:14}[item.field_key];
      verifyExpected(row[column],item); row[column]=item.field_key.includes('stock')||item.field_key.includes('price')?Number(after):String(after);
    }
    const output=global.XLSX.utils.sheet_to_csv(global.XLSX.utils.aoa_to_sheet(rows),{FS:',',RS:'\r\n'}); return new Blob([new Uint8Array([0xEF,0xBB,0xBF]),output],{type:'text/csv;charset=utf-8'});
  }

  function outputName(name) { const dot=name.lastIndexOf('.'); return dot<0?`${name}_SystemV3반영`:`${name.slice(0,dot)}_SystemV3반영${name.slice(dot)}`; }
  function csvCell(value){const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
  function auditCsv(items){const rows=[['판매처','셀피아 SKU','변경항목','판매처 상품코드','옵션코드','변경 전','변경 후','원본파일','원본행']];for(const item of items)rows.push([SOURCE_LABELS[item.source_channel],item.sellpia_sku_code,FIELD_LABELS[item.field_key]||item.field_key,item.seller_product_code,item.seller_option_code,scalar(item.expected_source_value),scalar(item.after_value),item.source_file_name,item.source_row_no]);return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}

  async function buildExportArchive(filesBySource,items,onProgress) {
    if(!items?.length) throw new Error('내보낼 항목이 없습니다.');
    const blocked=items.filter(item=>item.blocking_reason); if(blocked.length) throw new Error(`원본 위치를 확인할 수 없는 항목이 ${blocked.length}건 있습니다.`);
    const files=[...filesBySource.values()].flat(); const byName=new Map(files.map(file=>[file.name,file])); const grouped=new Map();
    for(const item of items){if(!grouped.has(item.source_file_name))grouped.set(item.source_file_name,[]);grouped.get(item.source_file_name).push({...item});}
    const missing=[...grouped.keys()].filter(name=>!byName.has(name)); if(missing.length)throw new Error(`최근 DB 스냅샷과 같은 원본 파일을 선택해주세요: ${missing.join(', ')}`);
    const archive=new global.JSZip(); const manifest=[]; let index=0;
    for(const [name,fileItems] of grouped){index+=1;onProgress?.(Math.round((index-1)/grouped.size*85),`${name} 검증·반영 중`);const file=byName.get(name);
      const blob=name.toLowerCase().endsWith('.csv')?await patchCsvFile(file,fileItems):await patchXlsxFile(file,fileItems); const nextName=outputName(name); archive.file(nextName,blob); manifest.push({source:fileItems[0].source_channel,source_name:name,output_name:nextName,item_count:fileItems.length,size:blob.size});}
    archive.file('SystemV3_내보내기_검증.csv',auditCsv(items));onProgress?.(90,'ZIP 파일 압축 중');
    const blob=await archive.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});return{blob,manifest};
  }
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

  global.SystemV3SellerExport=Object.freeze({cellValue,setCellValue,patchSmartstoreRow,patchMakeshopRow,patchCsvFile,buildExportArchive,downloadBlob,outputName});
})(typeof window!=='undefined'?window:globalThis);
