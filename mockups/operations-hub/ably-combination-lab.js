(function(global) {
  'use strict';
  const definitions=[
    {sku:'1000-1+2',name:'테스트 2종 조합',memo:'1000-1/1000-2'},
    {sku:'1000-3+4+5',name:'테스트 3종 조합',memo:'[1000-3],[1000-4],[1000-5]'},
    {sku:'1000-6+7+8',name:'테스트 품절 조합',memo:'1000-6/1000-7/1000-8'},
    {sku:'1000-9+10',name:'테스트 마지막 조합',memo:'[1000-9],[1000-10]'}
  ];
  function initialState() {
    return {stocks:Object.fromEntries([20,12,30,8,16,10,0,25,7,18].map((stock,index)=>[`1000-${index+1}`,String(stock)])),
      combinations:definitions.map(row=>({...row,stock:'999'}))};
  }
  function calculate(memo,stocks) {
    const parsed=global.AblyCombinationModel.parseSkuMemo(memo);
    if(parsed.error)return {...parsed,value:null};
    const components=[];
    for(const sku of parsed.skus) {
      const raw=stocks[sku];
      if(raw===undefined||raw===null||String(raw).trim()==='')return {...parsed,value:null,error:`${sku} 재고 없음`};
      if(!/^\d+$/.test(String(raw).trim())||!Number.isSafeInteger(Number(raw)))return {...parsed,value:null,error:`${sku} 재고는 0 이상의 정수로 입력하세요`};
      components.push({sku,stock:Number(raw)});
    }
    return {...parsed,components,value:Math.min(...components.map(row=>row.stock))};
  }
  global.AblyCombinationLabModel={initialState,calculate};
  if(!global.document)return;
  const mount=document.getElementById('ably-combination-lab');
  if(!mount)return;
  const key='operations-hub-ably-virtual-lab-v1';
  let state=initialState();
  try {
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved&&Object.keys(state.stocks).every(sku=>typeof saved.stocks?.[sku]==='string')&&
      saved.combinations?.length===definitions.length&&saved.combinations.every((row,index)=>row.sku===definitions[index].sku&&typeof row.memo==='string'&&typeof row.stock==='string'))state=saved;
  }catch{}
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  mount.innerHTML=`<button class="btn" id="ably-lab-back" type="button">← 상품 목록</button><div class="ably-lab-head"><div><h3>가상 테스트 상품 1000</h3><p>개별 SKU 1000-1~1000-10 · 조합 4개. 이 브라우저에만 보관하며 실제 상품이나 재고를 변경하지 않습니다.</p></div><button class="btn" id="ably-lab-reset" type="button">테스트 초기화</button></div>
    <details open><summary>주문수집 후 개별 SKU 재고 입력</summary><div class="ably-lab-stock-grid">${Object.keys(state.stocks).map((sku,index)=>`<label><b>${sku}</b><span>테스트 개별 상품 ${index+1}</span><input type="text" inputmode="numeric" data-lab-sku="${sku}" aria-label="${sku} 가상 재고" value="${escape(state.stocks[sku])}"></label>`).join('')}</div></details>
    <p>아래 기존 조합 재고는 처음에 999로 설정했습니다. 개별 재고와 Q열을 수정해 예상값을 확인한 뒤 가상 재고를 갱신하세요.</p>
    <div class="ably-combination-table"><table class="data-table"><thead><tr><th>조합 SKU (R)</th><th>개별 SKU 연결 (Q)</th><th>기존 조합 재고 (W)</th><th>개별 재고</th><th>갱신 예상값</th><th>확인 결과</th></tr></thead><tbody>${state.combinations.map((row,index)=>`<tr><td><b>${escape(row.sku)}</b><br>${escape(definitions[index].name)}</td><td><input class="ably-lab-memo" data-lab-memo="${index}" aria-label="${escape(row.sku)} Q열 연결" value="${escape(row.memo)}"></td><td><input class="ably-lab-old" data-lab-old="${index}" aria-label="${escape(row.sku)} 기존 가상 재고" value="${escape(row.stock)}"></td><td data-lab-components="${index}"></td><td data-lab-next="${index}"></td><td data-lab-result="${index}"></td></tr>`).join('')}</tbody></table></div>
    <div class="ably-lab-head"><p id="ably-lab-status" role="status">예상값은 연결한 개별 SKU의 최솟값입니다. 기존 조합 재고는 계산에서 제외합니다.</p><button class="btn primary" id="ably-lab-apply" type="button">가상 조합 재고 갱신</button></div>`;
  function persist() {
    try{localStorage.setItem(key,JSON.stringify(state));}
    catch{document.getElementById('ably-lab-status').textContent+=' 브라우저 저장이 불가해 새로고침하면 초기화됩니다.';}
  }
  function render() {
    state.combinations.forEach((row,index)=>{
      const result=calculate(row.memo,state.stocks);
      mount.querySelector(`[data-lab-components="${index}"]`).textContent=result.components?.map(item=>`${item.sku}: ${item.stock}`).join(' / ')||'—';
      mount.querySelector(`[data-lab-next="${index}"]`).textContent=result.value??'—';
      mount.querySelector(`[data-lab-result="${index}"]`).textContent=result.error||(String(result.value)===row.stock?'현재값과 동일':'갱신 가능');
    });
  }
  mount.addEventListener('input',event=>{
    const target=event.target;
    if(target.dataset.labSku)state.stocks[target.dataset.labSku]=target.value;
    else if(target.dataset.labMemo!==undefined)state.combinations[Number(target.dataset.labMemo)].memo=target.value;
    else if(target.dataset.labOld!==undefined)state.combinations[Number(target.dataset.labOld)].stock=target.value;
    else return;
    document.getElementById('ably-lab-status').textContent='입력 변경됨 · 예상값을 확인한 뒤 가상 조합 재고를 갱신하세요.';
    render();persist();
  });
  document.getElementById('ably-lab-apply').onclick=()=>{
    let updated=0,excluded=0;
    state.combinations.forEach((row,index)=>{
      const result=calculate(row.memo,state.stocks);
      if(result.error){excluded++;return;}
      row.stock=String(result.value);mount.querySelector(`[data-lab-old="${index}"]`).value=row.stock;updated++;
    });
    document.getElementById('ably-lab-status').textContent=`가상 재고 갱신 완료 · ${updated}개 반영 · ${excluded}개 제외. 실제 재고 변경 없음.`;
    render();persist();
  };
  document.getElementById('ably-lab-reset').onclick=()=>{
    state=initialState();
    mount.querySelectorAll('[data-lab-sku]').forEach(input=>{input.value=state.stocks[input.dataset.labSku];});
    state.combinations.forEach((row,index)=>{
      mount.querySelector(`[data-lab-memo="${index}"]`).value=row.memo;
      mount.querySelector(`[data-lab-old="${index}"]`).value=row.stock;
    });
    document.getElementById('ably-lab-status').textContent='개별 SKU 10개와 조합 4개를 초기값으로 복원했습니다.';
    render();persist();
  };
  render();
  document.getElementById('ably-virtual-product-open').onclick=()=>{
    document.getElementById('ably-products-home').hidden=true;mount.hidden=false;
    document.getElementById('ably-lab-back').focus();
  };
  document.getElementById('ably-lab-back').onclick=()=>{
    mount.hidden=true;document.getElementById('ably-products-home').hidden=false;
    document.getElementById('ably-virtual-product-open').focus();
  };
})(typeof window==='undefined'?globalThis:window);
