(function initSellerFileWorkflowV2(global){
 'use strict';
 const D=()=>global.SystemV3Data,A=()=>global.AblyPlayautoExport;
 const state={files:[],catalog:null,preview:null,role:null,loading:false};
 const roles={
  playauto_product:{label:'PlayAuto · 판매가 + 옵션가',type:'product_price_option',hint:'쇼핑몰상품 시트',fileLabel:'쇼핑몰상품.xlsx'},
  playauto_option:{label:'PlayAuto · 옵션가 + 실재고',type:'option_price_stock',hint:'옵션기본 시트 · V 옵션가 / W 메모 보존 / X 실제 판매수량',fileLabel:'옵션기본.xlsx'}
 };
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=v=>Number(v||0).toLocaleString('ko-KR');
 const fmtTime=v=>{if(!v)return '업로드 없음';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});};
 const currentFile=role=>state.files.find(row=>row.source_role===role)||null;
 const safeName=v=>String(v||'file').replace(/[\\/:*?"<>|]+/g,'_').trim().slice(0,120)||'file';

 function setStatus(text,kind=''){
  for(const id of ['seller-file-status','export-workflow-status']){const el=document.getElementById(id);if(el){el.className=`${id} ${kind}`.trim();el.textContent=text;}}
 }

 async function loadStatuses(){
  try{
   const [result,standard]=await Promise.all([D().loadAuxiliarySellerFiles('ably'),D().loadLatestSellerOriginalStatus(['smartstore','makeshop'])]);
   state.files=result.rows||[];state.standardStatuses=standard||[];renderUploadStatuses();renderExportStatuses();renderStandardStatuses();
  }catch(error){setStatus(`판매처 원본 상태 조회 실패: ${error?.message||error}`,'error');}
 }

 async function catalog(){
  if(state.catalog)return state.catalog;
  setStatus('셀피아 SKU·상품코드·옵션명을 불러오는 중…');
  state.catalog=await D().loadPlayautoSellpiaCatalog();
  return state.catalog;
 }

 function uploadCard(role){
  const config=roles[role];
  return `<article class="ably-file-card" data-role="${role}">
   <header><h4>${esc(config.label)}</h4><span>${esc(config.hint)}</span></header>
   <p>에이블리 수정 업로드용 PlayAuto 원본을 보관합니다. 내보낼 때 이 파일의 구조·서식을 그대로 사용합니다.</p>
   <div class="ably-file-card-status" data-file-status="${role}">상태 확인 중…</div>
   <input type="file" data-file-input="${role}" accept=".xlsx,.xls">
   <button class="btn" type="button" data-file-pick="${role}">파일 선택·업로드</button>
  </article>`;
 }

 function ensureUpload(){
  const page=document.getElementById('upload'),layout=page?.querySelector('.upload-layout'),source=document.getElementById('source-select');
  if(!page||!layout||!source||document.getElementById('ably-file-set'))return;
  const section=document.createElement('section');section.id='ably-file-set';section.className='ably-file-set';section.hidden=source.value!=='ably';
  section.innerHTML=`<div class="ably-file-set-head"><div><h3>에이블리 파일 세트</h3><p>기존 에이블리 업로드는 조회·매칭용 GOODS_LIST입니다. 실제 가격/재고 수정 파일은 PlayAuto 두 양식을 별도로 최신 상태로 보관합니다.</p></div><button class="btn" id="ably-file-refresh" type="button">상태 새로고침</button></div><div class="ably-file-set-grid"><article class="ably-file-card"><header><h4>에이블리 전체 원본 · GOODS_LIST</h4><span>조회·매칭용</span></header><p>상품/옵션 존재 확인과 판매처 매칭 검증에 사용합니다. 이 파일 자체를 수정 업로드용으로 다시 내보내지 않습니다.</p><div class="ably-file-card-status ready">위의 기존 에이블리 원본 업로드 기능으로 등록</div></article>${uploadCard('playauto_product')}${uploadCard('playauto_option')}</div><div id="seller-file-status" class="export-workflow-status">PlayAuto 파일은 필요한 기능만 최신으로 올려두면 됩니다.</div>`;
  layout.insertAdjacentElement('afterend',section);
  const syncVisibility=()=>{section.hidden=source.value!=='ably';if(!section.hidden)void loadStatuses();};
  source.addEventListener('change',syncVisibility);
  document.getElementById('ably-file-refresh').onclick=()=>void loadStatuses();
  section.querySelectorAll('[data-file-pick]').forEach(btn=>btn.onclick=()=>section.querySelector(`[data-file-input="${btn.dataset.filePick}"]`)?.click());
  section.querySelectorAll('[data-file-input]').forEach(input=>input.onchange=()=>{const file=input.files?.[0];if(file)void uploadRole(input.dataset.fileInput,file);input.value='';});
  if(!section.hidden)void loadStatuses();
 }

 function renderUploadStatuses(){
  for(const role of Object.keys(roles)){
   const el=document.querySelector(`[data-file-status="${role}"]`);if(!el)continue;
   const row=currentFile(role);
   if(!row){el.className='ably-file-card-status warn';el.textContent='등록된 파일 없음';continue;}
   el.className='ably-file-card-status ready';
   el.textContent=`${row.file_name} · ${fmtTime(row.created_at)} · ${n(row.row_count)}행 · 매칭 ${n(row.matched_count)} / 미확정 ${n(row.unresolved_count)}`;
  }
 }

 async function uploadRole(role,file){
  const config=roles[role];if(!config)return;
  setStatus(`${config.label} 파일을 검사하는 중…`);
  try{
   const parsed=await A().readTemplate(file);
   if(parsed.type!==config.type)throw Error(`${config.label} 양식이 아닙니다. 감지된 형식: ${parsed.type||'알 수 없음'}`);
   const resolved=A().resolveRows(parsed.items,await catalog());
   const matched=resolved.filter(item=>item.resolution?.sku).length,unresolved=resolved.length-matched;
   setStatus(`양식 확인 완료 · ${n(resolved.length)}행 · 매칭 ${n(matched)} · 미확정 ${n(unresolved)} · 업로드 중…`);
   await D().uploadAuxiliarySellerFile({
    sourceChannel:'ably',sourceRole:role,file,rowCount:resolved.length,matchedCount:matched,unresolvedCount:unresolved,
    metadata:{detected_type:parsed.type,sheet:parsed.sheet}
   });
   state.catalog=null;await loadStatuses();setStatus(`${config.label} 저장 완료`,'success');
  }catch(error){setStatus(`파일 저장 실패: ${error?.message||error}`,'error');}
 }

 function ensureExport(){
  const page=document.getElementById('jobs'),head=page?.querySelector('.page-head');
  if(!page||!head||document.getElementById('export-workflow-v2'))return;
  page.querySelector('.export-hub')?.remove();
  const section=document.createElement('section');section.id='export-workflow-v2';section.className='export-workflow-v2';
  section.innerHTML=`<header><h3>판매처 파일 내보내기</h3><p>스마트스토어·메이크샵은 판매처 원본 양식을 수정하고, 에이블리는 보관한 PlayAuto 양식으로 별도 생성합니다. 에이블리 GOODS_LIST는 내보내기 대상이 아닙니다.</p></header>
   <div class="export-scope-v2">
    <label>대상 범위<select id="export-scope-mode"><option value="all">파일에서 매칭되는 전체 SKU</option><option value="manual">SKU 직접 입력</option><option value="tag">태그 적용 SKU</option></select></label>
    <div><label id="export-scope-manual-wrap" class="export-scope-detail" hidden>SKU 목록<textarea id="export-scope-manual" placeholder="10000-1&#10;10000-2"></textarea></label><label id="export-scope-tag-wrap" class="export-scope-detail" hidden>태그<select id="export-scope-tag"><option value="">태그 선택</option></select></label></div>
   </div>
   <div class="export-channel-grid">
    <article class="export-channel-card" data-standard-source="smartstore"><header><h4>스마트스토어</h4><span>원본 양식</span></header><p>최신 보관 원본 XLSX에 저장된 시스템 가격을 바로 반영합니다. 필요하면 저장된 재고 수정안도 함께 넣을 수 있습니다.</p><div class="export-role-status" data-standard-status="smartstore">원본 상태 확인 중…</div><label class="direct-stock-toggle"><input type="checkbox" data-standard-stock="smartstore"><span>저장된 재고 수정안도 포함</span></label><div class="direct-export-actions"><button class="btn" type="button" data-standard-preview="smartstore">미리보기</button><button class="btn primary" type="button" data-standard-run="smartstore">파일 생성</button></div><div class="direct-export-preview" data-standard-result="smartstore">대상 범위를 위에서 선택한 뒤 미리보기하세요.</div></article>
    <article class="export-channel-card" data-standard-source="makeshop"><header><h4>메이크샵</h4><span>원본 양식</span></header><p>최신 보관 원본 XLSX에 저장된 시스템 가격을 바로 반영합니다. 필요하면 저장된 재고 수정안도 함께 넣을 수 있습니다.</p><div class="export-role-status" data-standard-status="makeshop">원본 상태 확인 중…</div><label class="direct-stock-toggle"><input type="checkbox" data-standard-stock="makeshop"><span>저장된 재고 수정안도 포함</span></label><div class="direct-export-actions"><button class="btn" type="button" data-standard-preview="makeshop">미리보기</button><button class="btn primary" type="button" data-standard-run="makeshop">파일 생성</button></div><div class="direct-export-preview" data-standard-result="makeshop">대상 범위를 위에서 선택한 뒤 미리보기하세요.</div></article>
    <article class="export-channel-card"><header><h4>에이블리 · PlayAuto</h4><span>전용 양식</span></header><p>GOODS_LIST는 조회/매칭에만 사용합니다. 실제 수정 업로드 파일은 아래 PlayAuto 원본을 기준으로 만듭니다.</p>
      <div class="export-role-status" data-export-file="playauto_product"></div>
      <div class="export-role-status" data-export-file="playauto_option"></div>
      <div class="ably-export-actions"><button class="btn" type="button" data-preview-role="playauto_product">판매가 + 옵션가 미리보기</button><button class="btn" type="button" data-preview-role="playauto_option">옵션가 + 실재고 미리보기</button><button class="btn wide" type="button" data-page-upload-ably>PlayAuto 원본 관리</button></div>
    </article>
   </div>
   <section id="export-preview-v2" class="export-preview-v2" hidden><div class="export-preview-head"><div><h4 id="export-preview-title">미리보기</h4><p id="export-preview-copy"></p></div><button class="btn" id="export-preview-close" type="button">닫기</button></div><div id="export-preview-counts" class="export-preview-counts"></div><div class="export-preview-table-wrap"><table class="export-preview-table"><thead><tr><th>SKU</th><th>현재값</th><th>저장값</th><th>상태</th></tr></thead><tbody id="export-preview-rows"></tbody></table></div><div class="export-preview-footer"><button class="btn primary" id="export-preview-generate" type="button">검증된 값으로 XLSX 생성</button></div></section>
   <div id="export-workflow-status" class="export-workflow-status">내보내기 전에 미리보기에서 매칭·변경·제외 건수를 확인하세요.</div>`;
  head.insertAdjacentElement('afterend',section);

  const mode=document.getElementById('export-scope-mode');
  mode.onchange=()=>{document.getElementById('export-scope-manual-wrap').hidden=mode.value!=='manual';document.getElementById('export-scope-tag-wrap').hidden=mode.value!=='tag';if(mode.value==='tag')void loadTags();};
  section.querySelectorAll('[data-standard-preview]').forEach(btn=>btn.onclick=()=>void previewStandard(btn.dataset.standardPreview));
  section.querySelectorAll('[data-standard-run]').forEach(btn=>btn.onclick=()=>void runStandard(btn.dataset.standardRun));
  section.querySelector('[data-page-upload-ably]').onclick=()=>{document.querySelector('.nav-item[data-page="upload"]')?.click();setTimeout(()=>{const source=document.getElementById('source-select');if(source){source.value='ably';source.dispatchEvent(new Event('change',{bubbles:true}));}},80);};
  section.querySelectorAll('[data-preview-role]').forEach(btn=>btn.onclick=()=>void preview(btn.dataset.previewRole));
  document.getElementById('export-preview-close').onclick=()=>document.getElementById('export-preview-v2').hidden=true;
  document.getElementById('export-preview-generate').onclick=()=>void generate();
  void loadStatuses();renameLegacyExportUi();
 }

 function renderStandardStatuses(){
  for(const source of ['smartstore','makeshop']){
   const el=document.querySelector(`[data-standard-status="${source}"]`);if(!el)continue;
   const row=(state.standardStatuses||[]).find(item=>item.source===source);
   if(!row?.available){el.className='export-role-status missing';el.textContent='최신 보관 원본 없음 · 먼저 원본 업로드 필요';continue;}
   el.className='export-role-status ready';
   el.textContent=`${row.fileNames?.length||0}개 보관 · ${fmtTime(row.completedAt)}`;
  }
 }

 async function directScopeSkus(){
  const scope=await scopeSkus();
  return scope?[...scope]:null;
 }

 function standardResult(source,text,kind=''){
  const el=document.querySelector(`[data-standard-result="${source}"]`);if(!el)return;
  el.className=`direct-export-preview ${kind}`.trim();el.textContent=text;
 }

 async function previewStandard(source){
  const bridge=global.SystemV3SellerExportBridge;if(!bridge){setStatus('직접 내보내기 연결 모듈을 불러오지 못했습니다. 새로고침해주세요.','error');return;}
  const button=document.querySelector(`[data-standard-preview="${source}"]`),includeStock=Boolean(document.querySelector(`[data-standard-stock="${source}"]`)?.checked);
  if(button)button.disabled=true;standardResult(source,'저장된 가격·원본 위치를 검증하는 중…');
  try{
   const skus=await directScopeSkus(),result=await bridge.preview({source,skus,includeStock});
   standardResult(source,[result.count,result.detail].filter(Boolean).join(' · ')||'미리보기 완료','success');
   setStatus(`${source==='smartstore'?'스마트스토어':'메이크샵'} 미리보기 완료`,'success');
  }catch(error){standardResult(source,error?.message||String(error),'error');setStatus(`미리보기 실패: ${error?.message||error}`,'error');}
  finally{if(button)button.disabled=false;}
 }

 async function runStandard(source){
  const bridge=global.SystemV3SellerExportBridge;if(!bridge){setStatus('직접 내보내기 연결 모듈을 불러오지 못했습니다. 새로고침해주세요.','error');return;}
  const button=document.querySelector(`[data-standard-run="${source}"]`),includeStock=Boolean(document.querySelector(`[data-standard-stock="${source}"]`)?.checked);
  if(button)button.disabled=true;standardResult(source,'원본 검증 후 파일을 생성하는 중…');setStatus('판매처 파일 생성 중…');
  try{
   const skus=await directScopeSkus(),result=await bridge.run({source,skus,includeStock});
   const ok=/완료/.test(result.title||'')&&!/실패|중단/.test(result.title||'');
   standardResult(source,[result.title,result.progressDetail].filter(Boolean).join(' · ')||'파일 생성 완료',ok?'success':'');
   setStatus(ok?'파일 생성 완료':'파일 생성 작업이 끝났습니다. 결과를 확인하세요.',ok?'success':'');
  }catch(error){standardResult(source,error?.message||String(error),'error');setStatus(`파일 생성 실패: ${error?.message||error}`,'error');}
  finally{if(button)button.disabled=false;}
 }

 function renderExportStatuses(){
  for(const role of Object.keys(roles)){
   const el=document.querySelector(`[data-export-file="${role}"]`);if(!el)continue;
   const row=currentFile(role);
   if(!row){el.className='export-role-status missing';el.innerHTML=`<b>${esc(roles[role].label)}</b><span>보관 원본 없음 · 먼저 업로드 필요</span>`;continue;}
   el.className='export-role-status ready';el.innerHTML=`<b>${esc(roles[role].label)}</b><span>${esc(row.file_name)} · ${fmtTime(row.created_at)} · 매칭 ${n(row.matched_count)}/${n(row.row_count)}</span>`;
  }
 }

 async function loadTags(){
  const select=document.getElementById('export-scope-tag');if(!select||select.dataset.loaded==='1')return;
  try{const result=await D().loadTagCatalog({search:''});select.innerHTML='<option value="">태그 선택</option>'+(result.rows||[]).map(tag=>`<option value="${esc(tag.tag_id)}">${esc(tag.tag_name)} · ${n(tag.option_count)} SKU</option>`).join('');select.dataset.loaded='1';}
  catch(error){setStatus(`태그 목록 조회 실패: ${error?.message||error}`,'error');}
 }

 async function scopeSkus(){
  const mode=document.getElementById('export-scope-mode')?.value||'all';
  if(mode==='all')return null;
  if(mode==='manual'){
   const values=String(document.getElementById('export-scope-manual')?.value||'').split(/[,\s]+/).map(v=>v.trim()).filter(Boolean);
   if(!values.length)throw Error('내보낼 SKU를 입력해주세요.');
   return new Set(values);
  }
  const tagId=document.getElementById('export-scope-tag')?.value;if(!tagId)throw Error('태그를 선택해주세요.');
  const rows=[];let page=1;
  while(true){const result=await D().loadTagMembers({tagId,page,pageSize:1000,search:''});rows.push(...(result.rows||[]));if(rows.length>=Number(result.count||0)||(result.rows||[]).length<1000)break;page++;}
  if(!rows.length)throw Error('선택한 태그에 적용된 SKU가 없습니다.');
  return new Set(rows.map(row=>row.sellpia_sku_code));
 }

 async function blobFile(record){
  const blob=await D().downloadAuxiliarySellerFile(record.storage_path);
  return new File([blob],record.file_name,{type:record.mime_type||blob.type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 }

 function priceValid(row){return row&&!row.error&&!['error','failed','missing','stale'].includes(row.status)&&Number.isFinite(Number(row.option_price))&&Number.isFinite(Number(row.base_price));}

 async function preview(role){
  const record=currentFile(role);if(!record){setStatus(`${roles[role].label} 원본을 먼저 업로드해주세요.`,'error');return;}
  state.role=role;state.preview=null;setStatus(`${roles[role].label} 원본과 저장값을 비교하는 중…`);
  try{
   const file=await blobFile(record),parsed=await A().readTemplate(file);
   if(parsed.type!==roles[role].type)throw Error('보관된 PlayAuto 원본 역할과 실제 양식이 다릅니다.');
   const resolved=A().resolveRows(parsed.items,await catalog()),scope=await scopeSkus();
   const resolvedWithSku=resolved.filter(item=>item.resolution?.sku);
   let chosen=scope?resolvedWithSku.filter(item=>scope.has(item.resolution.sku)):resolvedWithSku;
   if(!chosen.length)throw Error('선택 범위에서 PlayAuto 원본과 매칭되는 SKU가 없습니다.');

   // 상품 판매가는 한 행의 옵션들이 공유하므로 선택된 행의 모든 옵션을 함께 읽어 안전성을 확인한다.
   let safetyRows=chosen;
   if(role==='playauto_product'){
    const touched=new Set(chosen.map(item=>item.source_row_no));
    safetyRows=resolvedWithSku.filter(item=>touched.has(item.source_row_no));
   }
   const safetySkus=[...new Set(safetyRows.map(item=>item.resolution.sku))];
   const stored=await D().loadStoredMatrixPrices({sources:['ably'],skus:safetySkus,includeMatrixDrafts:true,onProgress:p=>setStatus(p?.message||'저장된 에이블리 가격을 읽는 중…')});
   const priceMap=new Map((stored.rows||[]).filter(row=>row.source_channel==='ably').map(row=>[row.sellpia_sku_code,row]));
   const stockMap=role==='playauto_option'?new Map((await D().loadSystemStocks(safetySkus)).map(row=>[row.sellpia_sku_code,row.system_stock])):new Map();

   const chosenSet=new Set(chosen.map(item=>`${item.source_row_no}|${item.option_index??''}|${item.resolution.sku}`));
   const prepared=safetyRows.map(item=>{
    const sku=item.resolution.sku,row=priceMap.get(sku),inScope=chosenSet.has(`${item.source_row_no}|${item.option_index??''}|${sku}`);
    const out={...item,resolution:item.resolution,_inScope:inScope,_status:'ready',_error:''};
    if(role==='playauto_product'){
      if(!priceValid(row)){out._status='missing';out._error='저장된 에이블리 가격 없음';return out;}
      out.target_base_price=Number(row.base_price);
      if(inScope)out.target_option_price=Number(row.option_price);
    }else{
      if(priceValid(row)&&inScope)out.target_option_price=Number(row.option_price);
      const stock=stockMap.get(sku);if(inScope&&Number.isFinite(Number(stock)))out.target_stock=Number(stock);
      if(inScope&&!Number.isFinite(Number(out.target_option_price))&&!Number.isFinite(Number(out.target_stock))){out._status='missing';out._error='저장된 옵션가/재고 없음';}
    }
    return out;
   });

   if(role==='playauto_product'){
    const byRow=new Map();for(const item of prepared){if(!byRow.has(item.source_row_no))byRow.set(item.source_row_no,[]);byRow.get(item.source_row_no).push(item);}
    for(const group of byRow.values()){
      if(!group.some(item=>item._inScope))continue;
      const bases=[...new Set(group.filter(item=>Number.isFinite(Number(item.target_base_price))).map(item=>Number(item.target_base_price)))];
      const safe=bases.length===1&&group.every(item=>item.resolution?.sku&&priceValid(priceMap.get(item.resolution.sku)));
      if(!safe){for(const item of group)if(item._inScope){item._status='conflict';item._error='공유 판매가를 안전하게 결정할 수 없음';delete item.target_base_price;delete item.target_option_price;}}
    }
   }

   const output=prepared.filter(item=>item._inScope);
   for(const item of output){
    if(item._status!=='ready')continue;
    if(role==='playauto_product'){
      const baseChanged=Number(item.target_base_price)!==Number(item.base_price),optionChanged=Number(item.target_option_price)!==Number(item.option_price);
      item._changed=baseChanged||optionChanged;
      item._current=`판매가 ${n(item.base_price)} / 옵션 ${n(item.option_price)}`;item._target=`판매가 ${n(item.target_base_price)} / 옵션 ${n(item.target_option_price)}`;
    }else{
      const optionChanged=Number.isFinite(Number(item.target_option_price))&&Number(item.target_option_price)!==Number(item.option_price);
      const stockChanged=Number.isFinite(Number(item.target_stock))&&Number(item.target_stock)!==Number(item.actual_stock);
      item._changed=optionChanged||stockChanged;
      item._current=`옵션 ${n(item.option_price)} / 재고 ${n(item.actual_stock)}`;item._target=`옵션 ${Number.isFinite(Number(item.target_option_price))?n(item.target_option_price):'유지'} / 재고 ${Number.isFinite(Number(item.target_stock))?n(item.target_stock):'유지'}`;
    }
   }
   const unresolved=resolved.filter(item=>!item.resolution?.sku).length,ready=output.filter(item=>item._status==='ready').length,changed=output.filter(item=>item._status==='ready'&&item._changed).length,blocked=output.length-ready;
   state.preview={role,record,file,parsed,items:prepared,output,counts:{template:parsed.items.length,matched:resolvedWithSku.length,selected:output.length,ready,changed,blocked,unresolved}};
   renderPreview();setStatus(`${roles[role].label} 미리보기 완료 · 생성 가능 ${n(ready)}건 · 제외 ${n(blocked)}건`,'success');
  }catch(error){setStatus(`미리보기 실패: ${error?.message||error}`,'error');}
 }

 function renderPreview(){
  const p=state.preview,box=document.getElementById('export-preview-v2');if(!p||!box)return;
  box.hidden=false;document.getElementById('export-preview-title').textContent=roles[p.role].label;
  document.getElementById('export-preview-copy').textContent=p.role==='playauto_product'?'PlayAuto 쇼핑몰상품 원본의 판매가·옵션가를 저장된 에이블리 가격과 비교합니다.':'PlayAuto 옵션기본 원본의 옵션가·X열 실제 판매수량을 저장값과 비교합니다. W열 판매가능재고는 보존합니다.';
  const c=p.counts;document.getElementById('export-preview-counts').innerHTML=`<span>원본 ${n(c.template)}</span><span>매칭 ${n(c.matched)}</span><span>선택 ${n(c.selected)}</span><span class="good">생성 가능 ${n(c.ready)}</span><span class="good">변경 ${n(c.changed)}</span><span class="warn">미확정 ${n(c.unresolved)}</span><span class="${c.blocked?'bad':''}">제외 ${n(c.blocked)}</span>`;
  document.getElementById('export-preview-rows').innerHTML=p.output.slice(0,150).map(item=>`<tr><td>${esc(item.resolution?.sku||'—')}</td><td>${esc(item._current||'—')}</td><td>${esc(item._target||'—')}</td><td class="${item._status==='ready'?'':'error'}">${item._status==='ready'?(item._changed?'변경':'동일'):esc(item._error||item._status)}</td></tr>`).join('')||'<tr><td colspan="4">표시할 항목이 없습니다.</td></tr>';
  document.getElementById('export-preview-generate').disabled=!c.ready;
 }

 async function generate(){
  const p=state.preview;if(!p)return;
  const readySet=new Set(p.output.filter(item=>item._status==='ready').map(item=>`${item.source_row_no}|${item.option_index??''}|${item.resolution.sku}`));
  const items=p.items.map(item=>readySet.has(`${item.source_row_no}|${item.option_index??''}|${item.resolution?.sku}`)?item:{...item,target_base_price:null,target_option_price:null,target_stock:null});
  setStatus('PlayAuto XLSX 생성 중…');
  try{
   const blob=p.role==='playauto_product'?await A().buildProductPriceOption(p.file,items):await A().buildOptionPriceStock(p.file,items);
   const suffix=p.role==='playauto_product'?'판매가_옵션가':'옵션가_실재고';
   global.SystemV3SellerExport.downloadBlob(blob,`에이블리_PlayAuto_${suffix}_${new Date().toISOString().slice(0,10)}.xlsx`);
   setStatus(`에이블리 ${roles[p.role].label} XLSX 생성 완료`,'success');
  }catch(error){setStatus(`XLSX 생성 실패: ${error?.message||error}`,'error');}
 }

 function renameLegacyExportUi(){
  document.querySelectorAll('button').forEach(btn=>{if(btn.textContent.trim()==='현재 데이터 내보내기')btn.textContent='원본 양식 내보내기';});
  for(const dialog of document.querySelectorAll('[role="dialog"],.modal,.modal-panel')){
   if(!/판매처 원본 파일 생성|현재 데이터 내보내기/.test(dialog.textContent||''))continue;
   for(const input of dialog.querySelectorAll('input[type="checkbox"]')){
    const container=input.closest('label,div');if(container&&/에이블리/.test(container.textContent||'')){input.checked=false;input.disabled=true;container.title='에이블리는 판매처 원본 대신 PlayAuto 전용 내보내기를 사용합니다.';container.style.opacity='.45';}
   }
  }
 }

 function tick(){ensureUpload();ensureExport();renameLegacyExportUi();}
 const observer=new MutationObserver(()=>queueMicrotask(tick));observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
 global.addEventListener('load',tick);tick();
})(window);
