(function(global){
  'use strict';
  function generate(products,{title,account='',code='',price='',option1='옵션1',option2='옵션2'}={}){
    if(!products.length)throw new Error('상품을 선택하세요.');
    if(products.length>100)throw new Error('한 번에 100개 상품까지 선택하세요.');
    if(!String(title||'').trim())throw new Error('온라인 상품명을 입력하세요.');
    if(new Set(products.map(p=>p.sellpia_sku_code)).size!==products.length)throw new Error('선택 SKU가 중복되었습니다.');
    for(const p of products)if(p.system_stock===null||p.system_stock===undefined||String(p.system_stock).trim()===''||!Number.isSafeInteger(Number(p.system_stock))||Number(p.system_stock)<0)throw new Error(`${p.sellpia_sku_code} 재고를 확인하세요.`);
    const names=products.map(p=>p.sellpia_option_name||p.display_name||p.sellpia_sku_code);
    const label=p=>{const name=p.sellpia_option_name||p.display_name||p.sellpia_sku_code;return names.filter(n=>n===name).length>1?`${name} [${p.sellpia_sku_code}]`:name;};
    return products.flatMap(first=>products.map(second=>{
      const row=Array(35).fill('');
      row[0]='에이블리';row[1]=account;row[2]=code;row[3]=title;row[5]=price;
      row[8]='일반';row[9]='조합형';row[10]=option1;row[11]=label(first);
      row[12]=option2;row[13]=label(second);
      row[16]=`[${first.sellpia_sku_code}],[${second.sellpia_sku_code}]`;
      row[17]=`${first.sellpia_sku_code}+${second.sellpia_sku_code}`;
      row[21]=0;row[22]=Math.min(Number(first.system_stock),Number(second.system_stock));row[23]=1;row[34]='Y';
      return row;
    }));
  }
  global.AblyPairGenerator={generate};
  if(!global.document)return;
  const home=document.getElementById('ably-products-home');
  const panel=document.createElement('section');panel.className='panel ably-combination-panel';panel.hidden=true;
  document.getElementById('ably-combinations').append(panel);
  panel.innerHTML=`<button class="btn" id="ably-pairs-back">← 상품 목록</button><h2>상품 선택 · 1+1 전체 조합 생성</h2><p>선택한 상품을 옵션1과 옵션2에 각각 배치합니다. 9개를 선택하면 같은 상품 조합과 순서가 바뀐 조합을 포함해 81행을 생성합니다.</p>
    <label>개별 SKU 목록 <textarea id="ably-pairs-codes" rows="3" style="width:100%">${Array.from({length:9},(_,i)=>`1000-${i+1}`).join('\n')}</textarea></label><button class="btn" id="ably-pairs-load">상품 조회</button><button class="btn" id="ably-pairs-all">전체 선택</button><button class="btn" id="ably-pairs-none">선택 해제</button>
    <div id="ably-pairs-products" class="ably-lab-stock-grid"></div>
    <div class="ably-lab-stock-grid"><label>온라인 상품명 (D)<input id="ably-pairs-title" value="1+1 조합 상품 1000"></label><label>계정 (B)<input id="ably-pairs-account"></label><label>판매자관리코드 (C)<input id="ably-pairs-code"></label><label>판매가 (F)<input id="ably-pairs-price" type="number" min="0"></label><label>옵션1 명칭 (K)<input id="ably-pairs-option1" value="옵션1"></label><label>옵션2 명칭 (M)<input id="ably-pairs-option2" value="옵션2"></label></div>
    <p>계정·판매자관리코드·판매가는 실제 사용할 값으로 입력하세요. 재고는 두 SKU의 시스템 현재재고 중 최솟값을 사용합니다.</p><p id="ably-pairs-status" role="status"></p><button class="btn primary" id="ably-pairs-download">전체 1+1 조합 엑셀 다운로드</button>`;
  const el=id=>document.getElementById('ably-pairs-'+id),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let rows=[],selected=new Set(),busy=false;
  function lock(value){busy=value;panel.querySelectorAll('input,button,textarea').forEach(input=>input.disabled=value);}
  function summary(){el('status').textContent=`선택 ${selected.size}개 · 옵션1 ${selected.size}개 × 옵션2 ${selected.size}개 = 총 ${selected.size**2}행`;}
  function render(){el('products').innerHTML=rows.map(row=>`<label><span><input type="checkbox" data-pair-sku="${escape(row.sellpia_sku_code)}" ${selected.has(row.sellpia_sku_code)?'checked':''}> <b>${escape(row.sellpia_sku_code)}</b></span><span>${escape(row.display_name)}</span><b>현재재고 ${row.system_stock??'없음'}</b></label>`).join('');summary();}
  async function load(){
    lock(true);rows=[];selected.clear();render();
    try{
      const codes=[...new Set(el('codes').value.split(/[\s,]+/).map(x=>x.trim()).filter(Boolean))];if(!codes.length||codes.length>100)throw new Error('SKU를 1~100개 입력하세요.');
      const loaded=await global.SystemV3Data.loadAblyComponentStocks(codes);
      const bySku=new Map(loaded.map(row=>[row.sellpia_sku_code,row]));rows=codes.map(code=>bySku.get(code)).filter(Boolean);selected=new Set(rows.map(row=>row.sellpia_sku_code));render();
      const missing=codes.filter(code=>!bySku.has(code));if(missing.length)el('status').textContent+=` · 미조회: ${missing.join(', ')}`;
    }catch(error){el('status').textContent=error.message;}finally{lock(false);}
  }
  document.getElementById('ably-virtual-product-open').onclick=()=>{home.hidden=true;panel.hidden=false;void load();};
  el('back').onclick=()=>{panel.hidden=true;home.hidden=false;};el('load').onclick=load;
  el('all').onclick=()=>{selected=new Set(rows.map(row=>row.sellpia_sku_code));render();};el('none').onclick=()=>{selected.clear();render();};
  el('products').addEventListener('change',event=>{const sku=event.target.dataset.pairSku;if(sku){event.target.checked?selected.add(sku):selected.delete(sku);summary();}});
  el('download').onclick=async()=>{
    if(busy)return;lock(true);
    try{
      if(!el('title').value.trim()||!el('account').value.trim()||!el('code').value.trim())throw new Error('온라인 상품명·계정·판매자관리코드를 입력하세요.');
      if(el('price').value==='')throw new Error('판매가를 입력하세요.');
      const codes=rows.filter(row=>selected.has(row.sellpia_sku_code)).map(row=>row.sellpia_sku_code);if(!codes.length)throw new Error('상품을 선택하세요.');
      const fresh=await global.SystemV3Data.loadAblyComponentStocks(codes),bySku=new Map(fresh.map(row=>[row.sellpia_sku_code,row]));
      if(codes.some(code=>!bySku.has(code)))throw new Error('선택 SKU의 재고를 조회하지 못했습니다. 다시 조회하세요.');
      const price=el('price').value;if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0))throw new Error('판매가를 확인하세요.');
      const generated=generate(codes.map(code=>bySku.get(code)),{title:el('title').value,account:el('account').value,code:el('code').value,price:price===''?'':Number(price),option1:el('option1').value||'옵션1',option2:el('option2').value||'옵션2'});
      const sheet=global.XLSX.utils.aoa_to_sheet([global.AblyStockExport.headers,...generated]);const book=global.XLSX.utils.book_new();global.XLSX.utils.book_append_sheet(book,sheet,'옵션기본');
      const blob=new Blob([global.XLSX.write(book,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      global.SystemV3SellerExport.downloadBlob(blob,`에이블리_1+1_${codes.length}개상품_${generated.length}조합.xlsx`);
      el('status').textContent=`다운로드 완료 · 옵션1 ${codes.length}개 × 옵션2 ${codes.length}개 · 총 ${generated.length}행. 같은 SKU 조합도 기존 최솟값 기준을 적용했습니다.`;
    }catch(error){el('status').textContent=`생성 실패: ${error.message}`;}finally{lock(false);}
  };
})(typeof window==='undefined'?globalThis:window);
