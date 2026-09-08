(function(global){
  'use strict';
  const headers=['*쇼핑몰','*계정','*판매자관리코드','온라인 상품명','쇼핑몰상품코드','판매가','옵션 이미지(SKU)','옵션 이미지(직접등록)','*상품 구분','*옵션 Type','옵션1 명칭','옵션1 값','옵션2 명칭','옵션2 값','옵션3 명칭','옵션3 값','옵션관리코드','옵션 SKU 코드','옵션 바코드','옵션 모델번호','배송처코드','추가 금액','판매가능재고','*판매수량','출고수량','무게(Kg)','단위 가격 표시 여부','표시 용량','표시 단위','구성 방식','팩 수량','팩당 수량','팩당 수량 단위','개당 용량','*옵션상태'];
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function patchCell(xml,line,column,value){
    const reference=column+line;
    const rowRe=new RegExp(`<row\\b[^>]*\\br="${line}"[^>]*>[\\s\\S]*?<\\/row>`);
    const row=xml.match(rowRe)?.[0];if(!row)throw new Error(`${line}행을 원본에서 찾지 못했습니다.`);
    const cellRe=new RegExp(`<c\\b([^>]*\\br="${reference}"[^>]*)(?:\\/>|>[\\s\\S]*?<\\/c>)`);
    const old=row.match(cellRe);
    const style=old?.[1].match(/\bs="[^"]*"/)?.[0]||'';
    const cell=typeof value==='number'?`<c r="${reference}" ${style}><v>${value}</v></c>`:`<c r="${reference}" ${style} t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
    let patched;
    if(old)patched=row.replace(cellRe,()=>cell);
    else {
      const index=letters=>[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
      const after=[...row.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"/g)].find(match=>index(match[1])>index(column));
      patched=after?row.slice(0,after.index)+cell+row.slice(after.index):row.replace('</row>',cell+'</row>');
    }
    return xml.replace(rowRe,()=>patched);
  }
  async function build({file,items,results,test=false}){
    const valid=items.filter((item,index)=>!results[index].error);
    if(!valid.length)throw new Error('재고를 계산할 수 있는 조합이 없습니다. Q열 연결과 개별 SKU 재고를 확인하세요.');
    if(test){
      const output=items.map((item,index)=>{const row=[...item.row];row[16]=item.memoText; if(!results[index].error)row[22]=results[index].value;return row;});
      const book=global.XLSX.utils.book_new();global.XLSX.utils.book_append_sheet(book,global.XLSX.utils.aoa_to_sheet([headers,...output]),'옵션기본');
      return new Blob([global.XLSX.write(book,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    }
    const zip=await global.JSZip.loadAsync(await file.arrayBuffer());
    const parser=new DOMParser();
    const workbook=parser.parseFromString(await zip.file('xl/workbook.xml').async('string'),'application/xml');
    const sheet=[...workbook.getElementsByTagName('sheet')].find(el=>el.getAttribute('name')==='옵션기본');
    const rels=parser.parseFromString(await zip.file('xl/_rels/workbook.xml.rels').async('string'),'application/xml');
    const relation=[...rels.getElementsByTagName('Relationship')].find(el=>el.getAttribute('Id')===sheet?.getAttribute('r:id'));
    const target=relation?.getAttribute('Target');if(!target)throw new Error('옵션기본 시트 경로를 찾지 못했습니다.');
    const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
    const entry=zip.file(path);if(!entry)throw new Error('원본 시트를 읽지 못했습니다.');
    let xml=await entry.async('string');
    items.forEach((item,index)=>{
      if(item.memoText!==String(item.row[16]??''))xml=patchCell(xml,item.line,'Q',item.memoText);
      if(!results[index].error)xml=patchCell(xml,item.line,'W',results[index].value);
    });
    zip.file(path,xml,{createFolders:false});
    return zip.generateAsync({type:'blob',compression:'DEFLATE'});
  }
  global.AblyStockExport={headers,patchCell,build};
})(typeof window==='undefined'?globalThis:window);
