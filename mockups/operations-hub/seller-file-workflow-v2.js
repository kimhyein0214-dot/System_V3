(function initSellerFileWorkflowV2(global){
 'use strict';
 const D=()=>global.SystemV3Data,A=()=>global.AblyPlayautoExport;
 const state={files:[],catalog:null,preview:null,previewFilter:'all',role:null,loading:false,carrierFiles:new Map(),standardCarrierFiles:new Map(),standardCarrierPlans:new Map()};
 const roles={
  playauto_product:{label:'PlayAuto · 판매가 + 옵션가',type:'product_price_option',hint:'쇼핑몰상품 시트',fileLabel:'쇼핑몰상품.xlsx'},
  playauto_option:{label:'PlayAuto · 옵션가 + 재고',type:'option_price_stock',hint:'옵션기본 시트 · V 추가 금액 / W 판매가능재고 / X 원본 보존',fileLabel:'옵션기본.xlsx'}
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
  section.innerHTML=`<div class="ably-file-set-head"><div><h3>에이블리 장기 원본</h3><p>GOODS_LIST와 판매가·옵션가 ALL만 장기 reference로 보관합니다. 옵션가·재고 부분 수정파일은 내보내기 화면에서 브라우저 메모리로만 처리합니다.</p></div><button class="btn" id="ably-file-refresh" type="button">상태 새로고침</button></div><div class="ably-file-set-grid"><article class="ably-file-card"><header><h4>에이블리 전체 원본 · GOODS_LIST</h4><span>조회·매칭용</span></header><p>상품/옵션 존재 확인과 판매처 매칭 검증에 사용합니다. 이 파일 자체를 수정 업로드용으로 다시 내보내지 않습니다.</p><div class="ably-file-card-status ready">위의 기존 에이블리 원본 업로드 기능으로 등록</div></article>${uploadCard('playauto_product')}<article class="ably-file-card"><header><h4>옵션가·재고 수정파일</h4><span>임시 carrier</span></header><p>Storage에 저장하지 않습니다. 판매처 내보내기 화면에서 파일을 선택해 즉시 변환합니다.</p><div class="ably-file-card-status ready">브라우저 세션 동안만 사용</div></article></div><div id="seller-file-status" class="export-workflow-status">장기 원본과 임시 carrier를 분리해 관리합니다.</div>`;
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
  section.innerHTML=`<header><h3>판매처 파일 내보내기</h3><p>스마트스토어·메이크샵은 변경분 또는 선택한 공식 수정파일을 변환합니다. 에이블리 옵션가·재고 수정파일은 Storage에 올리지 않고 브라우저에서 즉시 변환합니다.</p></header>
   <div class="export-scope-v2">
    <label>대상 범위<select id="export-scope-mode"><option value="all">파일에서 매칭되는 전체 SKU</option><option value="manual">SKU 직접 입력</option><option value="tag">태그 적용 SKU</option></select></label>
    <div><label id="export-scope-manual-wrap" class="export-scope-detail" hidden>SKU 목록<textarea id="export-scope-manual" placeholder="10000-1&#10;10000-2"></textarea></label><label id="export-scope-tag-wrap" class="export-scope-detail" hidden>태그<select id="export-scope-tag"><option value="">태그 선택</option></select></label></div>
   </div>
   <div class="export-channel-grid">
     <article class="export-channel-card" data-standard-source="smartstore"><header><h4>스마트스토어</h4><span>원본 양식</span></header><p>현재 매트릭스와 다른 안전 상품 묶음만 생성하거나, 직접 받은 공식 부분 수정 XLSX를 메모리에서 변환합니다.</p><div class="export-role-status" data-standard-status="smartstore">원본 상태 확인 중…</div><div class="export-role-status matrix-stock-state" data-matrix-stock-status="smartstore">재고 상태 확인 전 · 새 수정안을 계산하지 않습니다.</div><input type="file" data-standard-carrier-input="smartstore" accept=".xlsx,.xls"><div class="direct-export-actions"><button class="btn" type="button" data-standard-preview="smartstore">변경분 미리보기</button><button class="btn primary" type="button" data-standard-run="smartstore">변경분 XLSX 생성</button><button class="btn" type="button" data-standard-carrier-pick="smartstore">공식 수정파일 선택</button><button class="btn primary" type="button" data-standard-carrier-run="smartstore" disabled title="preview-only 단계에서는 XLSX 생성과 연결하지 않습니다.">XLSX 생성 연결 전</button></div><div class="direct-export-progress" data-standard-progress="smartstore" hidden><div class="direct-export-progress-head"><b data-progress-title>파일 생성 준비</b><span data-progress-percent>0%</span></div><div class="direct-export-progress-track"><i data-progress-bar style="width:0%"></i></div><small data-progress-detail>대상 범위와 원본을 확인합니다.</small></div><div class="direct-export-preview" data-standard-result="smartstore">변경분을 확인하거나 공식 수정파일을 선택하세요.</div></article>
    <article class="export-channel-card" data-standard-source="makeshop"><header><h4>메이크샵</h4><span>원본 양식</span></header><p>현재 매트릭스와 다른 안전 상품 묶음만 생성하거나, 직접 받은 공식 부분 수정 XLSX를 메모리에서 변환합니다.</p><div class="export-role-status" data-standard-status="makeshop">원본 상태 확인 중…</div><div class="export-role-status matrix-stock-state" data-matrix-stock-status="makeshop">재고 상태 확인 전 · 새 수정안을 계산하지 않습니다.</div><input type="file" data-standard-carrier-input="makeshop" accept=".xlsx,.xls"><div class="direct-export-actions"><button class="btn" type="button" data-standard-preview="makeshop">변경분 미리보기</button><button class="btn primary" type="button" data-standard-run="makeshop">변경분 XLSX 생성</button><button class="btn" type="button" data-standard-carrier-pick="makeshop">공식 수정파일 선택</button><button class="btn primary" type="button" data-standard-carrier-run="makeshop" disabled>선택 파일 변환</button></div><div class="direct-export-progress" data-standard-progress="makeshop" hidden><div class="direct-export-progress-head"><b data-progress-title>파일 생성 준비</b><span data-progress-percent>0%</span></div><div class="direct-export-progress-track"><i data-progress-bar style="width:0%"></i></div><small data-progress-detail>대상 범위와 원본을 확인합니다.</small></div><div class="direct-export-preview" data-standard-result="makeshop">변경분을 확인하거나 공식 수정파일을 선택하세요.</div></article>
    <article class="export-channel-card"><header><h4>에이블리 · PlayAuto</h4><span>전용 양식</span></header><p>GOODS_LIST는 조회/매칭에만 사용합니다. 판매가·옵션가 ALL은 장기 원본을, 옵션가·재고 부분파일은 선택한 로컬 파일을 기준으로 만듭니다.</p>
      <div class="export-role-status" data-export-file="playauto_product"></div>
      <div class="export-role-status" data-export-file="playauto_option"></div>
      <input type="file" data-carrier-input="playauto_option" accept=".xlsx,.xls"><div class="ably-export-actions"><button class="btn" type="button" data-preview-role="playauto_product">판매가 + 옵션가 미리보기</button><button class="btn" type="button" data-carrier-pick="playauto_option">옵션가 + 재고 파일 선택</button><button class="btn wide" type="button" data-page-upload-ably>장기 원본 관리</button></div>
    </article>
   </div>
   <section id="export-preview-v2" class="export-preview-v2" hidden><div class="export-preview-head"><div><h4 id="export-preview-title">미리보기</h4><p id="export-preview-copy"></p></div><button class="btn" id="export-preview-close" type="button">닫기</button></div><div id="export-preview-counts" class="export-preview-counts"></div><div class="export-preview-table-wrap"><table class="export-preview-table"><thead><tr><th>SKU</th><th>현재값</th><th>저장값</th><th>상태</th></tr></thead><tbody id="export-preview-rows"></tbody></table></div><div class="export-preview-footer"><button class="btn primary" id="export-preview-generate" type="button">검증된 값으로 XLSX 생성</button></div></section>
   <div id="export-workflow-status" class="export-workflow-status">내보내기 전에 미리보기에서 매칭·변경·제외 건수를 확인하세요.</div>`;
  head.insertAdjacentElement('afterend',section);

  const mode=document.getElementById('export-scope-mode');
  mode.onchange=()=>{document.getElementById('export-scope-manual-wrap').hidden=mode.value!=='manual';document.getElementById('export-scope-tag-wrap').hidden=mode.value!=='tag';if(mode.value==='tag')void loadTags();};
  if(!section.dataset.progressBound){section.dataset.progressBound='1';global.addEventListener('system-v3-seller-export-progress',event=>{const d=event.detail||{};if(d.source)standardProgress(d.source,d.percent,d.title,d.detail,d.percent>=100?'done':'running');});}
  section.querySelectorAll('[data-standard-preview]').forEach(btn=>btn.onclick=()=>void previewStandard(btn.dataset.standardPreview));
  section.querySelectorAll('[data-standard-run]').forEach(btn=>btn.onclick=()=>void runStandard(btn.dataset.standardRun));
  section.querySelectorAll('[data-standard-carrier-pick]').forEach(btn=>btn.onclick=()=>section.querySelector(`[data-standard-carrier-input="${btn.dataset.standardCarrierPick}"]`)?.click());
  section.querySelectorAll('[data-standard-carrier-input]').forEach(input=>input.onchange=()=>{const file=input.files?.[0];if(file){state.standardCarrierFiles.set(input.dataset.standardCarrierInput,file);void previewStandardCarrier(input.dataset.standardCarrierInput,file);}input.value='';});
  section.querySelectorAll('[data-standard-carrier-run]').forEach(btn=>btn.onclick=()=>void runStandardCarrier(btn.dataset.standardCarrierRun));
  section.querySelector('[data-page-upload-ably]').onclick=()=>{document.querySelector('.nav-item[data-page="upload"]')?.click();setTimeout(()=>{const source=document.getElementById('source-select');if(source){source.value='ably';source.dispatchEvent(new Event('change',{bubbles:true}));}},80);};
  section.querySelectorAll('[data-preview-role]').forEach(btn=>btn.onclick=()=>void preview(btn.dataset.previewRole));
  section.querySelectorAll('[data-carrier-pick]').forEach(btn=>btn.onclick=()=>section.querySelector(`[data-carrier-input="${btn.dataset.carrierPick}"]`)?.click());
  section.querySelectorAll('[data-carrier-input]').forEach(input=>input.onchange=()=>{const file=input.files?.[0];if(file){state.carrierFiles.set(input.dataset.carrierInput,file);renderExportStatuses();void preview(input.dataset.carrierInput);}input.value='';});
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

 function carrierPriceTuple(value){
  if(!value)return '가격 원본 정보 없음';
  const show=number=>number===null||number===undefined||number===''?'—':n(number);
  return `기준 ${show(value.base)} / 할인 ${show(value.discounted)} / 옵션 ${show(value.option)} / 최종 ${show(value.final)}`;
 }

 function renderTransformationPlan(source,file,result){
  const plan=result?.plan,el=document.querySelector(`[data-standard-result="${source}"]`);if(!el)return;
  if(!plan||plan.kind!=='TransformationPlan'){standardResult(source,'TransformationPlan을 만들지 못했습니다. 새로고침 후 다시 확인해주세요.','error');return;}
  state.standardCarrierPlans.set(source,plan);
  const c=plan.summary||{},states=c.price_states||{},rows=(plan.preview||[]).slice(0,150);
  const stateClass=code=>code==='calculated_complete'?'complete':code==='latest_generation_unreflected'?'stale':code==='timeout_error'?'error':'fallback';
  el.className='direct-export-preview transformation-plan-preview';
  el.innerHTML=`<div class="transformation-plan-head"><b>${esc(file.name)} · TransformationPlan</b><span>preview-only · Storage 저장 안 함</span></div>
   <div class="transformation-plan-summary"><span>입력 ${n(c.total)}</span><span>매칭 ${n(c.matched)}</span><span>안전 변경 ${n(c.changed)}</span><span>후보 변경 ${n(c.candidate_changed)}</span><span>차단 ${n(c.blocked)}</span><span>정상 완료 ${n(states.calculated_complete)}</span><span>latest generation 미반영 ${n(states.latest_generation_unreflected)}</span><span>timeout/error ${n(states.timeout_error)}</span><span>원본 fallback ${n(states.original_fallback)}</span></div>
   <div class="transformation-plan-warning">${esc(plan.safety?.reason||'가격 계산 상태를 재검증해야 합니다.')} · 실제 XLSX 생성은 아직 연결하지 않았습니다.</div>
   <div class="transformation-plan-table-wrap"><table class="transformation-plan-table"><thead><tr><th>행 / SKU</th><th>상품 · 옵션</th><th>현재값</th><th>preview 저장값</th><th>가격 상태</th></tr></thead><tbody>${rows.map(row=>{const diff=row.diff||{},stock=diff.stock||{},price=diff.price||{},priceState=row.price_state||{};return `<tr><td>${esc(row.source_row_no??'—')} / ${esc(row.sku||'—')}</td><td>${esc(row.product_code||'—')} · ${esc(row.option_code||'—')}</td><td>재고 ${esc(stock.before??'—')}<br>${esc(carrierPriceTuple(price.before))}</td><td>재고 ${esc(stock.after??stock.before??'—')}<br>${esc(carrierPriceTuple(price.after||price.before))}</td><td class="price-state ${stateClass(priceState.code)}"><b>${esc(priceState.label||'가격 계산 미완료/오류 · 원본 유지')}</b><br><small>${esc(row.reason||priceState.detail||'')}</small></td></tr>`;}).join('')||'<tr><td colspan="5">표시할 행이 없습니다.</td></tr>'}</tbody></table></div>
   ${(plan.preview||[]).length>150?`<div class="transformation-plan-limit">상세 diff는 앞 150행만 표시합니다. 전체 ${n(plan.preview.length)}행</div>`:''}`;
  const button=document.querySelector('[data-standard-carrier-run="'+source+'"]');if(button){button.disabled=true;button.dataset.planCanGenerate=String(Boolean(plan.canGenerate));button.title=plan.canGenerate?'재검증 결과는 안전하지만 preview-only 단계이므로 XLSX 생성은 아직 연결하지 않습니다.':'가격 결과가 완결되지 않았거나 stale이므로 XLSX 생성을 차단합니다.';}
 }

 function standardProgress(source,percent,title,detail,stateName='running'){
  const box=document.querySelector(`[data-standard-progress="${source}"]`);if(!box)return;
  const safe=Math.max(0,Math.min(100,Math.round(Number(percent)||0)));
  box.hidden=false;box.dataset.state=stateName;
  const titleNode=box.querySelector('[data-progress-title]'),percentNode=box.querySelector('[data-progress-percent]'),bar=box.querySelector('[data-progress-bar]'),detailNode=box.querySelector('[data-progress-detail]');
  if(titleNode)titleNode.textContent=title||'파일 생성 중';
  if(percentNode)percentNode.textContent=`${safe}%`;
  if(bar)bar.style.width=`${safe}%`;
  if(detailNode)detailNode.textContent=detail||'';
 }

 async function refreshMatrixStockStatus(source,skus=null){
  const el=document.querySelector('[data-matrix-stock-status="'+source+'"]');if(!el)return null;
  el.textContent='매트릭스 재고 반영 상태 확인 중…';
  try{const r=await D().summarizeMatrixStocksForExport({source,skus});el.className='export-role-status matrix-stock-state ready';el.textContent='재고 상태 · 판매처 반영 '+n(r.applied)+'건 · 수정안 있음 '+n(r.draft)+'건 · 미반영 '+n(r.unapplied)+'건 · 기준재고 없음 '+n(r.missing)+'건'+(r.sourceMissing?' · 원본 위치 없음 '+n(r.sourceMissing)+'건':'');return r;}
  catch(error){el.className='export-role-status matrix-stock-state missing';el.textContent='재고 상태 조회 실패 · '+(error?.message||error);return null;}
 }

 async function previewStandard(source){
  const bridge=global.SystemV3SellerExportBridge;if(!bridge){setStatus('직접 내보내기 연결 모듈을 불러오지 못했습니다. 새로고침해주세요.','error');return;}
  const button=document.querySelector('[data-standard-preview="'+source+'"]');if(button)button.disabled=true;global.__systemV3DirectExportBusy=true;
  standardResult(source,'매트릭스 가격·재고와 원본 위치를 검증하는 중…');
  try{const skus=await directScopeSkus();await refreshMatrixStockStatus(source,skus);const result=await bridge.previewChangedOnly({source,skus});standardResult(source,[result.count,result.detail,'재고는 현재 수정안/판매처 반영 상태만 사용'].filter(Boolean).join(' · '),'success');setStatus((source==='smartstore'?'스마트스토어':'메이크샵')+' 변경분 미리보기 완료','success');}
  catch(error){standardResult(source,error?.message||String(error),'error');setStatus('미리보기 실패: '+(error?.message||error),'error');}
  finally{global.__systemV3DirectExportBusy=false;if(button)button.disabled=false;}
 }

 async function runStandard(source){
  const bridge=global.SystemV3SellerExportBridge;if(!bridge){setStatus('직접 내보내기 연결 모듈을 불러오지 못했습니다. 새로고침해주세요.','error');return;}
  const button=document.querySelector('[data-standard-run="'+source+'"]');if(button)button.disabled=true;global.__systemV3DirectExportBusy=true;
  standardProgress(source,3,'파일 생성 준비','현재 매트릭스 표시값과 최신 원본 위치를 읽습니다.');standardResult(source,'매트릭스에 보이는 값으로 파일을 생성하는 중…');setStatus('판매처 파일 생성 중…');
  try{const skus=await directScopeSkus();await refreshMatrixStockStatus(source,skus);const result=await bridge.runChangedOnly({source,skus});standardProgress(source,100,'변경분 파일 생성 완료','현재 매트릭스와 다른 안전 행만 원본 양식에 남겼습니다.','done');standardResult(source,[result.title,result.progressDetail].filter(Boolean).join(' · ')||'변경분 파일 생성 완료','success');setStatus('변경분 파일 생성 완료','success');}
  catch(error){standardProgress(source,100,'파일 생성 중단',error?.message||String(error),'error');standardResult(source,error?.message||String(error),'error');setStatus('파일 생성 실패: '+(error?.message||error),'error');}
  finally{global.__systemV3DirectExportBusy=false;if(button)button.disabled=false;}
 }

 async function previewStandardCarrier(source,file=state.standardCarrierFiles.get(source)){
  const bridge=global.SystemV3SellerExportBridge,button=document.querySelector('[data-standard-carrier-run="'+source+'"]');
  if(!bridge?.previewCarrier){setStatus('공식 수정파일 변환 모듈을 불러오지 못했습니다. 새로고침해주세요.','error');return;}
  if(!file){standardResult(source,'공식 수정 XLSX를 선택해주세요.','error');return;}
  if(button)button.disabled=true;
  standardResult(source,`${file.name} · 브라우저 메모리에서 매칭 확인 중…`);
  try{const result=await bridge.previewCarrier({source,file});if(source==='smartstore')renderTransformationPlan(source,file,result);else{standardResult(source,[file.name,result.count,result.detail,'Storage 저장 안 함'].filter(Boolean).join(' · '),'success');if(button)button.disabled=false;}setStatus((source==='smartstore'?'스마트스토어 TransformationPlan':'메이크샵 공식 수정파일')+' 미리보기 완료','success');}
  catch(error){standardResult(source,'공식 수정파일 확인 실패: '+(error?.message||error),'error');setStatus('공식 수정파일 확인 실패: '+(error?.message||error),'error');}
 }

 async function runStandardCarrier(source){
  const bridge=global.SystemV3SellerExportBridge,file=state.standardCarrierFiles.get(source),button=document.querySelector('[data-standard-carrier-run="'+source+'"]');
  if(source==='smartstore'){standardResult(source,'Smartstore carrier는 현재 preview-only 단계입니다. 실제 XLSX 생성은 가격 결과 재검증 연결 이후에만 허용됩니다.','error');return;}
  if(!bridge?.runCarrier||!file){standardResult(source,'먼저 공식 수정 XLSX를 선택해주세요.','error');return;}
  if(button)button.disabled=true;standardResult(source,`${file.name} · 현재 매트릭스 표시값으로 변환 중…`);
  try{const result=await bridge.runCarrier({source,file});standardResult(source,[result.title,result.progressDetail,'Storage 저장 안 함'].filter(Boolean).join(' · '),'success');setStatus('공식 수정파일 변환 완료','success');}
  catch(error){standardResult(source,'공식 수정파일 변환 실패: '+(error?.message||error),'error');setStatus('공식 수정파일 변환 실패: '+(error?.message||error),'error');}
  finally{if(button)button.disabled=false;}
 }

 function renderExportStatuses(){
 for(const role of Object.keys(roles)){
   const el=document.querySelector(`[data-export-file="${role}"]`);if(!el)continue;
   if(role==='playauto_option'){
    const file=state.carrierFiles.get(role);
    el.className=`export-role-status ${file?'ready':'missing'}`;
    el.innerHTML=`<b>${esc(roles[role].label)}</b><span>${file?`${esc(file.name)} · 브라우저 메모리에서 변환 준비`:'공식 수정 XLSX를 선택해주세요 · Storage 저장 안 함'}</span>`;
    continue;
   }
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

 async function preview(role){
  const record=role==='playauto_option'?null:currentFile(role);
  const carrier=role==='playauto_option'?state.carrierFiles.get(role):null;
  if(!record&&!carrier){setStatus(`${roles[role].label} ${role==='playauto_option'?'공식 수정파일을 선택해주세요.':'원본을 먼저 업로드해주세요.'}`,'error');return;}
  state.role=role;state.preview=null;state.previewFilter='all';setStatus(`${roles[role].label} 원본과 저장값을 비교하는 중…`);
  try{
   const file=carrier||await blobFile(record),parsed=await A().readTemplate(file);
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
   const stored=await D().loadCarrierMatrixTargets({source:'ably',skus:safetySkus});
   const targetMap=new Map((stored.rows||[]).map(row=>[row.sku,row]));

   const chosenSet=new Set(chosen.map(item=>`${item.source_row_no}|${item.option_index??''}|${item.resolution.sku}`));
   const sourceRows=role==='playauto_option'&&!scope?resolved:safetyRows;
   const prepared=sourceRows.map(item=>{
    const sku=item.resolution?.sku,row=sku?targetMap.get(sku):null,inScope=sku?chosenSet.has(`${item.source_row_no}|${item.option_index??''}|${sku}`):!scope;
    const out={...item,resolution:item.resolution,_inScope:inScope,_status:'ready',_error:'',_changedFields:[]};
    if(item.carrier_identity_error){out._status='ambiguous';out._error=item.carrier_identity_error;return out;}
    if(!sku){out._status='unresolved';out._error=item.resolution?.error||'SKU를 정확히 찾지 못했습니다.';return out;}
    const sourceBase=Number.isFinite(Number(item.base_price))?Number(item.base_price):null;
    const sourceOption=Number.isFinite(Number(item.option_price))?Number(item.option_price):null;
    const sourceFinal=sourceBase!==null&&sourceOption!==null?sourceBase+sourceOption:null;
    const matrixTarget=global.HubCurrentPriceExport?.matrixPriceTarget({...row,
      source_base_price:sourceBase,source_discounted_base_price:sourceBase,source_option_price:sourceOption,
      source_final_price:sourceFinal,source_discount_terms:[]
    });
    if(matrixTarget?.invalid){out._status='conflict';out._error=matrixTarget.reason;return out;}
    if(role==='playauto_product'){
      out.target_base_price=matrixTarget?Number(matrixTarget.base):sourceBase;
      if(inScope)out.target_option_price=matrixTarget?Number(matrixTarget.option):sourceOption;
    }else{
      if(inScope)out.target_option_price=matrixTarget?Number(matrixTarget.option):sourceOption;
      const draftStock=row?.stock_draft?.after_value;
      if(inScope&&item.available_stock==null)out._blankStockPreserved=true;
      else if(inScope&&draftStock!==null&&draftStock!==undefined&&draftStock!==''&&Number.isFinite(Number(draftStock)))out.target_stock=Number(draftStock);
      else if(inScope)out.target_stock=item.available_stock;
    }
    return out;
   });

   if(role==='playauto_product'){
    const byRow=new Map();for(const item of prepared){if(!byRow.has(item.source_row_no))byRow.set(item.source_row_no,[]);byRow.get(item.source_row_no).push(item);}
    for(const group of byRow.values()){
      if(!group.some(item=>item._inScope))continue;
      const bases=[...new Set(group.filter(item=>Number.isFinite(Number(item.target_base_price))).map(item=>Number(item.target_base_price)))];
      const safe=bases.length===1&&group.every(item=>item.resolution?.sku&&item._status==='ready');
      if(!safe){for(const item of group)if(item._inScope){item._status='conflict';item._error='공유 판매가를 안전하게 결정할 수 없음';delete item.target_base_price;delete item.target_option_price;}}
    }
   }

   const output=prepared.filter(item=>item._inScope);
   for(const item of output){
    if(item._status!=='ready')continue;
    if(role==='playauto_product'){
      const baseChanged=Number(item.target_base_price)!==Number(item.base_price),optionChanged=Number(item.target_option_price)!==Number(item.option_price);
      if(baseChanged)item._changedFields.push('base');if(optionChanged)item._changedFields.push('option');
      item._changed=baseChanged||optionChanged;
      item._current=`판매가 ${n(item.base_price)} / 옵션 ${n(item.option_price)}`;item._target=`판매가 ${n(item.target_base_price)} / 옵션 ${n(item.target_option_price)}`;
    }else{
      const optionChanged=Number.isFinite(Number(item.target_option_price))&&Number(item.target_option_price)!==Number(item.option_price);
      const stockChanged=Number.isFinite(Number(item.target_stock))&&item.available_stock!==null&&Number(item.target_stock)!==Number(item.available_stock);
      if(optionChanged)item._changedFields.push('option');if(stockChanged)item._changedFields.push('stock');
      item._changed=optionChanged||stockChanged;
      item._current=`추가 금액 ${n(item.option_price)} / 판매가능재고 ${item.available_stock==null?'빈칸':n(item.available_stock)}`;item._target=`추가 금액 ${Number.isFinite(Number(item.target_option_price))?n(item.target_option_price):'유지'} / 판매가능재고 ${item._blankStockPreserved?'빈셀 유지':Number.isFinite(Number(item.target_stock))?n(item.target_stock):'유지'}`;
    }
   }
   const unresolved=output.filter(item=>item._status==='unresolved'||item._status==='ambiguous').length,ready=output.filter(item=>item._status==='ready').length,changed=output.filter(item=>item._status==='ready'&&item._changed).length,preserved=output.filter(item=>item._blankStockPreserved).length,blocked=output.filter(item=>item._status!=='ready').length;
   state.preview={role,record,file,parsed,items:prepared,output,counts:{template:parsed.items.length,matched:resolvedWithSku.length,selected:output.length,ready,changed,blocked,unresolved,preserved}};
   renderPreview();setStatus(`${roles[role].label} 미리보기 완료 · 생성 가능 ${n(ready)}건 · 제외 ${n(blocked)}건`,'success');
  }catch(error){setStatus(`미리보기 실패: ${error?.message||error}`,'error');}
 }

 function previewRowsForFilter(preview,filter='all'){
  const rows=Array.isArray(preview?.output)?preview.output:[];
  if(filter==='ready')return rows.filter(item=>item._status==='ready');
  if(filter==='changed')return rows.filter(item=>item._status==='ready'&&item._changed);
  if(filter==='unresolved')return rows.filter(item=>item._status==='unresolved'||item._status==='ambiguous');
  if(filter==='preserved')return rows.filter(item=>item._blankStockPreserved);
  if(filter==='blocked')return rows.filter(item=>item._status!=='ready');
  return rows;
 }

 function previewFilterButton(filter,label,count,tone=''){
  const active=state.previewFilter===filter;
  return `<button type="button" class="export-preview-filter ${tone} ${active?'active':''}" data-preview-filter="${filter}" aria-pressed="${active}" title="${esc(label)} 항목만 보기">${esc(label)} ${n(count)}</button>`;
 }

 function renderPreview(){
  const p=state.preview,box=document.getElementById('export-preview-v2');if(!p||!box)return;
  box.hidden=false;document.getElementById('export-preview-title').textContent=roles[p.role].label;
  document.getElementById('export-preview-copy').textContent=p.role==='playauto_product'?'PlayAuto 쇼핑몰상품 원본의 판매가·옵션가를 현재 매트릭스 표시값과 비교합니다.':'공식 옵션기본 파일을 Storage에 저장하지 않고 V 추가 금액과 W 판매가능재고만 현재 매트릭스 표시값으로 변환합니다. X *판매수량과 나머지 셀은 보존합니다.';
  const c=p.counts,counts=document.getElementById('export-preview-counts');
  counts.innerHTML=`<span>원본 ${n(c.template)}</span><span>매칭 ${n(c.matched)}</span>${previewFilterButton('all','선택',c.selected)}${previewFilterButton('ready','생성 가능',c.ready,'good')}${previewFilterButton('changed','변경',c.changed,'good')}${previewFilterButton('unresolved','미확정',c.unresolved,'warn')}${c.preserved?previewFilterButton('preserved','원본 blank 유지',c.preserved):''}${previewFilterButton('blocked','제외',c.blocked,c.blocked?'bad':'')}`;
  counts.onclick=event=>{const button=event.target.closest?.('[data-preview-filter]');if(!button)return;const next=button.dataset.previewFilter;state.previewFilter=state.previewFilter===next&&next!=='all'?'all':next;renderPreview();};
  const rows=previewRowsForFilter(p,state.previewFilter);
  document.getElementById('export-preview-rows').innerHTML=rows.slice(0,150).map(item=>`<tr><td>${esc(item.resolution?.sku||'—')}</td><td>${esc(item._current||'—')}</td><td>${esc(item._target||'—')}</td><td class="${item._status==='ready'?'':'error'}">${item._status==='ready'?(item._changed?'변경':'동일'):esc(item._error||item._status)}</td></tr>`).join('')||'<tr><td colspan="4">이 조건에 해당하는 항목이 없습니다.</td></tr>';
  document.getElementById('export-preview-generate').disabled=!c.ready;
 }

 async function generate(){
  const p=state.preview;if(!p)return;
  const writeByKey=new Map(p.output.filter(item=>item._status==='ready'&&item._changed).map(item=>[`${item.source_row_no}|${item.option_index??''}|${item.resolution.sku}`,item]));
  const items=p.items.map(item=>{
   const selected=writeByKey.get(`${item.source_row_no}|${item.option_index??''}|${item.resolution?.sku}`),fields=new Set(selected?._changedFields||[]);
   return {...item,target_base_price:fields.has('base')?selected.target_base_price:null,target_option_price:fields.has('option')?selected.target_option_price:null,target_stock:fields.has('stock')?selected.target_stock:null};
  });
  const progressBox=document.getElementById('export-preview-v2');if(progressBox){progressBox.dataset.generating='1';}
  setStatus('PlayAuto XLSX 생성 중 · 25% · 원본 템플릿 준비');
  try{
   setStatus('PlayAuto XLSX 생성 중 · 55% · 수정 셀 반영');
   const blob=p.role==='playauto_product'?await A().buildProductPriceOption(p.file,items):await A().buildOptionPriceStock(p.file,items);
   setStatus('PlayAuto XLSX 생성 중 · 90% · 파일 저장 준비');
   const suffix=p.role==='playauto_product'?'판매가_옵션가':'옵션가_재고';
   const base=safeName(p.file.name).replace(/\.(xlsx|xls)$/i,'');
   global.SystemV3SellerExport.downloadBlob(blob,`${base}_SystemV3_${suffix}_${new Date().toISOString().slice(0,10)}.xlsx`);
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
