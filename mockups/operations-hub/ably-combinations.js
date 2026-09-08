(function(global) {
  'use strict';
  function parseSkuMemo(value) {
    const text=String(value??'').trim();
    if(!text)return {skus:[],error:'Q열 연결 SKU 미등록'};
    let parts;
    if(/[\[\]]/.test(text)) {
      if(!/^\[[^\[\],/]+\](?:\s*,\s*\[[^\[\],/]+\])*$/.test(text))return {skus:[],error:'[SKU1],[SKU2] 형식을 확인하세요'};
      parts=[...text.matchAll(/\[([^\[\]]+)\]/g)].map(match=>match[1].trim());
    } else {
      if(text.includes(','))return {skus:[],error:'쉼표는 [SKU1],[SKU2] 형식에서 사용하세요'};
      parts=text.split('/').map(part=>part.trim());
    }
    if(parts.some(part=>!part))return {skus:[],error:'빈 SKU가 있습니다'};
    // A repeated SKU is one stock source, not an implied component quantity.
    return {skus:[...new Set(parts)],error:''};
  }
  global.AblyCombinationModel={parseSkuMemo};
  if(!global.document)return;
  const input=document.getElementById('ably-combination-file');
  const status=document.getElementById('ably-combination-file-status');
  const body=document.getElementById('ably-combination-preview');
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];body.innerHTML='';if(!file)return;
    if(file.size>20*1024*1024){status.textContent='20MB 이하의 엑셀 파일을 선택하세요.';return;}
    input.disabled=true;status.textContent='파일의 Q열 연결 SKU를 확인하고 있습니다.';
    try {
      if(!global.XLSX)throw new Error('엑셀 읽기 도구를 불러오지 못했습니다. 새로고침 후 다시 선택하세요.');
      const book=global.XLSX.read(await file.arrayBuffer(),{type:'array'});
      const sheet=book.Sheets['옵션기본'];
      if(!sheet)throw new Error('옵션기본 시트를 찾을 수 없습니다.');
      const range=global.XLSX.utils.decode_range(sheet['!ref']||'A1');
      if(range.e.r>20000)throw new Error('옵션 20,000행 이하의 파일을 선택하세요.');
      const data=global.XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:true,range:'A1:AI'+(range.e.r+1)});
      for(const [index,name] of [[2,'*판매자관리코드'],[9,'*옵션 Type'],[16,'옵션관리코드'],[17,'옵션 SKU 코드'],[22,'판매가능재고']]) {
        if(String(data[0]?.[index]??'').trim()!==name)throw new Error(`${global.XLSX.utils.encode_col(index)}열 헤더가 ${name}인지 확인하세요.`);
      }
      const rows=data.slice(1).map((row,index)=>({row,line:index+2})).filter(({row})=>row.some(value=>value!==''&&value!==null));
      const combinations=rows.filter(({row})=>String(row[9]).trim()==='조합형');
      let valid=0,missing=0,invalid=0;
      const result=combinations.map(({row,line})=>{
        const memo=parseSkuMemo(row[16]);
        if(!String(row[16]??'').trim())missing++;else if(memo.error)invalid++;else valid++;
        return {row,line,memo};
      });
      body.innerHTML=result.slice(0,200).map(({row,line,memo})=>`<tr><td>${line}</td><td>${escape(row[2])}<br>${escape(row[11])} / ${escape(row[13])}${row[15]?` / ${escape(row[15])}`:''}</td><td>${escape(row[17])||'미등록'}</td><td>${escape(row[16])||'—'}</td><td>${memo.skus.map(escape).join('<br>')||'—'}</td><td>${escape(memo.error||'연결값 확인 · 개별 재고 필요')}</td></tr>`).join('')||'<tr><td colspan="6">조합형 옵션행이 없습니다.</td></tr>';
      status.textContent=`${file.name} · 조합형 ${combinations.length}행 · 연결값 있음 ${valid} · 미등록 ${missing} · 형식 오류 ${invalid} · 미리보기 ${Math.min(200,result.length)}행. 파일은 이 브라우저에서만 읽으며 저장하지 않습니다.`;
    }catch(error){status.textContent=`파일 확인 실패: ${error.message}`;}
    finally{input.disabled=false;}
  });
})(typeof window==='undefined'?globalThis:window);
