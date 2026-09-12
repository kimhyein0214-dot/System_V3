(function initTagManagementV2(global){
 'use strict';
 const D=()=>global.SystemV3Data;
 const state={mode:'all',catalog:[],catalogSearch:'',selectedTagId:'',tag:null,page:1,pageSize:100,count:0,rows:[],memberSearch:'',selected:new Set(),rules:[],loading:false};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=v=>Number(v||0).toLocaleString('ko-KR');
 const safeName=v=>String(v||'태그').replace(/[\\/:*?"<>|]+/g,'_').trim().slice(0,80)||'태그';
 const sellerNames={smartstore:'스마트스토어',makeshop:'메이크샵',ably:'에이블리'};
 function ruleDisplay(rule){
  const M=global.HubRuleRegistry||{},labels=M.fields||{};
  const sourceLabel=labels[rule.source_field]||rule.source_field||'시작값';
  const targetLabel=labels[rule.target_field]||rule.target_field||'저장값';
  const sourceSeller=M.isPlatform?.(rule.source_field)?(sellerNames[rule.source_scope||rule.scope]||'저장 판매처와 동일'):'';
  const destination=M.isPlatform?.(rule.target_field)?(sellerNames[rule.scope]||'전체 판매처'):'공통';
  return {source:`${sourceSeller?sourceSeller+' · ':''}${sourceLabel}`,target:targetLabel,destination};
 }
 function host(){return document.getElementById('attributes');}
 function pageCount(){return Math.max(1,Math.ceil(state.count/state.pageSize));}
 function setStatus(text,kind=''){const el=document.getElementById('tag-manager-status');if(!el)return;el.className=`tag-manager-status ${kind}`.trim();el.textContent=text;}
 function currentTag(){return state.catalog.find(tag=>String(tag.tag_id)===String(state.selectedTagId))||null;}

 function ensureShell(){
  const h=host(),title=h?.querySelector('.attributes-title');
  if(!h||!title||h.querySelector('.attributes-view-tabs'))return;
  const tabs=document.createElement('nav');
  tabs.className='attributes-view-tabs';
  tabs.setAttribute('aria-label','상품 태그 보기');
  tabs.innerHTML='<button type="button" data-tag-view="all" aria-selected="true">전체 SKU</button><button type="button" data-tag-view="tag" aria-selected="false">태그별 관리</button>';
  title.insertAdjacentElement('afterend',tabs);
  const manager=document.createElement('section');
  manager.id='tag-manager-v2';
  manager.className='tag-manager-v2';
  manager.hidden=true;
  manager.innerHTML=`
   <aside class="tag-manager-panel">
    <div class="tag-manager-head"><div><h3>태그 목록</h3><p>태그를 선택하면 현재 저장된 적용 SKU만 표시합니다.</p></div></div>
    <form id="tag-catalog-search" class="tag-manager-search"><input id="tag-catalog-query" placeholder="태그 이름 검색"><button class="btn" type="submit">검색</button></form>
    <div id="tag-catalog" class="tag-catalog"></div>
   </aside>
   <section class="tag-manager-panel">
    <div class="tag-manager-head"><div><h3 id="tag-member-title">태그를 선택하세요</h3><p id="tag-member-copy">저장된 태그 적용 내역을 조회·수정할 수 있습니다.</p></div><button class="btn" id="tag-member-refresh" type="button">새로고침</button></div>
    <form id="tag-member-search" class="tag-manager-search"><input id="tag-member-query" placeholder="SKU / 자사코드 / 상품명 / 옵션명 검색"><button class="btn primary" type="submit">검색</button></form>
    <div class="tag-manager-table-wrap"><table class="tag-manager-table"><thead><tr><th class="check"><input id="tag-member-select-page" type="checkbox" aria-label="현재 페이지 전체 선택"></th><th class="sku">SKU</th><th class="code">자사코드</th><th>상품 / 옵션</th></tr></thead><tbody id="tag-member-rows"></tbody></table></div>
    <nav class="tag-manager-pagination"><button class="btn" id="tag-member-prev" type="button">이전</button><span id="tag-member-page">1 / 1</span><button class="btn" id="tag-member-next" type="button">다음</button></nav>
   </section>
   <aside class="tag-manager-panel tag-manager-side">
    <div class="tag-selected-card"><h3 id="tag-selected-name">태그 미선택</h3><p id="tag-selected-group">왼쪽에서 태그를 선택하세요.</p></div>
    <div class="tag-stat-grid"><div><span>적용 SKU</span><b id="tag-stat-count">-</b></div><div><span>연결 Rule</span><b id="tag-stat-rules">-</b></div></div>
    <div class="tag-rule-summary"><span>연결 수식</span><div id="tag-rule-list"><i>태그를 선택하면 표시됩니다.</i></div></div>
    <div class="tag-manager-actions">
      <button class="btn wide" id="tag-download-current" type="button" disabled>현재 적용 목록 XLSX</button>
      <button class="btn" id="tag-download-blank" type="button" disabled>빈 템플릿</button>
      <button class="btn" id="tag-upload-sync" type="button" disabled>엑셀 업로드</button>
      <button class="btn" id="tag-edit-rule" type="button" disabled>수식 관리</button>
      <button class="btn tag-manager-danger" id="tag-remove-selected" type="button" disabled>선택 해제</button>
      <button class="btn tag-manager-danger" id="tag-clear-all" type="button" disabled>전체 적용 해제</button>
    </div>
    <div id="tag-manager-status" class="tag-manager-status">태그를 선택하세요.</div>
   </aside>`;
  const quick=h.querySelector('.attributes-quick-actions'),layout=h.querySelector('.attributes-layout');
  (quick||layout)?.insertAdjacentElement('afterend',manager);
  bind();
 }

 function setMode(mode){
  state.mode=mode;
  const h=host(),manager=document.getElementById('tag-manager-v2');
  h?.classList.toggle('tag-manager-mode',mode==='tag');
  if(manager)manager.hidden=mode!=='tag';
  h?.querySelectorAll('[data-tag-view]').forEach(btn=>btn.setAttribute('aria-selected',String(btn.dataset.tagView===mode)));
  if(mode==='tag'&&!state.catalog.length)void loadCatalog();
 }

 async function loadCatalog({keepSelection=true}={}){
  if(state.loading)return;
  state.loading=true;setStatus('태그 목록을 불러오는 중…');
  try{
   const result=await D().loadTagCatalog({search:state.catalogSearch});
   state.catalog=result.rows||[];
   if(!keepSelection||!state.catalog.some(t=>String(t.tag_id)===String(state.selectedTagId))){state.selectedTagId='';state.tag=null;state.rows=[];state.count=0;state.selected.clear();}
   renderCatalog();renderSelected();
   if(state.selectedTagId)await loadMembers();
   else setStatus(`활성 태그 ${n(state.catalog.length)}개`);
  }catch(error){setStatus(`태그 목록 조회 실패: ${error?.message||error}`,'error');}
  finally{state.loading=false;}
 }

 function renderCatalog(){
  const box=document.getElementById('tag-catalog');if(!box)return;
  box.innerHTML=state.catalog.map(tag=>{const formula=Number(tag.rule_count||0)>0;return `<button type="button" data-tag-id="${esc(tag.tag_id)}" class="${String(tag.tag_id)===String(state.selectedTagId)?'active':''}" style="--tag-color:${esc(tag.tag_color||'#dbeafe')}"><span class="tag-color-dot"></span><span class="tag-catalog-name"><b>${esc(tag.tag_name)}</b><small class="tag-kind ${formula?'formula':'plain'}">${formula?'ƒ 수식':'일반'}</small></span><em>${n(tag.option_count)}</em></button>`;}).join('')||'<p class="tag-manager-empty">태그가 없습니다.</p>';
  box.querySelectorAll('[data-tag-id]').forEach(btn=>btn.onclick=()=>selectTag(btn.dataset.tagId));
 }

 async function selectTag(tagId){
  state.selectedTagId=tagId;state.tag=currentTag();state.page=1;state.memberSearch='';state.selected.clear();
  const q=document.getElementById('tag-member-query');if(q)q.value='';
  renderCatalog();renderSelected();await Promise.all([loadMembers(),loadRules()]);
 }

 async function loadRules(){
  if(!state.selectedTagId)return;
  try{
   const registry=await D().ruleRegistry('list');
   state.rules=(registry.rules||[]).filter(rule=>String(rule.tag_id)===String(state.selectedTagId));
  }catch{state.rules=[];}
  renderSelected();
 }

 async function loadMembers(){
  if(!state.selectedTagId)return;
  setStatus('저장된 적용 SKU를 불러오는 중…');
  try{
   const result=await D().loadTagMembers({tagId:state.selectedTagId,page:state.page,pageSize:state.pageSize,search:state.memberSearch});
   state.rows=result.rows||[];state.count=Number(result.count||0);state.selected.clear();
   renderMembers();renderSelected();setStatus(`${n(state.count)}개 적용 SKU · 현재 ${n(state.rows.length)}개 표시`,'success');
  }catch(error){state.rows=[];state.count=0;renderMembers();setStatus(`적용 SKU 조회 실패: ${error?.message||error}`,'error');}
 }

 function renderMembers(){
  const body=document.getElementById('tag-member-rows');if(!body)return;
  body.innerHTML=state.rows.map(row=>`<tr><td class="check"><input type="checkbox" data-tag-member="${esc(row.sellpia_sku_code)}" ${state.selected.has(row.sellpia_sku_code)?'checked':''}></td><td><b>${esc(row.sellpia_sku_code)}</b></td><td>${esc(row.own_sku||'—')}</td><td class="product"><b>${esc(row.sellpia_product_name||'상품명 없음')}</b><span>${esc(row.sellpia_option_name||'옵션 없음')}</span></td></tr>`).join('')||'<tr><td colspan="4" class="tag-manager-empty">적용된 SKU가 없습니다.</td></tr>';
  body.querySelectorAll('[data-tag-member]').forEach(input=>input.onchange=()=>{input.checked?state.selected.add(input.dataset.tagMember):state.selected.delete(input.dataset.tagMember);renderSelected();});
  const p=pageCount(),label=document.getElementById('tag-member-page');if(label)label.textContent=`${state.page} / ${p}`;
  document.getElementById('tag-member-prev').disabled=state.page<=1;
  document.getElementById('tag-member-next').disabled=state.page>=p;
  const selectPage=document.getElementById('tag-member-select-page');
  if(selectPage){selectPage.checked=state.rows.length>0&&state.rows.every(r=>state.selected.has(r.sellpia_sku_code));selectPage.indeterminate=state.rows.some(r=>state.selected.has(r.sellpia_sku_code))&&!selectPage.checked;}
 }

 function renderSelected(){
  const tag=currentTag();
  const name=document.getElementById('tag-selected-name'),group=document.getElementById('tag-selected-group');
  if(name)name.innerHTML=tag?`${esc(tag.tag_name)} <small class="tag-kind ${Number(tag.rule_count||0)>0?'formula':'plain'}">${Number(tag.rule_count||0)>0?'ƒ 수식 태그':'일반 태그'}</small>`:'태그 미선택';
  if(group)group.textContent=tag?`${tag.tag_group||'운영'} · ${Number(tag.rule_count||0)>0?'가격/계산 Rule 연결됨':'분류·운영용 태그'} · 저장 기준 option 태그`:'왼쪽에서 태그를 선택하세요.';
  const title=document.getElementById('tag-member-title'),copy=document.getElementById('tag-member-copy');
  if(title)title.textContent=tag?tag.tag_name:'태그를 선택하세요';
  if(copy)copy.textContent=tag?`현재 DB에 저장된 ${n(tag.option_count)}개 SKU 적용 내역`:'저장된 태그 적용 내역을 조회·수정할 수 있습니다.';
  document.getElementById('tag-stat-count').textContent=tag?n(tag.option_count):'-';
  document.getElementById('tag-stat-rules').textContent=tag?n(state.rules.length||tag.rule_count):'-';
  const ruleList=document.getElementById('tag-rule-list');
  if(ruleList)ruleList.innerHTML=tag?(state.rules.length?state.rules.map(rule=>{const view=ruleDisplay(rule);return `<i class="tag-rule-item"><b class="tag-rule-destination">${esc(view.destination)} 저장</b><span>${esc(rule.name)} · ${esc(view.source)} → ${esc(view.target)}</span></i>`;}).join(''):'<i>연결된 공통 Rule 없음</i>'):'<i>태그를 선택하면 표시됩니다.</i>';
  for(const id of ['tag-download-current','tag-download-blank','tag-upload-sync','tag-edit-rule','tag-clear-all'])document.getElementById(id).disabled=!tag;
  document.getElementById('tag-remove-selected').disabled=!tag||!state.selected.size;
 }

 async function allMembers(){
  if(!state.selectedTagId)return[];
  const rows=[];let page=1;const pageSize=1000;
  while(true){
   const result=await D().loadTagMembers({tagId:state.selectedTagId,page,pageSize,search:''});
   rows.push(...(result.rows||[]));
   if(rows.length>=Number(result.count||0)||(result.rows||[]).length<pageSize)break;
   page++;
  }
  return rows;
 }

 function workbook(rows,fileName){
  if(!global.XLSX)throw Error('XLSX 모듈을 불러오지 못했습니다.');
  const data=[['셀피아 SKU','상품명(메모)','옵션명(메모)','자사코드(메모)','메모'],...rows.map(row=>[row.sellpia_sku_code||'',row.sellpia_product_name||'',row.sellpia_option_name||'',row.own_sku||'',row.memo||''])];
  const book=global.XLSX.utils.book_new(),sheet=global.XLSX.utils.aoa_to_sheet(data);
  sheet['!cols']=[{wch:18},{wch:42},{wch:34},{wch:22},{wch:28}];
  global.XLSX.utils.book_append_sheet(book,sheet,'태그일괄적용');
  global.XLSX.writeFile(book,fileName);
 }

 async function downloadCurrent(){
  const tag=currentTag();if(!tag)return;
  setStatus('현재 저장된 태그 적용 목록을 XLSX로 만드는 중…');
  try{const rows=await allMembers();workbook(rows,`${safeName(tag.tag_name)}_일괄적용.xlsx`);setStatus(`${n(rows.length)}개 저장 내역 XLSX 다운로드 완료`,'success');}
  catch(error){setStatus(`XLSX 생성 실패: ${error?.message||error}`,'error');}
 }

 function downloadBlank(){
  const tag=currentTag();if(!tag)return;
  workbook([],`${safeName(tag.tag_name)}_일괄적용.xlsx`);
  setStatus('빈 동기화 템플릿을 다운로드했습니다. A열을 비운 채 파일 기준 동기화하면 전체 해제할 수 있습니다.','success');
 }

 function openUpload(){
  const tag=currentTag();if(!tag)return;
  setStatus(`업로드 파일명은 '${tag.tag_name}_일괄적용.xlsx'로 사용하세요. 파일명으로 태그를 자동 인식합니다.`);
  global.HubPriceWorkspace?.openTagImport?.();
 }

 async function editRule(){
  const tag=currentTag();if(!tag)return;
  if(!global.HubPriceWorkspace?.openForTag){setStatus('수식 편집기를 불러오지 못했습니다.','error');return;}
  await global.HubPriceWorkspace.openForTag({id:tag.tag_id,name:tag.tag_name,color:tag.tag_color,group:tag.tag_group});
 }

 async function recalc(skus){
  if(!skus.length||!global.HubPriceMaterializer?.materialize)return;
  try{await global.HubPriceMaterializer.materialize({skus:[...new Set(skus)],sources:['smartstore','makeshop','ably'],reason:'tag-manager-remove'});}
  catch(error){setStatus(`태그는 해제됐지만 가격 재계산 확인이 필요합니다: ${error?.message||error}`,'error');}
 }

 async function removeSelected(){
  const tag=currentTag(),skus=[...state.selected];if(!tag||!skus.length)return;
  if(!global.confirm(`${tag.tag_name} 태그를 선택한 ${n(skus.length)}개 SKU에서 해제할까요? 태그와 수식 자체는 삭제하지 않습니다.`))return;
  setStatus('선택 SKU에서 태그를 해제하는 중…');
  try{const result=await D().removeTagMembers({tagId:tag.tag_id,skus});await recalc(skus);await loadCatalog();setStatus(`${n(result.removed_count)}개 SKU에서 태그 적용을 해제했습니다.`,'success');}
  catch(error){setStatus(`태그 해제 실패: ${error?.message||error}`,'error');}
 }

 async function clearAll(){
  const tag=currentTag();if(!tag)return;
  const preview=await D().syncTagAssignments({tagId:tag.tag_id,skus:[],preview:true});
  const count=Number(preview.remove_count||0);
  if(!count){setStatus('현재 해제할 SKU가 없습니다.');return;}
  if(!global.confirm(`${tag.tag_name} 태그의 현재 적용 ${n(count)}개를 전부 해제할까요?\n태그 자체와 연결 수식 Rule은 삭제하지 않습니다.`))return;
  setStatus(`${n(count)}개 전체 해제 중…`);
  try{
   const members=await allMembers();
   const result=await D().syncTagAssignments({tagId:tag.tag_id,skus:[],preview:false});
   await recalc(members.map(row=>row.sellpia_sku_code));
   await loadCatalog({keepSelection:true});
   setStatus(`${n(result.remove_count)}개 SKU에서 태그 적용을 전부 해제했습니다.`,'success');
  }catch(error){setStatus(`전체 해제 실패: ${error?.message||error}`,'error');}
 }

 function bind(){
  const h=host();
  h.querySelectorAll('[data-tag-view]').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.tagView));
  document.getElementById('tag-catalog-search').onsubmit=e=>{e.preventDefault();state.catalogSearch=document.getElementById('tag-catalog-query').value.trim();void loadCatalog({keepSelection:false});};
  document.getElementById('tag-member-search').onsubmit=e=>{e.preventDefault();state.memberSearch=document.getElementById('tag-member-query').value.trim();state.page=1;void loadMembers();};
  document.getElementById('tag-member-refresh').onclick=()=>void loadCatalog();
  document.getElementById('tag-member-prev').onclick=()=>{if(state.page>1){state.page--;void loadMembers();}};
  document.getElementById('tag-member-next').onclick=()=>{if(state.page<pageCount()){state.page++;void loadMembers();}};
  document.getElementById('tag-member-select-page').onchange=e=>{state.rows.forEach(row=>e.target.checked?state.selected.add(row.sellpia_sku_code):state.selected.delete(row.sellpia_sku_code));renderMembers();renderSelected();};
  document.getElementById('tag-download-current').onclick=()=>void downloadCurrent();
  document.getElementById('tag-download-blank').onclick=downloadBlank;
  document.getElementById('tag-upload-sync').onclick=openUpload;
  document.getElementById('tag-edit-rule').onclick=()=>void editRule();
  document.getElementById('tag-remove-selected').onclick=()=>void removeSelected();
  document.getElementById('tag-clear-all').onclick=()=>void clearAll();
 }

 function tick(){ensureShell();}
 const observer=new MutationObserver(()=>queueMicrotask(tick));
 observer.observe(document.documentElement,{childList:true,subtree:true});
 global.addEventListener('load',tick);tick();
})(window);
