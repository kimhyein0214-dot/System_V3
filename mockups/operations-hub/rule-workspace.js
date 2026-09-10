(function(g){
 'use strict';
 const $=id=>document.getElementById('rw-'+id),M=g.HubRuleRegistry,D=g.SystemV3Data;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>Number.isFinite(v)?v.toLocaleString('ko-KR'):v??'—';
 const sources={ably:'에이블리',smartstore:'스마트스토어',makeshop:'메이크샵'};
 const fieldLabels={...M.fields,calculated_base_price:'내부 최종 기준가격 · 매트릭스 기준가격',basis_sku_price:'기준 SKU 가격 · 고급 중간값'};
 const option=(values,selected)=>Object.entries(values).map(([v,label])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label)}</option>`).join('');
 const state={registry:{rules:[],assignments:[],dependencies:[]},tags:[],selected:null,steps:[],products:{},bulk:[],checks:new Set(),tab:'rules',busy:false,legacy:[],platformDoc:null,requested:[],tagContext:null};
 const host=document.getElementById('price-rules');if(!host)return;
 const legacy=document.createElement('div');legacy.className='rw-legacy';legacy.hidden=true;while(host.firstChild)legacy.append(host.firstChild);
 host.innerHTML=`<div class="rw"><div class="rw-bar"><h2>가격 규칙</h2><button class="btn" id="rw-refresh">최신값 불러오기</button><button class="btn primary" id="rw-new">새 규칙</button><button class="btn" id="rw-legacy-open">기존 저장 규칙 관리</button></div><section class="rw-tag-context" id="rw-tag-context" hidden></section><nav class="rw-bar rw-tabs" aria-label="가격 규칙 작업"><button data-tab="rules" aria-selected="true">규칙관리</button><button data-tab="bulk">SKU 일괄적용</button><button data-tab="dependencies">종속관계</button><button data-tab="platform">플랫폼 가격</button><button data-tab="export">내보내기</button></nav><div class="rw-content" id="rw-content"></div><p class="rw-status" id="rw-status" role="status">규칙을 불러오세요.</p><div class="rw-drawer-backdrop" id="rw-backdrop" hidden><section class="rw-drawer" role="dialog" aria-modal="true" aria-labelledby="rw-drawer-title"><div class="rw-bar"><h3 id="rw-drawer-title"></h3><button class="btn" id="rw-close">닫기</button></div><div id="rw-drawer-body" class="rw-page"></div><p class="rw-status" id="rw-drawer-status" role="status"></p></section></div></div>`;
 const legacyBackdrop=document.createElement('div');legacyBackdrop.id='rw-legacy-backdrop';legacyBackdrop.className='rw-legacy-backdrop';legacyBackdrop.hidden=true;
 legacyBackdrop.innerHTML=`<section class="rw-legacy-dialog" role="dialog" aria-modal="true" aria-labelledby="rw-legacy-title"><header class="rw-legacy-header"><div><h2 id="rw-legacy-title">기존 저장 규칙 관리</h2><p>기존 계산 태그·할인 태그·가격 조합·실입고가 수식을 원래 편집 화면에서 관리합니다.</p></div><button class="btn" id="rw-legacy-close" type="button">닫기</button></header><p id="rw-legacy-status" class="rw-legacy-status" role="status"></p><div class="rw-legacy-body"></div></section>`;
 legacyBackdrop.querySelector('.rw-legacy-body').append(legacy);host.append(legacyBackdrop);
 let legacyLoaded=false,legacyLoading=false;
 function closeLegacy(){legacyBackdrop.hidden=true;legacy.hidden=true;$('legacy-open').focus();}
 async function openLegacy(){
  legacyBackdrop.hidden=false;legacy.hidden=false;$('legacy-close').focus();
  if(legacyLoaded||legacyLoading)return;
  legacyLoading=true;$('legacy-status').textContent='기존 저장 규칙을 불러오는 중…';
  try{
   if(typeof g.SystemV3PriceRuleLab?.refresh!=='function'||typeof g.loadInboundCostTags!=='function')throw Error('기존 규칙 편집 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
   await Promise.all([g.SystemV3PriceRuleLab.refresh(),g.loadInboundCostTags({silent:false})]);legacyLoaded=true;
   $('legacy-status').textContent='기존 저장 규칙은 그대로 유지됩니다. 이 화면은 기존 규칙을 새 공통 규칙으로 변환하지 않습니다.';
  }catch(error){$('legacy-status').textContent=error.message;}
  finally{legacyLoading=false;}
 }
 $('legacy-open').onclick=openLegacy;$('legacy-close').onclick=closeLegacy;legacyBackdrop.onclick=e=>{if(e.target===legacyBackdrop)closeLegacy();};
 document.getElementById('price-rule-lab-done')?.addEventListener('click',()=>{legacyBackdrop.hidden=true;legacy.hidden=true;});
 legacyBackdrop.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeLegacy();return;}
  if(e.key!=='Tab')return;
  const controls=[...legacyBackdrop.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 });
 function status(text){$('status').textContent=text;}
 async function run(fn){if(state.busy)return;state.busy=true;try{await fn();}catch(e){status(e.message);$('drawer-status').textContent=e.message;}finally{state.busy=false;}}
 async function materialize(skus,{sources:targetSources=Object.keys(sources),reason='price-rule-change'}={}){
  const uniqueSkus=[...new Set((skus||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  if(!uniqueSkus.length)return {totalSkus:0,persistedRows:0,errorRows:0,status:'complete'};
  if(typeof g.HubPriceMaterializer?.materialize!=='function')throw Error('가격 계산 결과 저장 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.');
  return g.HubPriceMaterializer.materialize({skus:uniqueSkus,sources:targetSources,reason,onProgress:progress=>status(`계산 결과 저장 중 · 영향 SKU ${Number(progress.totalSkus||0).toLocaleString('ko-KR')}개 · 저장값 ${Number(progress.persistedRows||0).toLocaleString('ko-KR')}개`)});
 }
 const calculationState=result=>result?.status==='partial'?`오류값 ${Number(result.errorRows||0).toLocaleString('ko-KR')}개 · 내보내기 제외`:`영향 ${Number(result?.totalSkus||0).toLocaleString('ko-KR')}개 SKU 가격 저장`;
 async function allSkus(){const result=await D.loadAllFilteredSkus({status:'all'},{onProgress:progress=>status(progress?.message||'전체 SKU 목록을 읽는 중…')});return result.skus||[];}
 const sourcesForRules=rules=>rules.some(rule=>!M.isPlatform(rule.target_field))?Object.keys(sources):[...new Set(rules.map(rule=>rule.scope).filter(Boolean))];
 async function configuredSourcesForRuleIds(ruleIds){
  if(!ruleIds.size||typeof g.HubPlatformRules?.settings!=='function')return [];
  const configured=[];
  for(const source of Object.keys(sources)){const document=await g.HubPlatformRules.settings(source),body=document?.body||{};if(ruleIds.has(body.registration_rule_id)||ruleIds.has(body.discount_rule_id))configured.push(source);}
  return configured;
 }
 function current(){return state.registry.rules.find(r=>r.id===state.selected);}
 function name(id){return state.registry.rules.find(r=>r.id===id)?.name||'없음';}
 function tagName(rule){
  if(!rule?.tag_id)return '';
  if(state.tagContext&&String(state.tagContext.id)===String(rule.tag_id))return state.tagContext.name;
  return state.tags.find(tag=>String(tag.tag_id)===String(rule.tag_id))?.tag_name||'연결된 상품 태그';
 }
 function operationSummary(rule){
  const steps=rule?.config?.steps||[];
  return steps.map(step=>step.op==='round'?`${money(step.unit)} 단위 ${{nearest:'반올림',up:'올림',down:'내림'}[step.rounding]||'반올림'}`:`${{add:'+ ',subtract:'− ',multiply:'× ',divide:'÷ ',set:'값 지정 '}[step.op]||''}${money(step.value)}`).join(' → ')||'입력값 그대로';
 }
 function ruleSummary(rule){return `${rule.input_origin==='parent'?'상위 SKU':'해당 SKU'} ${fieldLabels[rule.source_field]||rule.source_field} → ${operationSummary(rule)} → ${fieldLabels[rule.target_field]||rule.target_field}${rule.scope?' · '+(sources[rule.scope]||rule.scope):''}`;}
 async function refresh(){const [registry,tags]=await Promise.all([D.ruleRegistry('list'),typeof D.loadTags==='function'?D.loadTags():Promise.resolve(state.tags)]);state.registry=registry;state.tags=tags||[];if(state.selected&&!current())state.selected=null;renderTab();status(`규칙 ${state.registry.rules.length}개 · 적용 ${state.registry.assignments.length}개 · 종속 ${state.registry.dependencies.length}개`);if(state.tab==='rules')await preview();}
 function select(id){readTagContext();state.selected=id;renderRules();void run(preview);}
 function renderTab(){renderTagContext();document.querySelectorAll('.rw-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===state.tab)));if(state.tab==='rules')renderRules();if(state.tab==='dependencies')renderDependencies();if(state.tab==='platform')renderPlatform();if(state.tab==='export')renderExport();}
 function renderRules(){
  renderTagContext();
  const r=current()||{name:state.tagContext?state.tagContext.name+' 수식':'',target_field:'calculated_base_price',input_origin:'self',source_field:'actual_inbound_cost',scope:'',config:{steps:[]}};state.steps=structuredClone(r.config.steps||[]);state.importConfig=null;
  $('content').innerHTML=`<div class="rw-top"><aside class="rw-registry"><input id="rw-filter" placeholder="규칙·태그 이름 검색" aria-label="규칙 또는 태그 이름 검색"><div id="rw-list"></div></aside><section class="rw-editor"><div class="rw-rule-heading"><label>규칙 이름<input id="rw-name" value="${esc(r.name)}"></label><div class="rw-rule-link"><b>연결 상품 태그</b><span>${esc(tagName(r)||'없음 · 개별 Rule')}</span><small>${esc(ruleSummary(r))}</small></div></div><div class="rw-pipeline"><section class="rw-pipeline-step"><header><b>1</b><div><h3>계산 시작점 선택</h3><small>어느 SKU의 어떤 값을 가져올지 정합니다.</small></div></header><div class="rw-start-fields"><label>SKU 위치<select id="rw-origin" aria-describedby="rw-stage-note">${option({self:'해당 SKU',parent:'상위 SKU'},r.input_origin)}</select></label><label>시작값 / 참조 필드<select id="rw-source-field">${option(fieldLabels,r.source_field)}</select></label><label>참조 판매처<select id="rw-source-scope">${option({'':'적용 판매처와 같음',...sources},r.source_scope||'')}</select></label></div></section><i class="rw-pipeline-arrow" aria-hidden="true">→</i><section class="rw-pipeline-step rw-formula-step"><header><b>2</b><div><h3>수식 만들기</h3><small>미리 만든 수식 태그를 쓰거나 계산 단계를 직접 만듭니다.</small></div><button class="btn" id="rw-add-op">+ 연산 추가</button></header><div class="rw-formula-library"><label>미리 만든 수식 태그<select id="rw-legacy-rules" aria-label="미리 만든 수식 태그"><option value="">수식 태그 선택</option></select></label><button class="btn" id="rw-legacy-load" type="button">태그 목록 새로고침</button></div><div class="rw-ops" id="rw-ops"></div></section><i class="rw-pipeline-arrow" aria-hidden="true">→</i><section class="rw-pipeline-step"><header><b>3</b><div><h3>계산 적용점 선택</h3><small>계산 결과가 저장될 위치를 정합니다.</small></div></header><div class="rw-end-fields"><label>도착값 / 저장 위치<select id="rw-target" aria-describedby="rw-stage-note">${option(Object.fromEntries(M.targets.map(k=>[k,fieldLabels[k]])),r.target_field)}</select></label><label>판매처<select id="rw-scope" aria-describedby="rw-stage-note">${option({'':'공통',...sources},r.scope)}</select></label></div><p id="rw-stage-note" class="rw-stage-note" hidden></p></section></div><div class="rw-flow" aria-live="polite"><p id="rw-flow-summary"></p><p id="rw-flow-effect"></p></div><div class="rw-bar"><button class="btn" id="rw-bulk">${r.tag_id?'이 수식 태그를 SKU에 적용':'SKU 일괄적용'}</button><button class="btn primary" id="rw-save">${state.tagContext?'태그와 수식 저장':'규칙 저장'}</button></div><p id="rw-save-status" class="rw-save-status" role="status" aria-live="polite"></p></section></div><section class="rw-preview"><div class="rw-bar"><h3>적용 SKU · 저장값 미리보기</h3><input id="rw-preview-filter" placeholder="적용 SKU 검색 · 조회한 상품명" aria-label="적용 SKU 검색"><span id="rw-preview-count"></span></div><p id="rw-preview-state" class="rw-preview-state" role="status"></p><div class="rw-scroll"><table><thead><tr><th>SKU</th><th>상품 / 옵션</th><th>입력값</th><th>계산값</th><th>적용규칙</th><th>상태</th></tr></thead><tbody id="rw-preview"></tbody></table></div></section>`;
  renderList();renderFormulaLibrary();renderOps();updateRuleScopes();$('target').onchange=updateRuleScopes;$('source-field').onchange=updateRuleScopes;$('filter').oninput=renderList;$('add-op').onclick=()=>{readOps();state.steps.push({op:'add',value:0});renderOps();};$('save').onclick=()=>run(saveRule);$('bulk').onclick=()=>run(openBulk);$('legacy-load').onclick=()=>run(loadLegacy);$('legacy-rules').onchange=importLegacy;$('preview-filter').oninput=()=>run(preview);
  $('content').oninput=e=>{if(e.target.closest('.rw-editor'))updateRuleFlow();};$('content').onchange=e=>{if(e.target.closest('.rw-editor'))updateRuleFlow();};
 }
 function renderList(){const q=$('filter').value.toLowerCase(),counts=new Map();for(const a of state.registry.assignments)counts.set(a.rule_id,(counts.get(a.rule_id)||0)+1);$('list').innerHTML=state.registry.rules.filter(r=>(!state.tagContext||state.tagContext.id&&String(r.tag_id)===String(state.tagContext.id))&&`${r.name} ${tagName(r)}`.toLowerCase().includes(q)).map(r=>`<button data-rule="${r.id}" aria-current="${r.id===state.selected}"><strong>${esc(r.name)}</strong>${r.tag_id?`<span class="rw-linked-tag">태그 · ${esc(tagName(r))}</span>`:'<span class="rw-linked-tag rw-muted">개별 Rule</span>'}<small>${esc(ruleSummary(r))}</small><small>적용 ${Number(counts.get(r.id)||0).toLocaleString('ko-KR')} SKU</small></button>`).join('')||'<p class="rw-empty">등록된 규칙이 없습니다.</p>';$('list').querySelectorAll('button').forEach(b=>b.onclick=()=>select(b.dataset.rule));}
 function readOps(){state.steps=[...$('ops').children].map(row=>{const op=row.querySelector('select').value;return op==='round'?{op,unit:Number(row.querySelector('input').value),rounding:row.querySelector('[data-round]').value}:{op,value:Number(row.querySelector('input').value)};});}
 function moveOp(from,to){readOps();if(to<0||to>=state.steps.length)return;state.steps.splice(to,0,state.steps.splice(from,1)[0]);renderOps();}
 function renderOps(){ $('ops').innerHTML=state.steps.map((s,i)=>`<div class="rw-op" draggable="true" data-index="${i}"><span>${i+1}</span><select aria-label="${i+1}번 연산">${option({add:'+ 더하기',subtract:'− 빼기',multiply:'× 곱하기',divide:'÷ 나누기',set:'값 지정',round:'끝자리 처리'},s.op)}</select><input type="number" value="${s.op==='round'?s.unit:s.value}" aria-label="${i+1}번 연산값"><select data-round ${s.op==='round'?'':'hidden'} aria-label="끝자리 방식">${option({nearest:'반올림',up:'올림',down:'내림'},s.rounding||'nearest')}</select><button data-up aria-label="위로">↑</button><button data-down aria-label="아래로">↓</button><button data-delete aria-label="삭제">×</button></div>`).join('');
  $('ops').querySelectorAll('.rw-op').forEach((row,i)=>{row.querySelector('select').onchange=()=>{readOps();if(state.steps[i].op==='round'&&!state.steps[i].unit)state.steps[i].unit=100;renderOps();};row.querySelector('[data-up]').onclick=()=>moveOp(i,i-1);row.querySelector('[data-down]').onclick=()=>moveOp(i,i+1);row.querySelector('[data-delete]').onclick=()=>{readOps();state.steps.splice(i,1);renderOps();};row.ondragstart=e=>e.dataTransfer.setData('text/plain',String(i));row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();moveOp(Number(e.dataTransfer.getData('text/plain')),i);};});
  updateRuleFlow();
 }
 function assignedRuleCount(){const r=current();return r?state.registry.assignments.filter(a=>a.rule_id===r.id).length:0;}
 function updateRuleFlow(){
  if(!$('flow-summary'))return;readOps();
  const r=current(),target=$('target').value,origin=$('origin').value,source=$('source-field').value;
  const operations=state.steps.map(s=>s.op==='round'?`${money(s.unit)} 단위 ${{nearest:'반올림',up:'올림',down:'내림'}[s.rounding]}`:`${{add:'+ ',subtract:'− ',multiply:'× ',divide:'÷ ',set:'값 지정 '}[s.op]}${money(s.value)}`).join(' → ')||'입력값 그대로';
  $('flow-summary').textContent=`${origin==='parent'?'상위 SKU':'해당 SKU'} ${fieldLabels[source]} → ${operations} → ${fieldLabels[target]}${$('scope').value?' · '+sources[$('scope').value]:''}`;
  $('flow-effect').textContent=target==='calculated_base_price'?'이 결과는 매트릭스의 기준가격입니다. 이 내부 기준가격을 참조하는 판매처 규칙은 결과를 이어받을 수 있습니다. 판매처 등록가·옵션가·할인은 해당 판매처 규칙에 따라 계산됩니다.':target==='basis_sku_price'?'고급 중간값입니다. 이를 참조하는 내부 최종 기준가격 규칙을 거쳐 매트릭스 기준가격과 판매처 계산에 이어질 수 있습니다.':M.isPlatform(target)?'선택한 판매처의 결과값을 계산합니다. 등록가·옵션가·할인·최종가는 연결된 판매처 규칙에 따라 이어집니다.':'입력값에 계산 순서를 적용해 선택한 위치에 저장합니다. 이 값을 참조하는 후속 규칙은 결과를 이어받을 수 있습니다.';
  const draft=!r||r.name!==$('name').value.trim()||r.target_field!==target||r.input_origin!==origin||r.source_field!==source||(r.scope||'')!==$('scope').value||(r.source_scope||'')!==(M.isPlatform(source)?$('source-scope').value:'')||JSON.stringify(r.config.steps||[])!==JSON.stringify(state.steps)||!!state.importConfig;
  $('preview-state').textContent=!r?'아직 저장하지 않은 규칙입니다. 저장하고 SKU에 적용하면 결과를 조회할 수 있습니다.':`아래 표는 저장된 규칙 v${r.version||1} 기준입니다.${draft?' 편집 중인 입력값·계산 순서는 저장 전이며, 아래 표에 반영되지 않았습니다.':' 위 계산 순서와 저장된 규칙이 같습니다.'}`;
  $('preview-state').classList.toggle('rw-draft',draft);
 }
 function navigate(page){if(typeof g.showPage==='function')g.showPage(page);else document.querySelector(`.nav-item[data-page="${page}"]`)?.click();}
 function readTagContext(){
  if(!state.tagContext)return null;
  if($('tag-name'))Object.assign(state.tagContext,{name:$('tag-name').value,color:$('tag-color').value,group:$('tag-group').value,returnAfterSave:$('tag-return').checked});
  return {...state.tagContext};
 }
 function renderTagContext(){
  const region=$('tag-context'),tag=state.tagContext;region.hidden=!tag;if(!tag){region.innerHTML='';return;}
  const related=state.registry.rules.filter(r=>tag.id&&String(r.tag_id)===String(tag.id));
  region.innerHTML=`<div class="rw-bar"><b>상품태그 수식 · ${esc(tag.name)}</b><button class="btn" id="rw-tag-back">← 상품태그로 돌아가기</button></div><div class="rw-tag-fields"><label>태그 이름<input id="rw-tag-name" maxlength="32" value="${esc(tag.name)}"></label><label>색상<input type="color" id="rw-tag-color" value="${esc(tag.color||'#dbeafe')}"></label><label>태그 그룹<input id="rw-tag-group" value="${esc(tag.group||'운영')}"></label><label>이 태그의 수식<select id="rw-tag-rule">${option({'':'새 수식',...Object.fromEntries(related.map(r=>[r.id,r.name+' · '+(sources[r.scope]||fieldLabels[r.target_field])]))},state.selected||'')}</select></label></div><label class="rw-tag-return"><input type="checkbox" id="rw-tag-return" ${tag.returnAfterSave?'checked':''}>저장 후 상품태그로 돌아가기</label>`;
  $('tag-back').onclick=()=>run(returnToTags);$('tag-rule').onchange=()=>{readTagContext();state.selected=$('tag-rule').value||null;renderRules();void run(preview);};
  region.querySelectorAll('input').forEach(input=>input.oninput=readTagContext);
 }
 async function returnToTags(){state.tagContext=null;$('tag-context').hidden=true;navigate('attributes');await g.SystemV3AttributesPage?.refresh();}
 async function openForTag(tag){return run(async()=>{
  state.registry=await D.ruleRegistry('list');
  state.tagContext={id:tag.id||tag.tag_id||null,name:tag.name||tag.tag_name||'',color:tag.color||tag.tag_color||'#dbeafe',group:tag.group||tag.tag_group||'운영',returnAfterSave:false};
  if(state.tagContext.id&&!state.tags.some(item=>String(item.tag_id)===String(state.tagContext.id)))state.tags.push({tag_id:state.tagContext.id,tag_name:state.tagContext.name,tag_color:state.tagContext.color,tag_group:state.tagContext.group});
  state.selected=state.registry.rules.find(r=>state.tagContext.id&&String(r.tag_id)===String(state.tagContext.id))?.id||null;
  state.tab='rules';navigate('price-rules');renderTab();await preview();status('태그와 수식을 함께 저장합니다. SKU 목록을 따로 입력할 필요가 없습니다.');
 });}
 function updateRuleScopes(){
  const platform=M.isPlatform($('target').value),previous=$('scope').value;
  const choices=platform?{...(!current()?{'':'전체판매처(스마트스토어·메이크샵·에이블리)'}:{}),...sources}:{'':'공통'};
  $('scope').innerHTML=option(choices,previous);$('scope').disabled=!platform;
  $('source-scope').disabled=!M.isPlatform($('source-field').value);
  const count=assignedRuleCount(),locked=count>0;$('target').disabled=locked;$('origin').disabled=locked;$('scope').disabled=locked||!platform;
  $('stage-note').hidden=!locked;$('stage-note').textContent=locked?`저장된 위치: ${fieldLabels[current().target_field]} · ${sources[current().scope]||'공통'} · ${current().input_origin==='parent'?'상위 SKU 입력':'해당 SKU 입력'}. ${count.toLocaleString('ko-KR')}개 SKU에 적용되어 결과 위치·판매처·입력 위치는 고정됩니다. 입력값과 계산 순서는 여기서 수정할 수 있습니다.`:'';
  updateRuleFlow();
 }
 async function saveRule(){
  const button=$('save'),controls=[...document.querySelectorAll('.rw button,.rw input,.rw select,.rw textarea')].map(el=>({el,disabled:el.disabled}));
  const show=(message,error=false)=>{const node=$('save-status');if(node){node.textContent=message;node.classList.toggle('rw-error',error);}};
  try{
   readOps();const rule={...current(),name:$('name').value.trim(),target_field:$('target').value,scope:$('scope').value,input_origin:$('origin').value,source_field:$('source-field').value,source_scope:M.isPlatform($('source-field').value)?$('source-scope').value:'',config:{...(current()?.config||{}),...(state.importConfig||{}),steps:state.steps}};
   if(!rule.name)throw Error('규칙 이름을 입력하세요.');
   const tag=readTagContext();if(tag&&!tag.name.trim())throw Error('태그 이름을 입력하세요.');if(tag&&typeof D.saveTagRule!=='function')throw Error('태그·수식 통합 저장 기능을 불러오지 못했습니다. 입력 내용은 유지됩니다.');
   const allPlatforms=M.isPlatform(rule.target_field)&&!rule.scope;
   if(allPlatforms){
    if(rule.id)throw Error('전체판매처 규칙은 새 규칙에서 등록하세요. 기존 규칙은 해당 판매처에서 수정합니다.');
    for(const scope of Object.keys(sources))M.validateRule({...rule,scope,source_scope:M.isPlatform(rule.source_field)?rule.source_scope||scope:''});
    if(!state.tagContext&&typeof D.savePlatformRuleGroup!=='function')throw Error('전체판매처 저장 기능을 불러오지 못했습니다. 입력 내용은 유지됩니다. 새로고침 후 다시 시도하세요.');
   }else M.validateRule(rule);
   controls.forEach(({el})=>el.disabled=true);button.textContent='저장 중…';button.setAttribute('aria-busy','true');show(tag?'태그와 수식을 함께 저장하고 있습니다.':allPlatforms?'3개 판매처 규칙을 함께 저장하고 있습니다.':'규칙을 저장하고 있습니다.');
   const result=tag?await D.saveTagRule({tag:{id:tag.id,name:tag.name.trim(),color:tag.color,group:tag.group},rule:{...rule,tag_id:tag.id||null}}):null;
   const saved=tag?result?.rules:allPlatforms?await D.savePlatformRuleGroup(rule):[await D.ruleRegistry('save',rule)];
   if(tag){if(!result?.tag?.tag_id)throw Error('태그 저장 응답을 확인하지 못했습니다.');state.tagContext={...tag,id:result.tag.tag_id,name:result.tag.tag_name,color:result.tag.tag_color,group:result.tag.tag_group};}
   if(!Array.isArray(saved)||saved.length!==(allPlatforms?3:1)||saved.some(r=>!r.id)||(allPlatforms&&new Set(saved.map(r=>r.scope)).size!==3))throw Error('저장 응답을 확인하지 못했습니다. 입력 내용은 유지됩니다.');
    state.selected=saved[0].id;await refresh();
    const savedIds=new Set(saved.map(item=>item.id)),affected=new Set(state.registry.assignments.filter(item=>savedIds.has(item.rule_id)).map(item=>item.sku));
    const configuredSources=await configuredSourcesForRuleIds(savedIds);if(configuredSources.length)(await allSkus()).forEach(sku=>affected.add(sku));
    const calculation=await materialize([...affected],{sources:[...new Set([...sourcesForRules(saved),...configuredSources])],reason:`rule-save:${saved.map(item=>item.id).join(',')}`});
    const message=tag?`태그와 수식 저장 완료 · ${calculationState(calculation)}`:allPlatforms?`전체판매처 저장 완료 · 3개 판매처 규칙 · ${calculationState(calculation)}`:`규칙 저장 완료 · ${calculationState(calculation)}`;
    show(message);status(message);g.dispatchEvent(new CustomEvent('hub-rules-changed',{detail:{persisted:true}}));
   if(tag){g.dispatchEvent(new Event('hub-tags-changed'));await g.SystemV3AttributesPage?.refresh();if(tag.returnAfterSave)await returnToTags();}
  }catch(error){show(error.message,true);throw error;}
  finally{controls.forEach(({el,disabled})=>el.disabled=disabled);button.textContent=state.tagContext?'태그와 수식 저장':'규칙 저장';button.removeAttribute('aria-busy');}
 }
 async function preview(){
  if(!$('preview'))return;
  const r=current(),query=$('preview-filter').value.trim().toLowerCase();
  if(!r){state.previewMeta={total:0,matched:0};state.preview=[];renderPreview([]);return;}
  const assigned=[...new Set(state.registry.assignments.filter(a=>a.rule_id===r.id).map(a=>a.sku))];
  const matches=query?assigned.filter(sku=>sku.toLowerCase().includes(query)||String(state.products[sku]?.display_name||'').toLowerCase().includes(query)):assigned;
  const skus=matches.slice(0,200),selected=new Set(skus);
  state.previewMeta={total:assigned.length,matched:matches.length,query};
  $('preview-count').textContent=`전체 ${assigned.length.toLocaleString('ko-KR')} SKU · 미리보기 ${skus.length}개 조회 중`;
  const stale=()=>state.tab!=='rules'||current()?.id!==r.id||!$('preview-filter');
  let rows;
  if(M.isPlatform(r.target_field)&&skus.length){
   const result=await g.HubPlatformRules.calculate(skus,r.scope);if(stale())return;
   Object.assign(state.products,Object.fromEntries(result.rows.map(row=>[row.sku,row.product])));
   const column={platform_registration_price:'platformBase',platform_option_price:'platformOption',platform_discount_price:'discounted',platform_final_price:'platformFinal',platform_price:'platformFinal'}[r.target_field];
   const errors=new Map(result.errors.filter(row=>selected.has(row.sku)).map(row=>[row.sku,row]));
   rows=result.rows.filter(row=>selected.has(row.sku)&&!errors.has(row.sku)).map(row=>({sku:row.sku,base:row.value,value:column==='discounted'?row.platformBase-row.platformDiscount:row[column],error:row.error}));
   rows.push(...errors.values());
   state.previewMeta.relatedErrors=result.errors.filter(row=>!selected.has(row.sku)).length;
  }else{
   const products=await D.loadFormulaProducts(M.expandSkus(skus,state.registry.dependencies));if(stale())return;
   Object.assign(state.products,Object.fromEntries(products.map(p=>[p.sellpia_sku_code,p])));
   const evaluator=M.createEvaluator({...state.registry,products:Object.fromEntries(products.map(p=>[p.sellpia_sku_code,p]))});
   rows=skus.map(sku=>{try{return {sku,...evaluator.evaluate(sku,r.target_field,r.scope)};}catch(e){return {sku,error:e.message};}});
  }
  if($('preview-filter').value.trim().toLowerCase()!==query){await preview();return;}
  state.preview=rows;renderPreview(rows);
 }
 function renderPreview(rows){
  const meta=state.previewMeta||{total:rows.length,matched:rows.length};
  $('preview-count').textContent=`전체 ${meta.total.toLocaleString('ko-KR')} SKU · ${meta.query?'검색 '+meta.matched.toLocaleString('ko-KR')+'개 · ':''}미리보기 ${rows.length}개(최대 200) · 표시 결과 오류 ${rows.filter(r=>r.error).length}`+(meta.relatedErrors?` · 연관 옵션 오류 ${meta.relatedErrors}`:'');
  $('preview').innerHTML=rows.map(r=>`<tr><td>${esc(r.sku)}</td><td>${esc(state.products[r.sku]?.display_name)}</td><td>${money(r.base)}</td><td>${money(r.value)}</td><td>${esc(name(state.selected))}</td><td class="${r.error?'rw-error':''}">${esc(r.error||'정상')}</td></tr>`).join('')||'<tr><td colspan="6" class="rw-empty">'+(meta.query?'검색과 일치하는 적용 SKU가 없습니다.':'적용된 SKU가 없습니다.')+'</td></tr>';
 }
 function renderFormulaLibrary(){
  if(!$('legacy-rules'))return;
  const shared=state.registry.rules.filter(rule=>rule.tag_id),selected=current()?.tag_id?`shared:${current().id}`:'';
  $('legacy-rules').innerHTML='<option value="">수식 태그 선택</option>'+(shared.length?`<optgroup label="상품 태그와 연결된 공통 Rule">${shared.map(rule=>`<option value="shared:${esc(rule.id)}">${esc(tagName(rule))} · ${esc(operationSummary(rule))}</option>`).join('')}</optgroup>`:'')+(state.legacy.length?`<optgroup label="기존 저장 수식 태그">${state.legacy.map((entry,index)=>`<option value="legacy:${index}">${esc(entry.name)}</option>`).join('')}</optgroup>`:'');
  if(selected&&shared.some(rule=>`shared:${rule.id}`===selected))$('legacy-rules').value=selected;
 }
 async function loadLegacy(){const [price,inbound]=await Promise.all([D.loadPriceRuleTags(),D.loadInboundCostFormulaTags()]);state.legacy=[...inbound.map(r=>({r,type:'inbound',name:r.tag_name})),...price.filter(r=>r.tag_role!=='discount').map(r=>({r,type:'price',name:r.tag_name}))];renderFormulaLibrary();status(`수식 태그 ${state.registry.rules.filter(rule=>rule.tag_id).length+state.legacy.length}개를 불러왔습니다.`);}
 function importLegacy(){const value=$('legacy-rules').value;if(!value)return;if(value.startsWith('shared:')){const ruleId=value.slice(7);if(!state.registry.rules.some(rule=>rule.id===ruleId))return;state.selected=ruleId;renderRules();void run(preview);status(`${tagName(current())} 수식 태그를 열었습니다. 아래 버튼에서 이 공유 Rule을 SKU에 바로 적용할 수 있습니다.`);return;}const entry=state.legacy[Number(value.replace('legacy:',''))];if(!entry)return;const f=g.TagPriceModel.fromSavedRule(entry.r,entry.type);state.selected=null;state.importConfig={min:f.min,max:f.max};$('name').value=entry.name;$('origin').value='self';$('source-field').value=entry.type==='inbound'?'purchase_price':'actual_inbound_cost';updateRuleScopes();state.steps=[...(f.fixed!==''&&f.fixed!=null?[{op:'set',value:Number(f.fixed)}]:[]),{op:'multiply',value:f.multiplier},{op:'divide',value:f.divide||1},{op:'add',value:f.add},{op:'round',unit:f.unit,rounding:f.rounding}];renderOps();status('기존 수식 태그의 시작점과 계산 순서를 가져왔습니다. 3단계 도착점을 확인하고 새 공통 Rule로 저장한 뒤 SKU에 적용하세요.');}
 function drawer(title,html){$('drawer-title').textContent=title;$('drawer-body').innerHTML=html;$('drawer-status').textContent='';$('backdrop').hidden=false;$('close').focus();}
 const skuText=v=>[...new Set(String(v).split(/[\s,;]+/).map(s=>s.trim()).filter(s=>s&&!['SKU','sku','sellpia_sku_code'].includes(s)))];
 async function fileRows(file){if(!file)return[];const book=g.XLSX.read(await file.arrayBuffer(),{type:'array'});return g.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''});}
 async function openBulk(){if(!current())throw Error('먼저 저장된 규칙을 선택하세요.');state.checks=new Set();drawer('SKU 일괄적용',`<div class="rw-rule-summary">${esc(current().name)} · ${esc(fieldLabels[current().target_field])}</div><div class="rw-bar"><input id="rw-search" placeholder="SKU 또는 상품명" aria-label="SKU 또는 상품 검색"><button class="btn" id="rw-search-go">검색</button><input type="file" id="rw-bulk-file" accept=".xlsx,.xls,.csv" aria-label="SKU 엑셀 업로드"></div><textarea id="rw-paste" placeholder="SKU 목록 붙여넣기" aria-label="SKU 목록 붙여넣기"></textarea><div class="rw-bar"><button class="btn" id="rw-paste-go">붙여넣기 조회</button><button class="btn" id="rw-select-all">전체 선택</button><span id="rw-selected-count">0개 선택</span></div><div class="rw-scroll"><table><thead><tr><th></th><th>SKU</th><th>상품 / 옵션</th><th>현재 Rule</th><th>적용 후 Rule</th><th>충돌</th></tr></thead><tbody id="rw-bulk-rows"></tbody></table></div><div class="rw-bar"><button class="btn" id="rw-remove">선택 Rule만 제거</button><button class="btn primary" id="rw-apply">선택 SKU에 적용</button></div>`);
  $('search-go').onclick=()=>run(async()=>{const result=await D.loadProducts({search:$('search').value,pageSize:100});setBulk(result.rows);});$('paste-go').onclick=()=>run(async()=>{const skus=skuText($('paste').value);if(skus.length>1000)throw Error('한 번에 최대 1,000 SKU입니다.');const rows=await D.loadFormulaProducts(skus);const map=new Map(rows.map(p=>[p.sellpia_sku_code,p]));setBulk(skus.map(sku=>map.get(sku)||{sellpia_sku_code:sku,missing:true}));});$('bulk-file').onchange=()=>run(async()=>{$('paste').value=(await fileRows($('bulk-file').files[0])).map(r=>r[0]).join('\n');const skus=skuText($('paste').value);const rows=await D.loadFormulaProducts(skus);const found=new Map(rows.map(p=>[p.sellpia_sku_code,p]));setBulk(skus.map(sku=>found.get(sku)||{sellpia_sku_code:sku,missing:true}));});$('select-all').onclick=()=>{state.bulk.forEach(p=>state.checks.add(p.sellpia_sku_code));renderBulk();};$('apply').onclick=()=>run(()=>applyBulk('apply'));$('remove').onclick=()=>run(()=>applyBulk('remove'));
 }
 function setBulk(rows){state.bulk=rows;state.checks=new Set();renderBulk();}
 function bulkConflict(p){const r=current(),a=state.registry.assignments.find(a=>a.sku===p.sellpia_sku_code&&a.target_field===r.target_field&&a.scope===r.scope);return p.missing?'없는 SKU':a&&a.rule_id!==r.id?'같은 단계 Rule 충돌':r.input_origin==='parent'&&!state.registry.dependencies.some(d=>d.child_sku===p.sellpia_sku_code&&d.rule_id===r.id)?'종속관계에서 상위 참조 지정':'';}
 function renderBulk(){const r=current();$('selected-count').textContent=state.checks.size+'개 선택';$('bulk-rows').innerHTML=state.bulk.map(p=>{const sku=p.sellpia_sku_code,a=state.registry.assignments.filter(a=>a.sku===sku);return `<tr><td><input type="checkbox" data-sku="${esc(sku)}" ${state.checks.has(sku)?'checked':''} aria-label="${esc(sku)} 선택"></td><td>${esc(sku)}</td><td>${esc(p.display_name||p.sellpia_product_name)}</td><td>${esc(a.map(a=>name(a.rule_id)).join(', ')||'없음')}</td><td>${esc(r.name)}</td><td class="rw-error">${esc(bulkConflict(p))}</td></tr>`;}).join('');$('bulk-rows').querySelectorAll('input').forEach(x=>x.onchange=()=>{x.checked?state.checks.add(x.dataset.sku):state.checks.delete(x.dataset.sku);$('selected-count').textContent=state.checks.size+'개 선택';});}
 async function applyBulk(action){const selected=state.bulk.filter(p=>state.checks.has(p.sellpia_sku_code));if(!selected.length)throw Error('SKU를 선택하세요.');if(action==='apply'&&selected.some(bulkConflict))throw Error('충돌 표시를 확인하세요. 다른 단계의 Rule은 유지됩니다.');const rule=current(),assignments=selected.map(p=>{const sku=p.sellpia_sku_code,reference=state.registry.dependencies.find(d=>d.child_sku===sku&&d.rule_id===state.selected);return {sku,rule_id:state.selected,...(reference?{reference}: {})};});await D.assignRules(action,assignments);state.registry=await D.ruleRegistry('list');const calculation=await materialize(selected.map(item=>item.sellpia_sku_code),{sources:sourcesForRules([rule]),reason:`rule-${action}:${rule.id}`});renderBulk();if($('target'))updateRuleScopes();status(`${selected.length} SKU ${action==='apply'?'적용':'선택 Rule 제거'} 완료 · ${calculationState(calculation)}`);$('drawer-status').textContent=$('status').textContent;await preview();g.dispatchEvent(new CustomEvent('hub-rules-changed',{detail:{persisted:true}}));}
 function renderDependencies(){ $('content').innerHTML=`<section class="rw-page"><div class="rw-bar"><h3>종속관계 · 필드 참조</h3><button class="btn" id="rw-dep-import">엑셀 일괄등록</button><button class="btn primary" id="rw-dep-new">새 종속관계</button></div><div class="rw-scroll"><table><thead><tr><th>상위 SKU</th><th>참조 필드</th><th>→ 하위 SKU</th><th>적용 필드</th><th>적용 Rule</th><th>상태</th></tr></thead><tbody>${state.registry.dependencies.map((d,i)=>`<tr data-dep="${i}" tabindex="0"><td>${esc(d.parent_sku)}</td><td>${esc(fieldLabels[d.source_field])}</td><td>→ ${esc(d.child_sku)}</td><td>${esc(fieldLabels[d.target_field])}</td><td>${esc(name(d.rule_id))}</td><td>${d.relation_valid===false?'관계 해제':'정상'}</td></tr>`).join('')}</tbody></table></div></section>`;$('dep-new').onclick=()=>openDependency();$('dep-import').onclick=openDependencyImport;$('content').querySelectorAll('[data-dep]').forEach(r=>{r.onclick=()=>openDependency(state.registry.dependencies[Number(r.dataset.dep)]);r.onkeydown=e=>{if(e.key==='Enter')r.click();};}); }
 function dependencyRuleOptions(id){return option(Object.fromEntries(state.registry.rules.filter(r=>r.input_origin==='parent').map(r=>[r.id,r.name])),id);}
 function openDependency(d={}){drawer('종속관계 설정',`<div class="rw-fields"><label>상위 SKU<input id="rw-dep-parent" value="${esc(d.parent_sku)}"></label><label>참조 필드<select id="rw-dep-source">${option(fieldLabels,d.source_field||'calculated_base_price')}</select></label><label>참조 판매처<select id="rw-dep-source-scope">${option({'':'적용 판매처와 같음',...sources},d.source_scope||'')}</select></label><label>하위 SKU<input id="rw-dep-child" value="${esc(d.child_sku)}"></label><label>적용 Rule<select id="rw-dep-rule">${dependencyRuleOptions(d.rule_id)}</select></label><label>적용 위치<input id="rw-dep-target" readonly></label></div><div class="rw-bar"><button class="btn primary" id="rw-dep-save">저장</button></div>`);const update=()=>{$('dep-target').value=M.fields[state.registry.rules.find(r=>r.id===$('dep-rule').value)?.target_field]||'상위 SKU 입력 Rule을 먼저 생성하세요.';};update();$('dep-rule').onchange=update;$('dep-save').onclick=()=>run(async()=>{const child=$('dep-child').value.trim(),rule=state.registry.rules.find(item=>item.id===$('dep-rule').value);await D.assignRules('apply',[{sku:child,rule_id:rule.id,reference:{parent_sku:$('dep-parent').value.trim(),source_field:$('dep-source').value,source_scope:M.isPlatform($('dep-source').value)?$('dep-source-scope').value:'',create_relation:true}}]);await refresh();const calculation=await materialize([child],{sources:sourcesForRules([rule]),reason:`dependency-save:${child}`});$('backdrop').hidden=true;status(`종속관계 저장 완료 · 영향 ${calculation.totalSkus.toLocaleString('ko-KR')}개 가격 저장`);g.dispatchEvent(new CustomEvent('hub-rules-changed',{detail:{persisted:true}}));});}
  function openDependencyImport(){drawer('종속관계 엑셀 일괄등록',`<div class="rw-rule-summary">상위 SKU | 참조 필드 | 하위 SKU | 적용 필드 | Rule 이름 또는 ID</div><div class="rw-bar"><input id="rw-dep-file" type="file" accept=".xlsx,.xls,.csv" aria-label="종속관계 엑셀 업로드"><button class="btn" id="rw-dep-parse">미리보기</button></div><textarea id="rw-dep-paste" placeholder="parent_sku\tsource_field\tchild_sku\ttarget_field\trule_id" aria-label="종속관계 붙여넣기"></textarea><div class="rw-scroll"><table><thead><tr><th>상위</th><th>참조 필드</th><th>하위</th><th>적용 필드</th><th>Rule</th><th>검사</th></tr></thead><tbody id="rw-dep-import-rows"></tbody></table></div><div class="rw-bar"><button class="btn primary" id="rw-dep-import-save" disabled>검사된 관계 등록</button></div>`);let entries=[];$('dep-file').onchange=()=>run(async()=>{$('dep-paste').value=(await fileRows($('dep-file').files[0])).map(r=>r.join('\t')).join('\n');});$('dep-parse').onclick=()=>run(async()=>{const rows=$('dep-paste').value.trim().split(/\r?\n/).map(l=>l.split(/\t|,/).map(x=>x.trim())).filter(r=>r[0]&&!['parent_sku','상위 SKU'].includes(r[0]));entries=rows.map(r=>{const rule=state.registry.rules.find(x=>x.id===r[4]||x.name===r[4]);return {sku:r[2],rule_id:rule?.id,reference:{parent_sku:r[0],source_field:r[1],target_field:r[3],source_scope:r[5]||'',create_relation:true},error:!rule?'없는 Rule':rule.input_origin!=='parent'?'상위 입력 Rule 필요':rule.target_field!==r[3]?'적용 필드 불일치':''};});const products=Object.fromEntries((await D.loadFormulaProducts([...new Set(entries.flatMap(e=>[e.sku,e.reference.parent_sku]))])).map(p=>[p.sellpia_sku_code,p]));for(const e of entries){if(!products[e.sku]||!products[e.reference.parent_sku])e.error='없는 SKU';if(e.sku===e.reference.parent_sku)e.error='자기 참조';}if(!entries.some(e=>e.error)){try{const changes=entries.map(e=>({...e,target_field:e.reference.target_field,scope:state.registry.rules.find(r=>r.id===e.rule_id).scope}));const assignments=[...state.registry.assignments,...changes.filter(e=>!state.registry.assignments.some(a=>a.sku===e.sku&&a.rule_id===e.rule_id))];const dependencies=[...state.registry.dependencies.filter(d=>!changes.some(e=>e.sku===d.child_sku&&e.rule_id===d.rule_id&&e.reference.parent_sku===d.parent_sku)),...changes.map(e=>({...e.reference,child_sku:e.sku,rule_id:e.rule_id,scope:e.scope}))];validateGraphLinks(assignments,dependencies);}catch(error){entries.forEach(e=>e.error=error.message);}}$('dep-import-rows').innerHTML=entries.map(e=>`<tr>${[e.reference.parent_sku,e.reference.source_field,e.sku,e.reference.target_field,name(e.rule_id),e.error||'정상'].map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('');$('dep-import-save').disabled=!entries.length||entries.some(e=>e.error);});$('dep-paste').oninput=()=>{$('dep-import-save').disabled=true;};$('dep-import-save').onclick=()=>run(async()=>{const payload=entries.map(({error,...entry})=>entry),children=payload.map(entry=>entry.sku),rules=payload.map(entry=>state.registry.rules.find(rule=>rule.id===entry.rule_id)).filter(Boolean);await D.assignRules('apply',payload);await refresh();const calculation=await materialize(children,{sources:sourcesForRules(rules),reason:'dependency-import'});$('backdrop').hidden=true;status(`종속관계 ${payload.length.toLocaleString('ko-KR')}개 등록 · 영향 ${calculation.totalSkus.toLocaleString('ko-KR')}개 가격 저장`);g.dispatchEvent(new CustomEvent('hub-rules-changed',{detail:{persisted:true}}));});}

 function validateGraphLinks(assignments,dependencies){
  const slots=new Map(),refs=new Map(),edges=new Map();
  for(const d of dependencies){const k=M.key(d.child_sku,d.target_field,d.scope);if(refs.has(k))throw Error(d.child_sku+': 같은 단계에 상위 참조가 여러 개입니다.');if(d.parent_sku===d.child_sku)throw Error('자기 참조');if(!M.fields[d.source_field])throw Error('알 수 없는 참조 필드');refs.set(k,d);}
  for(const a of assignments){const k=M.key(a.sku,a.target_field,a.scope);if(slots.has(k))throw Error(a.sku+': 같은 단계 Rule 충돌');slots.set(k,a);const r=state.registry.rules.find(r=>r.id===a.rule_id);if(!r)throw Error('없는 Rule');const d=refs.get(k);if(r.input_origin==='parent'&&!d)throw Error(a.sku+': 상위 참조 없음');const field=d?.source_field||r.source_field;edges.set(k,M.key(d?.parent_sku||a.sku,field,M.isPlatform(field)?d?.source_scope||r.source_scope||r.scope:''));}
  for(const sku of new Set(assignments.map(a=>a.sku))){const inbound=M.key(sku,'actual_inbound_cost'),basis=M.key(sku,'basis_sku_price'),base=M.key(sku,'calculated_base_price');if(slots.has(inbound)&&!slots.has(basis))edges.set(basis,inbound);if((slots.has(inbound)||slots.has(basis))&&!slots.has(base))edges.set(base,basis);}
  const done=new Set();function visit(k,path=[]){if(path.includes(k)||path.length>=64)throw Error('필드 참조 순환 또는 64단계 초과');if(done.has(k))return;if(edges.has(k))visit(edges.get(k),[...path,k]);done.add(k);}for(const k of edges.keys())visit(k);
 }
 function platformSelectors(){return `<label>판매처<select id="rw-platform-source">${option(sources,'ably')}</select></label><label>대상 SKU 목록<input id="rw-platform-skus" placeholder="SKU를 쉼표로 구분" value="${esc(state.requested.join(', '))}"></label>`;}
 function renderPlatform(){ $('content').innerHTML=`<section class="rw-page"><div class="rw-config">${platformSelectors()}<label>상품가격 기준<select id="rw-anchor">${option({lowest:'전체 옵션 중 최저가',middle:'전체 옵션 중 중간가격'},'lowest')}</select></label><label>등록가격 Rule<select id="rw-registration"></select></label><label>할인 Rule<select id="rw-discount"></select></label><label>계산 방식<select id="rw-mode">${option({reverse:'자동 역산 · 목표 최종가 유지',forward:'등록가격 수식 적용 후 할인'},'reverse')}</select></label><label>옵션가 계산<input readonly value="각 옵션 계산가 − 상품 기준가"></label></div><div class="rw-bar"><button class="btn" id="rw-edit-registration">등록 Rule 편집</button><button class="btn" id="rw-edit-discount">할인 Rule 편집</button><button class="btn" id="rw-platform-save">판매처 설정 저장</button><button class="btn" id="rw-platform-refresh-all">전체 저장가격 갱신</button><button class="btn primary" id="rw-platform-preview">입력 SKU 계산·저장</button></div><div class="rw-scroll"><table><thead><tr><th>SKU</th><th>내부 기준가격</th><th>플랫폼 상품가격</th><th>옵션가</th><th>할인</th><th>최종가격</th><th>상태</th></tr></thead><tbody id="rw-platform-rows"></tbody></table></div></section>`;$('platform-source').onchange=()=>run(loadPlatform);$('platform-save').onclick=()=>run(savePlatform);$('platform-preview').onclick=()=>run(platformPreview);$('platform-refresh-all').onclick=()=>run(materializeAll);for(const kind of ['registration','discount'])$('edit-'+kind).onclick=()=>{const id=$(kind).value;if(!id){status('편집할 Rule을 선택하세요.');return;}state.tab='rules';state.selected=id;renderTab();};void loadPlatform().catch(e=>status(e.message));}
 async function loadPlatform(){const source=$('platform-source').value;state.platformDoc=await g.HubPlatformRules.settings(source);const f=state.platformDoc.body;for(const kind of ['registration','discount'])$(kind).innerHTML='<option value="">'+(kind==='discount'?'원본 할인 유지':'내부 기준가 그대로')+'</option>'+option(Object.fromEntries(state.registry.rules.filter(r=>r.scope===source&&r.target_field==='platform_'+kind+'_price'&&r.input_origin==='self').map(r=>[r.id,r.name])),f[kind+'_rule_id']);$('anchor').value=f.anchor;$('mode').value=f.mode;}
 async function savePlatform(){const source=$('platform-source').value;state.platformDoc=await D.workDocument('save','formula',{...state.platformDoc,title:'registry-platform:'+source,body:{source,anchor:$('anchor').value,mode:$('mode').value,registration_rule_id:$('registration').value||null,discount_rule_id:$('discount').value||null}});const skus=await allSkus(),calculation=await materialize(skus,{sources:[source],reason:`platform-settings:${source}`});status(`판매처 Rule 연결 저장 완료 · ${calculationState(calculation)}`);g.dispatchEvent(new CustomEvent('hub-rules-changed',{detail:{persisted:true}}));if(skuText($('platform-skus').value).length)await showStoredPlatformRows();}
 async function materializeAll(){const skus=await allSkus(),calculation=await materialize(skus,{reason:'manual-full-price-refresh'});status(`전체 저장가격 갱신 완료 · 영향 ${calculation.totalSkus.toLocaleString('ko-KR')}개 SKU · 오류값 ${calculation.errorRows.toLocaleString('ko-KR')}개`);g.dispatchEvent(new CustomEvent('hub-rules-changed',{detail:{persisted:true}}));if(skuText($('platform-skus').value).length)await showStoredPlatformRows();}
 async function showStoredPlatformRows(){
  const source=$('platform-source').value,requested=skuText($('platform-skus').value),siblings=await D.loadRulePlatformSiblings(requested,source),displaySkus=[...new Set([...requested,...siblings])];
  const [stored,internal]=await Promise.all([D.loadStoredMatrixPrices({sources:[source],skus:displaySkus}),D.loadCalculatedResults({skus:displaySkus,scope:'',fields:['calculated_base_price']})]);
  const internalBySku=new Map(internal.rows.map(row=>[row.sku,row])),missing=new Map(stored.missing.map(row=>[row.sellpia_sku_code,row]));
  const rows=[...stored.rows,...displaySkus.filter(sku=>!stored.rows.some(row=>row.sellpia_sku_code===sku)).map(sku=>({sellpia_sku_code:sku,error:missing.get(sku)?.reason||'저장값 없음'}))];
  $('platform-rows').innerHTML=rows.map(row=>`<tr>${[row.sellpia_sku_code,money(internalBySku.get(row.sellpia_sku_code)?.value),money(row.base_price),money(row.option_price),row.base_price!=null&&row.discounted_base_price!=null?'−'+money(Number(row.base_price)-Number(row.discounted_base_price)):'—',money(row.final_price),row.error||internalBySku.get(row.sellpia_sku_code)?.error||'정상'].map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('');status(`${stored.rows.length} SKU 저장 가격 조회 · 누락 ${stored.missing.length}`);
 }
 async function platformPreview(){state.requested=skuText($('platform-skus').value);if(!state.requested.length)throw Error('대상 SKU를 입력하세요.');const source=$('platform-source').value,calculation=await materialize(state.requested,{sources:[source],reason:`platform-preview:${source}`});await showStoredPlatformRows();status(`${calculation.totalSkus.toLocaleString('ko-KR')}개 영향 SKU 계산·저장 · 오류값 ${calculation.errorRows.toLocaleString('ko-KR')}개`);g.dispatchEvent(new CustomEvent('hub-rules-changed',{detail:{persisted:true}}));}
 async function exportTargetSkus(){
  if($('export-scope').value!=='assigned')return skuText($('platform-skus').value);
  const source=$('platform-source').value,candidates=[...new Set(state.registry.assignments.filter(a=>!a.scope||a.scope===source).map(a=>a.sku))];
  if(!candidates.length)return [];
  if(typeof D.filterRulePlatformSkus!=='function')throw Error('판매처 연결 SKU 조회 기능을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.');
  return D.filterRulePlatformSkus(candidates,source);
 }
 async function prepareStoredExport(){
  const source=$('platform-source').value,skus=await exportTargetSkus();if(!skus.length)throw Error('내보낼 SKU가 없습니다. 대상 SKU를 입력하거나 적용된 전체 SKU를 선택하세요.');
  status('최신 보관 원본을 불러오는 중…');const files=await D.downloadLatestSellerOriginals([source],progress=>status(`원본 파일 ${progress.completed||0} / ${progress.total||0}개 불러오는 중`));
  const selectedName=$('export-file').value,selectedFiles=(files.get(source)||[]).filter(file=>!selectedName||file.name===selectedName);if(!selectedFiles.length)throw Error('선택한 최신 원본 파일을 확인하지 못했습니다.');
  const filesBySource=new Map([[source,selectedFiles]]);status('매트릭스에 저장된 가격을 읽어 원본 행과 연결하는 중…');
  const refreshed=await g.HubCurrentPriceExport.refreshItems([],filesBySource,{sources:[source],skus,includeRules:true,onProgress:status});
  return {source,skus,filesBySource,...refreshed};
 }
 async function previewStoredExport(){
  const prepared=await prepareStoredExport(),rows=prepared.items.filter(item=>item.field_key==='sellpia_sale_price'&&!item.preserve_unmapped);
  const previewRows=[
   ...rows.map(item=>({sku:item.sellpia_sku_code,before:item.before_value,after:item.after_value,detail:[[item.base_price,item.target_base_price,'등록가격'],[item.option_price,item.target_option_price,'옵션가'],[item.before_value,item.after_value,'최종가격']].filter(([before,after])=>before==null||Number(before)!==Number(after)).map(([, ,label])=>label).join(' / ')||'변경 없음'})),
   ...prepared.excludedItems.map(entry=>({sku:entry.item?.sellpia_sku_code||'',before:'—',after:'—',detail:'제외 · '+entry.reason}))
  ];
  $('export-rows').innerHTML=previewRows.map(row=>`<tr>${[row.sku,money(row.before),money(row.after),row.detail].map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="4" class="rw-empty">연결된 저장 가격이 없습니다.</td></tr>';
  status(`저장 가격 미리보기 · 적용 ${rows.length.toLocaleString('ko-KR')}건 · 제외 ${prepared.excludedItems.length.toLocaleString('ko-KR')}건`);
 }
 async function runStoredExport(){
  const prepared=await prepareStoredExport();status('저장 가격을 최신 원본 양식에 기록하는 중…');
  const result=await g.HubCurrentPriceExport.buildArchive(prepared.filesBySource,prepared.items,(percent,detail)=>status(`${Math.round(percent)}% · ${detail}`),prepared.excludedItems);
  const applied=result.appliedItems.filter(item=>item.stored_matrix_price&&!item.preserve_unmapped&&item.sellpia_sku_code),versions=[...new Map(applied.flatMap(item=>item.rule_versions||[]).map(version=>[version.id,version])).values()];
  await D.workDocument('save','formula',{title:'registry-export:'+g.crypto.randomUUID(),body:{source:prepared.source,created_at:new Date().toISOString(),rule_versions:versions,generation_ids:[...new Set(applied.map(item=>item.generation_id).filter(Boolean))],sku_count:new Set(applied.map(item=>item.sellpia_sku_code)).size,manifest:result.manifest,skipped_count:result.skippedItems.length}});
  g.SystemV3SellerExport.downloadBlob(result.blob,`SystemV3_${prepared.source}_저장가격_${new Date().toISOString().slice(0,10)}.zip`);status(`XLSX 생성 완료 · 저장 가격 반영 ${applied.length.toLocaleString('ko-KR')}건 · 제외 ${result.skippedItems.length.toLocaleString('ko-KR')}건`);await loadHistory();
 }
 function renderExport(){
  $('content').innerHTML=`<section class="rw-page"><div class="rw-config">${platformSelectors()}<label>대상 범위<select id="rw-export-scope">${option({entered:'입력 SKU와 같은 상품의 전체 옵션',assigned:'규칙이 적용된 전체 SKU'},'entered')}</select></label><label>원본 파일<select id="rw-export-file"><option value="">최신 보관 원본 전체</option></select></label></div><p class="rw-stage-note">내보내기에서는 수식을 다시 계산하지 않습니다. 매트릭스에 저장된 판매처 가격을 결과만 최신 보관 원본 양식에 기록합니다.</p><div class="rw-bar"><button class="btn" id="rw-export-preview">원본값 / 저장값 미리보기</button><button class="btn primary" id="rw-export-run">저장값으로 XLSX 생성</button></div><div class="rw-scroll"><table><thead><tr><th>SKU</th><th>원본값</th><th>저장값</th><th>변경 항목</th></tr></thead><tbody id="rw-export-rows"></tbody></table><h3 style="padding:14px">최근 생성 이력</h3><table><thead><tr><th>생성 시각</th><th>판매처</th><th>SKU</th><th>적용 Rule 버전</th></tr></thead><tbody id="rw-history"></tbody></table></div></section>`;
  $('export-preview').onclick=()=>run(previewStoredExport);$('export-run').onclick=()=>run(runStoredExport);$('platform-source').onchange=()=>run(loadOriginals);void (async()=>{await loadOriginals();await loadHistory();})().catch(error=>status(error.message));
 }
 async function loadOriginals(){const files=await D.loadLatestSellerOriginalStatus();const source=$('platform-source').value;const entry=files.find(r=>r.source===source);$('export-file').innerHTML='<option value="">최신 보관 원본 전체</option>'+option(Object.fromEntries((entry?.files||[]).map(f=>[f.name,f.name])), '');}
 async function loadHistory(){const docs=(await D.workDocument('list','formula')).filter(d=>d.title.startsWith('registry-export:')).slice(0,20);const history=await Promise.all(docs.map(d=>D.workDocument('get','formula',{id:d.id})));if(!$('history'))return;$('history').innerHTML=history.map(d=>`<tr><td>${esc(d.body.created_at)}</td><td>${esc(sources[d.body.source])}</td><td>${d.body.sku_count}</td><td>${esc((d.body.rule_versions||[]).map(r=>name(r.id)+' v'+r.version).join(', '))}</td></tr>`).join('');}
 $('new').onclick=()=>{readTagContext();state.selected=null;state.tab='rules';renderTab();};$('refresh').onclick=()=>run(refresh);$('close').onclick=()=>{$('backdrop').hidden=true;};$('backdrop').onclick=e=>{if(e.target===$('backdrop'))$('backdrop').hidden=true;};document.addEventListener('keydown',e=>{if(e.key==='Escape')$('backdrop').hidden=true;});document.querySelectorAll('.rw-tabs button').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='bulk'){void run(openBulk);return;}state.tab=b.dataset.tab;renderTab();});
 g.HubPriceWorkspace={refresh:()=>run(refresh),openForTag,state};g.TagPriceWorkspace=g.HubPriceWorkspace;renderTab();
})(window);
