const sourceConfig = {
  sellpia: {name:'셀피아 기준 원본', initial:'S', cls:'sellpia', guide:'행번호가 이어지는 셀피아 파일 3개를 올려주세요.', detail:'분할된 파일 3개 · XLSX 또는 CSV', files:3},
  smartstore: {name:'스마트스토어 상품 원본', initial:'N', cls:'smart', guide:'분할된 스마트스토어 상품 파일 2개를 올려주세요.', detail:'분할된 파일 2개 · XLSX', files:2},
  makeshop: {name:'메이크샵 상품 원본', initial:'M', cls:'make', guide:'메이크샵에서 내려받은 상품 파일 1개를 올려주세요.', detail:'파일 1개 · XLSX 또는 XLS', files:1},
  ably: {name:'에이블리 상품 원본', initial:'A', cls:'ably', guide:'에이블리 GOODS_LIST 파일 1개를 올려주세요.', detail:'파일 1개 · CSV', files:1},
  survey: {name:'재고조사 완료 파일', initial:'#', cls:'sellpia', guide:'담당자가 조사 완료한 재고 파일 1개를 올려주세요.', detail:'파일 1개 · 셀피아 SKU 포함', files:1}
};

const tableSamples = {
  matching: {
    columns:['셀피아 SKU','자사코드','상품명 / 옵션','판매처','연결상태','최근 수정'],
    rows:[
      ['1014-1','[P] C-07-01','NEW 컬러 큐빅 별 피어싱 · 크리스탈','스마트스토어','연결 완료','오늘 12:41'],
      ['11035-124','[P] R-18-24','베이직 링 피어싱 · 실버 8mm','메이크샵','검토 필요','오늘 11:58'],
      ['11246-13','[P] B-04-13','큐빅 바벨 피어싱 · 골드','에이블리','미매칭','오늘 11:42'],
      ['1280-18','[P] S-11-18','심플 미니 큐빅 피어싱 · 라이트핑크','스마트스토어','연결 완료','어제 17:31']]
  },
  inventory: {
    columns:['셀피아 SKU','자사코드','조사수량','피킹완료','미송서랍','실재고','상태'],
    rows:[
      ['1001-1','[P] A-01-01','96','2','0','98','정상'],
      ['10005-1','[P] E-11-01','78','0','1','79','확인 필요'],
      ['1014-1','[P] C-07-01','100','3','0','103','정상'],
      ['11057-4','[P] T-03-04','92','4','1','97','차이 3']]
  },
  channels: {
    columns:['판매처','갱신 항목','대상 행','진행률','마지막 이벤트','DB 저장','상태'],
    rows:[
      ['스마트스토어','재고 · 가격','14,940','100%','오늘 12:41:38','완료','정상'],
      ['메이크샵','재고','28,125','34%','오늘 12:43:02','진행 중','실행 중'],
      ['에이블리','재고','6,610','100%','오늘 12:36:19','완료','정상'],
      ['스마트스토어','가격','14,940','0%','대기','미저장','대기']]
  },
  attributes: {
    columns:['상품코드','대표 상품명','소재','상품군','형태','태그','분류 상태'],
    rows:[
      ['1014','NEW 컬러 큐빅 별 피어싱','써지컬스틸','피어싱','바벨','큐빅, 베스트','확정'],
      ['11035','베이직 링 피어싱','써지컬스틸','피어싱','링','기본, 데일리','확정'],
      ['11246','큐빅 바벨 피어싱','-','피어싱','바벨','신상품','검토 필요'],
      ['1280','심플 미니 큐빅 피어싱','써지컬스틸','피어싱','바벨','미니, 컬러','자동 분류']]
  },
  jobs: {
    columns:['작업 ID','구분','작업 내용','처리량','소요시간','마지막 이벤트','상태'],
    rows:[
      ['JOB-0812-043','메이크샵','원본 정규화 · 재고 갱신','9,518 / 28,125','1분 32초','12:43:02','실행 중'],
      ['JOB-0812-042','스마트스토어','재고 대조','10,096 / 14,040','3분 11초','12:42:48','실행 중'],
      ['JOB-0812-041','셀피아','원본 업로드 · SKU 갱신','27,223 / 27,223','45초','11:39:45','완료'],
      ['JOB-0812-040','메이크샵','가격 반영','7,204 / 28,125','2분 06초','11:31:22','오류']]
  }
};

function statusClass(value) {
  if (/정상|완료|확정/.test(value)) return 'green';
  if (/오류|미매칭|차이/.test(value)) return 'red';
  if (/필요|대기|진행|실행|자동/.test(value)) return 'amber';
  return '';
}

function buildTablePage(id, element) {
  const data = tableSamples[id];
  element.innerHTML = `
    <div class="page-head"><div><h2>${element.dataset.title}</h2><p>${element.dataset.copy}</p></div><div class="mock-badge">UI 목업</div></div>
    <div class="placeholder-toolbar"><input class="search-box" placeholder="SKU / 자사코드 / 상품명 검색"><button class="btn">필터</button><button class="btn">엑셀 내보내기</button><button class="btn primary" data-toast="목업 화면에서는 실행되지 않습니다.">선택 작업 실행</button></div>
    <table class="data-table"><thead><tr>${data.columns.map(col=>`<th>${col}</th>`).join('')}</tr></thead><tbody>${data.rows.map(row=>`<tr>${row.map((cell,index)=>`<td class="${index===0?'code-cell':''}">${index===row.length-1?`<span class="pill ${statusClass(cell)}">${cell}</span>`:cell}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="placeholder-foot">샘플 데이터 4건 · 실제 DB 미연결</div>`;
}

document.querySelectorAll('.table-page').forEach(page => buildTablePage(page.id, page));

const matrixBody = document.getElementById('matrix-body');
const productDrawer = document.getElementById('product-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const changeBar = document.getElementById('change-bar');
const pendingCount = document.getElementById('pending-count');
const changeModal = document.getElementById('change-modal');
const pendingChanges = [];
let pendingChangeBatchId = null;
let sellpiaAutosaveTimer = null;
let sellpiaSaveInFlight = false;
let sellpiaSavingCount = 0;
let sellpiaSaveError = '';
const SELLPIA_AUTOSAVE_DELAY_MS = 450;
const liveData = window.SystemV3Data;
const matrixCsv = window.SystemV3MatrixCsv;
const matrixState = {page:1, search:'', searchSources:['sellpia','smartstore','makeshop','ably'], status:'all', sort:'sku_asc', advancedFilter:{logic:'and', conditions:[]}, total:0, rows:[], loading:false, requestId:0, codeListSkus:[], codeListRows:[], codeListName:''};
const multiLinkState = {page:1, pageSize:50, search:'', source:'all', relationType:'complex', total:0, loading:false, requestId:0, rows:[], selected:null, loaded:false};
const mappingSyncState = {displayedVersion:'', checking:false, autoRefreshing:false, latest:null};
const matrixRowsBySku = new Map();
const drawerState = {
  activeTab:'connections', historyRequestId:0, historySku:'', attributeRequestId:0, priceRequestId:0,
  tags:null, attributeDraft:null, priceRuleTags:[], priceRuleSets:[], priceRuleAssignments:{},
  priceRulePreviews:{}, priceRuleSelections:{}, priceComposers:{}
};
const inventoryState = {loaded:false, loading:false, rows:[], snapshot:null, activityRefreshedAt:'', requestId:0};
const ATTRIBUTE_OPTIONS = Object.freeze({
  material:['14K','925 실버','써지컬','티타늄','아크릴/투명','실버','기타'],
  productGroup:['부품/소모품','피어싱','귀걸이','목걸이','반지','팔찌/발찌','헤어/잡화','기타'],
  shape:['세트','링','바벨/바','볼','진주','큐빅/스톤','투명/리테이너','체인','모티브','기타']
});
const matrixTable = document.querySelector('.matrix-table');
const matrixCellSelection = {anchor:null, focus:null, dragging:false};
const matrixZoomOut = document.getElementById('matrix-zoom-out');
const matrixZoomValue = document.getElementById('matrix-zoom-value');
const matrixZoomIn = document.getElementById('matrix-zoom-in');
const matrixFreezeToggle = document.getElementById('matrix-freeze-toggle');
const MATRIX_ZOOM_KEY = 'system-v3-matrix-zoom';
const MATRIX_FREEZE_KEY = 'system-v3-matrix-sellpia-freeze';
const MATRIX_ZOOM_MIN = 80;
const MATRIX_ZOOM_MAX = 140;
const MATRIX_ZOOM_STEP = 5;
const MATRIX_PRESETS_KEY = 'system-v3-matrix-presets-v1';
const MATRIX_ACTIVE_PRESET_KEY = 'system-v3-matrix-active-preset';
const DEFAULT_VIEW_OPTIONS = {
  channels:{smartstore:true, makeshop:true, ably:true},
  showStatus:true,
  showCodes:true,
  showSellerNames:true,
  showInventory:true,
  showPrice:true,
  showAttributes:true,
  showSync:true,
  wrapNames:false,
  imageSize:'default',
  status:'all',
  sort:'sku_asc',
  advancedFilter:{logic:'and', conditions:[]},
  zoom:100
};
const ADVANCED_FILTER_FIELDS = Object.freeze([
  {group:'셀피아', field:'sellpia_sku_code', label:'셀피아 SKU', type:'text'},
  {group:'셀피아', field:'sellpia_own_code', label:'자사코드', type:'text'},
  {group:'셀피아', field:'sellpia_product_name', label:'상품명', type:'text'},
  {group:'셀피아', field:'sellpia_option_name', label:'옵션명', type:'text'},
  {group:'셀피아', field:'sellpia_current_stock', label:'현재재고', type:'number'},
  {group:'셀피아', field:'sellpia_sale_price', label:'판매가', type:'number'},
  {group:'스마트스토어', field:'smartstore_product_code', label:'상품코드', type:'text'},
  {group:'스마트스토어', field:'smartstore_option_code', label:'옵션코드', type:'text'},
  {group:'스마트스토어', field:'smartstore_name', label:'상품명', type:'text'},
  {group:'스마트스토어', field:'smartstore_option_name', label:'옵션명', type:'text'},
  {group:'스마트스토어', field:'smartstore_stock', label:'판매처재고', type:'number'},
  {group:'스마트스토어', field:'smartstore_price', label:'판매가격', type:'number'},
  {group:'스마트스토어', field:'smartstore_sale_status', label:'판매상태', type:'text'},
  {group:'메이크샵', field:'makeshop_product_code', label:'상품코드', type:'text'},
  {group:'메이크샵', field:'makeshop_option_code', label:'옵션코드', type:'text'},
  {group:'메이크샵', field:'makeshop_name', label:'상품명', type:'text'},
  {group:'메이크샵', field:'makeshop_option_name', label:'옵션명', type:'text'},
  {group:'메이크샵', field:'makeshop_stock', label:'판매처재고', type:'number'},
  {group:'메이크샵', field:'makeshop_price', label:'판매가격', type:'number'},
  {group:'메이크샵', field:'makeshop_sale_status', label:'판매상태', type:'text'},
  {group:'에이블리', field:'ably_product_code', label:'상품코드', type:'text'},
  {group:'에이블리', field:'ably_option_code', label:'옵션코드', type:'text'},
  {group:'에이블리', field:'ably_name', label:'상품명', type:'text'},
  {group:'에이블리', field:'ably_option_name', label:'옵션명', type:'text'},
  {group:'에이블리', field:'ably_stock', label:'판매처재고', type:'number'},
  {group:'에이블리', field:'ably_price', label:'판매가격', type:'number'},
  {group:'에이블리', field:'ably_sale_status', label:'판매상태', type:'text'},
  {group:'운영정보', field:'overall_status', label:'연결상태', type:'status'},
  {group:'속성·태그', field:'material', label:'소재', type:'text'},
  {group:'속성·태그', field:'product_group', label:'상품군', type:'text'},
  {group:'속성·태그', field:'shape', label:'형태', type:'text'},
  {group:'속성·태그', field:'tag_summary', label:'태그', type:'text'}
]);
const ADVANCED_FILTER_OPERATORS = Object.freeze({
  text:[['contains','포함'],['not_contains','미포함'],['eq','같음'],['neq','같지 않음'],['empty','비어 있음'],['not_empty','비어 있지 않음']],
  number:[['gte','이상'],['lte','이하'],['gt','초과'],['lt','미만'],['eq','같음'],['neq','같지 않음'],['empty','비어 있음'],['not_empty','비어 있지 않음']],
  status:[['eq','같음'],['neq','같지 않음']]
});
const BUILTIN_PRESETS = Object.freeze({
  all:{id:'all', name:'전체 현황', ...DEFAULT_VIEW_OPTIONS},
  matching:{id:'matching', name:'매칭 검토', ...DEFAULT_VIEW_OPTIONS, showInventory:false, showPrice:false, showAttributes:false, wrapNames:true, status:'attention'},
  inventory:{id:'inventory', name:'재고 작업', ...DEFAULT_VIEW_OPTIONS, showCodes:false, showSellerNames:false, showPrice:false, showAttributes:false, zoom:110},
  price:{id:'price', name:'가격 작업', ...DEFAULT_VIEW_OPTIONS, showCodes:false, showSellerNames:false, showInventory:false, showAttributes:false, zoom:110},
  attributes:{id:'attributes', name:'속성·태그', ...DEFAULT_VIEW_OPTIONS, channels:{smartstore:false, makeshop:false, ably:false}, showStatus:false, showCodes:false, showSellerNames:false, showInventory:false, showPrice:false, status:'all'}
});

function cloneAdvancedFilter(filter) {
  return {
    logic:String(filter?.logic || 'and').toLowerCase() === 'or' ? 'or' : 'and',
    conditions:Array.isArray(filter?.conditions) ? filter.conditions.map(condition => ({...condition})) : []
  };
}

function cloneView(view) {
  return {...view, channels:{...view.channels}, advancedFilter:cloneAdvancedFilter(view.advancedFilter)};
}

function readCustomPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MATRIX_PRESETS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item?.id && item?.name).map(item => cloneView({...cloneView(DEFAULT_VIEW_OPTIONS), ...item, channels:{...DEFAULT_VIEW_OPTIONS.channels, ...item.channels}})) : [];
  } catch (error) {
    console.warn('matrix preset storage reset', error);
    return [];
  }
}

let customPresets = readCustomPresets();
let activePresetId = localStorage.getItem(MATRIX_ACTIVE_PRESET_KEY) || 'all';
let modifiedPresetSourceId = null;
function findPreset(id) {
  return BUILTIN_PRESETS[id] || customPresets.find(item => item.id === id) || BUILTIN_PRESETS.all;
}
let activeView = cloneView(findPreset(activePresetId));
let matrixZoom = Math.max(MATRIX_ZOOM_MIN, Math.min(MATRIX_ZOOM_MAX, Number(localStorage.getItem(MATRIX_ZOOM_KEY)) || 100));
let matrixSellpiaFrozen = localStorage.getItem(MATRIX_FREEZE_KEY) !== 'off';

function applyMatrixSellpiaFreeze(frozen, {persist = true, announce = false} = {}) {
  matrixSellpiaFrozen = Boolean(frozen);
  matrixTable.classList.toggle('sellpia-unfrozen', !matrixSellpiaFrozen);
  matrixFreezeToggle.classList.toggle('active', matrixSellpiaFrozen);
  matrixFreezeToggle.setAttribute('aria-pressed', String(matrixSellpiaFrozen));
  matrixFreezeToggle.textContent = `셀피아 고정 ${matrixSellpiaFrozen ? 'ON' : 'OFF'}`;
  matrixFreezeToggle.title = matrixSellpiaFrozen
    ? '셀피아 기준 영역을 화면 왼쪽에 고정합니다.'
    : '고정 없이 전체 매트릭스를 좌우로 이동합니다.';
  if (persist) localStorage.setItem(MATRIX_FREEZE_KEY, matrixSellpiaFrozen ? 'on' : 'off');
  if (announce) showToast(matrixSellpiaFrozen ? '셀피아 기준 영역을 다시 고정했습니다.' : '고정을 해제했습니다. 전체 표가 좌우로 함께 움직입니다.');
}

function applyMatrixZoom(value, {persist = true, syncView = true} = {}) {
  matrixZoom = Math.max(MATRIX_ZOOM_MIN, Math.min(MATRIX_ZOOM_MAX, Number(value) || 100));
  matrixTable.style.setProperty('--matrix-zoom', String(matrixZoom / 100));
  matrixZoomValue.textContent = `${matrixZoom}%`;
  matrixZoomOut.disabled = matrixZoom <= MATRIX_ZOOM_MIN;
  matrixZoomIn.disabled = matrixZoom >= MATRIX_ZOOM_MAX;
  if (syncView) activeView.zoom = matrixZoom;
  if (persist) localStorage.setItem(MATRIX_ZOOM_KEY, String(matrixZoom));
}

matrixZoomOut.addEventListener('click', () => { applyMatrixZoom(matrixZoom - MATRIX_ZOOM_STEP); markViewModified(); });
matrixZoomIn.addEventListener('click', () => { applyMatrixZoom(matrixZoom + MATRIX_ZOOM_STEP); markViewModified(); });
matrixZoomValue.addEventListener('click', () => { applyMatrixZoom(100); markViewModified(); });
applyMatrixZoom(matrixZoom, {persist:false, syncView:false});
matrixFreezeToggle.addEventListener('click', () => applyMatrixSellpiaFreeze(!matrixSellpiaFrozen, {announce:true}));
applyMatrixSellpiaFreeze(matrixSellpiaFrozen, {persist:false});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  })[character]);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function formatNullableNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('ko-KR') : '-';
}

function formatLiveTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false
  }).format(date);
}

function viewColumnIndexes(view) {
  const visible = new Set([1,2,3,4,5,6,7]);
  const channelColumns = {
    smartstore:{status:[8], codes:[9,10], names:[11], inventory:[12], price:[13,14,15]},
    makeshop:{status:[16], codes:[17,18], names:[19], inventory:[20], price:[21,22,23]},
    ably:{status:[24], codes:[25,26], names:[27], inventory:[28], price:[29,30,31]}
  };
  Object.entries(channelColumns).forEach(([channel, groups]) => {
    if (!view.channels[channel]) return;
    if (view.showStatus ?? view.showMapping ?? true) groups.status.forEach(index => visible.add(index));
    if (view.showCodes ?? view.showMapping ?? true) groups.codes.forEach(index => visible.add(index));
    if (view.showSellerNames ?? true) groups.names.forEach(index => visible.add(index));
    if (view.showInventory) groups.inventory.forEach(index => visible.add(index));
    if (view.showPrice) groups.price.forEach(index => visible.add(index));
  });
  if (view.showAttributes) [32,33,34].forEach(index => visible.add(index));
  if (view.showSync) visible.add(35);
  return visible;
}

function applyColumnVisibility(view = activeView) {
  const visible = viewColumnIndexes(view);
  const columnHeaders = matrixTable.querySelectorAll('.column-row th');
  for (let index = 3; index <= 35; index += 1) {
    const show = visible.has(index);
    const header = columnHeaders[index - 3];
    if (header) header.hidden = !show;
    matrixBody.querySelectorAll(`tr td:nth-child(${index})`).forEach(cell => { cell.hidden = !show; });
  }
  const groupConfig = [
    ['.smart-group', [8,9,10,11,12,13,14,15]],
    ['.make-group', [16,17,18,19,20,21,22,23]],
    ['.ably-group', [24,25,26,27,28,29,30,31]],
    ['.ops-group', [32,33,34,35]]
  ];
  groupConfig.forEach(([selector, indexes]) => {
    const header = matrixTable.querySelector(selector);
    const count = indexes.filter(index => visible.has(index)).length;
    header.hidden = count === 0;
    if (count) header.colSpan = count;
  });
  const variableColumns = [...visible].filter(index => index > 7).length;
  matrixTable.style.minWidth = `${Math.max(900, 776 + variableColumns * 112)}px`;
  matrixTable.dataset.imageSize = ['compact','default','large'].includes(view.imageSize) ? view.imageSize : 'default';
  matrixTable.classList.toggle('wrap-names', Boolean(view.wrapNames));
}

function renderCustomPresetOptions() {
  const select = document.getElementById('custom-preset-select');
  select.innerHTML = '<option value="">선택</option>' + customPresets.map(preset => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`).join('');
  select.value = customPresets.some(item => item.id === activePresetId) ? activePresetId : '';
}

function setActivePresetUi() {
  document.querySelectorAll('.matrix-view-tabs button[data-preset-id]').forEach(button => {
    const active = button.dataset.presetId === activePresetId;
    button.classList.toggle('active', active);
    button.classList.toggle('custom-active', false);
  });
  renderCustomPresetOptions();
  document.getElementById('view-settings-btn').textContent = activePresetId === 'temporary' ? '보기 설정 · 수정됨' : '보기 설정';
}

function applyViewPreset(view, {id = null, reload = true, announce = true} = {}) {
  activeView = cloneView({...cloneView(DEFAULT_VIEW_OPTIONS), ...view, channels:{...DEFAULT_VIEW_OPTIONS.channels, ...view.channels}});
  if (id) {
    activePresetId = id;
    modifiedPresetSourceId = null;
    localStorage.setItem(MATRIX_ACTIVE_PRESET_KEY, id);
  }
  matrixState.status = activeView.status;
  matrixState.sort = activeView.sort;
  matrixState.advancedFilter = cloneAdvancedFilter(activeView.advancedFilter);
  document.getElementById('matrix-status-filter').value = activeView.status;
  applyMatrixZoom(activeView.zoom, {syncView:false});
  applyColumnVisibility(activeView);
  renderAdvancedFilterBar();
  setActivePresetUi();
  if (reload) loadLiveMatrix({resetPage:true});
  if (announce) showToast(`${activeView.name} 보기를 적용했습니다.`);
}

function saveCustomPresets() {
  localStorage.setItem(MATRIX_PRESETS_KEY, JSON.stringify(customPresets));
  renderCustomPresetOptions();
}

function markViewModified() {
  if (activePresetId === 'temporary') return;
  modifiedPresetSourceId = activePresetId;
  activePresetId = 'temporary';
  localStorage.removeItem(MATRIX_ACTIVE_PRESET_KEY);
  setActivePresetUi();
}

function matrixImage(product) {
  const imageUrl = product.sellpia_override_image_url || product.image_url;
  if (!imageUrl) return '<span class="product-thumb gray">NO</span>';
  const url = escapeHtml(imageUrl);
  return `<span class="product-thumb live-thumb"><img src="${url}" alt="${escapeHtml(product.sellpia_sku_code)} 상품 이미지" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('image-failed');this.remove()"></span>`;
}

function sellpiaEditor(fieldKey, label, value, {number = false, className = ''} = {}) {
  const rawValue = value ?? '';
  const displayValue = number ? formatNullableNumber(rawValue) : (String(rawValue).trim() || '-');
  return `<button class="editable-cell sellpia-edit ${className}" data-source="sellpia" data-field-key="${fieldKey}" data-field="${label}" data-value="${escapeHtml(rawValue)}" data-value-type="${number ? 'number' : 'text'}" aria-keyshortcuts="Control+C Control+V">${escapeHtml(displayValue)}</button>`;
}

function matchState(tier) {
  if (!tier) return {key:'unmatched', label:'미매칭'};
  if (tier === 'FAST_REVIEW') return {key:'review', label:'검토 필요'};
  return {key:'connected', label:'연결 완료'};
}

function mappingCodeButton(product, prefix, label, kind, value, state) {
  const display = escapeHtml(value || '-');
  const prompt = state.key === 'unmatched' ? `${label} 원본에서 연결 상품 찾기` : `${label} 연결 확인·변경`;
  return `<button class="mapping-code-button ${state.key}" data-link-source="${prefix}" data-code-kind="${kind}" title="${prompt}">${display}</button>`;
}

function sellerNameCell(product, prefix) {
  const productName = String(product[`${prefix}_name`] || '').trim();
  const optionName = String(product[`${prefix}_option_name`] || '').trim();
  const isDraft = Boolean(product[`${prefix}_name_is_draft`]);
  if (!productName && !optionName) return '<td class="seller-name-cell data-gap"><span>판매처명 없음</span></td>';
  return `<td class="seller-name-cell${isDraft ? ' draft' : ''}" title="${escapeHtml([productName, optionName].filter(Boolean).join(' · '))}">
    <b>${escapeHtml(productName || '상품명 없음')}${isDraft ? '<i>초안</i>' : ''}</b><em>${escapeHtml(optionName || '옵션명 없음')}</em>
  </td>`;
}

function channelInventoryCells(product, prefix, label) {
  const tier = product[`${prefix}_match_tier`];
  const state = matchState(tier);
  const productCode = product[`${prefix}_product_code`] || '';
  const optionCode = product[`${prefix}_option_code`] || '';
  const listingCount = Number(product[`${prefix}_listing_count`] || 0);
  const title = listingCount > 1 ? ` title="이 SKU에는 ${listingCount}개의 판매처 행이 연결되어 있습니다."` : '';
  const linkBadge = product.__linkBadges?.[prefix];
  const relationLabels = {multi:'1:N', bundle:`조합 ${Number(linkBadge?.max_component_count || 0)}SKU`, multi_bundle:`1:N+조합`};
  const relationBadge = linkBadge && linkBadge.relation_type !== 'single'
    ? `<button class="matrix-relation-badge ${escapeHtml(linkBadge.relation_type)}" data-open-multi-link="${prefix}" data-link-sku="${escapeHtml(product.sellpia_sku_code)}" title="다중·조합 연결 화면에서 확인">${escapeHtml(relationLabels[linkBadge.relation_type] || '다중 연결')}</button>`
    : '';
  const codeCells = `<td class="mapping-code-cell"${title}>${mappingCodeButton(product, prefix, label, 'product', productCode, state)}</td><td class="mapping-code-cell">${mappingCodeButton(product, prefix, label, 'option', optionCode, state)}</td>`;
  const stock = product[`${prefix}_stock`];
  const price = product[`${prefix}_price`];
  const priceComponent = product.__sellerPriceComponents?.[prefix] || {};
  const basePrice = priceComponent.source_base_price ?? product[`${prefix}_base_price`] ?? price;
  const optionPrice = priceComponent.source_option_price ?? product[`${prefix}_option_price`] ?? 0;
  const finalPrice = priceComponent.source_final_price ?? product[`${prefix}_final_price`] ?? price;
  const policyPrice = product[`${prefix}_policy_price`];
  const policyActive = Boolean(product[`${prefix}_policy_active`]);
  const policyName = product[`${prefix}_policy_name`] || '';
  const sellpiaStock = product.sellpia_current_stock;
  const sellpiaPrice = product.sellpia_sale_price;
  const stockDiff = stock !== null && stock !== undefined && sellpiaStock !== null && sellpiaStock !== undefined && Number(stock) !== Number(sellpiaStock);
  const priceDiff = price !== null && price !== undefined && sellpiaPrice !== null && sellpiaPrice !== undefined && Number(price) !== Number(sellpiaPrice);
  const stockDraft = product.__sellerDrafts?.[`${prefix}:sellpia_current_stock`];
  const priceDraft = product.__sellerDrafts?.[`${prefix}:sellpia_sale_price`];
  const stockDisplay = stockDraft ? stockDraft.after_value : stock;
  const draftBasePrice = priceComponent.draft_base_price ?? priceDraft?.price_base_after ?? null;
  const draftOptionPrice = priceComponent.draft_option_price ?? priceDraft?.price_option_after ?? null;
  const draftFinalPrice = priceComponent.draft_final_price ?? priceDraft?.price_final_after ?? priceDraft?.after_value ?? null;
  const effectiveBasePrice = priceDraft ? draftBasePrice : basePrice;
  const effectiveOptionPrice = priceDraft ? draftOptionPrice : optionPrice;
  const effectiveFinalPrice = priceDraft ? draftFinalPrice : finalPrice;
  const draftClass = draft => draft ? ` pending draft-${draft.status}` : '';
  const stockCell = stock === null || stock === undefined
    ? '<td class="data-gap">-</td>'
    : `<td><button class="editable-cell seller-edit${stockDiff && !stockDraft ? ' diff' : ''}${draftClass(stockDraft)}" data-source="${prefix}" data-field-key="sellpia_current_stock" data-field="${label} 재고" data-value="${escapeHtml(stockDisplay)}" data-baseline="${escapeHtml(stock)}" data-value-type="number" data-change-id="${stockDraft?.change_id || ''}" data-draft-status="${stockDraft?.status || ''}" title="${stockDraft ? `수정안 ${formatNullableNumber(stockDisplay)} · 원본 ${formatNullableNumber(stock)}` : '수정 가능한 판매처 재고 · 변경하면 매트릭스 수정안으로 저장됩니다.'}">${formatNullableNumber(stockDisplay)}</button></td>`;
  const componentLayer = (original, draft) => `<span class="price-layer original"><span>원본</span><b>${formatNullableNumber(original)}</b></span>${priceDraft ? `<span class="price-layer draft"><span>수정</span><b>${formatNullableNumber(draft)}</b></span>` : ''}`;
  const noPrice = finalPrice === null || finalPrice === undefined;
  const baseCell = noPrice
    ? '<td class="data-gap">-</td>'
    : `<td class="price-component-cell derived" title="최종판가 - 옵션가로 자동 계산됩니다.">${componentLayer(basePrice, effectiveBasePrice)}</td>`;
  const optionCell = noPrice
    ? '<td class="data-gap">-</td>'
    : prefix === 'ably'
      ? `<td class="price-component-cell derived" title="에이블리는 별도 옵션가를 사용하지 않습니다.">${componentLayer(optionPrice, effectiveOptionPrice)}</td>`
      : `<td><button class="editable-cell seller-edit price-layer-cell price-component-option${draftClass(priceDraft)}" data-source="${prefix}" data-field-key="sellpia_sale_price" data-price-component="option" data-field="${label} 옵션가" data-value="${escapeHtml(effectiveOptionPrice)}" data-baseline="${escapeHtml(optionPrice)}" data-target-final="${escapeHtml(effectiveFinalPrice)}" data-value-type="signed-number" data-change-id="${priceDraft?.change_id || ''}" data-draft-status="${priceDraft?.status || ''}" title="옵션가를 바꾸면 최종판가는 유지되고 판매가가 자동 계산됩니다.">${componentLayer(optionPrice, effectiveOptionPrice)}</button></td>`;
  const finalLayers = `<span class="price-layer original"><span>원본</span><b>${formatNullableNumber(finalPrice)}</b></span>${policyActive && policyPrice !== null && policyPrice !== undefined ? `<span class="price-layer policy"><span>수식</span><b>${formatNullableNumber(policyPrice)}</b></span>` : ''}${priceDraft ? `<span class="price-layer draft"><span>수정</span><b>${formatNullableNumber(effectiveFinalPrice)}</b></span>` : ''}`;
  const finalCell = noPrice
    ? '<td class="data-gap">-</td>'
    : `<td><button class="editable-cell seller-edit price-hover-target price-layer-cell price-component-final${priceDiff && !priceDraft ? ' diff' : ''}${draftClass(priceDraft)}" data-source="${prefix}" data-field-key="sellpia_sale_price" data-price-component="final" data-field="${label} 최종판가" data-value="${escapeHtml(effectiveFinalPrice)}" data-baseline="${escapeHtml(finalPrice)}" data-option-price="${escapeHtml(effectiveOptionPrice)}" data-value-type="number" data-change-id="${priceDraft?.change_id || ''}" data-draft-status="${priceDraft?.status || ''}" tabindex="0" data-price-source="${prefix}" data-price-label="${label}" data-original-price="${escapeHtml(finalPrice)}" data-policy-price="${escapeHtml(policyPrice ?? '')}" data-policy-active="${policyActive ? 'true' : 'false'}" data-policy-name="${escapeHtml(policyName)}" data-draft-price="${escapeHtml(effectiveFinalPrice ?? '')}" data-base-price="${escapeHtml(sellpiaPrice ?? '')}" data-price-updated="${escapeHtml(product[`${prefix}_inventory_at`] || '')}" title="${priceDraft ? `반영 예정 ${formatNullableNumber(effectiveFinalPrice)} · 원본 ${formatNullableNumber(finalPrice)}` : policyActive ? `원본 ${formatNullableNumber(finalPrice)} · 수식 계산 ${formatNullableNumber(policyPrice)}` : '수정 가능한 판매처 최종판가'}">${finalLayers}</button></td>`;
  return `<td><span class="matrix-status ${state.key}">${state.label}</span>${relationBadge}</td>${codeCells}${sellerNameCell(product, prefix)}${stockCell}${baseCell}${optionCell}${finalCell}`;
}

function codeListSourceLabel(source) {
  return {sellpia:'셀피아', smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리'}[source] || source || '판매처 확인 필요';
}

function codeListPlaceholderSellerCells(codeRow, source) {
  if (codeRow.source_channel !== source) return '<td class="data-gap">-</td>'.repeat(8);
  const reason = escapeHtml(codeRow.reason || codeListIssueLabel(codeRow.match_status));
  const inputCode = escapeHtml(codeRow.input_code || '-');
  const state = codeRow.match_status === 'unmapped' ? 'review' : 'unmatched';
  return `<td><span class="matrix-status ${state}">${reason}</span></td>
    <td class="code-list-placeholder-code" title="${inputCode}">${inputCode}</td>
    <td class="data-gap">-</td>
    <td class="product-cell"><b>원본 코드 연결 대기</b><em>${escapeHtml(codeListSourceLabel(source))}</em></td>
    <td class="data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td>`;
}

function renderCodeListPlaceholderRow(product) {
  const codeRow = product.__codeList || {};
  const rowNo = Math.max(1, Number(codeRow.input_row) || 1);
  const sourceLabel = escapeHtml(codeListSourceLabel(codeRow.source_channel));
  const inputCode = escapeHtml(codeRow.input_code || '-');
  const reasonText = codeRow.reason || (codeRow.match_status === 'matched' ? '상품 정보 없음' : codeListIssueLabel(codeRow.match_status));
  const reason = escapeHtml(reasonText);
  const state = codeRow.match_status === 'unmapped' ? 'review' : 'unmatched';
  return `<tr class="code-list-placeholder-row" data-input-row="${rowNo}" data-status="${state}">
    <td class="sticky-col select-col"><input class="row-check" type="checkbox" disabled aria-label="엑셀 ${rowNo}행 선택 불가"></td>
    <td class="sticky-col image-col"><span class="code-list-placeholder-symbol">!</span></td>
    <td class="sticky-col sku-col code-list-sku-cell"><b>엑셀 ${rowNo}행</b><em>${reason}</em></td>
    <td class="sticky-col own-code-col data-gap">-</td>
    <td class="sticky-col sellpia-name-col product-cell"><b title="${inputCode}">${inputCode}</b><em>${sourceLabel} · ${reason}</em></td>
    <td class="sticky-col sellpia-stock-col data-gap">-</td><td class="sticky-col sellpia-price-col data-gap">-</td>
    ${codeListPlaceholderSellerCells(codeRow, 'smartstore')}
    ${codeListPlaceholderSellerCells(codeRow, 'makeshop')}
    ${codeListPlaceholderSellerCells(codeRow, 'ably')}
    <td class="data-gap">-</td><td class="data-gap">-</td><td><span class="tag ${state === 'review' ? 'review-tag' : ''}">${reason}</span></td><td>엑셀 ${rowNo}행</td>
  </tr>`;
}

function renderLiveMatrixRows(products) {
  clearMatrixCellSelection();
  matrixRowsBySku.clear();
  if (!products.length) {
    matrixBody.innerHTML = '<tr class="matrix-empty-row"><td colspan="35"><b>검색 결과가 없습니다.</b><span>SKU 또는 자사코드를 다시 확인해주세요.</span></td></tr>';
    return;
  }
  matrixBody.innerHTML = products.map(product => {
    if (product.__codeListPlaceholder) return renderCodeListPlaceholderRow(product);
    matrixRowsBySku.set(product.sellpia_sku_code, product);
    const sku = escapeHtml(product.sellpia_sku_code);
    const codeRow = product.__codeList || null;
    const inputRow = codeRow ? Math.max(1, Number(codeRow.input_row) || 1) : null;
    const skuMarkup = codeRow ? `<span class="code-list-sku-cell"><b>${sku}</b><em>엑셀 ${inputRow}행</em></span>` : sku;
    const rawOwnCode = product.sellpia_own_code || product.own_code || '';
    const ownCode = escapeHtml(rawOwnCode || '-');
    const liveImageUrl = product.sellpia_override_image_url || product.image_url || '';
    const imageUrl = escapeHtml(liveImageUrl);
    const tiers = [product.smartstore_match_tier, product.makeshop_match_tier, product.ably_match_tier];
    const connectedCount = tiers.filter(Boolean).length;
    const overallState = product.overall_status || (connectedCount === 0 ? 'unmatched' : tiers.includes('FAST_REVIEW') ? 'review' : 'connected');
    const rawDisplayName = product.sellpia_product_name || product.display_name || '';
    const rawOptionName = product.sellpia_option_name || '';
    const displayName = escapeHtml(rawDisplayName || '상품명 원본 적재 대기');
    const optionName = escapeHtml(rawOptionName || '셀피아 옵션명 적재 대기');
    const sellpiaStock = formatNullableNumber(product.sellpia_current_stock);
    const sellpiaPrice = formatNullableNumber(product.sellpia_sale_price);
    const mappingTag = overallState === 'review' ? '<span class="tag review-tag">검토 필요</span>' : `<span class="tag">${connectedCount}처 연결</span>`;
    const profile = product.__profile || {};
    const tagSummary = [profile.shape, profile.tag_summary].filter(Boolean).join(' · ');
    return `<tr data-sku="${sku}" data-own-code="${ownCode}" data-image="${imageUrl}" data-status="${overallState}"${inputRow ? ` data-input-row="${inputRow}"` : ''}>
      <td class="sticky-col select-col"><input class="row-check" type="checkbox" aria-label="${sku} 선택"></td>
      <td class="sticky-col image-col image-drop-cell" data-image-drop="${sku}" title="이미지를 이 셀에 놓으면 ${sku}.jpg로 저장됩니다.">${matrixImage(product)}<span class="image-drop-hint">DROP</span></td>
      <td class="sticky-col sku-col code-cell">${skuMarkup}</td>
      <td class="sticky-col own-code-col">${sellpiaEditor('sellpia_own_code', '셀피아 자사코드', rawOwnCode, {className:'sellpia-text-compact'})}</td>
      <td class="sticky-col sellpia-name-col product-cell"><b title="${displayName}">${displayName}</b><em title="${optionName}">${optionName}</em></td>
      <td class="sticky-col sellpia-stock-col number-cell${sellpiaStock === '-' ? ' data-gap' : ''}">${sellpiaEditor('sellpia_current_stock', '셀피아 현재재고', product.sellpia_current_stock, {number:true})}</td>
      <td class="sticky-col sellpia-price-col number-cell${sellpiaPrice === '-' ? ' data-gap' : ''}">${sellpiaEditor('sellpia_sale_price', '셀피아 판매가', product.sellpia_sale_price, {number:true})}</td>
      ${channelInventoryCells(product, 'smartstore', '스마트스토어')}
      ${channelInventoryCells(product, 'makeshop', '메이크샵')}
      ${channelInventoryCells(product, 'ably', '에이블리')}
      <td class="profile-cell${profile.material ? '' : ' data-gap'}">${escapeHtml(profile.material || '-')}</td><td class="profile-cell${profile.product_group ? '' : ' data-gap'}">${escapeHtml(profile.product_group || '-')}</td><td class="profile-tags-cell">${tagSummary ? `<span class="tag" title="${escapeHtml(tagSummary)}">${escapeHtml(tagSummary)}</span>` : mappingTag}</td><td>${formatLiveTime(profile.updated_at || product.sellpia_override_updated_at || product.updated_at)}</td>
    </tr>`;
  }).join('');
  applyColumnVisibility(activeView);
}

function setMatrixConnection(state, label) {
  const badge = document.getElementById('matrix-live-status');
  badge.className = `live-data-badge ${state}`;
  badge.textContent = label;
}

function renderMappingSyncStatus(status, state = '') {
  const panel = document.getElementById('matrix-mapping-sync');
  const label = document.getElementById('matrix-mapping-sync-state');
  const detail = document.getElementById('matrix-mapping-sync-detail');
  const time = document.getElementById('matrix-mapping-sync-time');
  if (!panel || !label || !detail || !time) return;
  const official = Number(status?.official_mapping_count || 0);
  const manual = Number(status?.manual_mapping_count || 0);
  const automatic = Number(status?.automatic_mapping_count || 0);
  const failed = Number(status?.latest_batch_failed_count || 0);
  const visibleAt = status?.latest_official_mapping_at || status?.core_refreshed_at;
  panel.className = `matrix-mapping-sync ${state || 'checking'}`;
  if (state === 'pending') {
    label.textContent = '코어 갱신 대기';
    detail.textContent = status?.legacy_auto_refresh_enabled
      ? '레거시 매핑 저장 완료 · 1분 내 코어 자동 갱신 예정입니다.'
      : '레거시 매핑 DB 저장은 완료됐지만 매트릭스 코어 갱신이 필요합니다.';
  } else if (state === 'changed') {
    label.textContent = mappingSyncState.autoRefreshing ? '화면 갱신 중' : 'DB 변경 감지';
    detail.textContent = mappingSyncState.autoRefreshing
      ? '새 매핑을 현재 매트릭스 페이지에 반영하고 있습니다.'
      : '현재 편집 저장이 끝나는 대로 화면을 자동 갱신합니다.';
  } else if (state === 'error') {
    label.textContent = '상태 확인 오류';
    detail.textContent = status?.message || '매핑 동기화 상태를 읽지 못했습니다.';
  } else {
    label.textContent = '화면 반영 완료';
    detail.textContent = `${formatNumber(official)}건 · 수동 ${formatNumber(manual)} · 자동 ${formatNumber(automatic)}${failed ? ` · 최근 실패 ${formatNumber(failed)}` : ''}${status?.legacy_auto_refresh_enabled ? ' · 레거시 1분 감시' : ''}`;
  }
  const screenAt = matrixState.lastLoadedAt ? formatLiveTime(matrixState.lastLoadedAt) : '-';
  time.textContent = `DB ${visibleAt ? formatLiveTime(visibleAt) : '-'} · 화면 ${screenAt}`;
}

async function loadMappingSyncStatus({markDisplayed = false, autoRefresh = false} = {}) {
  if (!liveData?.loadMappingSyncStatus || mappingSyncState.checking) return mappingSyncState.latest;
  mappingSyncState.checking = true;
  try {
    const status = await liveData.loadMappingSyncStatus();
    mappingSyncState.latest = status;
    const version = String(status?.mapping_version || '');
    const changed = Boolean(mappingSyncState.displayedVersion && version && version !== mappingSyncState.displayedVersion);
    if (status?.core_refresh_needed) {
      renderMappingSyncStatus(status, 'pending');
      return status;
    }
    if (markDisplayed) {
      mappingSyncState.displayedVersion = version;
      renderMappingSyncStatus(status, 'synced');
      return status;
    }
    if (changed && autoRefresh) {
      const canRefresh = !matrixState.loading && !sellpiaSaveInFlight && !pendingChanges.length;
      if (!canRefresh) {
        renderMappingSyncStatus(status, 'changed');
        return status;
      }
      mappingSyncState.autoRefreshing = true;
      renderMappingSyncStatus(status, 'changed');
      if (liveData?.refreshListingGraphCache) await liveData.refreshListingGraphCache();
      const refreshed = await loadLiveMatrix();
      if (refreshed) mappingSyncState.displayedVersion = version;
      mappingSyncState.autoRefreshing = false;
      renderMappingSyncStatus(status, refreshed ? 'synced' : 'error');
      return status;
    }
    renderMappingSyncStatus(status, changed ? 'changed' : 'synced');
    return status;
  } catch (error) {
    console.error('mapping sync status load failed', error);
    renderMappingSyncStatus({message:error?.message || String(error)}, 'error');
    return null;
  } finally {
    mappingSyncState.checking = false;
    mappingSyncState.autoRefreshing = false;
  }
}

async function loadLiveMatrix({resetPage = false} = {}) {
  if (!liveData) return false;
  if (resetPage) matrixState.page = 1;
  const requestId = ++matrixState.requestId;
  matrixState.loading = true;
  setMatrixConnection('loading', 'DB 조회 중');
  matrixBody.innerHTML = '<tr class="matrix-empty-row loading"><td colspan="35"><b>Supabase에서 실제 SKU를 불러오는 중입니다.</b><span>이미지와 자사코드를 함께 연결합니다.</span></td></tr>';
  try {
    const request = {
      page:matrixState.page,
      search:matrixState.search,
      searchSources:matrixState.searchSources,
      status:matrixState.status,
      sort:matrixState.sort,
      skus:matrixState.codeListSkus,
      codeListRows:matrixState.codeListRows,
      advancedFilter:matrixState.advancedFilter
    };
    let result;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        result = await liveData.loadProducts(request);
        break;
      } catch (error) {
        const message = `${error?.code || ''} ${error?.message || error}`.toLowerCase();
        const transient = message.includes('57014')
          || message.includes('statement timeout')
          || message.includes('canceling statement')
          || message.includes('fetch failed')
          || message.includes('failed to fetch');
        if (!transient || attempt > 0 || requestId !== matrixState.requestId) throw error;
        setMatrixConnection('loading', 'DB 재시도 중');
        await new Promise(resolve => setTimeout(resolve, 450));
      }
    }
    if (requestId !== matrixState.requestId) return false;
    matrixState.total = result.count;
    matrixState.rows = result.rows;
    renderLiveMatrixRows(result.rows);
    const first = result.count ? ((result.page - 1) * result.pageSize) + 1 : 0;
    const last = Math.min(result.page * result.pageSize, result.count);
    document.getElementById('matrix-total-count').textContent = formatNumber(result.count);
    document.getElementById('matrix-range').textContent = `${formatNumber(first)}–${formatNumber(last)} / ${formatNumber(result.count)}`;
    document.getElementById('matrix-page').textContent = result.page;
    document.getElementById('matrix-prev').disabled = result.page <= 1;
    document.getElementById('matrix-next').disabled = last >= result.count;
    document.getElementById('select-all-matrix').checked = false;
    updateSelectedCount();
    matrixState.lastLoadedAt = new Date().toISOString();
    setMatrixConnection('connected', matrixState.codeListRows.length
      ? `엑셀 목록 · ${formatNumber(result.count)} 결과 행`
      : `LIVE · ${formatNumber(result.count)} SKU`);
    return true;
  } catch (error) {
    console.error('operations hub matrix load failed', error);
    matrixBody.innerHTML = '<tr class="matrix-empty-row error"><td colspan="35"><b>실데이터를 불러오지 못했습니다.</b><span>DB 새로고침을 눌러 다시 시도해주세요.</span></td></tr>';
    document.getElementById('live-catalog-state').textContent = '연결 오류';
    setMatrixConnection('error', 'DB 연결 오류');
    return false;
  } finally {
    if (requestId === matrixState.requestId) matrixState.loading = false;
  }
}

function channelCard(source) {
  const className = {smartstore:'smart', makeshop:'make', ably:'ably'}[source];
  return className ? document.querySelector(`.sync-list .channel-logo.${className}`)?.closest('div') : null;
}

function updateJobsErrorBadge() {
  const badge = document.getElementById('jobs-error-badge');
  const sourceErrors = Number(badge.dataset.sourceErrors || 0);
  const queueErrors = Number(badge.dataset.queueErrors || 0);
  badge.textContent = formatNumber(sourceErrors + queueErrors);
  badge.classList.toggle('warn-badge', sourceErrors + queueErrors > 0);
}

async function loadLiveSourceStatus() {
  if (!liveData) return;
  try {
    const {events, latest} = await liveData.loadSourceStatus();
    for (const source of ['smartstore','makeshop','ably']) {
      const event = latest[source];
      const card = channelCard(source);
      if (!card) continue;
      if (!event) {
        card.querySelector('p em').textContent = '실행 기록 없음';
        card.querySelector('time').textContent = '-';
        card.querySelector('.status').textContent = '대기';
        card.querySelector('.status').className = 'status wait';
        continue;
      }
      const difference = Number(event.payload?.differences || 0);
      const missing = Number(event.payload?.missing || 0);
      const description = card.querySelector('p em');
      const time = card.querySelector('time');
      const status = card.querySelector('.status');
      const staleRunning = event.status === 'RUNNING' && Date.now() - new Date(event.event_at).getTime() > 15 * 60 * 1000;
      description.textContent = event.event_type === 'SOURCE_UPLOAD'
        ? `원본 ${formatNumber(event.output_rows)}건 · DB 반영`
        : `매칭 ${formatNumber(event.output_rows)}건 · 차이 ${formatNumber(difference)} · 미매칭 ${formatNumber(missing)}`;
      time.textContent = formatLiveTime(event.event_at);
      status.textContent = event.status === 'SUCCESS' ? '완료' : event.status === 'ERROR' ? '오류' : staleRunning ? '중단 추정' : '실행 중';
      status.className = `status ${event.status === 'SUCCESS' ? 'done' : 'wait'}`;
    }
    const running = (events || []).filter(event => event.status === 'RUNNING' && Date.now() - new Date(event.event_at).getTime() <= 15 * 60 * 1000).slice(0, 3);
    const taskList = document.getElementById('dashboard-task-list');
    if (running.length) {
      taskList.innerHTML = running.map(event => {
        const processed = Number(event.processed_rows || 0);
        const total = Number(event.total_rows || 0);
        const percent = total ? Math.min(100, Math.round((processed / total) * 100)) : 0;
        const sourceName = {smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리', sellpia:'셀피아'}[event.source] || event.source;
        const workName = event.event_type === 'SOURCE_UPLOAD' ? '원본 업로드' : '재고 대조';
        return `<article><div class="task-row"><b>${escapeHtml(sourceName)} ${workName}</b><span>${percent}%</span></div><div class="progress"><i style="width:${percent}%"></i></div><p>${formatNumber(processed)} / ${formatNumber(total)}행 · ${formatLiveTime(event.event_at)} 갱신</p></article>`;
      }).join('');
    } else {
      taskList.innerHTML = '<article><div class="task-row"><b>진행 중인 서버 작업 없음</b><span>정상</span></div><p>새 업로드나 동기화 작업을 시작하면 여기에 진행률이 표시됩니다.</p></article>';
    }
    const failedCount = (events || []).filter(event => event.status === 'ERROR').length;
    document.getElementById('jobs-error-badge').dataset.sourceErrors = failedCount;
    updateJobsErrorBadge();
    document.getElementById('dashboard-failed-alert').textContent = failedCount ? `최근 실패 작업 ${formatNumber(failedCount)}건` : '최근 실패 작업 없음';
  } catch (error) {
    console.error('operations hub source status load failed', error);
  }
}

async function loadLiveDashboardMetrics() {
  if (!liveData?.loadDashboardMetrics) return;
  try {
    const metrics = await liveData.loadDashboardMetrics();
    const total = Number(metrics.total_sku || 0);
    const connected = Number(metrics.connected_sku || 0);
    const unmatched = Number(metrics.unmatched_sku || 0);
    const mismatched = Number(metrics.inventory_mismatch_sku || 0);
    const projectedMismatch = Number(metrics.projected_inventory_mismatch_sku ?? mismatched);
    const inventoryDraftCells = Number(metrics.inventory_draft_cells || 0);
    const inventoryFailedCells = Number(metrics.inventory_failed_cells || 0);
    document.getElementById('live-total-sku').textContent = formatNumber(total);
    document.getElementById('live-catalog-state').textContent = 'Supabase 실데이터';
    document.getElementById('live-connected-sku').textContent = formatNumber(connected);
    document.getElementById('live-connected-rate').textContent = total ? `${((connected / total) * 100).toFixed(1)}%` : '0%';
    document.getElementById('live-inventory-mismatch').textContent = formatNumber(projectedMismatch);
    document.getElementById('live-inventory-mismatch-detail').textContent = `원본 ${formatNumber(mismatched)} · 수정안 ${formatNumber(inventoryDraftCells)}셀${inventoryFailedCells ? ` · 실패 ${formatNumber(inventoryFailedCells)}셀` : ''}`;
    document.getElementById('live-unmatched-sku').textContent = formatNumber(unmatched);
    document.getElementById('matrix-unmatched-badge').textContent = formatNumber(unmatched);
    document.getElementById('dashboard-unmatched-alert').textContent = `미매칭 SKU ${formatNumber(unmatched)}건`;
    document.getElementById('dashboard-inventory-alert').textContent = `수정안 반영 후 재고 차이 ${formatNumber(projectedMismatch)}건 · 원본 ${formatNumber(mismatched)}건`;
    const picking = metrics.today_picked;
    const shortage = metrics.shortage_drawer_qty;
    document.getElementById('live-today-picked').textContent = picking == null ? '-' : formatNumber(picking);
    document.getElementById('live-shortage-drawer').textContent = picking == null
      ? '주문 DB 연결 대기'
      : `미송서랍 ${formatNumber(shortage || 0)}`;
    document.getElementById('live-latest-sync').textContent = metrics.latest_sync_at
      ? formatLiveTime(metrics.latest_sync_at).split(' ').pop()
      : '-';
    document.getElementById('live-latest-sync-detail').textContent = metrics.latest_sync_at ? '실데이터 기준' : '동기화 기록 없음';
  } catch (error) {
    console.error('operations hub dashboard metrics load failed', error);
    document.getElementById('live-catalog-state').textContent = '집계 오류';
  }
}

async function refreshLiveData(options) {
  await Promise.all([loadLiveMatrix(options), loadLiveSourceStatus(), loadLiveDashboardMetrics()]);
  await loadMappingSyncStatus({markDisplayed:true});
}

function matrixRowName(row) {
  return {
    sku: row.dataset.sku,
    ownCode: row.dataset.ownCode || '-',
    image: row.dataset.image || '',
    name: row.querySelector('.product-cell b').textContent,
    option: row.querySelector('.product-cell em').textContent
  };
}

function fillDrawerChannel(sectionKey, dataKey, label, product) {
  const section = document.getElementById(`drawer-${sectionKey}`);
  const state = matchState(product?.[`${dataKey}_match_tier`]);
  const status = section.querySelector('.matrix-status');
  status.className = `matrix-status ${state.key}`;
  status.textContent = product?.[`${dataKey}_name_is_draft`] && state.key !== 'unmatched' ? '초안 저장' : state.label;
  const productCode = product?.[`${dataKey}_product_code`] || '';
  const optionCode = product?.[`${dataKey}_option_code`] || '';
  document.getElementById(`drawer-${sectionKey}-product`).value = productCode;
  document.getElementById(`drawer-${sectionKey}-option`).value = optionCode;
  const productName = document.getElementById(`drawer-${sectionKey}-name`);
  const optionName = document.getElementById(`drawer-${sectionKey}-option-name`);
  productName.value = product?.[`${dataKey}_name`] || '';
  optionName.value = product?.[`${dataKey}_option_name`] || '';
  productName.disabled = state.key === 'unmatched';
  optionName.disabled = state.key === 'unmatched';
  productName.placeholder = state.key === 'unmatched' ? '먼저 판매처 상품을 연결해주세요.' : '판매처별 SEO 상품명';
  optionName.placeholder = state.key === 'unmatched' ? '먼저 판매처 옵션을 연결해주세요.' : '판매처 옵션명';
  section.dataset.productCode = productCode;
  section.dataset.optionCode = optionCode;
  section.dataset.savedProductName = productName.value;
  section.dataset.savedOptionName = optionName.value;
  section.querySelectorAll('.seller-draft-save').forEach(button => { button.disabled = state.key === 'unmatched'; });
}

function drawerDraftState(drafts) {
  const values = drafts.filter(Boolean);
  if (!values.length) return {key:'connected', label:'원본 기준'};
  if (values.some(item => item.status === 'failed')) return {key:'review', label:`수정안 ${values.length}건 · 실패 확인`};
  return {key:'pending', label:`수정안 ${values.length}건`};
}

function renderPriceRuleSetSteps(ruleSet, preview) {
  if (!ruleSet) return '<div class="price-tag-empty">적용할 가격 태그를 선택해주세요.</div>';
  const steps = Array.isArray(preview?.steps) ? preview.steps : [];
  return `<div class="price-tag-step-list">${(ruleSet.tags || []).map((tag, index) => {
    const step = steps[index];
    const calculation = step ? `${formatNullableNumber(step.before)}원 → ${formatNullableNumber(step.after)}원` : '계산 대기';
    return `<span class="price-tag-step" style="--price-tag-color:${escapeHtml(tag.color || ruleSet.color || '#2f6fd1')}"><i>${index + 1}</i><b>${escapeHtml(tag.tag_name)}</b><em>${escapeHtml(calculation)}</em></span>`;
  }).join('')}</div>`;
}

function priceRuleTagSummary(tag) {
  if (!tag) return '-';
  if (tag.replace_price !== null && tag.replace_price !== undefined) return `${formatNullableNumber(tag.replace_price)}원 고정`;
  const value = Number(tag.modify_value || 0);
  if (tag.modify_type === 'percent') return `${Math.abs(value)}% ${value < 0 ? '할인' : '인상'}`;
  if (tag.modify_type === 'add') return `${formatNullableNumber(Math.abs(value))}원 ${value < 0 ? '할인' : '추가'}`;
  return '기준가 그대로';
}

function calculateLocalPriceRule(basePrice, tag) {
  const base = Number(basePrice);
  if (!Number.isFinite(base) || !tag) return null;
  let value = tag.replace_price !== null && tag.replace_price !== undefined ? Number(tag.replace_price) : base;
  const modifyValue = Number(tag.modify_value || 0);
  if (tag.modify_type === 'percent') value *= 1 + modifyValue / 100;
  if (tag.modify_type === 'add') value += modifyValue;
  if (tag.min_price !== null && tag.min_price !== undefined) value = Math.max(value, Number(tag.min_price));
  if (tag.max_price !== null && tag.max_price !== undefined) value = Math.min(value, Number(tag.max_price));
  const unit = Math.max(1, Number(tag.rounding_unit || 1));
  const scaled = value / unit;
  value = (tag.rounding_mode === 'up' ? Math.ceil(scaled) : tag.rounding_mode === 'down' ? Math.floor(scaled) : Math.round(scaled)) * unit;
  return Math.max(0, value);
}

function priceRuleTagSimpleMode(tag) {
  if (tag?.replace_price !== null && tag?.replace_price !== undefined) return {mode:'fixed', value:Number(tag.replace_price)};
  const value = Number(tag?.modify_value || 0);
  if (tag?.modify_type === 'percent') return {mode:value < 0 ? 'percent_discount' : 'percent_markup', value:Math.abs(value)};
  if (tag?.modify_type === 'add') return {mode:value < 0 ? 'amount_discount' : 'amount_add', value:Math.abs(value)};
  return {mode:'none', value:0};
}

function applyPriceRuleTagSimpleMode(tag, mode, rawValue) {
  const value = Math.max(0, Number(rawValue || 0));
  const next = {...tag, replace_price:null, modify_type:'none', modify_value:0};
  if (mode === 'fixed') next.replace_price = value;
  if (mode === 'percent_discount') { next.modify_type = 'percent'; next.modify_value = -value; }
  if (mode === 'percent_markup') { next.modify_type = 'percent'; next.modify_value = value; }
  if (mode === 'amount_discount') { next.modify_type = 'add'; next.modify_value = -value; }
  if (mode === 'amount_add') { next.modify_type = 'add'; next.modify_value = value; }
  return next;
}

function priceRuleTagSavePayload(tag) {
  return {
    tagId:null,
    tagName:tag.tag_name,
    color:tag.color || '#2f6fd1',
    replacePrice:tag.replace_price,
    modifyType:tag.modify_type || 'none',
    modifyValue:Number(tag.modify_value || 0),
    minPrice:tag.min_price,
    maxPrice:tag.max_price,
    roundingUnit:Number(tag.rounding_unit || 1),
    roundingMode:tag.rounding_mode || 'nearest',
    note:'상품 상세에서 만든 조합 태그 단계'
  };
}

function priceComposerFor(source) {
  if (!drawerState.priceComposers[source]) drawerState.priceComposers[source] = {name:'', tagIds:[], tagEdits:{}, editingTagId:null, open:false};
  const composer = drawerState.priceComposers[source];
  if (!composer.tagEdits) composer.tagEdits = {};
  return composer;
}

function renderPriceTagComposer(source, basePrice, ruleTags) {
  const composer = priceComposerFor(source);
  const tagsById = new Map((ruleTags || []).map(tag => [Number(tag.price_rule_tag_id), tag]));
  let current = Number(basePrice);
  const selectedRows = composer.tagIds.map((tagId, index) => {
    const tag = composer.tagEdits[String(tagId)] || tagsById.get(Number(tagId));
    if (!tag) return '';
    const before = current;
    current = calculateLocalPriceRule(current, tag);
    const simple = priceRuleTagSimpleMode(tag);
    const editing = String(composer.editingTagId || '') === String(tagId);
    return `<article data-composer-index="${index}" data-composer-tag-id="${tagId}" class="${editing ? 'editing' : ''}">
      <div class="price-tag-composer-step-summary"><i>${index + 1}</i><span><b>${escapeHtml(tag.tag_name)}</b><em>${escapeHtml(priceRuleTagSummary(tag))} · ${formatNullableNumber(before)}원 → ${formatNullableNumber(current)}원</em></span><div><button type="button" data-composer-edit aria-label="작은 태그 수정">✎</button><button type="button" data-composer-move="up" aria-label="위로">↑</button><button type="button" data-composer-move="down" aria-label="아래로">↓</button><button type="button" data-composer-remove aria-label="삭제">×</button></div></div>
      ${editing ? `<div class="price-tag-composer-step-editor">
        <label><span>작은 태그 이름</span><input data-composer-tag-name maxlength="40" value="${escapeHtml(tag.tag_name)}"></label>
        <label><span>계산 방식</span><select data-composer-tag-mode>
          <option value="none" ${simple.mode === 'none' ? 'selected' : ''}>기준가 그대로</option><option value="percent_discount" ${simple.mode === 'percent_discount' ? 'selected' : ''}>퍼센트 할인</option><option value="percent_markup" ${simple.mode === 'percent_markup' ? 'selected' : ''}>퍼센트 인상</option><option value="amount_discount" ${simple.mode === 'amount_discount' ? 'selected' : ''}>금액 할인</option><option value="amount_add" ${simple.mode === 'amount_add' ? 'selected' : ''}>금액 추가</option><option value="fixed" ${simple.mode === 'fixed' ? 'selected' : ''}>최종가 고정</option>
        </select></label>
        <label><span>값</span><input data-composer-tag-value type="number" min="0" step="1" value="${simple.value}"></label>
        <details><summary>최저·최고·끝자리</summary><div><label><span>최저가</span><input data-composer-tag-min type="number" min="0" value="${escapeHtml(tag.min_price ?? '')}"></label><label><span>최고가</span><input data-composer-tag-max type="number" min="0" value="${escapeHtml(tag.max_price ?? '')}"></label><label><span>끝자리 단위</span><input data-composer-tag-round-unit type="number" min="1" value="${escapeHtml(tag.rounding_unit ?? 1)}"></label><label><span>처리</span><select data-composer-tag-round-mode><option value="nearest" ${tag.rounding_mode === 'nearest' ? 'selected' : ''}>반올림</option><option value="up" ${tag.rounding_mode === 'up' ? 'selected' : ''}>올림</option><option value="down" ${tag.rounding_mode === 'down' ? 'selected' : ''}>내림</option></select></label></div></details>
        <p>수정본은 새 작은 태그로 저장되어 기존 조합에는 영향을 주지 않습니다.</p>
      </div>` : ''}
    </article>`;
  }).join('');
  const canSave = composer.name.trim() && composer.tagIds.length;
  return `<details class="price-tag-composer" ${composer.open ? 'open' : ''}>
    <summary>+ 새 조합 태그를 여기서 바로 만들기</summary>
    <div class="price-tag-composer-body">
      <label><span>조합 태그 이름</span><input data-price-composer-name maxlength="50" value="${escapeHtml(composer.name)}" placeholder="예: 10% 할인 + 배송비"></label>
      <label><span>계산 단계 추가</span><select data-price-composer-add><option value="">작은 태그 선택…</option>${(ruleTags || []).filter(tag => !composer.tagIds.includes(Number(tag.price_rule_tag_id))).map(tag => `<option value="${tag.price_rule_tag_id}">${escapeHtml(tag.tag_name)} · ${escapeHtml(priceRuleTagSummary(tag))}</option>`).join('')}</select></label>
      <div class="price-tag-composer-steps">${selectedRows || '<p>계산 단계를 하나 이상 추가해주세요.</p>'}</div>
      <div class="price-tag-composer-result"><span>셀피아 기준가 ${formatNullableNumber(basePrice)}원</span><b>${composer.tagIds.length ? `미리보기 ${formatNullableNumber(current)}원` : '단계 미선택'}</b></div>
      <button type="button" class="btn primary price-tag-composer-save" ${canSave ? '' : 'disabled'}>조합 저장 · 현재 상품에 배정</button>
    </div>
  </details>`;
}

function renderDrawerPricePolicy(source, label, originalPrice, draftPrice, sellpiaPrice, ruleSets = null, assignment = null, preview = null, selectedRuleSetId = null, ruleTags = []) {
  const current = Number(originalPrice);
  const base = Number(sellpiaPrice);
  const draft = Number(draftPrice);
  const hasCurrent = originalPrice !== '' && originalPrice !== null && originalPrice !== undefined && Number.isFinite(current);
  const hasBase = sellpiaPrice !== '' && sellpiaPrice !== null && sellpiaPrice !== undefined && Number.isFinite(base);
  const hasDraft = draftPrice !== '' && draftPrice !== null && draftPrice !== undefined && Number.isFinite(draft);
  const difference = hasCurrent && hasBase ? current - base : null;
  const differenceText = difference === null ? '-' : `${difference > 0 ? '+' : ''}${formatNullableNumber(difference)}원`;
  const currentFormula = `${label} 원본가 ${hasCurrent ? formatNullableNumber(current) : '-'}원 · 셀피아 기준가 ${hasBase ? formatNullableNumber(base) : '-'}원 · 차이 ${differenceText}`;
  if (!ruleSets) return `<div class="drawer-price-policy loading"><div class="drawer-price-policy-head"><b>판매처 가격 태그</b><span>불러오는 중</span></div><div class="price-formula"><span>현재 가격 비교</span><code>${escapeHtml(currentFormula)}</code></div></div>`;
  const savedRuleSetId = assignment?.price_rule_set_id ? String(assignment.price_rule_set_id) : '';
  const selectedId = selectedRuleSetId === null ? savedRuleSetId : String(selectedRuleSetId || '');
  const selectedSet = ruleSets.find(ruleSet => String(ruleSet.price_rule_set_id) === selectedId) || null;
  const dirty = selectedId !== savedRuleSetId;
  const calculatedPrice = selectedSet && preview?.final_price !== null && preview?.final_price !== undefined ? preview.final_price : null;
  const applyLabel = calculatedPrice === null ? '계산 최종가 없음' : `${formatNullableNumber(calculatedPrice)}원을 수정안으로 적용`;
  return `<div class="drawer-price-policy${selectedSet ? ' active-policy' : ''}" data-policy-source="${source}" data-final-price="${escapeHtml(calculatedPrice ?? '')}" data-saved-rule-set-id="${escapeHtml(savedRuleSetId)}">
    <div class="drawer-price-policy-head"><b>판매처 가격 태그</b><span>${savedRuleSetId ? '상품에 배정됨' : '태그 미배정'}</span></div>
    <div class="drawer-price-layer-summary"><span>판매처 원본가<b>${hasCurrent ? formatNullableNumber(current) : '-'}원</b></span><span>셀피아 기준가<b>${hasBase ? formatNullableNumber(base) : '-'}원</b></span><span class="policy">계산 최종가<b>${calculatedPrice === null ? '-' : `${formatNullableNumber(calculatedPrice)}원`}</b></span><span class="draft">반영 예정가<b>${hasDraft ? `${formatNullableNumber(draft)}원` : '-'}</b></span></div>
    <label class="price-tag-selector"><span>이 상품에 적용할 큰 태그</span><select data-price-rule-set><option value="">태그 사용 안 함</option>${ruleSets.map(ruleSet => `<option value="${ruleSet.price_rule_set_id}" ${String(ruleSet.price_rule_set_id) === selectedId ? 'selected' : ''}>${escapeHtml(ruleSet.set_name)}</option>`).join('')}</select></label>
    <div data-price-tag-preview>${renderPriceRuleSetSteps(selectedSet, preview)}</div>
    ${renderPriceTagComposer(source, sellpiaPrice, ruleTags)}
    <div class="price-formula"><span>현재 가격 비교</span><code>${escapeHtml(currentFormula)}</code></div>
    <p class="price-policy-summary">${selectedSet ? `셀피아 ${formatNullableNumber(base)}원에 ‘${escapeHtml(selectedSet.set_name)}’ 태그를 순서대로 계산합니다.` : '태그를 배정하지 않으면 판매처 가격 수정안이 자동 생성되지 않습니다.'}</p>
    <div class="price-policy-actions"><button class="btn price-tag-assignment-save" ${dirty ? '' : 'disabled'}>${selectedId ? '태그 배정 저장' : '태그 배정 해제'}</button><button class="btn primary price-tag-apply" ${selectedSet && !dirty && calculatedPrice !== null ? '' : 'disabled'}>${dirty ? '태그 배정을 먼저 저장' : applyLabel}</button></div>
    <footer>태그 배정은 ${label}의 현재 SKU에만 저장됩니다. 계산 결과를 검토한 뒤 ‘수정안으로 적용’을 눌러야 변경대기와 원본 내보내기에 포함됩니다.</footer>
  </div>`;
}

function renderCurrentPricePolicy(source, product, selectedRuleSetId = null) {
  const host = document.querySelector(`[data-price-policy-host="${source}"]`);
  if (!host || !product) return;
  const selectedId = selectedRuleSetId === null
    ? (drawerState.priceRuleSelections[source] ?? drawerState.priceRuleAssignments[source]?.price_rule_set_id ?? '')
    : selectedRuleSetId;
  const component = product?.__sellerPriceComponents?.[source] || {};
  const originalFinal = component.source_final_price ?? product?.[`${source}_final_price`] ?? product?.[`${source}_price`];
  const draftFinal = component.draft_final_price ?? product?.__sellerDrafts?.[`${source}:sellpia_sale_price`]?.price_final_after ?? product?.__sellerDrafts?.[`${source}:sellpia_sale_price`]?.after_value;
  host.innerHTML = renderDrawerPricePolicy(
    source,
    CHANNEL_LABELS[source],
    originalFinal,
    draftFinal,
    product.sellpia_sale_price,
    drawerState.priceRuleSets,
    drawerState.priceRuleAssignments[source],
    drawerState.priceRulePreviews[source] || null,
    selectedId,
    drawerState.priceRuleTags
  );
}

async function loadDrawerPriceRuleAssignments(product) {
  if (!liveData?.loadPriceRuleTags || !liveData?.loadPriceRuleSets || !liveData?.loadPriceRuleAssignment || !liveData?.previewPriceRuleSet) return;
  const requestId = ++drawerState.priceRequestId;
  const sku = product.sellpia_sku_code;
  try {
    const [ruleTags, ruleSets, ...assignments] = await Promise.all([
      liveData.loadPriceRuleTags(),
      liveData.loadPriceRuleSets(),
      ...['smartstore','makeshop','ably'].map(source => liveData.loadPriceRuleAssignment({sku, source}))
    ]);
    const previews = await Promise.all(assignments.map(assignment => assignment
      ? liveData.previewPriceRuleSet({basePrice:product.sellpia_sale_price, ruleSetId:assignment.price_rule_set_id})
      : Promise.resolve(null)));
    if (requestId !== drawerState.priceRequestId || productDrawer.dataset.sku !== sku) return;
    drawerState.priceRuleTags = ruleTags;
    drawerState.priceRuleSets = ruleSets;
    drawerState.priceRuleAssignments = Object.fromEntries(['smartstore','makeshop','ably'].map((source, index) => [source, assignments[index]]));
    drawerState.priceRulePreviews = Object.fromEntries(['smartstore','makeshop','ably'].map((source, index) => [source, previews[index]]));
    drawerState.priceRuleSelections = Object.fromEntries(['smartstore','makeshop','ably'].map((source, index) => [source, assignments[index]?.price_rule_set_id || '']));
    ['smartstore','makeshop','ably'].forEach((source, index) => {
      const host = document.querySelector(`[data-price-policy-host="${source}"]`);
      const component = product?.__sellerPriceComponents?.[source] || {};
      const originalFinal = component.source_final_price ?? product?.[`${source}_final_price`] ?? product?.[`${source}_price`];
      const draftFinal = component.draft_final_price ?? product?.__sellerDrafts?.[`${source}:sellpia_sale_price`]?.price_final_after ?? product?.__sellerDrafts?.[`${source}:sellpia_sale_price`]?.after_value;
      if (host) host.innerHTML = renderDrawerPricePolicy(source, CHANNEL_LABELS[source], originalFinal, draftFinal, product.sellpia_sale_price, ruleSets, assignments[index], previews[index], assignments[index]?.price_rule_set_id || '', ruleTags);
    });
  } catch (error) {
    console.error('price rule assignment load failed', error);
    document.querySelectorAll('[data-price-policy-host]').forEach(host => { host.innerHTML = `<div class="drawer-empty-state error"><b>가격 태그를 불러오지 못했습니다.</b><span>${escapeHtml(error?.message || error)}</span></div>`; });
  }
}

function renderDrawerInventoryChannel(source, label, product) {
  const state = matchState(product?.[`${source}_match_tier`]);
  const stock = product?.[`${source}_stock`];
  const component = product?.__sellerPriceComponents?.[source] || {};
  const sourceBasePrice = component.source_base_price ?? product?.[`${source}_base_price`] ?? product?.[`${source}_price`];
  const sourceOptionPrice = component.source_option_price ?? product?.[`${source}_option_price`] ?? 0;
  const sourceFinalPrice = component.source_final_price ?? product?.[`${source}_final_price`] ?? product?.[`${source}_price`];
  const stockDraft = product?.__sellerDrafts?.[`${source}:sellpia_current_stock`];
  const priceDraft = product?.__sellerDrafts?.[`${source}:sellpia_sale_price`];
  const draftState = state.key === 'unmatched' ? state : drawerDraftState([stockDraft, priceDraft]);
  const stockValue = stockDraft?.after_value ?? stock ?? '';
  const basePriceValue = component.draft_base_price ?? priceDraft?.price_base_after ?? sourceBasePrice ?? '';
  const optionPriceValue = component.draft_option_price ?? priceDraft?.price_option_after ?? sourceOptionPrice ?? 0;
  const finalPriceValue = component.draft_final_price ?? priceDraft?.price_final_after ?? priceDraft?.after_value ?? sourceFinalPrice ?? '';
  const stockDisabled = state.key === 'unmatched' || stock === null || stock === undefined;
  const priceDisabled = state.key === 'unmatched' || sourceFinalPrice === null || sourceFinalPrice === undefined;
  return `<section class="drawer-section drawer-inventory-channel" data-source="${source}">
    <div class="drawer-section-title"><h4><i class="dot ${{smartstore:'smart',makeshop:'make',ably:'ably'}[source]}"></i>${label}</h4><span class="matrix-status ${draftState.key}">${draftState.label}</span></div>
    <div class="drawer-inventory-meta"><span>상품 ${escapeHtml(product?.[`${source}_product_code`] || '-')}</span><span>옵션 ${escapeHtml(product?.[`${source}_option_code`] || '-')}</span></div>
    <div class="form-grid drawer-stock-grid">
      <label>판매처 재고<input type="number" min="0" step="1" data-drawer-value="sellpia_current_stock" data-saved-value="${escapeHtml(stockValue)}" data-original-value="${escapeHtml(stock ?? '')}" value="${escapeHtml(stockValue)}" ${stockDisabled ? 'disabled' : ''}></label>
    </div>
    <div class="drawer-price-component-grid">
      <label>판매가 <small>자동 계산</small><input type="number" value="${escapeHtml(basePriceValue)}" data-original-value="${escapeHtml(sourceBasePrice ?? '')}" disabled></label>
      <label>옵션가 <small>${source === 'ably' ? '미사용' : '직접 수정'}</small><input type="number" step="1" data-drawer-price-component="option" data-saved-value="${escapeHtml(optionPriceValue)}" data-original-value="${escapeHtml(sourceOptionPrice ?? 0)}" value="${escapeHtml(optionPriceValue)}" ${priceDisabled || source === 'ably' ? 'disabled' : ''}></label>
      <label>최종판가 <small>목표 금액</small><input type="number" min="0" step="1" data-drawer-price-component="final" data-saved-value="${escapeHtml(finalPriceValue)}" data-original-value="${escapeHtml(sourceFinalPrice ?? '')}" value="${escapeHtml(finalPriceValue)}" ${priceDisabled ? 'disabled' : ''}></label>
    </div>
    <p class="drawer-price-equation">판매가 ${formatNullableNumber(basePriceValue)} + 옵션가 ${formatNullableNumber(optionPriceValue)} = 최종판가 ${formatNullableNumber(finalPriceValue)}</p>
    <div class="drawer-value-comparison"><span>셀피아 재고 <b>${formatNullableNumber(product?.sellpia_current_stock)}</b></span><span>셀피아 판매가 <b>${formatNullableNumber(product?.sellpia_sale_price)}</b></span></div>
    <div data-price-policy-host="${source}">${renderDrawerPricePolicy(source, label, sourceFinalPrice, finalPriceValue, product?.sellpia_sale_price)}</div>
    <div class="drawer-section-actions"><span>${stockDraft || priceDraft ? '파란 수정안은 변경대기에 저장됨' : '수정하면 변경대기에 즉시 저장됨'}</span><button class="btn primary drawer-value-save" ${state.key === 'unmatched' || (stockDisabled && priceDisabled) ? 'disabled' : ''}>수정안 저장</button></div>
  </section>`;
}

function renderDrawerInventory(product) {
  document.getElementById('drawer-inventory-list').innerHTML = [
    renderDrawerInventoryChannel('smartstore', '스마트스토어', product),
    renderDrawerInventoryChannel('makeshop', '메이크샵', product),
    renderDrawerInventoryChannel('ably', '에이블리', product)
  ].join('');
}

function attributeSelectOptions(values, selected) {
  return values.map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('');
}

function attributeSourceLabel(profile) {
  const sources = [profile.material_source, profile.product_group_source, profile.shape_source];
  return sources.every(source => source === 'manual') ? '수동 확정' : '최초 자동 분류';
}

function renderAttributeTagChoices(tags, selectedIds, scope) {
  const selected = new Set((selectedIds || []).map(String));
  if (!tags.length) return '<div class="attribute-tags-empty">사용 가능한 태그가 없습니다.</div>';
  return tags.map(tag => `<label class="attribute-tag-choice" style="--tag-color:${escapeHtml(tag.tag_color || '#dbeafe')}">
    <input type="checkbox" data-attribute-tag="${scope}" value="${escapeHtml(tag.tag_id)}" ${selected.has(String(tag.tag_id)) ? 'checked' : ''}>
    <span>${escapeHtml(tag.tag_name)}</span><em>${escapeHtml(tag.tag_group || '운영')}</em>
  </label>`).join('');
}

function renderDrawerAttributesPanel(product, profile, tags) {
  const productTags = Array.isArray(profile.product_tags) ? profile.product_tags : [];
  const skuTags = Array.isArray(profile.sku_tags) ? profile.sku_tags : [];
  drawerState.attributeDraft = {
    material:profile.material || '기타',
    productGroup:profile.product_group || '기타',
    shape:profile.shape || '기타',
    productTagIds:productTags.map(tag => String(tag.tag_id)),
    skuTagIds:skuTags.map(tag => String(tag.tag_id))
  };
  document.getElementById('drawer-attributes-content').innerHTML = `<section class="drawer-section drawer-attributes-editor">
    <div class="drawer-section-title"><h4>분류 속성</h4><span class="matrix-status ${attributeSourceLabel(profile) === '수동 확정' ? 'connected' : 'pending'}">${attributeSourceLabel(profile)}</span></div>
    <div class="attribute-profile-meta"><span>상품코드 <b>${escapeHtml(profile.sellpia_product_code || '-')}</b></span><span>분류기 <b>${escapeHtml(profile.classifier_version || '-')}</b></span></div>
    <div class="attribute-select-grid">
      <label>소재<select id="drawer-attribute-material">${attributeSelectOptions(ATTRIBUTE_OPTIONS.material, drawerState.attributeDraft.material)}</select></label>
      <label>상품군<select id="drawer-attribute-product-group">${attributeSelectOptions(ATTRIBUTE_OPTIONS.productGroup, drawerState.attributeDraft.productGroup)}</select></label>
      <label>형태<select id="drawer-attribute-shape">${attributeSelectOptions(ATTRIBUTE_OPTIONS.shape, drawerState.attributeDraft.shape)}</select></label>
    </div>
    <div class="attribute-tag-section"><div><b>상품 공통 태그</b><span>같은 상품코드의 모든 옵션에 적용</span></div><div class="attribute-tag-grid">${renderAttributeTagChoices(tags, drawerState.attributeDraft.productTagIds, 'product')}</div></div>
    <div class="attribute-tag-section"><div><b>현재 SKU 예외 태그</b><span>${escapeHtml(product.sellpia_sku_code)}에만 적용</span></div><div class="attribute-tag-grid">${renderAttributeTagChoices(tags, drawerState.attributeDraft.skuTagIds, 'sku')}</div></div>
    <div class="attribute-new-tag"><input id="drawer-new-tag-name" maxlength="32" placeholder="새 태그 이름"><select id="drawer-new-tag-scope"><option value="product">상품 공통</option><option value="sku">현재 SKU</option></select><button class="btn" id="drawer-create-tag">태그 추가</button></div>
    <div class="drawer-section-actions"><span>수동 저장 후 규칙 재분류로 덮어쓰지 않습니다.</span><button class="btn primary" id="drawer-save-attributes">속성·태그 저장</button></div>
  </section>`;
}

async function renderDrawerAttributes(product) {
  const content = document.getElementById('drawer-attributes-content');
  const requestId = ++drawerState.attributeRequestId;
  content.innerHTML = '<div class="drawer-empty-state loading"><b>속성·태그를 불러오는 중입니다.</b><span>상품 공통값과 현재 SKU 예외값을 확인합니다.</span></div>';
  try {
    const [tags, profile] = await Promise.all([
      drawerState.tags ? Promise.resolve(drawerState.tags) : liveData.loadTags(),
      product.__profile ? Promise.resolve(product.__profile) : liveData.ensureProductProfile(product.sellpia_sku_code)
    ]);
    if (requestId !== drawerState.attributeRequestId || productDrawer.dataset.sku !== product.sellpia_sku_code) return;
    drawerState.tags = tags;
    product.__profile = profile;
    renderDrawerAttributesPanel(product, profile, tags);
  } catch (error) {
    console.error('product profile load failed', error);
    if (requestId === drawerState.attributeRequestId) content.innerHTML = `<div class="drawer-empty-state error"><b>속성·태그를 불러오지 못했습니다.</b><span>${escapeHtml(error?.message || error)}</span></div>`;
  }
}

function drawerFieldLabel(fieldKey) {
  return {
    sellpia_own_code:'셀피아 자사코드', sellpia_product_name:'셀피아 상품명', sellpia_option_name:'셀피아 옵션명',
    sellpia_current_stock:'재고', sellpia_sale_price:'판매가', sellpia_image:'셀피아 이미지',
    seller_product_name:'판매처 상품명', seller_option_name:'판매처 옵션명'
  }[fieldKey] || fieldKey || '변경사항';
}

function drawerStatusLabel(status) {
  return {pending:'반영 대기',validated:'검증 완료',processing:'처리 중',exported:'내보냄',applied:'반영 완료',failed:'실패',saved:'DB 초안',cancelled:'취소'}[status] || status || '기록';
}

function historyValue(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderDrawerHistory({changes = [], events = [], links = []}) {
  const changeMap = new Map(changes.map(item => [Number(item.change_id), item]));
  const eventChangeIds = new Set(events.map(item => Number(item.change_id)));
  const items = [
    ...events.map(event => ({kind:'event', at:event.created_at, event, change:changeMap.get(Number(event.change_id))})),
    ...changes.filter(change => !eventChangeIds.has(Number(change.change_id))).map(change => ({kind:'change', at:change.updated_at, change})),
    ...links.map(link => ({kind:'link', at:link.changed_at, link}))
  ].sort((left, right) => new Date(right.at || 0) - new Date(left.at || 0)).slice(0, 100);
  const list = document.getElementById('drawer-history-list');
  if (!items.length) {
    list.innerHTML = '<div class="drawer-empty-state"><b>이 SKU의 변경이력이 없습니다.</b><span>판매처 연결이나 수정안을 저장하면 여기에 기록됩니다.</span></div>';
    return;
  }
  list.innerHTML = items.map(item => {
    if (item.kind === 'link') {
      const link = item.link;
      const before = link.before_link || {};
      const after = link.after_link || {};
      return `<article class="drawer-history-item"><div><span class="drawer-history-kind link">연결 변경</span><time>${formatLiveTime(link.changed_at)}</time></div><b>${escapeHtml(CHANNEL_LABELS[link.source_channel] || link.source_channel)} · ${escapeHtml(after.product_code || '-')} / ${escapeHtml(after.option_code || '-')}</b><p>${before.product_code ? `이전 ${escapeHtml(before.product_code)} / ${escapeHtml(before.option_code || '-')}` : '신규 연결'} · ${escapeHtml(link.changed_by || '시스템')}</p></article>`;
    }
    const change = item.change || {};
    const event = item.event;
    const status = event?.to_status || change.status;
    const sourceLabel = change.source_channel ? (CHANNEL_LABELS[change.source_channel] || change.source_channel) : '셀피아 기준';
    const description = event?.message || change.status_message || change.error_message || `${historyValue(change.before_value)} → ${historyValue(change.after_value)}`;
    return `<article class="drawer-history-item"><div><span class="drawer-history-kind ${escapeHtml(status || '')}">${escapeHtml(drawerStatusLabel(status))}</span><time>${formatLiveTime(item.at)}</time></div><b>${escapeHtml(sourceLabel)} · ${escapeHtml(drawerFieldLabel(change.field_key))}</b><p>${escapeHtml(description || '-')}</p></article>`;
  }).join('');
}

async function loadDrawerHistory({force = false} = {}) {
  const sku = productDrawer.dataset.sku;
  if (!sku || !liveData?.loadProductHistory) return;
  if (!force && drawerState.historySku === sku) return;
  const requestId = ++drawerState.historyRequestId;
  const list = document.getElementById('drawer-history-list');
  list.innerHTML = '<div class="drawer-empty-state loading"><b>변경이력을 불러오는 중입니다.</b><span>변경대기와 연결 감사로그를 조회합니다.</span></div>';
  try {
    const history = await liveData.loadProductHistory(sku);
    if (requestId !== drawerState.historyRequestId || productDrawer.dataset.sku !== sku) return;
    drawerState.historySku = sku;
    renderDrawerHistory(history);
  } catch (error) {
    console.error('drawer product history load failed', error);
    if (requestId === drawerState.historyRequestId) list.innerHTML = `<div class="drawer-empty-state error"><b>변경이력을 불러오지 못했습니다.</b><span>${escapeHtml(error?.message || error)}</span></div>`;
  }
}

function setDrawerTab(tabName, {loadHistory = true} = {}) {
  drawerState.activeTab = tabName;
  document.querySelectorAll('[data-drawer-tab]').forEach(button => {
    const active = button.dataset.drawerTab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-drawer-panel]').forEach(panel => {
    const active = panel.dataset.drawerPanel === tabName;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  document.getElementById('drawer-foot-status').textContent = {
    connections:'판매처명 초안과 실제 반영 대기를 분리해 저장합니다.',
    inventory:'재고·가격 수정안은 변경대기에 저장한 뒤 원본 내보내기로 반영합니다.',
    attributes:'상품 공통 속성과 SKU 예외 태그를 Supabase에 즉시 저장합니다.',
    history:'SKU 단위 연결·수정·검증·내보내기 이력을 표시합니다.'
  }[tabName] || '';
  if (tabName === 'history' && loadHistory) loadDrawerHistory();
}

function openProductDrawer(row) {
  const product = matrixRowName(row);
  const liveProduct = matrixRowsBySku.get(product.sku) || {};
  document.getElementById('drawer-sku').textContent = product.sku;
  document.getElementById('drawer-name').textContent = liveProduct.sellpia_product_name || liveProduct.display_name || product.name;
  document.getElementById('drawer-option').textContent = `${liveProduct.sellpia_option_name || '옵션명 없음'} · 자사코드 ${product.ownCode}`;
  const drawerThumb = document.querySelector('.drawer-product .product-thumb');
  drawerThumb.className = 'product-thumb live-thumb';
  drawerThumb.innerHTML = product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.sku)} 상품 이미지">` : 'NO';
  fillDrawerChannel('smart', 'smartstore', '스마트스토어', liveProduct);
  fillDrawerChannel('make', 'makeshop', '메이크샵', liveProduct);
  fillDrawerChannel('ably', 'ably', '에이블리', liveProduct);
  productDrawer.dataset.sku = product.sku;
  drawerState.priceComposers = {};
  drawerState.priceRulePreviews = {};
  drawerState.priceRuleSelections = {};
  renderDrawerInventory(liveProduct);
  loadDrawerPriceRuleAssignments(liveProduct);
  const connectedCount = ['smartstore','makeshop','ably'].filter(channel => liveProduct[`${channel}_match_tier`]).length;
  document.getElementById('drawer-stock').textContent = formatNullableNumber(liveProduct.sellpia_current_stock);
  document.getElementById('drawer-price').textContent = formatNullableNumber(liveProduct.sellpia_sale_price);
  document.getElementById('drawer-channel-count').textContent = `${connectedCount}곳`;
  drawerState.historySku = '';
  renderDrawerAttributes(liveProduct);
  matrixBody.querySelectorAll('tr').forEach(item => item.classList.toggle('selected-row', item === row));
  productDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
  productDrawer.setAttribute('aria-hidden', 'false');
  setDrawerTab(drawerState.activeTab);
}

function closeProductDrawer() {
  productDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  productDrawer.setAttribute('aria-hidden', 'true');
}

const CHANNEL_LABELS = {smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리'};
const CHANNEL_SECTION_KEYS = {smartstore:'smart', makeshop:'make', ably:'ably'};

function applyLocalSellerDraft(product, source, fieldKey, after, result) {
  if (!product) return null;
  product.__sellerDrafts = product.__sellerDrafts || {};
  const key = `${source}:${fieldKey}`;
  if (result?.draft_status === 'unchanged') {
    delete product.__sellerDrafts[key];
    return null;
  }
  const draft = {
    change_id:result?.change_id || null,
    sellpia_sku_code:product.sellpia_sku_code,
    source_channel:source,
    field_key:fieldKey,
    before_value:fieldKey === 'sellpia_current_stock' ? product[`${source}_stock`] : product[`${source}_price`],
    after_value:Number(after),
    status:result?.draft_status || 'pending',
    updated_at:new Date().toISOString()
  };
  product.__sellerDrafts[key] = draft;
  return draft;
}

function applyLocalSellerPriceDraft(product, source, result) {
  if (!product) return null;
  product.__sellerPriceComponents = product.__sellerPriceComponents || {};
  const existing = product.__sellerPriceComponents[source] || {};
  const component = {
    ...existing,
    sellpia_sku_code:product.sellpia_sku_code,
    source_channel:source,
    source_base_price:result?.source_base_price ?? existing.source_base_price ?? product[`${source}_base_price`] ?? product[`${source}_price`],
    source_option_price:result?.source_option_price ?? existing.source_option_price ?? product[`${source}_option_price`] ?? 0,
    source_final_price:result?.source_final_price ?? existing.source_final_price ?? product[`${source}_final_price`] ?? product[`${source}_price`],
    draft_base_price:result?.draft_status === 'unchanged' ? null : result?.draft_base_price,
    draft_option_price:result?.draft_status === 'unchanged' ? null : result?.draft_option_price,
    draft_final_price:result?.draft_status === 'unchanged' ? null : result?.draft_final_price,
    option_price_source:result?.saved_option_price_source || 'original',
    price_rule_set_id:result?.saved_price_rule_set_id || null
  };
  product.__sellerPriceComponents[source] = component;
  const draft = applyLocalSellerDraft(product, source, 'sellpia_sale_price', result?.draft_final_price, result);
  if (draft) {
    Object.assign(draft, {
      price_base_before:component.source_base_price,
      price_base_after:component.draft_base_price,
      price_option_before:component.source_option_price,
      price_option_after:component.draft_option_price,
      price_final_before:component.source_final_price,
      price_final_after:component.draft_final_price,
      option_price_source:component.option_price_source,
      price_rule_set_id:component.price_rule_set_id
    });
  }
  return draft;
}

function syncMatrixSellerDraftCell(product, source, fieldKey) {
  if (!product) return;
  const row = matrixBody.querySelector(`tr[data-sku="${CSS.escape(product.sellpia_sku_code)}"]`);
  const button = row?.querySelector(`.seller-edit[data-source="${source}"][data-field-key="${fieldKey}"]`);
  if (!button) return;
  const draft = product.__sellerDrafts?.[`${source}:${fieldKey}`];
  const original = fieldKey === 'sellpia_current_stock' ? product[`${source}_stock`] : product[`${source}_price`];
  const display = draft?.after_value ?? original;
  button.dataset.value = display ?? '';
  button.dataset.changeId = draft?.change_id || '';
  button.dataset.draftStatus = draft?.status || '';
  button.classList.remove('pending', 'draft-pending', 'draft-validated', 'draft-failed', 'diff');
  if (draft) button.classList.add('pending', `draft-${draft.status}`);
  if (fieldKey === 'sellpia_current_stock') {
    button.textContent = formatNullableNumber(display);
    button.title = draft ? `수정안 ${formatNullableNumber(display)} · 원본 ${formatNullableNumber(original)}` : '수정 가능한 판매처 재고';
    return;
  }
  button.dataset.draftPrice = draft?.after_value ?? '';
  const policyRaw = button.dataset.policyPrice;
  const policyVisible = button.dataset.policyActive === 'true' && policyRaw !== '';
  button.innerHTML = `<span class="price-layer original"><span>원본</span><b>${formatNullableNumber(original)}</b></span>${policyVisible ? `<span class="price-layer policy"><span>수식</span><b>${formatNullableNumber(policyRaw)}</b></span>` : ''}${draft ? `<span class="price-layer draft"><span>반영</span><b>${formatNullableNumber(draft.after_value)}</b></span>` : ''}`;
  button.title = draft ? `반영 예정 ${formatNullableNumber(display)} · 원본 ${formatNullableNumber(original)}` : '수정 가능한 판매처 원본 가격';
}

function syncDrawerSellerDraftUi(product, source) {
  const section = document.querySelector(`.drawer-inventory-channel[data-source="${source}"]`);
  if (!section || !product) return;
  const stockDraft = product.__sellerDrafts?.[`${source}:sellpia_current_stock`];
  const priceDraft = product.__sellerDrafts?.[`${source}:sellpia_sale_price`];
  const state = drawerDraftState([stockDraft, priceDraft]);
  const status = section.querySelector('.drawer-section-title .matrix-status');
  if (status) {
    status.className = `matrix-status ${state.key}`;
    status.textContent = state.label;
  }
  section.querySelectorAll('[data-drawer-value]').forEach(input => {
    const fieldKey = input.dataset.drawerValue;
    const draft = product.__sellerDrafts?.[`${source}:${fieldKey}`];
    const original = fieldKey === 'sellpia_current_stock' ? product[`${source}_stock`] : product[`${source}_price`];
    const value = draft?.after_value ?? original ?? '';
    input.value = value;
    input.dataset.savedValue = String(value);
  });
  section.classList.remove('drawer-dirty');
  const actionCopy = section.querySelector('.drawer-section-actions>span');
  if (actionCopy) actionCopy.textContent = stockDraft || priceDraft ? '파란 수정안은 변경대기에 저장됨' : '수정하면 변경대기에 즉시 저장됨';
  const draftPrice = section.querySelector('[data-policy-source] .drawer-price-layer-summary .draft b');
  if (draftPrice) draftPrice.textContent = priceDraft ? `${formatNullableNumber(priceDraft.after_value)}원` : '-';
}

function refreshChangeQueueInBackground() {
  window.setTimeout(() => { void loadChangeQueue({silent:true}); }, 250);
}

const mappingPopover = document.getElementById('mapping-popover');
const mappingSearchInput = document.getElementById('mapping-search-input');
const mappingSearchResults = document.getElementById('mapping-search-results');
const mappingState = {source:'', sku:'', anchor:null, requestId:0, timer:null, page:1, pageSize:24, count:0};

function positionFloatingPanel(panel, anchor, width = 500) {
  const rect = anchor?.getBoundingClientRect?.() || {left:20, right:20, top:100, bottom:130};
  const safeWidth = Math.min(width, window.innerWidth - 24);
  panel.style.width = `${safeWidth}px`;
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - safeWidth - 12));
  const estimatedHeight = Math.min(520, window.innerHeight - 24);
  const below = rect.bottom + 8;
  const top = below + estimatedHeight <= window.innerHeight ? below : Math.max(12, rect.top - estimatedHeight - 8);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function closeMappingSearch() {
  mappingPopover.hidden = true;
  mappingState.requestId += 1;
  clearTimeout(mappingState.timer);
}

function openMappingSearch({source, sku, anchor, initialQuery = ''}) {
  mappingState.source = source;
  mappingState.sku = sku;
  mappingState.anchor = anchor;
  mappingState.page = 1;
  mappingState.count = 0;
  document.getElementById('mapping-source-label').textContent = CHANNEL_LABELS[source] || source;
  document.getElementById('mapping-target-sku').textContent = sku;
  mappingSearchInput.value = initialQuery === '-' ? '' : initialQuery;
  document.getElementById('mapping-search-help').textContent = '코드 또는 상품명으로 검색합니다. 상품명 / 옵션명 형식은 두 조건의 교집합입니다.';
  mappingSearchResults.innerHTML = '<div class="mapping-empty">검색어를 입력해주세요.</div>';
  mappingPopover.hidden = false;
  positionFloatingPanel(mappingPopover, anchor);
  mappingSearchInput.focus();
  mappingSearchInput.select();
  if (mappingSearchInput.value.trim()) runMappingSearch();
}

function renderMappingResults(result) {
  const items = Array.isArray(result?.rows) ? result.rows : [];
  mappingState.count = Number(result?.count || 0);
  mappingState.page = Number(result?.page || 1);
  const pageSize = Number(result?.pageSize || mappingState.pageSize);
  const totalPages = Math.max(1, Math.ceil(mappingState.count / pageSize));
  if (!items.length) {
    mappingSearchResults.innerHTML = '<div class="mapping-empty"><b>검색 결과가 없습니다.</b><span>코드 일부 또는 상품명으로 다시 검색해주세요.</span></div>';
    return;
  }
  const rows = items.map(item => {
    const linked = Array.isArray(item.linked_skus) ? item.linked_skus : [];
    const otherLinks = linked.filter(sku => sku !== mappingState.sku);
    const warning = otherLinks.length ? `<span class="mapping-linked-warning">다른 SKU ${escapeHtml(otherLinks.slice(0,3).join(', '))}${otherLinks.length > 3 ? ` 외 ${otherLinks.length - 3}` : ''} 연결됨</span>` : '<span class="mapping-free">연결 가능</span>';
    return `<article class="mapping-result-item">
      <button data-map-product="${escapeHtml(item.product_code)}" data-map-option="${escapeHtml(item.option_code || '')}" data-linked-skus="${escapeHtml(JSON.stringify(linked))}">
        <span class="mapping-result-codes"><b>${escapeHtml(item.product_code)}</b><em>${escapeHtml(item.option_code || '옵션코드 없음')}</em></span>
        <span class="mapping-result-names"><b>${escapeHtml(item.product_name || '상품명 없음')}</b><em>${escapeHtml(item.option_name || '옵션명 없음')}</em></span>
        <span class="mapping-result-meta"><i>재고 ${formatNullableNumber(item.stock)}</i><i>${formatNullableNumber(item.price)}원</i>${warning}</span>
      </button>
    </article>`;
  }).join('');
  mappingSearchResults.innerHTML = `${rows}<nav class="mapping-pagination" aria-label="검색 결과 페이지">
    <span>전체 ${formatNumber(mappingState.count)}개 · ${mappingState.page}/${totalPages}쪽</span>
    <div><button type="button" data-mapping-page="${mappingState.page - 1}" ${mappingState.page <= 1 ? 'disabled' : ''}>이전</button><button type="button" data-mapping-page="${mappingState.page + 1}" ${mappingState.page >= totalPages ? 'disabled' : ''}>다음</button></div>
  </nav>`;
}

async function runMappingSearch(page = mappingState.page) {
  const keyword = mappingSearchInput.value.trim();
  if (!keyword) {
    mappingSearchResults.innerHTML = '<div class="mapping-empty">검색어를 입력해주세요.</div>';
    return;
  }
  const requestId = ++mappingState.requestId;
  mappingSearchResults.innerHTML = '<div class="mapping-empty loading"><b>원본 검색 중</b><span>최신 정규화 데이터를 확인합니다.</span></div>';
  try {
    const result = await liveData.searchSellerItems(mappingState.source, keyword, page, mappingState.pageSize);
    if (requestId !== mappingState.requestId) return;
    renderMappingResults(result);
  } catch (error) {
    console.error('seller source search failed', error);
    mappingSearchResults.innerHTML = `<div class="mapping-empty error"><b>검색하지 못했습니다.</b><span>${escapeHtml(error?.message || error)}</span></div>`;
  }
}

mappingSearchInput.addEventListener('input', () => {
  clearTimeout(mappingState.timer);
  mappingState.page = 1;
  mappingState.timer = setTimeout(runMappingSearch, 260);
});
document.getElementById('close-mapping-popover').addEventListener('click', closeMappingSearch);
mappingSearchResults.addEventListener('click', async event => {
  const pageButton = event.target.closest('[data-mapping-page]');
  if (pageButton && !pageButton.disabled) {
    mappingState.page = Math.max(1, Number(pageButton.dataset.mappingPage) || 1);
    await runMappingSearch(mappingState.page);
    return;
  }
  const button = event.target.closest('[data-map-product]');
  if (!button) return;
  const linkedSkus = JSON.parse(button.dataset.linkedSkus || '[]');
  const otherLinks = linkedSkus.filter(sku => sku !== mappingState.sku);
  if (otherLinks.length && !window.confirm(`이 판매처 옵션은 ${otherLinks.join(', ')}에 연결되어 있습니다. ${mappingState.sku}에도 연결할까요?`)) return;
  button.disabled = true;
  button.classList.add('saving');
  try {
    await liveData.linkSellerItem({
      sku:mappingState.sku,
      source:mappingState.source,
      productCode:button.dataset.mapProduct,
      optionCode:button.dataset.mapOption
    });
    const sourceLabel = CHANNEL_LABELS[mappingState.source] || mappingState.source;
    const sku = mappingState.sku;
    closeMappingSearch();
    closeProductDrawer();
    await refreshLiveData();
    showToast(`${sku} · ${sourceLabel} 연결을 저장했습니다.`);
  } catch (error) {
    console.error('seller item link failed', error);
    showToast(`연결 저장 실패: ${error?.message || error}`);
    button.disabled = false;
    button.classList.remove('saving');
  }
});

const pricePopover = document.getElementById('price-popover');
let pricePopoverTimer;
function showPricePopover(target) {
  clearTimeout(pricePopoverTimer);
  const originalRaw = target.dataset.originalPrice;
  const policyRaw = target.dataset.policyPrice;
  const draftRaw = target.dataset.draftPrice;
  const original = Number(originalRaw);
  const policy = Number(policyRaw);
  const draft = Number(draftRaw);
  const base = Number(target.dataset.basePrice);
  const hasOriginal = originalRaw !== '' && Number.isFinite(original);
  const hasPolicy = target.dataset.policyActive === 'true' && policyRaw !== '' && Number.isFinite(policy);
  const hasDraft = draftRaw !== '' && Number.isFinite(draft);
  const hasBase = target.dataset.basePrice !== '' && Number.isFinite(base);
  const difference = hasOriginal && hasBase ? original - base : null;
  pricePopover.innerHTML = `<div class="price-popover-head"><b>${escapeHtml(target.dataset.priceLabel)} 가격 단계</b><span>${hasDraft ? '반영안 확인' : hasPolicy ? '수식 계산됨' : '원본 기준'}</span></div>
    <div class="price-popover-values"><p><span>판매처 원본가</span><b>${hasOriginal ? `${formatNullableNumber(original)}원` : '-'}</b></p><p><span>셀피아 기준가</span><b>${hasBase ? `${formatNullableNumber(base)}원` : '-'}</b></p><p class="policy"><span>판매처별 수식 계산가</span><b>${hasPolicy ? `${formatNullableNumber(policy)}원` : '정책 꺼짐'}</b></p><p class="draft"><span>반영 예정가</span><b>${hasDraft ? `${formatNullableNumber(draft)}원` : '수정안 없음'}</b></p></div>
    <div class="price-formula"><span>원본 비교</span><code>판매처 원본가 ${hasOriginal ? formatNullableNumber(original) : '-'} − 셀피아 기준가 ${hasBase ? formatNullableNumber(base) : '-'} = ${difference === null ? '-' : formatNullableNumber(difference)}</code></div>
    <p class="price-policy-note">${hasPolicy ? `${escapeHtml(target.dataset.policyName || '판매처 공통 가격정책')} 결과입니다. ` : ''}수식 계산가는 원본을 덮어쓰지 않습니다. 검토 후 반영 예정가로 저장해야 내보내기에 사용됩니다.</p>
    <footer>원본 갱신 ${formatLiveTime(target.dataset.priceUpdated)}</footer>`;
  pricePopover.hidden = false;
  positionFloatingPanel(pricePopover, target, 360);
}
function scheduleHidePricePopover() {
  clearTimeout(pricePopoverTimer);
  pricePopoverTimer = setTimeout(() => { pricePopover.hidden = true; }, 120);
}
pricePopover.addEventListener('mouseenter', () => clearTimeout(pricePopoverTimer));
pricePopover.addEventListener('mouseleave', scheduleHidePricePopover);

function addPendingChange(change) {
  pendingChangeBatchId = null;
  sellpiaSaveError = '';
  const duplicate = pendingChanges.find(item => item.sku === change.sku && item.field === change.field);
  if (duplicate) {
    duplicate.after = change.after;
    duplicate.fieldKey = change.fieldKey || duplicate.fieldKey;
    if (String(duplicate.after) === String(duplicate.before)) {
      pendingChanges.splice(pendingChanges.indexOf(duplicate), 1);
    }
  } else {
    pendingChanges.push(change);
  }
  updatePendingChangeUi();
  scheduleSellpiaAutosave();
}

function updatePendingChangeUi(message = '') {
  const total = pendingChanges.length + sellpiaSavingCount;
  pendingCount.textContent = total;
  changeBar.hidden = total === 0;
  const detail = changeBar.querySelector('em');
  if (detail) detail.textContent = message || (sellpiaSaveInFlight
    ? '셀피아 기준값을 Supabase에 자동 저장하고 있습니다.'
    : sellpiaSaveError
      ? `자동 저장 실패 · ${sellpiaSaveError}`
      : '연속 입력을 잠깐 묶은 뒤 Supabase에 자동 저장합니다.');
  const discard = document.getElementById('discard-changes');
  const preview = document.getElementById('preview-changes');
  if (discard) discard.disabled = sellpiaSaveInFlight || pendingChanges.length === 0;
  if (preview) preview.disabled = sellpiaSaveInFlight || pendingChanges.length === 0;
}

function scheduleSellpiaAutosave(delay = SELLPIA_AUTOSAVE_DELAY_MS) {
  clearTimeout(sellpiaAutosaveTimer);
  if (!pendingChanges.length || sellpiaSaveInFlight || !liveData?.saveSellpiaChanges) return;
  sellpiaAutosaveTimer = setTimeout(() => {
    sellpiaAutosaveTimer = null;
    flushPendingSellpiaChanges({automatic:true});
  }, delay);
}

function pendingChangeKey(change) {
  return `${change.sku}\u0000${change.fieldKey || change.field}`;
}

function removeSavedCellState(savedChanges) {
  for (const saved of savedChanges) {
    if (pendingChanges.some(change => pendingChangeKey(change) === pendingChangeKey(saved))) continue;
    const row = matrixBody.querySelector(`tr[data-sku="${CSS.escape(saved.sku)}"]`);
    row?.querySelector(`.sellpia-edit[data-field-key="${CSS.escape(saved.fieldKey)}"]`)?.classList.remove('pending');
  }
}

function restoreFailedChanges(savedChanges) {
  for (const failed of savedChanges) {
    const current = pendingChanges.find(change => pendingChangeKey(change) === pendingChangeKey(failed));
    if (current) current.before = failed.before;
    else pendingChanges.push(failed);
  }
}

function applySavedSellpiaChanges(savedChanges) {
  const updatedAt = new Date().toISOString();
  for (const saved of savedChanges) {
    const product = matrixRowsBySku.get(saved.sku);
    if (!product) continue;
    product[saved.fieldKey] = saved.after;
    if (saved.fieldKey === 'sellpia_own_code') product.own_code = saved.after;
    product.sellpia_override_updated_at = updatedAt;
  }
  const openProduct = matrixRowsBySku.get(productDrawer?.dataset?.sku || '');
  if (openProduct) {
    document.getElementById('drawer-stock').textContent = formatNullableNumber(openProduct.sellpia_current_stock);
    document.getElementById('drawer-price').textContent = formatNullableNumber(openProduct.sellpia_sale_price);
  }
}

async function flushPendingSellpiaChanges({automatic = false} = {}) {
  if (sellpiaSaveInFlight || !pendingChanges.length || !liveData?.saveSellpiaChanges) return null;
  clearTimeout(sellpiaAutosaveTimer);
  sellpiaAutosaveTimer = null;
  const snapshot = pendingChanges.splice(0, pendingChanges.length).map(change => ({...change}));
  const batchId = pendingChangeBatchId || createRequestId();
  pendingChangeBatchId = null;
  sellpiaSaveInFlight = true;
  sellpiaSavingCount = snapshot.length;
  sellpiaSaveError = '';
  updatePendingChangeUi();
  let saved = false;
  try {
    const result = await liveData.saveSellpiaChanges(snapshot, batchId);
    saved = true;
    applySavedSellpiaChanges(snapshot);
    removeSavedCellState(snapshot);
    changeModal.hidden = true;
    const savedBasePrice = snapshot.some(change => change.fieldKey === 'sellpia_sale_price');
    showToast(result.queuedCount
      ? `${result.savedCount}건 DB ${automatic ? '자동 ' : ''}저장 · 판매처 반영 대기 ${result.queuedCount}건 등록 완료`
      : savedBasePrice
        ? `셀피아 기준가 ${result.savedCount}건 DB ${automatic ? '자동 ' : ''}저장 완료 · 판매처별 가격 규칙에서 최종가를 적용해주세요.`
        : `${result.savedCount}건 DB ${automatic ? '자동 ' : ''}저장 완료`);
    if (!pendingChanges.length) {
      void loadLiveDashboardMetrics();
      refreshChangeQueueInBackground();
    }
    return result;
  } catch (error) {
    console.error('sellpia changes save failed', error);
    restoreFailedChanges(snapshot);
    pendingChangeBatchId = batchId;
    sellpiaSaveError = error?.message || String(error);
    showToast(`셀피아 자동 저장 실패: ${sellpiaSaveError}`);
    return null;
  } finally {
    sellpiaSaveInFlight = false;
    sellpiaSavingCount = 0;
    updatePendingChangeUi();
    if (saved && pendingChanges.length) scheduleSellpiaAutosave();
  }
}

function editableMatrixGrid() {
  return [...matrixBody.querySelectorAll('tr[data-sku]')]
    .map(row => [...row.querySelectorAll('.sellpia-edit')]);
}

function matrixCellGrid() {
  return [...matrixBody.querySelectorAll('tr[data-sku]')]
    .map(row => [...row.children].filter(cell => cell.matches('td')));
}

function editableCellPosition(cell, grid = editableMatrixGrid()) {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const columnIndex = grid[rowIndex].indexOf(cell);
    if (columnIndex >= 0) return {rowIndex, columnIndex};
  }
  return null;
}

function matrixCellPosition(cell, grid = matrixCellGrid()) {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const columnIndex = grid[rowIndex].indexOf(cell);
    if (columnIndex >= 0) return {rowIndex, columnIndex};
  }
  return null;
}

function selectionRectangle(grid = matrixCellGrid()) {
  const anchor = matrixCellPosition(matrixCellSelection.anchor, grid);
  const focus = matrixCellPosition(matrixCellSelection.focus, grid);
  if (!anchor || !focus) return null;
  return {
    top:Math.min(anchor.rowIndex, focus.rowIndex),
    bottom:Math.max(anchor.rowIndex, focus.rowIndex),
    left:Math.min(anchor.columnIndex, focus.columnIndex),
    right:Math.max(anchor.columnIndex, focus.columnIndex)
  };
}

function paintMatrixCellSelection() {
  const grid = matrixCellGrid();
  matrixBody.querySelectorAll('td.matrix-cell-selected,td.matrix-cell-anchor').forEach(cell => {
    cell.classList.remove('matrix-cell-selected', 'matrix-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
  const bounds = selectionRectangle(grid);
  if (!bounds) return;
  for (let rowIndex = bounds.top; rowIndex <= bounds.bottom; rowIndex += 1) {
    for (let columnIndex = bounds.left; columnIndex <= bounds.right; columnIndex += 1) {
      const cell = grid[rowIndex]?.[columnIndex];
      if (!cell) continue;
      cell.classList.add('matrix-cell-selected');
      cell.setAttribute('aria-selected', 'true');
    }
  }
  matrixCellSelection.anchor?.classList.add('matrix-cell-anchor');
}

function selectMatrixCell(cell, {extend = false} = {}) {
  if (!cell?.matches('td') || !cell.closest('tr[data-sku]')) return;
  if (!extend || !matrixCellSelection.anchor?.isConnected) matrixCellSelection.anchor = cell;
  matrixCellSelection.focus = cell;
  paintMatrixCellSelection();
}

function clearMatrixCellSelection() {
  matrixCellSelection.dragging = false;
  matrixCellSelection.anchor = null;
  matrixCellSelection.focus = null;
  matrixBody.querySelectorAll('td.matrix-cell-selected,td.matrix-cell-anchor').forEach(cell => {
    cell.classList.remove('matrix-cell-selected', 'matrix-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
  document.body.classList.remove('matrix-cell-selecting');
}

function matrixCellClipboardValue(cell) {
  if (!cell) return '';
  const editable = cell.querySelector('.editable-cell');
  if (editable) return String(editable.dataset.value ?? '');
  if (cell.matches('.select-col,.image-col')) return '';
  const productName = cell.querySelector('.product-cell b,.seller-name-cell b, b');
  const optionName = cell.querySelector('.product-cell em,.seller-name-cell em, em');
  if (productName && optionName) return `${productName.textContent.trim()} / ${optionName.textContent.trim()}`;
  const mappingCode = cell.querySelector('.mapping-code-button');
  if (mappingCode) return mappingCode.textContent.trim();
  return cell.textContent.replace(/\s+/g, ' ').trim();
}

function matrixSelectionClipboardText() {
  const grid = matrixCellGrid();
  const bounds = selectionRectangle(grid);
  if (!bounds) return '';
  const rows = [];
  for (let rowIndex = bounds.top; rowIndex <= bounds.bottom; rowIndex += 1) {
    const values = [];
    for (let columnIndex = bounds.left; columnIndex <= bounds.right; columnIndex += 1) {
      values.push(matrixCellClipboardValue(grid[rowIndex]?.[columnIndex]));
    }
    rows.push(values.join('\t'));
  }
  return rows.join('\n');
}

function normalizePastedRows(text) {
  const rows = String(text || '').replace(/\r/g, '').split('\n');
  if (rows.length > 1 && rows.at(-1) === '') rows.pop();
  return rows.map(row => row.split('\t'));
}

function parseEditableInputValue(value, valueType = 'text') {
  const signedNumber = valueType === 'signed-number';
  const numeric = valueType === 'number' || signedNumber;
  let normalized = String(value ?? '').trim();
  if (numeric) normalized = normalized.replace(/,/g, '');
  const valid = !numeric || (signedNumber
    ? /^-?\d+(\.\d+)?$/.test(normalized)
    : /^\d+(\.\d+)?$/.test(normalized));
  return {value:normalized, numeric, signedNumber, valid};
}

function commitEditableCellValue(cell, value) {
  if (!cell?.matches('.sellpia-edit')) return {changed:false, valid:false};
  const row = cell.closest('tr[data-sku]');
  if (!row) return {changed:false, valid:false};
  const before = String(cell.dataset.value ?? '');
  const parsed = parseEditableInputValue(value, cell.dataset.valueType);
  const {numeric} = parsed;
  const after = parsed.value;
  if (!parsed.valid) return {changed:false, valid:false};
  if (after === before) return {changed:false, valid:true};
  cell.dataset.value = after;
  cell.textContent = numeric ? formatNullableNumber(after) : (after || '-');
  cell.classList.add('pending');
  addPendingChange({
    sku:row.dataset.sku,
    field:cell.dataset.field,
    fieldKey:cell.dataset.fieldKey,
    before,
    after
  });
  if (!pendingChanges.some(item => item.sku === row.dataset.sku && item.field === cell.dataset.field)) {
    cell.classList.remove('pending');
  }
  return {changed:true, valid:true};
}

function isClipboardTypingTarget(target) {
  return Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"],.inline-editor'));
}

matrixBody.addEventListener('mousedown', event => {
  if (event.target.closest('.row-check,.inline-editor,[data-open-multi-link]')) return;
  const cell = event.target.closest('td');
  if (!cell || event.button !== 0) return;
  selectMatrixCell(cell, {extend:event.shiftKey});
  if (isClipboardTypingTarget(document.activeElement)) document.activeElement.blur();
  matrixCellSelection.dragging = true;
  document.body.classList.add('matrix-cell-selecting');
  event.preventDefault();
});

matrixBody.addEventListener('mouseover', event => {
  if (!matrixCellSelection.dragging) return;
  const cell = event.target.closest('td');
  if (!cell || cell === matrixCellSelection.focus) return;
  matrixCellSelection.focus = cell;
  paintMatrixCellSelection();
});

document.addEventListener('mouseup', () => {
  matrixCellSelection.dragging = false;
  document.body.classList.remove('matrix-cell-selecting');
});

document.addEventListener('copy', event => {
  if (!matrixCellSelection.anchor?.isConnected || isClipboardTypingTarget(document.activeElement)) return;
  const text = matrixSelectionClipboardText();
  if (!text) return;
  event.clipboardData?.setData('text/plain', text);
  event.preventDefault();
  const bounds = selectionRectangle();
  const count = bounds ? (bounds.bottom - bounds.top + 1) * (bounds.right - bounds.left + 1) : 0;
  showToast(`${count}개 셀을 복사했습니다.`);
});

document.addEventListener('paste', event => {
  if (!matrixCellSelection.anchor?.isConnected || isClipboardTypingTarget(document.activeElement)) return;
  const text = event.clipboardData?.getData('text/plain');
  if (!text) return;
  event.preventDefault();
  const grid = editableMatrixGrid();
  const anchorEditableCell = matrixCellSelection.anchor.querySelector('.sellpia-edit');
  const anchor = editableCellPosition(anchorEditableCell, grid);
  if (!anchor) {
    showToast('붙여넣기는 자사코드·현재재고·판매가 셀에서 시작해주세요.');
    return;
  }
  const pastedRows = normalizePastedRows(text);
  let changed = 0;
  let invalid = 0;
  let overflow = 0;
  let lastCell = matrixCellSelection.anchor;
  pastedRows.forEach((values, rowOffset) => values.forEach((value, columnOffset) => {
    const cell = grid[anchor.rowIndex + rowOffset]?.[anchor.columnIndex + columnOffset];
    if (!cell) {
      overflow += 1;
      return;
    }
    const result = commitEditableCellValue(cell, value);
    if (!result.valid) invalid += 1;
    if (result.changed) changed += 1;
    lastCell = cell.closest('td');
  }));
  matrixCellSelection.focus = lastCell;
  paintMatrixCellSelection();
  const notes = [invalid ? `형식 오류 ${invalid}개 제외` : '', overflow ? `현재 페이지 밖 ${overflow}개 제외` : ''].filter(Boolean);
  showToast(`${changed}개 셀을 붙여넣었습니다.${notes.length ? ` · ${notes.join(' · ')}` : ''}`);
});

function clearPendingChanges() {
  clearTimeout(sellpiaAutosaveTimer);
  sellpiaAutosaveTimer = null;
  pendingChanges.length = 0;
  pendingChangeBatchId = null;
  sellpiaSaveError = '';
  updatePendingChangeUi();
  document.querySelectorAll('.editable-cell.pending').forEach(cell => cell.classList.remove('pending'));
}

function updateSelectedCount() {
  const count = document.querySelectorAll('.row-check:checked').length;
  document.getElementById('selected-count').textContent = count;
}

const viewSettingsModal = document.getElementById('view-settings-modal');
function fillViewSettingsForm(view = activeView) {
  document.getElementById('preset-name').value = view.name || '';
  document.getElementById('preset-channel-smartstore').checked = view.channels.smartstore;
  document.getElementById('preset-channel-makeshop').checked = view.channels.makeshop;
  document.getElementById('preset-channel-ably').checked = view.channels.ably;
  document.getElementById('preset-show-status').checked = view.showStatus ?? view.showMapping ?? true;
  document.getElementById('preset-show-codes').checked = view.showCodes ?? view.showMapping ?? true;
  document.getElementById('preset-show-seller-names').checked = view.showSellerNames ?? true;
  document.getElementById('preset-show-inventory').checked = view.showInventory;
  document.getElementById('preset-show-price').checked = view.showPrice;
  document.getElementById('preset-show-attributes').checked = view.showAttributes;
  document.getElementById('preset-show-sync').checked = view.showSync;
  document.getElementById('preset-wrap-names').checked = Boolean(view.wrapNames);
  document.getElementById('preset-status').value = view.status;
  document.getElementById('preset-sort').value = view.sort;
  document.getElementById('preset-zoom').value = String(view.zoom);
  document.getElementById('preset-image-size').value = view.imageSize || 'default';
  const editablePresetId = activePresetId === 'temporary' ? modifiedPresetSourceId : activePresetId;
  document.getElementById('delete-preset').hidden = !customPresets.some(item => item.id === editablePresetId);
}

function readViewSettingsForm() {
  return {
    name:document.getElementById('preset-name').value.trim() || '사용자 보기',
    channels:{
      smartstore:document.getElementById('preset-channel-smartstore').checked,
      makeshop:document.getElementById('preset-channel-makeshop').checked,
      ably:document.getElementById('preset-channel-ably').checked
    },
    showStatus:document.getElementById('preset-show-status').checked,
    showCodes:document.getElementById('preset-show-codes').checked,
    showSellerNames:document.getElementById('preset-show-seller-names').checked,
    showInventory:document.getElementById('preset-show-inventory').checked,
    showPrice:document.getElementById('preset-show-price').checked,
    showAttributes:document.getElementById('preset-show-attributes').checked,
    showSync:document.getElementById('preset-show-sync').checked,
    wrapNames:document.getElementById('preset-wrap-names').checked,
    status:document.getElementById('preset-status').value,
    sort:document.getElementById('preset-sort').value,
    zoom:Number(document.getElementById('preset-zoom').value) || 100,
    imageSize:document.getElementById('preset-image-size').value,
    advancedFilter:cloneAdvancedFilter(activeView.advancedFilter)
  };
}

function openViewSettings() {
  fillViewSettingsForm(activeView);
  viewSettingsModal.hidden = false;
  document.getElementById('preset-name').focus();
}

function closeViewSettings() {
  viewSettingsModal.hidden = true;
}

function nextCustomPresetId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
}

function uniquePresetName(baseName) {
  const names = new Set(customPresets.map(item => item.name));
  if (!names.has(baseName)) return baseName;
  let number = 2;
  while (names.has(`${baseName} ${number}`)) number += 1;
  return `${baseName} ${number}`;
}

document.getElementById('view-settings-btn').addEventListener('click', openViewSettings);
document.getElementById('close-view-settings').addEventListener('click', closeViewSettings);
viewSettingsModal.addEventListener('click', event => { if (event.target === viewSettingsModal) closeViewSettings(); });
document.getElementById('apply-view-settings').addEventListener('click', () => {
  const draft = readViewSettingsForm();
  markViewModified();
  applyViewPreset(draft, {id:null});
  closeViewSettings();
});
document.getElementById('save-view-preset').addEventListener('click', () => {
  const draft = readViewSettingsForm();
  const editablePresetId = activePresetId === 'temporary' ? modifiedPresetSourceId : activePresetId;
  const existingIndex = customPresets.findIndex(item => item.id === editablePresetId);
  const id = existingIndex >= 0 ? editablePresetId : nextCustomPresetId();
  const saved = {...draft, id, name:existingIndex >= 0 ? draft.name : uniquePresetName(draft.name)};
  if (existingIndex >= 0) customPresets.splice(existingIndex, 1, saved);
  else customPresets.push(saved);
  saveCustomPresets();
  applyViewPreset(saved, {id});
  closeViewSettings();
  showToast(`${saved.name} 프리셋을 이 PC에 저장했습니다.`);
});
document.getElementById('duplicate-preset').addEventListener('click', () => {
  const draft = readViewSettingsForm();
  const duplicate = {...draft, id:nextCustomPresetId(), name:uniquePresetName(`${draft.name} 복사본`)};
  customPresets.push(duplicate);
  saveCustomPresets();
  applyViewPreset(duplicate, {id:duplicate.id});
  closeViewSettings();
  showToast(`${duplicate.name} 프리셋을 만들었습니다.`);
});
document.getElementById('delete-preset').addEventListener('click', () => {
  const editablePresetId = activePresetId === 'temporary' ? modifiedPresetSourceId : activePresetId;
  const preset = customPresets.find(item => item.id === editablePresetId);
  if (!preset || !window.confirm(`${preset.name} 프리셋을 이 PC에서 삭제할까요?`)) return;
  customPresets = customPresets.filter(item => item.id !== preset.id);
  saveCustomPresets();
  closeViewSettings();
  applyViewPreset(BUILTIN_PRESETS.all, {id:'all'});
  showToast(`${preset.name} 프리셋을 삭제했습니다.`);
});

const advancedFilterModal = document.getElementById('advanced-filter-modal');
const advancedFilterRows = document.getElementById('advanced-filter-rows');
let advancedFilterDraft = cloneAdvancedFilter(activeView.advancedFilter);

function advancedFilterField(field) {
  return ADVANCED_FILTER_FIELDS.find(item => item.field === field) || ADVANCED_FILTER_FIELDS[0];
}

function advancedFilterFieldOptions(selectedField) {
  const groups = new Map();
  ADVANCED_FILTER_FIELDS.forEach(item => {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  });
  return [...groups.entries()].map(([group, fields]) => `<optgroup label="${escapeHtml(group)}">${fields.map(item => `<option value="${item.field}"${item.field === selectedField ? ' selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</optgroup>`).join('');
}

function advancedFilterOperatorOptions(type, selectedOperator) {
  return (ADVANCED_FILTER_OPERATORS[type] || ADVANCED_FILTER_OPERATORS.text).map(([value, label]) => `<option value="${value}"${value === selectedOperator ? ' selected' : ''}>${label}</option>`).join('');
}

function advancedFilterValueControl(condition, fieldInfo, index) {
  const noValue = ['empty','not_empty'].includes(condition.operator);
  if (fieldInfo.type === 'status') {
    const options = [['connected','연결 완료'],['review','검토 필요'],['unmatched','미매칭']];
    return `<select class="advanced-filter-value" data-filter-part="value" data-filter-index="${index}">${options.map(([value, label]) => `<option value="${value}"${value === condition.value ? ' selected' : ''}>${label}</option>`).join('')}</select>`;
  }
  const inputMode = fieldInfo.type === 'number' ? 'decimal' : 'text';
  const placeholder = fieldInfo.type === 'number' ? '숫자 입력' : '비교할 텍스트 입력';
  return `<input class="advanced-filter-value" data-filter-part="value" data-filter-index="${index}" inputmode="${inputMode}" value="${escapeHtml(condition.value || '')}" placeholder="${noValue ? '비교값 불필요' : placeholder}"${noValue ? ' disabled' : ''}>`;
}

function renderAdvancedFilterRows() {
  advancedFilterRows.innerHTML = advancedFilterDraft.conditions.map((rawCondition, index) => {
    const fieldInfo = advancedFilterField(rawCondition.field);
    const operators = ADVANCED_FILTER_OPERATORS[fieldInfo.type] || ADVANCED_FILTER_OPERATORS.text;
    const operator = operators.some(([value]) => value === rawCondition.operator) ? rawCondition.operator : operators[0][0];
    const condition = {...rawCondition, field:fieldInfo.field, operator};
    advancedFilterDraft.conditions[index] = condition;
    return `<div class="advanced-filter-row" data-filter-index="${index}">
      <select data-filter-part="field" data-filter-index="${index}" aria-label="필터 필드">${advancedFilterFieldOptions(condition.field)}</select>
      <select data-filter-part="operator" data-filter-index="${index}" aria-label="필터 조건">${advancedFilterOperatorOptions(fieldInfo.type, condition.operator)}</select>
      ${advancedFilterValueControl(condition, fieldInfo, index)}
      <button class="advanced-filter-remove" type="button" data-filter-remove="${index}" aria-label="조건 삭제">×</button>
    </div>`;
  }).join('') || '<div class="drawer-empty-state"><b>설정된 조건이 없습니다.</b><span>조건 추가를 눌러 상세 필터를 만드세요.</span></div>';
  document.getElementById('advanced-filter-add').disabled = advancedFilterDraft.conditions.length >= 12;
}

function advancedFilterOperatorLabel(type, operator) {
  return (ADVANCED_FILTER_OPERATORS[type] || []).find(([value]) => value === operator)?.[1] || operator;
}

function advancedFilterConditionLabel(condition) {
  const fieldInfo = advancedFilterField(condition.field);
  const operator = advancedFilterOperatorLabel(fieldInfo.type, condition.operator);
  const statusLabels = {connected:'연결 완료', review:'검토 필요', unmatched:'미매칭'};
  const value = ['empty','not_empty'].includes(condition.operator) ? '' : ` ${statusLabels[condition.value] || condition.value}`;
  return `${fieldInfo.group} ${fieldInfo.label} · ${operator}${value}`;
}

function renderAdvancedFilterBar() {
  const filter = cloneAdvancedFilter(matrixState.advancedFilter);
  const count = filter.conditions.length;
  const button = document.getElementById('advanced-filter-btn');
  const bar = document.getElementById('advanced-filter-bar');
  document.getElementById('advanced-filter-count').textContent = String(count);
  button.classList.toggle('active', count > 0);
  button.disabled = matrixState.codeListRows.length > 0;
  button.title = button.disabled ? '엑셀 코드목록 보기에서는 업로드 행 순서를 우선합니다.' : '상품명·가격·재고·상태·태그 조건을 조합합니다.';
  bar.hidden = count === 0;
  document.getElementById('advanced-filter-logic-label').textContent = filter.logic === 'or' ? '하나 이상 만족' : '모두 만족';
  document.getElementById('advanced-filter-chips').innerHTML = filter.conditions.map((condition, index) => `<span class="advanced-filter-chip">${escapeHtml(advancedFilterConditionLabel(condition))}<button type="button" data-filter-chip-remove="${index}" aria-label="조건 해제">×</button></span>`).join('');
}

function validateAdvancedFilter(filter) {
  if (filter.conditions.length > 12) return '상세 필터는 최대 12개까지 사용할 수 있습니다.';
  for (const condition of filter.conditions) {
    const fieldInfo = ADVANCED_FILTER_FIELDS.find(item => item.field === condition.field);
    if (!fieldInfo) return '선택할 수 없는 필드가 포함되어 있습니다.';
    const operators = ADVANCED_FILTER_OPERATORS[fieldInfo.type] || [];
    if (!operators.some(([value]) => value === condition.operator)) return `${fieldInfo.label} 조건을 다시 선택해주세요.`;
    if (!['empty','not_empty'].includes(condition.operator) && !String(condition.value || '').trim()) return `${fieldInfo.group} ${fieldInfo.label}의 비교값을 입력해주세요.`;
    if (fieldInfo.type === 'number' && !['empty','not_empty'].includes(condition.operator) && !Number.isFinite(Number(condition.value))) return `${fieldInfo.group} ${fieldInfo.label}에는 숫자를 입력해주세요.`;
  }
  return '';
}

function openAdvancedFilter() {
  if (matrixState.codeListRows.length) {
    showToast('엑셀 코드목록 보기를 해제한 뒤 상세 필터를 사용해주세요.');
    return;
  }
  advancedFilterDraft = cloneAdvancedFilter(matrixState.advancedFilter);
  if (!advancedFilterDraft.conditions.length) advancedFilterDraft.conditions.push({field:'sellpia_product_name', operator:'contains', value:''});
  document.getElementById('advanced-filter-logic').value = advancedFilterDraft.logic;
  renderAdvancedFilterRows();
  advancedFilterModal.hidden = false;
  advancedFilterRows.querySelector('input:not(:disabled),select')?.focus();
}

function closeAdvancedFilter() {
  advancedFilterModal.hidden = true;
}

function setAdvancedFilter(filter, {reload = true, announce = true} = {}) {
  const normalized = cloneAdvancedFilter(filter);
  activeView.advancedFilter = cloneAdvancedFilter(normalized);
  matrixState.advancedFilter = normalized;
  markViewModified();
  renderAdvancedFilterBar();
  if (reload) loadLiveMatrix({resetPage:true});
  if (announce) showToast(normalized.conditions.length ? `상세 조건 ${normalized.conditions.length}개를 적용했습니다.` : '상세 필터를 모두 해제했습니다.');
}

document.getElementById('advanced-filter-btn').addEventListener('click', openAdvancedFilter);
document.getElementById('advanced-filter-close').addEventListener('click', closeAdvancedFilter);
document.getElementById('advanced-filter-cancel').addEventListener('click', closeAdvancedFilter);
advancedFilterModal.addEventListener('click', event => { if (event.target === advancedFilterModal) closeAdvancedFilter(); });
document.getElementById('advanced-filter-logic').addEventListener('change', event => { advancedFilterDraft.logic = event.target.value === 'or' ? 'or' : 'and'; });
document.getElementById('advanced-filter-add').addEventListener('click', () => {
  if (advancedFilterDraft.conditions.length >= 12) return;
  advancedFilterDraft.conditions.push({field:'sellpia_product_name', operator:'contains', value:''});
  renderAdvancedFilterRows();
  advancedFilterRows.querySelector(`[data-filter-index="${advancedFilterDraft.conditions.length - 1}"][data-filter-part="field"]`)?.focus();
});
document.getElementById('advanced-filter-reset').addEventListener('click', () => {
  advancedFilterDraft = {logic:'and', conditions:[]};
  document.getElementById('advanced-filter-logic').value = 'and';
  renderAdvancedFilterRows();
});
document.getElementById('advanced-filter-apply').addEventListener('click', () => {
  const normalized = cloneAdvancedFilter(advancedFilterDraft);
  const error = validateAdvancedFilter(normalized);
  if (error) { showToast(error); return; }
  setAdvancedFilter(normalized);
  closeAdvancedFilter();
});
advancedFilterRows.addEventListener('input', event => {
  const index = Number(event.target.dataset.filterIndex);
  const part = event.target.dataset.filterPart;
  if (!Number.isInteger(index) || !part || !advancedFilterDraft.conditions[index]) return;
  advancedFilterDraft.conditions[index][part] = event.target.value;
});
advancedFilterRows.addEventListener('change', event => {
  const index = Number(event.target.dataset.filterIndex);
  const part = event.target.dataset.filterPart;
  if (!Number.isInteger(index) || !part || !advancedFilterDraft.conditions[index]) return;
  advancedFilterDraft.conditions[index][part] = event.target.value;
  if (part === 'field') {
    const fieldInfo = advancedFilterField(event.target.value);
    advancedFilterDraft.conditions[index].operator = ADVANCED_FILTER_OPERATORS[fieldInfo.type][0][0];
    advancedFilterDraft.conditions[index].value = fieldInfo.type === 'status' ? 'connected' : '';
  }
  if (part === 'operator' && ['empty','not_empty'].includes(event.target.value)) advancedFilterDraft.conditions[index].value = '';
  if (part !== 'value') renderAdvancedFilterRows();
});
advancedFilterRows.addEventListener('click', event => {
  const button = event.target.closest('[data-filter-remove]');
  if (!button) return;
  advancedFilterDraft.conditions.splice(Number(button.dataset.filterRemove), 1);
  renderAdvancedFilterRows();
});
document.getElementById('advanced-filter-chips').addEventListener('click', event => {
  const button = event.target.closest('[data-filter-chip-remove]');
  if (!button) return;
  const filter = cloneAdvancedFilter(matrixState.advancedFilter);
  filter.conditions.splice(Number(button.dataset.filterChipRemove), 1);
  setAdvancedFilter(filter);
});
document.getElementById('advanced-filter-clear').addEventListener('click', () => setAdvancedFilter({logic:'and', conditions:[]}));

matrixBody.addEventListener('click', event => {
  const multiLinkButton = event.target.closest('[data-open-multi-link]');
  if (multiLinkButton) {
    openMultiLinkWorkspace(multiLinkButton.dataset.openMultiLink, multiLinkButton.dataset.linkSku);
    return;
  }
  const mappingButton = event.target.closest('.mapping-code-button');
  if (mappingButton) {
    const row = mappingButton.closest('tr[data-sku]');
    openMappingSearch({
      source:mappingButton.dataset.linkSource,
      sku:row.dataset.sku,
      anchor:mappingButton,
      initialQuery:mappingButton.textContent.trim()
    });
    return;
  }
  if (event.target.closest('.row-check')) return;
  const cell = event.target.closest('td');
  if (cell) selectMatrixCell(cell, {extend:event.shiftKey});
});

matrixBody.addEventListener('mouseover', event => {
  const target = event.target.closest('.price-hover-target');
  if (target && !target.contains(event.relatedTarget)) showPricePopover(target);
});
matrixBody.addEventListener('mouseout', event => {
  const target = event.target.closest('.price-hover-target');
  if (target && !target.contains(event.relatedTarget)) scheduleHidePricePopover();
});
matrixBody.addEventListener('focusin', event => {
  const target = event.target.closest('.price-hover-target');
  if (target) showPricePopover(target);
});
matrixBody.addEventListener('focusout', event => {
  if (event.target.closest('.price-hover-target')) scheduleHidePricePopover();
});

matrixBody.addEventListener('dblclick', event => {
  if (event.target.closest('.mapping-code-button,.row-check')) return;
  const tableCell = event.target.closest('td');
  const cell = event.target.closest('.editable-cell') || tableCell?.querySelector('.sellpia-edit');
  if (!cell) {
    const row = event.target.closest('tr[data-sku]');
    if (row) openProductDrawer(row);
    return;
  }
  if (cell.querySelector('input')) return;
  const before = cell.dataset.value ?? cell.textContent.trim();
  const beforeHtml = cell.innerHTML;
  const valueType = cell.dataset.valueType || 'text';
  const {numeric, signedNumber} = parseEditableInputValue(before, valueType);
  const input = document.createElement('input');
  input.className = `inline-editor${numeric ? '' : ' text-editor'}`;
  input.value = before;
  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  input.select();
  let completed = false;
  const finish = async save => {
    if (completed) return;
    completed = true;
    const parsed = parseEditableInputValue(save ? input.value : before, valueType);
    let after = parsed.value;
    if (save && !parsed.valid) {
      showToast(signedNumber ? '옵션가는 음수를 포함한 숫자로 입력해주세요.' : '재고와 최종판가는 0 이상의 숫자로 입력해주세요.');
      after = before;
      save = false;
    }
    if (save && after !== before) {
      if (cell.dataset.source === 'sellpia') {
        commitEditableCellValue(cell, after);
        return;
      }
      cell.dataset.value = after;
      cell.textContent = formatNullableNumber(after);
      cell.classList.add('pending');
      cell.disabled = true;
      try {
        const row = cell.closest('tr[data-sku]');
        const product = matrixRowsBySku.get(row.dataset.sku);
        const priceComponent = cell.dataset.priceComponent;
        const result = priceComponent
          ? await liveData.saveSellerPriceDraft({
              sku:row.dataset.sku,
              source:cell.dataset.source,
              targetFinalPrice:priceComponent === 'final' ? after : cell.dataset.targetFinal,
              optionPrice:priceComponent === 'option' ? after : cell.dataset.optionPrice,
              optionPriceSource:priceComponent === 'option' ? 'manual' : (product?.__sellerPriceComponents?.[cell.dataset.source]?.option_price_source || 'original')
            })
          : await liveData.saveSellerValueDraft({
              sku:row.dataset.sku,
              source:cell.dataset.source,
              fieldKey:cell.dataset.fieldKey,
              after
            });
        if (priceComponent) applyLocalSellerPriceDraft(product, cell.dataset.source, result);
        else applyLocalSellerDraft(product, cell.dataset.source, cell.dataset.fieldKey, after, result);
        showToast(result?.draft_status === 'unchanged'
          ? `${cell.dataset.field} 수정안을 취소했습니다.`
          : `${cell.dataset.field} 수정안을 매트릭스에 저장했습니다.`);
        renderLiveMatrixRows(matrixState.rows);
        refreshChangeQueueInBackground();
        void loadLiveDashboardMetrics();
      } catch (error) {
        console.error('seller draft save failed', error);
        cell.dataset.value = before;
        cell.innerHTML = beforeHtml;
        cell.classList.remove('pending');
        cell.disabled = false;
        showToast(`판매처 수정안 저장 실패: ${error?.message || error}`);
      }
      return;
    }
    cell.dataset.value = before;
    if (cell.classList.contains('price-layer-cell')) cell.innerHTML = beforeHtml;
    else cell.textContent = numeric ? formatNullableNumber(before) : (before || '-');
  };
  input.addEventListener('keydown', keyEvent => {
    if (keyEvent.key === 'Enter') finish(true);
    if (keyEvent.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
});

['dragenter','dragover'].forEach(type => matrixBody.addEventListener(type, event => {
  const cell = event.target.closest('.image-drop-cell');
  if (!cell) return;
  event.preventDefault();
  cell.classList.add('drag-over');
}));

['dragleave','drop'].forEach(type => matrixBody.addEventListener(type, async event => {
  const cell = event.target.closest('.image-drop-cell');
  if (!cell) return;
  event.preventDefault();
  cell.classList.remove('drag-over');
  if (type !== 'drop') return;
  const file = [...(event.dataTransfer?.files || [])].find(item => item.type.startsWith('image/'));
  if (!file) {
    showToast('이미지 파일을 해당 셀에 놓아주세요.');
    return;
  }
  const sku = cell.dataset.imageDrop;
  cell.classList.add('uploading');
  cell.innerHTML = '<span class="product-thumb gray">···</span><span class="image-drop-hint">저장 중</span>';
  try {
    const result = await liveData.uploadSellpiaImage(sku, file);
    const product = matrixRowsBySku.get(sku);
    if (product) product.sellpia_override_image_url = result.url;
    cell.closest('tr').dataset.image = result.url;
    cell.innerHTML = matrixImage({sellpia_sku_code:sku, sellpia_override_image_url:result.url}) + '<span class="image-drop-hint">DROP</span>';
    showToast(`${sku}.jpg로 사진을 저장했습니다.`);
  } catch (error) {
    console.error('sellpia image upload failed', error);
    const product = matrixRowsBySku.get(sku) || {sellpia_sku_code:sku};
    cell.innerHTML = matrixImage(product) + '<span class="image-drop-hint">DROP</span>';
    showToast(`사진 저장 실패: ${error?.message || error}`);
  } finally {
    cell.classList.remove('uploading');
  }
}));

const codeListModal = document.getElementById('code-list-modal');
const codeListFileInput = document.getElementById('code-list-file');
const codeListDropzone = document.getElementById('code-list-dropzone');
const codeListProgress = document.getElementById('code-list-progress');
const codeListResult = document.getElementById('code-list-result');
const codeListApply = document.getElementById('code-list-apply');
const codeListFilterPill = document.getElementById('code-list-filter-pill');
const codeListSearchInput = document.getElementById('matrix-search');
const matrixSearchSourceInputs = [...document.querySelectorAll('#matrix-search-sources input[type="checkbox"]')];
const codeListSession = {fileName:'', entries:[], invalid:[], resolved:[], skus:[], resultRows:[]};
const CODE_LIST_SOURCES = [
  {key:'sellpia', label:'셀피아', aliases:['셀피아','셀피아sku','셀피아코드']},
  {key:'smartstore', label:'스마트스토어', aliases:['스마트스토어','스마트스토어상품코드','스마트스토어코드']},
  {key:'makeshop', label:'메이크샵', aliases:['메이크샵','메이크샵상품코드','메이크샵코드']},
  {key:'ably', label:'에이블리', aliases:['에이블리','에이블리상품코드','에이블리코드']}
];

function normalizeCodeListHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_\-\/]/g, '');
}

function createRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.random() * 16 | 0;
    const value = character === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

function resetCodeListImport() {
  codeListSession.fileName = '';
  codeListSession.entries = [];
  codeListSession.invalid = [];
  codeListSession.resolved = [];
  codeListSession.skus = [];
  codeListSession.resultRows = [];
  codeListFileInput.value = '';
  codeListProgress.hidden = true;
  codeListResult.hidden = true;
  codeListApply.disabled = true;
  codeListDropzone.disabled = false;
  codeListDropzone.innerHTML = '<strong>엑셀 파일을 놓거나 선택하세요</strong><span>XLSX · XLS · CSV / 첫 번째 시트 사용</span>';
}

function openCodeListModal() {
  resetCodeListImport();
  codeListModal.hidden = false;
}

function closeCodeListModal() {
  codeListModal.hidden = true;
}

function setCodeListProgress(percent, title, detail) {
  codeListProgress.hidden = false;
  document.getElementById('code-list-progress-title').textContent = title;
  document.getElementById('code-list-progress-detail').textContent = detail;
  document.getElementById('code-list-progress-bar').style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function parseCodeListRows(rows) {
  const headerIndex = rows.findIndex((row, index) => {
    if (index > 14) return false;
    const headers = (row || []).map(normalizeCodeListHeader);
    return CODE_LIST_SOURCES.every(source => source.aliases.some(alias => headers.includes(normalizeCodeListHeader(alias))));
  });
  if (headerIndex < 0) throw new Error('셀피아·스마트스토어·메이크샵·에이블리 4개 헤더를 찾지 못했습니다.');
  const headers = (rows[headerIndex] || []).map(normalizeCodeListHeader);
  const indexes = Object.fromEntries(CODE_LIST_SOURCES.map(source => [
    source.key,
    headers.findIndex(header => source.aliases.some(alias => header === normalizeCodeListHeader(alias)))
  ]));
  const entries = [];
  const invalid = [];
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const rowNo = headerIndex + offset + 2;
    const values = CODE_LIST_SOURCES.map(source => ({
      source:source.key,
      label:source.label,
      code:String(row?.[indexes[source.key]] ?? '').trim()
    })).filter(item => item.code);
    if (!values.length) return;
    if (values.length > 1) {
      invalid.push({input_row:rowNo, source_channel:values.map(item => item.label).join(', '), input_code:values.map(item => item.code).join(' / '), reason:'한 행에 코드가 여러 개 있음'});
      return;
    }
    entries.push({row_no:rowNo, source:values[0].source, code:values[0].code});
  });
  if (!entries.length && !invalid.length) throw new Error('헤더 아래에 확인할 코드가 없습니다.');
  return {entries, invalid};
}

function codeListIssueLabel(status) {
  return status === 'unmapped' ? '매핑 필요' : status === 'invalid_source' ? '판매처 오류' : '코드 없음';
}

function renderCodeListResult() {
  const matchedSkus = [];
  const seenSkus = new Set();
  const grouped = new Map();
  for (const item of codeListSession.resolved) {
    if (!grouped.has(item.input_row)) grouped.set(item.input_row, []);
    grouped.get(item.input_row).push(item);
    if (item.match_status === 'matched' && item.sellpia_sku_code && !seenSkus.has(item.sellpia_sku_code)) {
      seenSkus.add(item.sellpia_sku_code);
      matchedSkus.push(item.sellpia_sku_code);
    }
  }
  const issues = [...codeListSession.invalid];
  for (const items of grouped.values()) {
    if (items.some(item => item.match_status === 'matched')) continue;
    const item = items[0];
    issues.push({
      input_row:item.input_row,
      source_channel:CODE_LIST_SOURCES.find(source => source.key === item.source_channel)?.label || item.source_channel,
      input_code:item.input_code,
      reason:codeListIssueLabel(item.match_status)
    });
  }
  codeListSession.skus = matchedSkus;
  codeListSession.resultRows = [
    ...codeListSession.resolved.map((item, sourceOrder) => ({
      ...item,
      source_order:sourceOrder,
      reason:item.match_status === 'matched' ? '' : codeListIssueLabel(item.match_status)
    })),
    ...codeListSession.invalid.map((item, sourceOrder) => ({
      ...item,
      source_order:codeListSession.resolved.length + sourceOrder,
      match_status:'invalid_row',
      sellpia_sku_code:null
    }))
  ]
    .sort((left, right) => Number(left.input_row) - Number(right.input_row) || left.source_order - right.source_order)
    .map((item, resultOrder) => ({...item, result_order:resultOrder + 1}));
  const unmappedCount = issues.filter(item => item.reason === '매핑 필요').length;
  const missingCount = issues.length - unmappedCount;
  document.getElementById('code-list-input-count').textContent = formatNumber(codeListSession.entries.length + codeListSession.invalid.length);
  document.getElementById('code-list-match-count').textContent = formatNumber(matchedSkus.length);
  document.getElementById('code-list-unmapped-count').textContent = formatNumber(unmappedCount);
  document.getElementById('code-list-missing-count').textContent = formatNumber(missingCount);
  document.getElementById('code-list-issues').innerHTML = issues.length
    ? issues.slice(0, 200).map(item => `<article><b>${formatNumber(item.input_row)}행</b><em>${escapeHtml(item.source_channel)}</em><em title="${escapeHtml(item.input_code)}">${escapeHtml(item.input_code)}</em><span>${escapeHtml(item.reason)}</span></article>`).join('')
    : '<div class="mapping-empty"><b>모든 코드가 매칭되었습니다.</b><span>엑셀 행 순서대로 매트릭스에 표시할 수 있습니다.</span></div>';
  codeListResult.hidden = false;
  codeListApply.disabled = !codeListSession.resultRows.length;
}

async function importCodeListFile(file) {
  if (!file) return;
  if (!window.XLSX) {
    showToast('엑셀 읽기 모듈을 불러오지 못했습니다.');
    return;
  }
  codeListDropzone.disabled = true;
  codeListSession.fileName = file.name;
  codeListDropzone.innerHTML = `<strong>${escapeHtml(file.name)}</strong><span>코드와 헤더를 확인하고 있습니다.</span>`;
  setCodeListProgress(12, '파일 읽는 중', file.name);
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:false});
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {header:1, raw:false, defval:''});
    setCodeListProgress(35, '행 구조 확인 중', `${formatNumber(rows.length)}행`);
    const parsed = parseCodeListRows(rows);
    codeListSession.entries = parsed.entries;
    codeListSession.invalid = parsed.invalid;
    setCodeListProgress(58, 'DB에서 코드 연결 확인 중', `${formatNumber(parsed.entries.length)}개 코드`);
    codeListSession.resolved = await liveData.resolveCodeEntries(parsed.entries);
    setCodeListProgress(100, '코드 확인 완료', `${formatNumber(codeListSession.resolved.length)}개 연결 결과`);
    renderCodeListResult();
  } catch (error) {
    console.error('code list import failed', error);
    setCodeListProgress(100, '불러오기 실패', error?.message || String(error));
    codeListDropzone.disabled = false;
    codeListApply.disabled = true;
  }
}

function updateCodeListFilterUi() {
  const active = matrixState.codeListRows.length > 0;
  codeListFilterPill.hidden = !active;
  document.getElementById('code-list-filter-count').textContent = active ? `${formatNumber(matrixState.codeListRows.length)}개 결과` : '0개 결과';
  document.getElementById('code-list-open').classList.toggle('active', active);
  codeListSearchInput.disabled = active;
  document.getElementById('matrix-status-filter').disabled = active;
  matrixSearchSourceInputs.forEach(input => { input.disabled = active; });
  codeListSearchInput.placeholder = active
    ? `${matrixState.codeListName || '엑셀 목록'} 순서로 모아보는 중`
    : 'SKU / 자사코드 / 상품명 / 상품코드-옵션코드 검색';
  renderAdvancedFilterBar();
}

function clearCodeListFilter() {
  matrixState.codeListSkus = [];
  matrixState.codeListRows = [];
  matrixState.codeListName = '';
  matrixState.search = '';
  codeListSearchInput.value = '';
  updateCodeListFilterUi();
  loadLiveMatrix({resetPage:true});
}

document.getElementById('code-list-open').addEventListener('click', openCodeListModal);
document.getElementById('code-list-close').addEventListener('click', closeCodeListModal);
document.getElementById('code-list-cancel').addEventListener('click', closeCodeListModal);
document.getElementById('code-list-reset').addEventListener('click', () => {
  resetCodeListImport();
  codeListFileInput.click();
});
codeListDropzone.addEventListener('click', () => codeListFileInput.click());
codeListFileInput.addEventListener('change', () => importCodeListFile(codeListFileInput.files?.[0]));
['dragenter','dragover'].forEach(type => codeListDropzone.addEventListener(type, event => {
  event.preventDefault();
  codeListDropzone.classList.add('drag-over');
}));
['dragleave','drop'].forEach(type => codeListDropzone.addEventListener(type, event => {
  event.preventDefault();
  codeListDropzone.classList.remove('drag-over');
  if (type === 'drop') importCodeListFile(event.dataTransfer?.files?.[0]);
}));
codeListApply.addEventListener('click', () => {
  if (!codeListSession.resultRows.length) return;
  if (matrixState.advancedFilter.conditions.length) {
    activeView.advancedFilter = {logic:'and', conditions:[]};
    matrixState.advancedFilter = {logic:'and', conditions:[]};
    markViewModified();
  }
  matrixState.codeListSkus = [...codeListSession.skus];
  matrixState.codeListRows = codeListSession.resultRows.map(item => ({...item}));
  matrixState.codeListName = codeListSession.fileName;
  matrixState.search = '';
  codeListSearchInput.value = '';
  updateCodeListFilterUi();
  closeCodeListModal();
  loadLiveMatrix({resetPage:true});
  showToast(`${formatNumber(codeListSession.entries.length + codeListSession.invalid.length)}개 입력 행을 ${formatNumber(matrixState.codeListRows.length)}개 결과 행으로 펼쳤습니다.`);
});
codeListFilterPill.addEventListener('click', clearCodeListFilter);

matrixBody.addEventListener('change', event => {
  if (event.target.matches('.row-check')) updateSelectedCount();
});
document.getElementById('select-all-matrix').addEventListener('change', event => {
  document.querySelectorAll('.row-check').forEach(check => { check.checked = event.target.checked; });
  updateSelectedCount();
});

let matrixSearchTimer;
document.getElementById('matrix-search').addEventListener('input', event => {
  matrixState.search = event.target.value.trim();
  clearTimeout(matrixSearchTimer);
  matrixSearchTimer = setTimeout(() => loadLiveMatrix({resetPage:true}), 280);
});

matrixSearchSourceInputs.forEach(input => input.addEventListener('change', event => {
  const selected = matrixSearchSourceInputs.filter(item => item.checked).map(item => item.value);
  if (!selected.length) {
    event.target.checked = true;
    showToast('검색 대상 판매처를 하나 이상 선택해 주세요.');
    return;
  }
  matrixState.searchSources = selected;
  if (matrixState.search) loadLiveMatrix({resetPage:true});
}));

document.getElementById('matrix-status-filter').addEventListener('change', event => {
  activeView.status = event.target.value;
  matrixState.status = event.target.value;
  markViewModified();
  loadLiveMatrix({resetPage:true});
});

document.querySelectorAll('.matrix-view-tabs button[data-preset-id]').forEach(button => button.addEventListener('click', () => {
  const preset = findPreset(button.dataset.presetId);
  applyViewPreset(preset, {id:preset.id});
}));
document.getElementById('custom-preset-select').addEventListener('change', event => {
  if (!event.target.value) return;
  const preset = findPreset(event.target.value);
  applyViewPreset(preset, {id:preset.id});
});

const priceRuleBulkModal = document.getElementById('price-rule-bulk-modal');
const priceRuleBulkState = {running:false, cancelRequested:false, ruleSets:[], selectedSkus:[], codeListSkus:[], filter:null};

function priceRuleBulkScope() {
  return priceRuleBulkModal.querySelector('input[name="price-rule-bulk-scope"]:checked')?.value || '';
}

function showPriceRuleBulkProgress(percent, title, detail) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  document.getElementById('price-rule-bulk-progress').hidden = false;
  document.getElementById('price-rule-bulk-progress-title').textContent = title;
  document.getElementById('price-rule-bulk-progress-percent').textContent = `${safePercent}%`;
  document.getElementById('price-rule-bulk-progress-bar').style.width = `${safePercent}%`;
  document.getElementById('price-rule-bulk-progress-detail').textContent = detail;
}

function updatePriceRuleBulkSetSummary() {
  const selectedId = Number(document.getElementById('price-rule-bulk-set').value || 0);
  const ruleSet = priceRuleBulkState.ruleSets.find(item => Number(item.price_rule_set_id) === selectedId);
  document.getElementById('price-rule-bulk-set-summary').textContent = ruleSet
    ? (ruleSet.tags || []).slice().sort((left, right) => Number(left.order) - Number(right.order)).map(tag => tag.tag_name).join(' → ') || '기준가 그대로'
    : '저장된 계산 순서를 상품에 배정합니다.';
}

async function openPriceRuleBulk() {
  if (!liveData?.loadPriceRuleSets || !liveData?.savePriceRuleAssignmentsBulk || !liveData?.stageAssignedPriceDraftsBulk) {
    showToast('가격 규칙 일괄 배정 기능을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    return;
  }
  priceRuleBulkState.selectedSkus = selectedMatrixSkus();
  priceRuleBulkState.codeListSkus = [...new Set(matrixState.codeListSkus.map(value => String(value || '').trim()).filter(Boolean))];
  priceRuleBulkState.filter = snapshotMatrixExportFilter();
  const counts = {
    selected:priceRuleBulkState.selectedSkus.length,
    code_list:priceRuleBulkState.codeListSkus.length,
    filtered:Number(priceRuleBulkState.filter.total || 0)
  };
  document.getElementById('price-rule-bulk-selected-count').textContent = `${formatNumber(counts.selected)}개`;
  document.getElementById('price-rule-bulk-code-count').textContent = `${formatNumber(counts.code_list)}개`;
  document.getElementById('price-rule-bulk-filtered-count').textContent = `${formatNumber(counts.filtered)}개`;
  let preferredScope = '';
  priceRuleBulkModal.querySelectorAll('input[name="price-rule-bulk-scope"]').forEach(input => {
    input.disabled = counts[input.value] === 0;
    input.checked = false;
    if (!preferredScope && counts[input.value] > 0) preferredScope = input.value;
  });
  const preferred = priceRuleBulkModal.querySelector(`input[name="price-rule-bulk-scope"][value="${preferredScope}"]`);
  if (preferred) preferred.checked = true;
  document.getElementById('price-rule-bulk-progress').hidden = true;
  document.getElementById('price-rule-bulk-run').disabled = true;
  document.getElementById('price-rule-bulk-stage').disabled = !preferredScope;
  document.getElementById('price-rule-bulk-run').textContent = '규칙 불러오는 중…';
  document.getElementById('price-rule-bulk-cancel').textContent = '취소';
  priceRuleBulkModal.hidden = false;
  try {
    priceRuleBulkState.ruleSets = await liveData.loadPriceRuleSets();
    const select = document.getElementById('price-rule-bulk-set');
    select.innerHTML = '<option value="">큰 태그 선택…</option>' + priceRuleBulkState.ruleSets.map(ruleSet => `<option value="${Number(ruleSet.price_rule_set_id)}">${escapeHtml(ruleSet.set_name)}</option>`).join('');
    updatePriceRuleBulkSetSummary();
    document.getElementById('price-rule-bulk-run').disabled = !preferredScope || !priceRuleBulkState.ruleSets.length;
    document.getElementById('price-rule-bulk-run').textContent = '규칙 배정 저장';
  } catch (error) {
    showPriceRuleBulkProgress(0, '규칙 조회 실패', error?.message || String(error));
    document.getElementById('price-rule-bulk-run').textContent = '규칙 배정 저장';
  }
}

function closePriceRuleBulk() {
  if (priceRuleBulkState.running) {
    priceRuleBulkState.cancelRequested = true;
    showPriceRuleBulkProgress(0, '중단 요청됨', '현재 500개 묶음 저장이 끝나면 다음 묶음부터 중단합니다.');
    return;
  }
  priceRuleBulkModal.hidden = true;
}

async function resolvePriceRuleBulkSkus() {
  const scope = priceRuleBulkScope();
  if (scope === 'selected') return [...priceRuleBulkState.selectedSkus];
  if (scope === 'code_list') return [...priceRuleBulkState.codeListSkus];
  if (scope === 'filtered') {
    return collectMatrixFilterSkus(priceRuleBulkState.filter, {
      onProgress:(loaded, total) => showPriceRuleBulkProgress(total ? (loaded / total) * 30 : 5, '상품 범위 확인 중', `${formatNumber(loaded)} / ${formatNumber(total)}개 SKU 확인`)
    });
  }
  return [];
}

async function runPriceRuleBulk() {
  if (priceRuleBulkState.running) return;
  const ruleSetId = Number(document.getElementById('price-rule-bulk-set').value || 0);
  const sources = [...priceRuleBulkModal.querySelectorAll('.price-rule-bulk-sources input:checked')].map(input => input.value);
  if (!priceRuleBulkScope()) { showToast('적용할 상품 범위를 선택해주세요.'); return; }
  if (!sources.length) { showToast('판매처를 하나 이상 선택해주세요.'); return; }
  if (!ruleSetId) { showToast('배정할 큰 태그를 선택해주세요.'); return; }
  priceRuleBulkState.running = true;
  priceRuleBulkState.cancelRequested = false;
  const runButton = document.getElementById('price-rule-bulk-run');
  const stageButton = document.getElementById('price-rule-bulk-stage');
  runButton.disabled = true;
  stageButton.disabled = true;
  runButton.textContent = '배정 저장 중…';
  try {
    showPriceRuleBulkProgress(2, '상품 범위 확인 중', '현재 화면의 선택 조건을 SKU 목록으로 확인합니다.');
    const skus = [...new Set((await resolvePriceRuleBulkSkus()).map(value => String(value || '').trim()).filter(Boolean))];
    if (!skus.length) throw new Error('배정할 셀피아 SKU를 찾지 못했습니다.');
    let processed = 0;
    let assignedRows = 0;
    let skippedSkus = 0;
    const batchSize = 500;
    while (processed < skus.length) {
      if (priceRuleBulkState.cancelRequested) throw new Error('가격 규칙 일괄 배정을 중단했습니다.');
      const batch = skus.slice(processed, processed + batchSize);
      const result = await liveData.savePriceRuleAssignmentsBulk({skus:batch, sources, ruleSetId});
      processed += batch.length;
      assignedRows += Number(result.assigned_rows || 0);
      skippedSkus += Number(result.skipped_skus || 0);
      showPriceRuleBulkProgress(30 + (processed / skus.length) * 68, '가격 규칙 배정 중', `${formatNumber(processed)} / ${formatNumber(skus.length)}개 SKU · ${formatNumber(assignedRows)}개 판매처 배정 저장`);
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    showPriceRuleBulkProgress(100, '배정 완료', `${formatNumber(skus.length - skippedSkus)}개 SKU · ${formatNumber(assignedRows)}개 판매처 규칙 저장${skippedSkus ? ` · 미발견 ${formatNumber(skippedSkus)}개` : ''}`);
    showToast('가격 규칙 일괄 배정을 저장했습니다. 실제 가격 수정안은 아직 만들지 않았습니다.');
    document.getElementById('price-rule-bulk-cancel').textContent = '닫기';
  } catch (error) {
    showPriceRuleBulkProgress(0, priceRuleBulkState.cancelRequested ? '배정 중단' : '배정 실패', error?.message || String(error));
  } finally {
    priceRuleBulkState.running = false;
    runButton.disabled = false;
    stageButton.disabled = false;
    runButton.textContent = '다시 배정 저장';
  }
}

async function runAssignedPriceDraftsBulk() {
  if (priceRuleBulkState.running) return;
  const sources = [...priceRuleBulkModal.querySelectorAll('.price-rule-bulk-sources input:checked')].map(input => input.value);
  if (!priceRuleBulkScope()) { showToast('적용할 상품 범위를 선택해주세요.'); return; }
  if (!sources.length) { showToast('판매처를 하나 이상 선택해주세요.'); return; }
  priceRuleBulkState.running = true;
  priceRuleBulkState.cancelRequested = false;
  const runButton = document.getElementById('price-rule-bulk-run');
  const stageButton = document.getElementById('price-rule-bulk-stage');
  runButton.disabled = true;
  stageButton.disabled = true;
  stageButton.textContent = '가격 수정안 생성 중…';
  try {
    showPriceRuleBulkProgress(2, '상품 범위 확인 중', '배정된 큰 태그와 현재 셀피아 판매가를 확인합니다.');
    const skus = [...new Set((await resolvePriceRuleBulkSkus()).map(value => String(value || '').trim()).filter(Boolean))];
    if (!skus.length) throw new Error('가격 수정안을 만들 셀피아 SKU를 찾지 못했습니다.');
    const batchId = createRequestId();
    let processed = 0;
    let pendingDrafts = 0;
    let unchangedDrafts = 0;
    let failedRows = 0;
    let unassignedRows = 0;
    const errors = [];
    const batchSize = 100;
    while (processed < skus.length) {
      if (priceRuleBulkState.cancelRequested) throw new Error('가격 수정안 생성을 중단했습니다.');
      const batch = skus.slice(processed, processed + batchSize);
      const result = await liveData.stageAssignedPriceDraftsBulk({skus:batch, sources, batchId});
      processed += batch.length;
      pendingDrafts += Number(result.pending_drafts || 0);
      unchangedDrafts += Number(result.unchanged_drafts || 0);
      failedRows += Number(result.failed_rows || 0);
      unassignedRows += Number(result.unassigned_rows || 0);
      errors.push(...(Array.isArray(result.errors) ? result.errors : []));
      showPriceRuleBulkProgress(30 + (processed / skus.length) * 68, '가격 수정안 생성 중', `${formatNumber(processed)} / ${formatNumber(skus.length)}개 SKU · 수정안 ${formatNumber(pendingDrafts)}건 · 동일가 ${formatNumber(unchangedDrafts)}건`);
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    const errorSummary = errors.slice(0, 3).map(item => `${item.sku || '-'} ${CHANNEL_LABELS[item.source] || item.source}: ${item.message}`).join(' / ');
    showPriceRuleBulkProgress(100, '가격 수정안 생성 완료', `수정안 ${formatNumber(pendingDrafts)}건 · 동일가 ${formatNumber(unchangedDrafts)}건 · 미배정 ${formatNumber(unassignedRows)}건 · 실패 ${formatNumber(failedRows)}건${errorSummary ? ` · ${errorSummary}` : ''}`);
    showToast('배정된 가격 규칙으로 검토용 수정안을 만들었습니다. 매트릭스에서 판매가·옵션가·최종판가를 확인해주세요.');
    document.getElementById('price-rule-bulk-cancel').textContent = '닫기';
    await refreshLiveData();
  } catch (error) {
    showPriceRuleBulkProgress(0, priceRuleBulkState.cancelRequested ? '수정안 생성 중단' : '수정안 생성 실패', error?.message || String(error));
  } finally {
    priceRuleBulkState.running = false;
    runButton.disabled = false;
    stageButton.disabled = false;
    stageButton.textContent = '배정 규칙으로 가격 수정안 생성';
  }
}

document.getElementById('matrix-bulk-btn').addEventListener('click', openPriceRuleBulk);
document.getElementById('price-rule-bulk-close').addEventListener('click', closePriceRuleBulk);
document.getElementById('price-rule-bulk-cancel').addEventListener('click', closePriceRuleBulk);
document.getElementById('price-rule-bulk-run').addEventListener('click', runPriceRuleBulk);
document.getElementById('price-rule-bulk-stage').addEventListener('click', runAssignedPriceDraftsBulk);
document.getElementById('price-rule-bulk-set').addEventListener('change', updatePriceRuleBulkSetSummary);

document.getElementById('matrix-refresh-btn').addEventListener('click', () => refreshLiveData());
document.getElementById('matrix-prev').addEventListener('click', () => {
  if (matrixState.loading || matrixState.page <= 1) return;
  matrixState.page -= 1;
  loadLiveMatrix();
});
document.getElementById('matrix-next').addEventListener('click', () => {
  if (matrixState.loading || matrixState.page * liveData.pageSize >= matrixState.total) return;
  matrixState.page += 1;
  loadLiveMatrix();
});

document.getElementById('close-drawer').addEventListener('click', closeProductDrawer);
document.getElementById('drawer-cancel').addEventListener('click', closeProductDrawer);
drawerBackdrop.addEventListener('click', closeProductDrawer);
document.querySelectorAll('[data-drawer-link-source]').forEach(button => button.addEventListener('click', () => {
  const source = button.dataset.drawerLinkSource;
  const section = button.closest('.drawer-section');
  openMappingSearch({
    source,
    sku:productDrawer.dataset.sku,
    anchor:button,
    initialQuery:section.dataset.productCode || ''
  });
}));

document.querySelectorAll('.drawer-section textarea[data-seller-name]').forEach(input => input.addEventListener('input', () => {
  const section = input.closest('.drawer-section');
  delete section.dataset.queueBatchId;
  const sectionKey = CHANNEL_SECTION_KEYS[section.dataset.source];
  const changed = document.getElementById(`drawer-${sectionKey}-name`).value !== section.dataset.savedProductName
    || document.getElementById(`drawer-${sectionKey}-option-name`).value !== section.dataset.savedOptionName;
  const status = section.querySelector('.matrix-status');
  if (changed) {
    status.className = 'matrix-status pending';
    status.textContent = '입력 변경됨';
  }
}));

document.querySelectorAll('.seller-draft-save').forEach(button => button.addEventListener('click', async () => {
  const section = button.closest('.drawer-section');
  const source = section.dataset.source;
  const sectionKey = CHANNEL_SECTION_KEYS[source];
  const sku = productDrawer.dataset.sku;
  const queue = button.dataset.queue === 'true';
  const batchId = section.dataset.queueBatchId || createRequestId();
  section.dataset.queueBatchId = batchId;
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = queue ? '대기 등록 중' : '초안 저장 중';
  try {
    const result = await liveData.saveSellerListing({
      sku,
      source,
      productCode:section.dataset.productCode,
      optionCode:section.dataset.optionCode,
      productName:document.getElementById(`drawer-${sectionKey}-name`).value,
      optionName:document.getElementById(`drawer-${sectionKey}-option-name`).value,
      queue,
      batchId
    });
    delete section.dataset.queueBatchId;
    await loadLiveMatrix();
    const row = matrixBody.querySelector(`tr[data-sku="${CSS.escape(sku)}"]`);
    if (row) openProductDrawer(row);
    showToast(queue ? `${CHANNEL_LABELS[source]} 명칭 변경 ${Number(result?.queued_count || 0)}건을 반영 대기에 추가했습니다.` : `${CHANNEL_LABELS[source]} 명칭 초안을 저장했습니다.`);
  } catch (error) {
    console.error('seller listing save failed', error);
    showToast(`판매처명 저장 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}));

document.getElementById('drawer-inventory-list').addEventListener('input', event => {
  const composerName = event.target.closest('[data-price-composer-name]');
  if (composerName) {
    const source = composerName.closest('[data-policy-source]')?.dataset.policySource;
    if (!source) return;
    const composer = priceComposerFor(source);
    composer.name = composerName.value;
    composer.open = true;
    const save = composerName.closest('.price-tag-composer')?.querySelector('.price-tag-composer-save');
    if (save) save.disabled = !(composer.name.trim() && composer.tagIds.length);
    return;
  }
  const input = event.target.closest('[data-drawer-value],[data-drawer-price-component]');
  if (!input) return;
  const section = input.closest('.drawer-inventory-channel');
  const changed = [...section.querySelectorAll('[data-drawer-value],[data-drawer-price-component]')].some(item => item.value.trim() !== item.dataset.savedValue);
  section.classList.toggle('drawer-dirty', changed);
  const optionInput = section.querySelector('[data-drawer-price-component="option"]');
  const finalInput = section.querySelector('[data-drawer-price-component="final"]');
  const baseInput = section.querySelector('.drawer-price-component-grid label:first-child input');
  if (optionInput && finalInput && baseInput) {
    const option = Number(optionInput.value || 0);
    const finalPrice = Number(finalInput.value || 0);
    const base = finalPrice - option;
    baseInput.value = Number.isFinite(base) ? String(base) : '';
    const equation = section.querySelector('.drawer-price-equation');
    if (equation) equation.textContent = `판매가 ${formatNullableNumber(base)} + 옵션가 ${formatNullableNumber(option)} = 최종판가 ${formatNullableNumber(finalPrice)}`;
  }
  const status = section.querySelector('.matrix-status');
  if (changed) {
    status.className = 'matrix-status pending';
    status.textContent = '입력 변경됨';
  }
});

document.getElementById('drawer-inventory-list').addEventListener('change', async event => {
  const composerTagField = event.target.closest('[data-composer-tag-name],[data-composer-tag-mode],[data-composer-tag-value],[data-composer-tag-min],[data-composer-tag-max],[data-composer-tag-round-unit],[data-composer-tag-round-mode]');
  if (composerTagField) {
    const policyBox = composerTagField.closest('[data-policy-source]');
    const source = policyBox?.dataset.policySource;
    const row = composerTagField.closest('[data-composer-tag-id]');
    const tagId = Number(row?.dataset.composerTagId);
    if (!source || !tagId) return;
    const composer = priceComposerFor(source);
    const original = drawerState.priceRuleTags.find(tag => Number(tag.price_rule_tag_id) === tagId);
    let draft = {...(composer.tagEdits[String(tagId)] || original)};
    if (!draft.price_rule_tag_id) return;
    if (composerTagField.matches('[data-composer-tag-name]')) draft.tag_name = composerTagField.value.trim() || original.tag_name;
    if (composerTagField.matches('[data-composer-tag-mode],[data-composer-tag-value]')) {
      const mode = row.querySelector('[data-composer-tag-mode]').value;
      const value = row.querySelector('[data-composer-tag-value]').value;
      draft = applyPriceRuleTagSimpleMode(draft, mode, value);
    }
    const optionalNumber = selector => {
      const value = row.querySelector(selector)?.value;
      return value === '' || value === undefined ? null : Math.max(0, Number(value));
    };
    if (composerTagField.matches('[data-composer-tag-min]')) draft.min_price = optionalNumber('[data-composer-tag-min]');
    if (composerTagField.matches('[data-composer-tag-max]')) draft.max_price = optionalNumber('[data-composer-tag-max]');
    if (composerTagField.matches('[data-composer-tag-round-unit]')) draft.rounding_unit = Math.max(1, optionalNumber('[data-composer-tag-round-unit]') || 1);
    if (composerTagField.matches('[data-composer-tag-round-mode]')) draft.rounding_mode = composerTagField.value;
    composer.tagEdits[String(tagId)] = draft;
    composer.editingTagId = tagId;
    composer.open = true;
    const product = matrixRowsBySku.get(productDrawer.dataset.sku);
    renderCurrentPricePolicy(source, product);
    return;
  }
  const composerAdd = event.target.closest('[data-price-composer-add]');
  if (composerAdd) {
    const source = composerAdd.closest('[data-policy-source]')?.dataset.policySource;
    const tagId = Number(composerAdd.value);
    if (!source || !tagId) return;
    const composer = priceComposerFor(source);
    if (!composer.tagIds.includes(tagId)) composer.tagIds.push(tagId);
    composer.editingTagId = tagId;
    composer.open = true;
    const product = matrixRowsBySku.get(productDrawer.dataset.sku);
    renderCurrentPricePolicy(source, product);
    return;
  }
  const selector = event.target.closest('[data-price-rule-set]');
  if (!selector) return;
  const policyBox = selector.closest('[data-policy-source]');
  const source = policyBox.dataset.policySource;
  const sku = productDrawer.dataset.sku;
  const product = matrixRowsBySku.get(sku);
  const selectedRuleSetId = selector.value;
  const host = policyBox.parentElement;
  try {
    drawerState.priceRuleSelections[source] = selectedRuleSetId;
    drawerState.priceRulePreviews[source] = null;
    renderCurrentPricePolicy(source, product, selectedRuleSetId);
    if (!selectedRuleSetId) return;
    const preview = await liveData.previewPriceRuleSet({
      basePrice:product?.sellpia_sale_price,
      ruleSetId:selectedRuleSetId
    });
    if (productDrawer.dataset.sku !== sku) return;
    drawerState.priceRulePreviews[source] = preview;
    renderCurrentPricePolicy(source, product, selectedRuleSetId);
  } catch (error) {
    console.error('price tag preview failed', error);
    showToast(`가격 태그 계산 실패: ${error?.message || error}`);
  }
});

document.getElementById('drawer-inventory-list').addEventListener('click', async event => {
  const composerRow = event.target.closest('[data-composer-index]');
  const composerSave = event.target.closest('.price-tag-composer-save');
  if (composerRow || composerSave) {
    const policyBox = event.target.closest('[data-policy-source]');
    const source = policyBox?.dataset.policySource;
    const sku = productDrawer.dataset.sku;
    const product = matrixRowsBySku.get(sku);
    if (!source || !product) return;
    const composer = priceComposerFor(source);
    if (composerRow) {
      const index = Number(composerRow.dataset.composerIndex);
      const tagId = Number(composerRow.dataset.composerTagId);
      const action = event.target.closest('[data-composer-edit],[data-composer-remove],[data-composer-move]');
      if (!action) return;
      if (action.matches('[data-composer-edit]')) composer.editingTagId = Number(composer.editingTagId) === tagId ? null : tagId;
      if (action.matches('[data-composer-remove]')) {
        composer.tagIds.splice(index, 1);
        delete composer.tagEdits[String(tagId)];
        if (Number(composer.editingTagId) === tagId) composer.editingTagId = null;
      }
      if (action.dataset.composerMove === 'up' && index > 0) [composer.tagIds[index - 1], composer.tagIds[index]] = [composer.tagIds[index], composer.tagIds[index - 1]];
      if (action.dataset.composerMove === 'down' && index < composer.tagIds.length - 1) [composer.tagIds[index + 1], composer.tagIds[index]] = [composer.tagIds[index], composer.tagIds[index + 1]];
      composer.open = true;
      renderCurrentPricePolicy(source, product);
      return;
    }
    if (!composer.name.trim() || !composer.tagIds.length) {
      showToast('조합 태그 이름과 계산 단계를 입력해주세요.');
      return;
    }
    const originalLabel = composerSave.textContent;
    composerSave.disabled = true;
    composerSave.textContent = '조합 저장 중…';
    try {
      const savedTagIds = [];
      for (const tagId of composer.tagIds) {
        const editedTag = composer.tagEdits[String(tagId)];
        if (!editedTag) {
          savedTagIds.push(Number(tagId));
          continue;
        }
        const savedTag = await liveData.savePriceRuleTag(priceRuleTagSavePayload(editedTag));
        savedTagIds.push(Number(savedTag.price_rule_tag_id));
      }
      const savedSet = await liveData.savePriceRuleSet({
        setName:composer.name.trim(),
        color:'#1558c0',
        tagIds:savedTagIds
      });
      const [ruleTags, ruleSets, savedAssignment] = await Promise.all([
        liveData.loadPriceRuleTags(),
        liveData.loadPriceRuleSets(),
        liveData.savePriceRuleAssignment({sku, source, ruleSetId:savedSet.price_rule_set_id})
      ]);
      const preview = await liveData.previewPriceRuleSet({basePrice:product.sellpia_sale_price, ruleSetId:savedSet.price_rule_set_id});
      drawerState.priceRuleTags = ruleTags;
      drawerState.priceRuleSets = ruleSets;
      drawerState.priceRuleAssignments[source] = savedAssignment;
      drawerState.priceRuleSelections[source] = savedSet.price_rule_set_id;
      drawerState.priceRulePreviews[source] = preview;
      drawerState.priceComposers[source] = {name:'', tagIds:[], tagEdits:{}, editingTagId:null, open:false};
      renderCurrentPricePolicy(source, product, savedSet.price_rule_set_id);
      showToast(`‘${savedSet.set_name}’ 조합 태그를 만들고 ${CHANNEL_LABELS[source]} 현재 상품에 배정했습니다.`);
    } catch (error) {
      console.error('inline price tag composer save failed', error);
      composerSave.disabled = false;
      composerSave.textContent = originalLabel;
      showToast(`조합 태그 저장 실패: ${error?.message || error}`);
    }
    return;
  }
  const assignmentSave = event.target.closest('.price-tag-assignment-save');
  const tagApply = event.target.closest('.price-tag-apply');
  if (assignmentSave || tagApply) {
    const policyBox = event.target.closest('[data-policy-source]');
    const source = policyBox.dataset.policySource;
    const sku = productDrawer.dataset.sku;
    const product = matrixRowsBySku.get(sku);
    if (tagApply) {
      const finalPrice = policyBox.dataset.finalPrice;
      if (finalPrice === '') return;
      const originalLabel = tagApply.textContent;
      tagApply.disabled = true;
      tagApply.textContent = '수정안 저장 중…';
      try {
        const currentComponent = product?.__sellerPriceComponents?.[source] || {};
        const result = await liveData.saveSellerPriceDraft({
          sku,
          source,
          targetFinalPrice:finalPrice,
          optionPrice:currentComponent.draft_option_price ?? currentComponent.source_option_price ?? product?.[`${source}_option_price`] ?? 0,
          optionPriceSource:currentComponent.option_price_source || 'tag',
          priceRuleSetId:drawerState.priceRuleSelections[source] || null,
          batchId:createRequestId()
        });
        applyLocalSellerPriceDraft(product, source, result);
        renderLiveMatrixRows(matrixState.rows);
        renderDrawerInventory(product);
        ['smartstore','makeshop','ably'].forEach(channel => renderCurrentPricePolicy(channel, product, drawerState.priceRuleSelections[channel] || ''));
        refreshChangeQueueInBackground();
        void loadLiveDashboardMetrics();
        showToast(result?.draft_status === 'unchanged'
          ? `${CHANNEL_LABELS[source]} 원본가와 계산 최종가가 같아 기존 가격 수정안을 취소했습니다.`
          : `${CHANNEL_LABELS[source]} 계산 최종가 ${formatNullableNumber(finalPrice)}원을 수정안으로 저장했습니다.`);
      } catch (error) {
        console.error('price tag draft save failed', error);
        tagApply.disabled = false;
        tagApply.textContent = originalLabel;
        showToast(`가격 수정안 저장 실패: ${error?.message || error}`);
      }
      return;
    }
    const selectedRuleSetId = policyBox.querySelector('[data-price-rule-set]')?.value || '';
    const originalLabel = assignmentSave.textContent;
    assignmentSave.disabled = true;
    assignmentSave.textContent = '태그 저장 중…';
    try {
      const saved = await liveData.savePriceRuleAssignment({
        sku,
        source,
        ruleSetId:selectedRuleSetId || null
      });
      const preview = saved ? await liveData.previewPriceRuleSet({basePrice:product?.sellpia_sale_price, ruleSetId:saved.price_rule_set_id}) : null;
      drawerState.priceRuleAssignments = {...drawerState.priceRuleAssignments, [source]:saved};
      drawerState.priceRuleSelections[source] = saved?.price_rule_set_id || '';
      drawerState.priceRulePreviews[source] = preview;
      renderCurrentPricePolicy(source, product, saved?.price_rule_set_id || '');
      const selectedSet = drawerState.priceRuleSets.find(ruleSet => String(ruleSet.price_rule_set_id) === String(saved?.price_rule_set_id || ''));
      showToast(saved
        ? `${CHANNEL_LABELS[source]}의 현재 SKU에 ‘${selectedSet?.set_name || '가격 태그'}’를 배정했습니다.`
        : `${CHANNEL_LABELS[source]}의 현재 SKU 가격 태그를 해제했습니다.`);
    } catch (error) {
      console.error('price tag assignment save failed', error);
      showToast(`가격 태그 저장 실패: ${error?.message || error}`);
      assignmentSave.disabled = false;
      assignmentSave.textContent = originalLabel;
    }
    return;
  }
  const button = event.target.closest('.drawer-value-save');
  if (!button) return;
  const section = button.closest('.drawer-inventory-channel');
  const source = section.dataset.source;
  const sku = productDrawer.dataset.sku;
  const stockInput = section.querySelector('[data-drawer-value="sellpia_current_stock"]');
  const optionInput = section.querySelector('[data-drawer-price-component="option"]');
  const finalInput = section.querySelector('[data-drawer-price-component="final"]');
  const stockChanged = stockInput && !stockInput.disabled && stockInput.value.trim() !== stockInput.dataset.savedValue;
  const optionChanged = optionInput && !optionInput.disabled && optionInput.value.trim() !== optionInput.dataset.savedValue;
  const finalChanged = finalInput && !finalInput.disabled && finalInput.value.trim() !== finalInput.dataset.savedValue;
  if (!stockChanged && !optionChanged && !finalChanged) {
    showToast('바뀐 재고·가격 값이 없습니다.');
    return;
  }
  if ((stockChanged && !/^\d+(\.\d+)?$/.test(stockInput.value.trim()))
      || (finalChanged && !/^\d+(\.\d+)?$/.test(finalInput.value.trim()))
      || (optionChanged && !/^-?\d+(\.\d+)?$/.test(optionInput.value.trim()))) {
    showToast('재고·최종판가는 0 이상, 옵션가는 음수를 포함한 숫자로 입력해주세요.');
    return;
  }
  const targetFinalPrice = Number(finalInput?.value || 0);
  const targetOptionPrice = Number(optionInput?.value || 0);
  if ((optionChanged || finalChanged) && targetFinalPrice - targetOptionPrice < 0) {
    showToast('최종판가보다 옵션가가 커서 판매가가 음수가 됩니다. 값을 다시 확인해주세요.');
    return;
  }
  const batchId = createRequestId();
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = '수정안 저장 중…';
  try {
    const results = [];
    const product = matrixRowsBySku.get(sku);
    if (stockChanged) {
      const result = await liveData.saveSellerValueDraft({sku, source, fieldKey:'sellpia_current_stock', after:stockInput.value.trim(), batchId});
      results.push(result);
      applyLocalSellerDraft(product, source, 'sellpia_current_stock', stockInput.value.trim(), result);
    }
    if (optionChanged || finalChanged) {
      const result = await liveData.saveSellerPriceDraft({
        sku,
        source,
        targetFinalPrice,
        optionPrice:targetOptionPrice,
        optionPriceSource:optionChanged ? 'manual' : (product?.__sellerPriceComponents?.[source]?.option_price_source || 'original'),
        priceRuleSetId:product?.__sellerPriceComponents?.[source]?.price_rule_set_id || null,
        batchId
      });
      results.push(result);
      applyLocalSellerPriceDraft(product, source, result);
    }
    renderLiveMatrixRows(matrixState.rows);
    renderDrawerInventory(product);
    ['smartstore','makeshop','ably'].forEach(channel => renderCurrentPricePolicy(channel, product, drawerState.priceRuleSelections[channel] || ''));
    refreshChangeQueueInBackground();
    void loadLiveDashboardMetrics();
    const savedCount = results.filter(result => result?.draft_status === 'pending').length;
    const cancelledCount = results.filter(result => result?.draft_status === 'unchanged').length;
    showToast(`${CHANNEL_LABELS[source]} 수정안 ${savedCount}건 저장${cancelledCount ? ` · 원본값 복귀 ${cancelledCount}건` : ''}`);
  } catch (error) {
    console.error('drawer seller value save failed', error);
    showToast(`재고·가격 수정안 저장 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});

function readDrawerAttributeDraft() {
  const content = document.getElementById('drawer-attributes-content');
  return {
    material:content.querySelector('#drawer-attribute-material')?.value || '기타',
    productGroup:content.querySelector('#drawer-attribute-product-group')?.value || '기타',
    shape:content.querySelector('#drawer-attribute-shape')?.value || '기타',
    productTagIds:[...content.querySelectorAll('[data-attribute-tag="product"]:checked')].map(input => input.value),
    skuTagIds:[...content.querySelectorAll('[data-attribute-tag="sku"]:checked')].map(input => input.value)
  };
}

document.getElementById('drawer-attributes-content').addEventListener('click', async event => {
  const saveButton = event.target.closest('#drawer-save-attributes');
  const createButton = event.target.closest('#drawer-create-tag');
  if (!saveButton && !createButton) return;
  const sku = productDrawer.dataset.sku;
  const product = matrixRowsBySku.get(sku);
  if (!sku || !product) return;

  if (createButton) {
    const nameInput = document.getElementById('drawer-new-tag-name');
    const scope = document.getElementById('drawer-new-tag-scope').value;
    const draft = readDrawerAttributeDraft();
    const originalLabel = createButton.textContent;
    createButton.disabled = true;
    createButton.textContent = '추가 중…';
    try {
      const created = await liveData.createProductTag({name:nameInput.value, group:'운영'});
      drawerState.tags = await liveData.loadTags();
      if (scope === 'sku') draft.skuTagIds.push(String(created.tag_id));
      else draft.productTagIds.push(String(created.tag_id));
      const profile = product.__profile || await liveData.ensureProductProfile(sku);
      profile.product_tags = drawerState.tags.filter(tag => draft.productTagIds.includes(String(tag.tag_id)));
      profile.sku_tags = drawerState.tags.filter(tag => draft.skuTagIds.includes(String(tag.tag_id)));
      profile.material = draft.material;
      profile.product_group = draft.productGroup;
      profile.shape = draft.shape;
      renderDrawerAttributesPanel(product, profile, drawerState.tags);
      showToast(`${created.tag_name} 태그를 만들었습니다. 저장을 눌러 상품에 적용해주세요.`);
    } catch (error) {
      console.error('product tag create failed', error);
      showToast(`태그 추가 실패: ${error?.message || error}`);
      createButton.disabled = false;
      createButton.textContent = originalLabel;
    }
    return;
  }

  const draft = readDrawerAttributeDraft();
  const originalLabel = saveButton.textContent;
  saveButton.disabled = true;
  saveButton.textContent = '저장 중…';
  try {
    const saved = await liveData.saveProductProfile({sku, ...draft});
    product.__profile = saved;
    await loadLiveMatrix();
    const row = matrixBody.querySelector(`tr[data-sku="${CSS.escape(sku)}"]`);
    if (row) openProductDrawer(row);
    setDrawerTab('attributes', {loadHistory:false});
    showToast(`${sku} 속성·태그를 DB에 저장했습니다.`);
  } catch (error) {
    console.error('product profile save failed', error);
    showToast(`속성·태그 저장 실패: ${error?.message || error}`);
    saveButton.disabled = false;
    saveButton.textContent = originalLabel;
  }
});

function moveDrawerSelection(direction) {
  const rows = [...matrixBody.querySelectorAll('tr[data-sku]')];
  const currentIndex = rows.findIndex(row => row.dataset.sku === productDrawer.dataset.sku);
  const target = rows[currentIndex + direction];
  if (target) openProductDrawer(target);
  else showToast(direction < 0 ? '현재 페이지의 첫 SKU입니다.' : '현재 페이지의 마지막 SKU입니다.');
}
document.getElementById('drawer-prev').addEventListener('click', () => moveDrawerSelection(-1));
document.getElementById('drawer-next').addEventListener('click', () => moveDrawerSelection(1));

document.querySelectorAll('[data-drawer-tab]').forEach(button => button.addEventListener('click', () => setDrawerTab(button.dataset.drawerTab)));
document.getElementById('drawer-history-refresh').addEventListener('click', () => {
  drawerState.historySku = '';
  loadDrawerHistory({force:true});
});

document.getElementById('discard-changes').addEventListener('click', () => {
  clearPendingChanges();
  loadLiveMatrix();
  showToast('저장 전 변경사항을 모두 취소했습니다.');
});

function openChangeModal() {
  if (!pendingChanges.length) return;
  document.getElementById('modal-count').textContent = `${pendingChanges.length}건`;
  document.getElementById('modal-products').textContent = `${new Set(pendingChanges.map(item => item.sku)).size}개`;
  document.getElementById('change-list').innerHTML = pendingChanges.map(change => `
    <article class="change-item"><span>${change.sku}</span><p><b>${change.field}</b><em>${change.before} → ${change.after}</em></p><strong>변경 대기</strong></article>`).join('');
  changeModal.hidden = false;
}

document.getElementById('preview-changes').addEventListener('click', openChangeModal);
document.getElementById('close-change-modal').addEventListener('click', () => { changeModal.hidden = true; });
document.getElementById('modal-back').addEventListener('click', () => { changeModal.hidden = true; });
document.getElementById('apply-sellpia-changes').addEventListener('click', async event => {
  if (!pendingChanges.length || !liveData?.saveSellpiaChanges) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'DB 저장 중...';
  try {
    await flushPendingSellpiaChanges({automatic:false});
  } finally {
    button.disabled = false;
    button.textContent = '선택 변경사항 저장';
  }
});

const QUEUE_FIELD_LABELS = {
  sellpia_own_code:'셀피아 자사코드',
  sellpia_product_name:'셀피아 상품명',
  sellpia_option_name:'셀피아 옵션명',
  sellpia_current_stock:'판매처 재고',
  sellpia_sale_price:'판매처 가격',
  sellpia_image:'셀피아 이미지',
  seller_product_name:'판매처 상품명',
  seller_option_name:'판매처 옵션명'
};
const QUEUE_STATUS_LABELS = {
  pending:'검증 대기', validated:'검증 완료', processing:'파일 생성 중', exported:'내보냄', applied:'반영 완료',
  failed:'실패', saved:'DB 내부 저장', cancelled:'취소'
};
const QUEUE_EVENT_LABELS = {
  created:'변경 생성', validated:'검증 완료', processing:'파일 생성 시작', exported:'원본 내보냄', applied:'반영 완료',
  failed:'실패', cancelled:'취소', retried:'재시도 등록', status_changed:'상태 변경'
};
const queueState = {rows:[], loading:false, selectedChangeId:null};
const queueBody = document.getElementById('queue-body');

function queueScalar(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function queueTargetMarkup(row) {
  const targets = Array.isArray(row.target_channels) ? row.target_channels : [];
  if (!targets.length) return '<span class="queue-status saved">DB 내부</span>';
  return `<span class="queue-targets">${targets.map(target => `<i>${escapeHtml(CHANNEL_LABELS[target] || target)}</i>`).join('')}</span>`;
}

function queueMessage(row) {
  const validation = Array.isArray(row.validation_errors) ? row.validation_errors.join(' · ') : '';
  return row.error_message || validation || row.status_message || '-';
}

function renderChangeQueue(rows) {
  queueState.rows = rows;
  if (!rows.length) {
    queueBody.innerHTML = '<tr class="queue-empty"><td colspan="10">현재 조건에 해당하는 변경대기가 없습니다.</td></tr>';
  } else {
    queueBody.innerHTML = rows.map(row => {
      const selectable = ['pending','validated','exported','failed'].includes(row.status);
      const before = escapeHtml(queueScalar(row.before_value));
      const after = escapeHtml(queueScalar(row.after_value));
      const message = escapeHtml(queueMessage(row));
      const selected = Number(row.change_id) === Number(queueState.selectedChangeId);
      return `<tr data-change-id="${Number(row.change_id)}" class="${selected ? 'selected' : ''}" title="배치 ${escapeHtml(row.change_batch_id || '-')}">
        <td><input class="queue-row-check" type="checkbox" value="${Number(row.change_id)}" ${selectable ? '' : 'disabled'} aria-label="변경 ${Number(row.change_id)} 선택"></td>
        <td>#${Number(row.change_id)}</td>
        <td>${escapeHtml(row.sellpia_sku_code)}</td>
        <td>${queueTargetMarkup(row)}</td>
        <td>${escapeHtml(QUEUE_FIELD_LABELS[row.field_key] || row.field_key)}</td>
        <td class="queue-value"><b title="${before}">${before}</b><em title="${after}">→ ${after}</em></td>
        <td><span class="queue-status ${escapeHtml(row.status)}">${escapeHtml(QUEUE_STATUS_LABELS[row.status] || row.status)}</span></td>
        <td>${Number(row.retry_count || 0)} / ${Number(row.max_retry_count || 3)}</td>
        <td>${formatLiveTime(row.requested_at)}</td>
        <td class="queue-message" title="${message}">${message}</td>
      </tr>`;
    }).join('');
  }
  document.getElementById('queue-result-count').textContent = `${formatNumber(rows.length)}건 표시`;
  document.getElementById('queue-select-all').checked = false;
  updateQueueSelection();
}

function selectedQueueRows() {
  const ids = new Set([...queueBody.querySelectorAll('.queue-row-check:checked')].map(check => Number(check.value)));
  return queueState.rows.filter(row => ids.has(Number(row.change_id)));
}

function updateQueueSelection() {
  const selected = selectedQueueRows();
  document.getElementById('queue-selected-count').textContent = selected.length;
  document.getElementById('queue-validate').disabled = !selected.some(row => ['pending','failed'].includes(row.status));
  document.getElementById('queue-cancel').disabled = !selected.some(row => ['pending','validated','failed'].includes(row.status));
  document.getElementById('queue-retry').disabled = !selected.some(row => row.status === 'failed' && Number(row.retry_count) < Number(row.max_retry_count));
  document.getElementById('queue-confirm-applied').disabled = !selected.some(row => row.status === 'exported');
}

async function loadChangeQueue({silent = false} = {}) {
  if (!liveData?.loadChangeQueue || queueState.loading) return;
  queueState.loading = true;
  const badge = document.getElementById('queue-live-status');
  if (!silent) {
    badge.className = 'live-data-badge loading';
    badge.textContent = 'DB 조회 중';
    queueBody.innerHTML = '<tr class="queue-empty"><td colspan="10">변경대기를 불러오는 중입니다.</td></tr>';
  }
  try {
    const [queue, stats] = await Promise.all([
      liveData.loadChangeQueue({
        status:document.getElementById('queue-status-filter').value,
        source:document.getElementById('queue-source-filter').value
      }),
      liveData.loadChangeQueueStats()
    ]);
    renderChangeQueue(queue.rows);
    document.getElementById('queue-result-count').textContent = `${formatNumber(queue.count)}건 중 ${formatNumber(queue.rows.length)}건 표시`;
    document.getElementById('queue-active-count').textContent = formatNumber(stats.active || 0);
    document.getElementById('queue-validated-count').textContent = formatNumber(stats.validated || 0);
    document.getElementById('queue-failed-count').textContent = formatNumber(stats.failed || 0);
    document.getElementById('queue-applied-count').textContent = formatNumber(stats.applied || 0);
    document.getElementById('jobs-error-badge').dataset.queueErrors = Number(stats.failed || 0);
    updateJobsErrorBadge();
    badge.className = 'live-data-badge connected';
    badge.textContent = `LIVE · ${formatNumber(queue.count)}건`;
  } catch (error) {
    console.error('change queue load failed', error);
    badge.className = 'live-data-badge error';
    badge.textContent = 'DB 조회 오류';
    queueBody.innerHTML = `<tr class="queue-empty"><td colspan="10">변경대기를 불러오지 못했습니다. ${escapeHtml(error?.message || error)}</td></tr>`;
  } finally {
    queueState.loading = false;
  }
}

async function openQueueEvents(changeId) {
  const panel = document.getElementById('queue-event-panel');
  const list = document.getElementById('queue-event-list');
  queueState.selectedChangeId = Number(changeId);
  queueBody.querySelectorAll('tr[data-change-id]').forEach(row => row.classList.toggle('selected', Number(row.dataset.changeId) === queueState.selectedChangeId));
  document.getElementById('queue-event-title').textContent = `변경 #${queueState.selectedChangeId} 이력`;
  panel.hidden = false;
  list.innerHTML = '<span class="queue-event-empty">이력을 불러오는 중입니다.</span>';
  try {
    const events = await liveData.loadChangeEvents(queueState.selectedChangeId);
    list.innerHTML = events.length ? events.map(event => `<article><time>${formatLiveTime(event.created_at)}</time><p><b>${escapeHtml(QUEUE_EVENT_LABELS[event.event_type] || event.event_type)}</b><span>${escapeHtml(event.message || [event.from_status, event.to_status].filter(Boolean).join(' → ') || '-')}</span></p></article>`).join('') : '<span class="queue-event-empty">기록된 이벤트가 없습니다.</span>';
  } catch (error) {
    list.innerHTML = `<span class="queue-event-empty">이력 조회 실패 · ${escapeHtml(error?.message || error)}</span>`;
  }
}

async function runQueueAction(action, button) {
  const selected = selectedQueueRows();
  const eligible = selected.filter(row => action === 'validate'
    ? ['pending','failed'].includes(row.status)
    : action === 'cancel'
      ? ['pending','validated','failed'].includes(row.status)
      : row.status === 'failed' && Number(row.retry_count) < Number(row.max_retry_count));
  if (!eligible.length) return;
  if (action === 'cancel' && !window.confirm(`${eligible.length}건의 판매처 반영 대기를 취소할까요? DB에 저장된 운영값은 유지됩니다.`)) return;
  const ids = eligible.map(row => Number(row.change_id));
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = action === 'validate' ? '검증 중…' : action === 'cancel' ? '취소 중…' : '재시도 등록 중…';
  try {
    const result = action === 'validate'
      ? await liveData.validateChangeQueue(ids)
      : action === 'cancel'
        ? await liveData.cancelChangeQueue(ids)
        : await liveData.retryChangeQueue(ids);
    await loadChangeQueue();
    if (action === 'validate') showToast(`검증 완료 ${Number(result?.validated_count || 0)}건 · 실패 ${Number(result?.failed_count || 0)}건`);
    else if (action === 'cancel') showToast(`${Number(result?.cancelled_count || 0)}건을 취소했습니다.`);
    else showToast(`재시도 ${Number(result?.retried_count || 0)}건 · 제외 ${Number(result?.skipped_count || 0)}건`);
  } catch (error) {
    console.error(`change queue ${action} failed`, error);
    showToast(`변경대기 작업 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
    updateQueueSelection();
  }
}

queueBody.addEventListener('change', event => {
  if (event.target.matches('.queue-row-check')) updateQueueSelection();
});
queueBody.addEventListener('click', event => {
  if (event.target.closest('.queue-row-check')) return;
  const row = event.target.closest('tr[data-change-id]');
  if (row) openQueueEvents(row.dataset.changeId);
});
document.getElementById('queue-select-all').addEventListener('change', event => {
  queueBody.querySelectorAll('.queue-row-check:not(:disabled)').forEach(check => { check.checked = event.target.checked; });
  updateQueueSelection();
});
document.getElementById('queue-status-filter').addEventListener('change', () => loadChangeQueue());
document.getElementById('queue-source-filter').addEventListener('change', () => loadChangeQueue());
document.getElementById('queue-refresh').addEventListener('click', () => loadChangeQueue());
document.getElementById('queue-validate').addEventListener('click', event => runQueueAction('validate', event.currentTarget));
document.getElementById('queue-cancel').addEventListener('click', event => runQueueAction('cancel', event.currentTarget));
document.getElementById('queue-retry').addEventListener('click', event => runQueueAction('retry', event.currentTarget));
document.getElementById('queue-event-close').addEventListener('click', () => { document.getElementById('queue-event-panel').hidden = true; });

const sellerExport = window.SystemV3SellerExport;
const sellerExportModal = document.getElementById('seller-export-modal');
const sellerExportState = {
  rows:[],
  action:'export',
  running:false,
  selectedSkus:[],
  filter:null,
  filteredSkus:null,
  filteredSkusPromise:null,
  previewRequestId:0
};

function selectedExportSources() {
  return [...sellerExportModal.querySelectorAll('.seller-export-source-check:checked')].map(input => input.value);
}

function selectedSellerExportScope() {
  return sellerExportModal.querySelector('input[name="seller-export-scope"]:checked')?.value || 'all';
}

function matrixHasActiveExportFilter() {
  return Boolean(
    String(matrixState.search || '').trim()
    || matrixState.status !== 'all'
    || matrixState.advancedFilter.conditions.length
    || matrixState.codeListRows.length
  );
}

function snapshotMatrixExportFilter() {
  return {
    search:matrixState.search,
    searchSources:[...matrixState.searchSources],
    status:matrixState.status,
    sort:matrixState.sort,
    advancedFilter:cloneAdvancedFilter(matrixState.advancedFilter),
    codeListSkus:[...matrixState.codeListSkus],
    total:Number(matrixState.total || 0)
  };
}

async function collectMatrixFilterSkus(filter, {onProgress = null} = {}) {
    const skus = [];
    const seen = new Set();
    const appendRows = rows => {
      (rows || []).forEach(row => {
        const sku = String(row.sellpia_sku_code || '').trim();
        if (sku && !seen.has(sku)) { seen.add(sku); skus.push(sku); }
      });
    };
    const baseRequest = {
      search:filter.search,
      searchSources:filter.searchSources,
      status:filter.status,
      sort:filter.sort,
      advancedFilter:filter.advancedFilter
    };
    if (filter.codeListSkus.length) {
      for (let offset = 0; offset < filter.codeListSkus.length; offset += 1000) {
        const skuBatch = filter.codeListSkus.slice(offset, offset + 1000);
        const result = await liveData.loadMatrixExportChunk({...baseRequest, offset:0, limit:1000, skus:skuBatch});
        appendRows(result.rows);
      }
    } else {
      let offset = 0;
      const chunkSize = 400;
      let firstChunk = true;
      while (firstChunk || offset < filter.total) {
        firstChunk = false;
        const result = await loadMatrixCsvChunk({...baseRequest, offset, limit:chunkSize, skus:[]});
        appendRows(result.rows);
        const loaded = result.rows?.length || 0;
        if (!loaded) break;
        offset += loaded;
        onProgress?.(Math.min(offset, filter.total), filter.total);
        if (loaded < Number(result.limit || chunkSize)) break;
      }
    }
    return skus;
}

async function collectSellerExportFilteredSkus() {
  if (sellerExportState.filteredSkus) return sellerExportState.filteredSkus;
  if (sellerExportState.filteredSkusPromise) return sellerExportState.filteredSkusPromise;
  const filter = sellerExportState.filter || snapshotMatrixExportFilter();
  sellerExportState.filteredSkusPromise = collectMatrixFilterSkus(filter, {
    onProgress:(loaded, total) => {
      const detail = document.getElementById('seller-export-preview-detail');
      if (detail && !sellerExportModal.hidden) detail.textContent = `현재 필터 SKU 확인 ${formatNumber(loaded)} / ${formatNumber(total)}`;
    }
  }).then(skus => {
    sellerExportState.filteredSkus = skus;
    const filteredCountNode = document.getElementById('seller-export-filtered-count');
    if (filteredCountNode && !sellerExportModal.hidden) filteredCountNode.textContent = `현재 조건 ${formatNumber(skus.length)}개 SKU`;
    return skus;
  }).finally(() => { sellerExportState.filteredSkusPromise = null; });
  return sellerExportState.filteredSkusPromise;
}

async function resolveSellerExportScopeSkus() {
  const scope = selectedSellerExportScope();
  if (scope === 'selected') return [...sellerExportState.selectedSkus];
  if (scope === 'filtered') return collectSellerExportFilteredSkus();
  return null;
}

function sellerExportRowsForSources(rows, sources) {
  const allowed = new Set(sources);
  return (rows || []).filter(row => {
    if (row.source_channel) return allowed.has(row.source_channel);
    return (row.target_channels || []).some(source => allowed.has(source));
  });
}

async function refreshSellerExportPreview() {
  const preview = document.getElementById('seller-export-preview');
  if (sellerExportState.action === 'draft') { preview.hidden = true; return; }
  preview.hidden = false;
  const requestId = ++sellerExportState.previewRequestId;
  const sources = selectedExportSources();
  const countNode = document.getElementById('seller-export-preview-count');
  const detailNode = document.getElementById('seller-export-preview-detail');
  if (!sources.length) {
    countNode.textContent = '0건';
    detailNode.textContent = '판매처를 하나 이상 선택해주세요.';
    return;
  }
  countNode.textContent = '확인 중';
  detailNode.textContent = sellerExportState.rows.length ? '선택한 변경대기를 확인합니다.' : '선택한 범위의 저장된 수정안을 확인합니다.';
  try {
    let count;
    if (sellerExportState.rows.length) {
      count = sellerExportRowsForSources(sellerExportState.rows, sources).length;
    } else {
      const scope = selectedSellerExportScope();
      const scopeSkus = await resolveSellerExportScopeSkus();
      if (requestId !== sellerExportState.previewRequestId) return;
      count = await liveData.countSellerDraftsForExport(sources, scopeSkus);
      if (requestId !== sellerExportState.previewRequestId) return;
      const scopeLabels = {filtered:'현재 검색·필터 결과', selected:'체크한 SKU', all:'전체 변경대기'};
      detailNode.textContent = `${scopeLabels[scope]} · ${sources.map(source => CHANNEL_LABELS[source] || source).join('·')}`;
    }
    countNode.textContent = `${formatNumber(count)}건`;
    if (sellerExportState.rows.length) detailNode.textContent = `변경대기에서 선택한 항목 · ${sources.map(source => CHANNEL_LABELS[source] || source).join('·')}`;
  } catch (error) {
    if (requestId !== sellerExportState.previewRequestId) return;
    countNode.textContent = '확인 실패';
    detailNode.textContent = error?.message || String(error);
  }
}

function showSellerExportProgress(percent, title, detail) {
  const panel = document.getElementById('seller-export-progress');
  panel.hidden = false;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  document.getElementById('seller-export-progress-title').textContent = title;
  document.getElementById('seller-export-progress-percent').textContent = `${safePercent}%`;
  document.getElementById('seller-export-progress-bar').style.width = `${safePercent}%`;
  document.getElementById('seller-export-progress-detail').textContent = detail;
}

async function refreshSellerOriginalStates() {
  const nodes = [...sellerExportModal.querySelectorAll('[data-export-source]')];
  nodes.forEach(node => {
    node.querySelector('.seller-original-state').textContent = '최신 원본 확인 중';
    node.classList.remove('original-ready', 'original-missing');
  });
  try {
    const statuses = await liveData.loadLatestSellerOriginalStatus(nodes.map(node => node.dataset.exportSource));
    for (const status of statuses) {
      const node = sellerExportModal.querySelector(`[data-export-source="${status.source}"]`);
      if (!node) continue;
      const names = status.fileNames.length ? status.fileNames.join(', ') : '보관 파일 없음';
      node.querySelector('.seller-original-state').textContent = status.available
        ? `${status.fileNames.length}개 보관 · ${formatLiveTime(status.completedAt)}`
        : `다음 원본 업로드부터 자동 보관 · ${names}`;
      node.classList.add(status.available ? 'original-ready' : 'original-missing');
      if (sellerExportState.action === 'export' && !status.available) {
        const checkbox = node.querySelector('.seller-export-source-check');
        checkbox.checked = false;
        checkbox.disabled = true;
      }
    }
  } catch (error) {
    nodes.forEach(node => { node.querySelector('.seller-original-state').textContent = '원본 상태 조회 실패'; });
  } finally {
    refreshSellerExportPreview();
  }
}

function selectedMatrixSkus() {
  return [...matrixBody.querySelectorAll('.row-check:checked')]
    .map(check => check.closest('tr[data-sku]')?.dataset.sku)
    .filter(Boolean);
}

function openSellerExport({action = 'export', rows = []} = {}) {
  sellerExportState.rows = rows;
  sellerExportState.action = action;
  sellerExportState.selectedSkus = selectedMatrixSkus();
  sellerExportState.filter = snapshotMatrixExportFilter();
  sellerExportState.filteredSkus = null;
  sellerExportState.filteredSkusPromise = null;
  sellerExportState.previewRequestId += 1;
  const rowSources = new Set(rows.flatMap(row => row.source_channel ? [row.source_channel] : (row.target_channels || [])));
  sellerExportModal.querySelectorAll('.seller-export-source-check').forEach(input => {
    input.disabled = false;
    input.checked = !rowSources.size || rowSources.has(input.value);
  });
  const skus = sellerExportState.selectedSkus;
  const scopePanel = document.getElementById('seller-export-scope');
  const previewPanel = document.getElementById('seller-export-preview');
  const showScope = action === 'export' && !rows.length;
  scopePanel.hidden = !showScope;
  previewPanel.hidden = action === 'draft';
  const filteredCount = sellerExportState.filter.codeListSkus.length
    ? sellerExportState.filter.codeListSkus.length
    : sellerExportState.filter.total;
  document.getElementById('seller-export-filtered-count').textContent = matrixState.loading
    ? '현재 조건 SKU 확인 중'
    : `현재 조건 ${formatNumber(filteredCount)}개 SKU`;
  document.getElementById('seller-export-selected-count').textContent = skus.length ? `체크한 ${formatNumber(skus.length)}개 SKU` : '체크한 SKU 없음';
  const selectedScope = document.getElementById('seller-export-selected-scope');
  selectedScope.disabled = !skus.length;
  const defaultScope = matrixHasActiveExportFilter() ? 'filtered' : (skus.length ? 'selected' : 'all');
  const defaultScopeInput = sellerExportModal.querySelector(`input[name="seller-export-scope"][value="${defaultScope}"]`);
  if (defaultScopeInput) defaultScopeInput.checked = true;
  document.getElementById('seller-export-title').textContent = action === 'draft' ? '셀피아 기준 재고 수정안' : '검토한 수정본 내보내기';
  document.getElementById('seller-export-kicker').textContent = action === 'draft' ? '매트릭스 수정안 생성' : '판매처 원본 파일 생성';
  document.getElementById('seller-export-guide-title').textContent = action === 'draft'
    ? `셀피아 재고와 다른 판매처 값을 수정안으로 만듭니다.${skus.length ? ` · 선택 ${formatNumber(skus.length)}개 SKU` : ' · 전체 매트릭스'}`
    : '매트릭스에서 검토한 수정안만 최신 보관 원본에 반영합니다.';
  document.getElementById('seller-export-guide-detail').textContent = action === 'draft'
    ? '원본 파일은 아직 바뀌지 않습니다. 생성 후 파란 수정 가능 셀에서 값을 확인하거나 다시 고칠 수 있습니다.'
    : '원본을 다시 선택할 필요가 없습니다. 수정된 XLSX 셀은 형광 노랑 배경과 굵은 글씨로 표시해 별도의 ZIP 수정본으로 내려받습니다.';
  document.getElementById('seller-export-run').textContent = action === 'draft' ? '매트릭스에 수정안 만들기' : '검토한 수정본 ZIP 만들기';
  document.getElementById('seller-export-progress').hidden = true;
  sellerExportModal.hidden = false;
  refreshSellerExportPreview();
  refreshSellerOriginalStates();
}

function closeSellerExport() {
  if (sellerExportState.running) return;
  sellerExportModal.hidden = true;
}

async function runSellerExport() {
  if (!sellerExport || !liveData?.prepareSellerExport) {
    showToast('원본 내보내기 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    return;
  }
  const sources = selectedExportSources();
  if (!sources.length) { showToast('판매처를 하나 이상 선택해주세요.'); return; }
  const batchId = createRequestId();
  const button = document.getElementById('seller-export-run');
  sellerExportState.running = true;
  button.disabled = true;
  document.getElementById('seller-export-cancel').disabled = true;
  document.getElementById('seller-export-close').disabled = true;
  let prepared = false;
  try {
    if (sellerExportState.action === 'draft') {
      const skus = selectedMatrixSkus();
      showSellerExportProgress(5, '재고 차이 계산 준비', `${skus.length ? `선택 ${formatNumber(skus.length)}개 SKU` : '전체 매트릭스'}를 안전한 묶음으로 나눠 확인합니다.`);
      let afterSku = null;
      let processed = 0;
      let total = skus.length || 0;
      let staged = 0;
      let cancelled = 0;
      let hasMore = true;
      while (hasMore) {
        const result = await liveData.stageSellerInventoryDraftBatch({sources, skus, batchId, afterSku, batchSize:500});
        const batchProcessed = Number(result?.processed_count || 0);
        if (!total) total = Number(result?.total_count || 0);
        processed += batchProcessed;
        staged += Number(result?.staged_count || 0);
        cancelled += Number(result?.cancelled_count || 0);
        afterSku = result?.next_cursor || null;
        hasMore = Boolean(result?.has_more) && batchProcessed > 0 && afterSku;
        const ratio = total ? Math.min(processed / total, 1) : 1;
        showSellerExportProgress(
          5 + ratio * 90,
          '재고 수정안 생성 중',
          `${formatNumber(Math.min(processed, total || processed))} / ${formatNumber(total || processed)} SKU 확인 · 수정안 ${formatNumber(staged)}건 저장`
        );
      }
      showSellerExportProgress(100, '수정안 생성 완료', `${formatNumber(staged)}건을 매트릭스 검토 대기로 저장했습니다. 판매처 셀에서 값을 다시 수정할 수 있습니다.`);
      showToast(staged ? `재고 수정안 ${formatNumber(staged)}건을 만들었습니다.${cancelled ? ` 기존 수정안 ${formatNumber(cancelled)}건은 교체했습니다.` : ''}` : '셀피아 재고와 다른 판매처 값이 없습니다.');
      await Promise.all([loadLiveMatrix(), loadChangeQueue({silent:true}), loadLiveDashboardMetrics()]);
      return;
    }

    showSellerExportProgress(4, '수정안 확인 중', '검토한 판매처 수정안을 내보내기 상태로 확정합니다.');
    let changeIds;
    if (sellerExportState.rows.length) {
      const scopedRows = sellerExportRowsForSources(sellerExportState.rows, sources);
      const reviewIds = scopedRows.filter(row => ['pending','failed'].includes(row.status)).map(row => Number(row.change_id));
      if (reviewIds.length) await liveData.validateChangeQueue(reviewIds);
      changeIds = scopedRows.map(row => Number(row.change_id));
    } else {
      const scope = selectedSellerExportScope();
      const scopeSkus = await resolveSellerExportScopeSkus();
      if (scope !== 'all' && !scopeSkus.length) throw new Error(scope === 'selected' ? '체크한 SKU가 없습니다.' : '현재 검색·필터 결과에 해당하는 SKU가 없습니다.');
      changeIds = await liveData.validateSellerDraftsForExport(sources, scopeSkus);
    }
    if (!changeIds.length) throw new Error('매트릭스에서 검토할 판매처 수정안이 없습니다. 먼저 재고 수정안을 만들어주세요.');
    showSellerExportProgress(9, '최신 원본 불러오는 중', '마지막 업로드 때 시스템에 보관한 원본 파일을 자동으로 가져옵니다.');
    const filesBySource = await liveData.downloadLatestSellerOriginals(sources, progress => {
      const ratio = progress.total ? progress.completed / progress.total : 0;
      showSellerExportProgress(9 + ratio * 8, '최신 원본 불러오는 중', progress.name ? `${progress.name} 다운로드 중` : '원본 다운로드 완료');
    });
    showSellerExportProgress(18, 'DB 반영 계획 생성 중', `${formatNumber(changeIds.length)}건의 원본 위치를 판매처 코드로 확인하고 있습니다.`);
    const preparedExport = await liveData.prepareSellerExport({batchId, mode:'change_queue', changeIds, sources});
    const items = preparedExport.items;
    prepared = true;
    const blocked = items.filter(item => item.blocking_reason);
    const exportable = items.filter(item => !item.blocking_reason);
    if (!exportable.length) throw new Error(`원본 위치를 확인할 수 없는 항목만 ${formatNumber(blocked.length)}건입니다. 판매처 연결 코드와 최신 원본을 확인해주세요.`);
    showSellerExportProgress(22, '원본 파일 검증 중', `${formatNumber(exportable.length)}건을 대조합니다.${blocked.length ? ` 위치 확인 실패 ${formatNumber(blocked.length)}건은 제외합니다.` : ''}`);
    const result = await sellerExport.buildExportArchive(filesBySource, exportable, (percent, detail) => showSellerExportProgress(22 + percent * .74, '판매처 수정본 생성 중', detail));
    await liveData.completeSellerExport({batchId, success:true, manifest:result.manifest, skippedItems:result.skippedItems});
    const timestamp = new Date().toISOString().replace(/[-:T]/g,'').slice(0,12);
    sellerExport.downloadBlob(result.blob, `SystemV3_판매처원본_${timestamp}.zip`);
    const skippedCount = blocked.length + result.skippedItems.length;
    showSellerExportProgress(100, 'ZIP 생성 완료', `${formatNumber(result.appliedItems.length)}건 · 파일 ${result.manifest.length}개를 내려받았습니다. XLSX 수정 셀은 형광 노랑·굵은 글씨로 표시했습니다.${skippedCount ? ` 원본 검증 충돌 ${formatNumber(skippedCount)}건은 제외목록 CSV에 기록했습니다.` : ''}`);
    showToast(`판매처 원본 ${formatNumber(result.appliedItems.length)}건 내보내기 완료${skippedCount ? ` · 충돌 ${formatNumber(skippedCount)}건 제외` : ''}`);
    await Promise.all([loadChangeQueue({silent:true}), loadLiveMatrix()]);
  } catch (error) {
    console.error('seller export failed', error);
    if (prepared) {
      try { await liveData.completeSellerExport({batchId, success:false, errorMessage:error?.message || String(error)}); } catch (completeError) { console.error('seller export failure state update failed', completeError); }
    }
    showSellerExportProgress(0, '내보내기 중단', error?.message || '원본 파일을 확인해주세요.');
    showToast(`원본 내보내기 실패: ${error?.message || error}`);
  } finally {
    sellerExportState.running = false;
    button.disabled = false;
    document.getElementById('seller-export-cancel').disabled = false;
    document.getElementById('seller-export-close').disabled = false;
  }
}

document.getElementById('matrix-match-stock-btn').addEventListener('click', () => openSellerExport({action:'draft'}));
document.getElementById('matrix-export-btn').addEventListener('click', () => openSellerExport({action:'export'}));
document.getElementById('queue-export').addEventListener('click', () => openSellerExport({action:'export', rows:selectedQueueRows()}));
document.getElementById('seller-export-close').addEventListener('click', closeSellerExport);
document.getElementById('seller-export-cancel').addEventListener('click', closeSellerExport);
document.getElementById('seller-export-run').addEventListener('click', runSellerExport);
sellerExportModal.querySelectorAll('.seller-export-source-check').forEach(input => input.addEventListener('change', refreshSellerExportPreview));
sellerExportModal.querySelectorAll('input[name="seller-export-scope"]').forEach(input => input.addEventListener('change', refreshSellerExportPreview));

const matrixCsvModal = document.getElementById('matrix-csv-modal');
const matrixCsvState = {running:false, cancelRequested:false};

function matrixCsvFilterSummary() {
  if (matrixState.codeListRows.length) {
    return `${matrixState.codeListName || '엑셀 코드목록'} · 입력 행 순서와 중복, 미발견 행을 그대로 저장합니다.`;
  }
  const parts = [];
  if (matrixState.search) parts.push(`검색 “${matrixState.search}”`);
  if (matrixState.searchSources.length < 4) parts.push(`검색처 ${matrixState.searchSources.map(source => CHANNEL_LABELS[source] || (source === 'sellpia' ? '셀피아' : source)).join('·')}`);
  const statusLabels = {all:'전체 연결상태', attention:'미매칭+검토', connected:'연결 완료', review:'검토 필요', unmatched:'미매칭'};
  parts.push(statusLabels[matrixState.status] || matrixState.status);
  if (matrixState.advancedFilter.conditions.length) parts.push(`상세조건 ${matrixState.advancedFilter.conditions.length}개 ${matrixState.advancedFilter.logic === 'or' ? 'OR' : 'AND'}`);
  const sortLabels = {sku_asc:'SKU 오름차순', stock_desc:'재고 많은 순', price_desc:'가격 높은 순', updated_desc:'최근 갱신 순'};
  parts.push(sortLabels[matrixState.sort] || matrixState.sort);
  return parts.join(' · ');
}

function showMatrixCsvProgress(percent, title, detail) {
  const panel = document.getElementById('matrix-csv-progress');
  panel.hidden = false;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  document.getElementById('matrix-csv-progress-title').textContent = title;
  document.getElementById('matrix-csv-progress-percent').textContent = `${safePercent}%`;
  document.getElementById('matrix-csv-progress-bar').style.width = `${safePercent}%`;
  document.getElementById('matrix-csv-progress-detail').textContent = detail;
}

function openMatrixCsvExport() {
  if (!matrixCsv || !liveData?.loadMatrixExportChunk) {
    showToast('CSV 내보내기 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    return;
  }
  matrixCsvState.cancelRequested = false;
  document.getElementById('matrix-csv-count').textContent = `${formatNumber(matrixState.total)}행`;
  document.getElementById('matrix-csv-filter-summary').textContent = matrixCsvFilterSummary();
  document.getElementById('matrix-csv-progress').hidden = true;
  document.getElementById('matrix-csv-run').disabled = matrixState.total === 0;
  matrixCsvModal.hidden = false;
}

function closeMatrixCsvExport() {
  if (matrixCsvState.running) {
    matrixCsvState.cancelRequested = true;
    showMatrixCsvProgress(0, '취소 요청됨', '현재 데이터 묶음이 끝나면 CSV 생성을 중단합니다.');
    return;
  }
  matrixCsvModal.hidden = true;
}

function matrixCsvFileName(codeListMode) {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const base = codeListMode && matrixState.codeListName
    ? matrixState.codeListName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60)
    : '상세필터';
  return `SystemV3_${base}_${timestamp}.csv`;
}

async function loadCodeListCsvChunk(offset, limit) {
  const codeRows = matrixState.codeListRows.slice(offset, offset + limit).map(item => ({...item}));
  const skus = [...new Set(codeRows.map(item => String(item.sellpia_sku_code || '').trim()).filter(Boolean))];
  const result = skus.length
    ? await liveData.loadMatrixExportChunk({offset:0, limit:Math.max(1, skus.length), status:'all', advancedFilter:{logic:'and', conditions:[]}, skus})
    : {rows:[]};
  const bySku = new Map((result.rows || []).map(row => [String(row.sellpia_sku_code || '').trim(), row]));
  return codeRows.map(codeRow => {
    const product = bySku.get(String(codeRow.sellpia_sku_code || '').trim());
    return product
      ? {...product, __codeList:codeRow}
      : {sellpia_sku_code:'', __codeList:codeRow, __codeListPlaceholder:true};
  });
}

function isMatrixCsvTimeout(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('statement timeout') || message.includes('canceling statement') || message.includes('57014');
}

async function loadMatrixCsvChunk(options, onRetry) {
  let limit = Math.max(50, Math.min(Number(options.limit) || 400, 400));
  while (true) {
    try {
      return await liveData.loadMatrixExportChunk({...options, limit});
    } catch (error) {
      if (!isMatrixCsvTimeout(error) || limit <= 100) throw error;
      limit = Math.max(100, Math.floor(limit / 2));
      onRetry?.(limit);
    }
  }
}

async function runMatrixCsvExport() {
  if (matrixCsvState.running || !matrixState.total) return;
  const codeListMode = matrixState.codeListRows.length > 0;
  const scope = matrixCsvModal.querySelector('input[name="matrix-csv-scope"]:checked')?.value || 'visible';
  const columns = matrixCsv.buildColumns({scope, view:cloneView(activeView), codeListMode});
  const chunks = [matrixCsv.serializeHeader(columns)];
  const total = matrixState.total;
  // The wide live matrix can exceed the hosted Postgres statement timeout at
  // 1,000 rows even though the browser writes the CSV incrementally. Keep each
  // request comfortably below that boundary and split again if the DB is busy.
  const chunkSize = codeListMode ? 200 : 400;
  const runButton = document.getElementById('matrix-csv-run');
  const closeButton = document.getElementById('matrix-csv-close');
  matrixCsvState.running = true;
  matrixCsvState.cancelRequested = false;
  runButton.disabled = true;
  closeButton.disabled = true;
  runButton.textContent = 'CSV 생성 중…';
  let processed = 0;
  try {
    showMatrixCsvProgress(1, '서버 조회 준비', `${formatNumber(total)}행을 ${formatNumber(chunkSize)}행 단위로 안전하게 불러옵니다.`);
    while (processed < total) {
      if (matrixCsvState.cancelRequested) throw new Error('사용자가 CSV 생성을 취소했습니다.');
      const rows = codeListMode
        ? await loadCodeListCsvChunk(processed, chunkSize)
        : (await loadMatrixCsvChunk({
            offset:processed,
            limit:Math.min(chunkSize, total - processed),
            search:matrixState.search,
            searchSources:[...matrixState.searchSources],
            status:matrixState.status,
            sort:matrixState.sort,
            advancedFilter:cloneAdvancedFilter(matrixState.advancedFilter)
          }, retryLimit => showMatrixCsvProgress(
            total ? Math.min(96, Math.max(2, (processed / total) * 96)) : 2,
            '서버 응답 재시도 중',
            `서버가 혼잡해 ${formatNumber(retryLimit)}행 단위로 자동 축소했습니다. 완료된 ${formatNumber(processed)}행부터 이어갑니다.`
          ))).rows;
      if (!rows.length) break;
      chunks.push(matrixCsv.serializeRows(rows, columns));
      processed += rows.length;
      const percent = total ? Math.min(96, Math.max(2, (processed / total) * 96)) : 96;
      showMatrixCsvProgress(percent, 'CSV 데이터 작성 중', `${formatNumber(processed)} / ${formatNumber(total)}행 완료 · 현재 조건과 정렬 순서 유지`);
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    if (matrixCsvState.cancelRequested) throw new Error('사용자가 CSV 생성을 취소했습니다.');
    if (!processed) throw new Error('현재 조건으로 내보낼 데이터가 없습니다.');
    showMatrixCsvProgress(98, '파일 저장 준비', `${formatNumber(processed)}행을 한글·코드 보호 형식으로 묶고 있습니다.`);
    const bytes = matrixCsv.downloadChunks(chunks, matrixCsvFileName(codeListMode));
    showMatrixCsvProgress(100, 'CSV 저장 완료', `${formatNumber(processed)}행 · ${(bytes / 1024 / 1024).toFixed(1)}MB 파일을 내려받았습니다.`);
    showToast(`현재 결과 ${formatNumber(processed)}행 CSV 저장 완료`);
  } catch (error) {
    const cancelled = matrixCsvState.cancelRequested || /취소/.test(String(error?.message || error));
    showMatrixCsvProgress(0, cancelled ? 'CSV 생성 취소' : 'CSV 생성 실패', cancelled ? `${formatNumber(processed)}행 처리 후 중단했습니다. 파일은 저장되지 않았습니다.` : (error?.message || String(error)));
    if (!cancelled) {
      console.error('matrix csv export failed', error);
      showToast(`CSV 저장 실패: ${error?.message || error}`);
    }
  } finally {
    matrixCsvState.running = false;
    matrixCsvState.cancelRequested = false;
    runButton.disabled = false;
    closeButton.disabled = false;
    runButton.textContent = 'CSV 만들기';
  }
}

document.getElementById('matrix-csv-btn').addEventListener('click', openMatrixCsvExport);
document.getElementById('matrix-csv-close').addEventListener('click', closeMatrixCsvExport);
document.getElementById('matrix-csv-cancel').addEventListener('click', closeMatrixCsvExport);
document.getElementById('matrix-csv-run').addEventListener('click', runMatrixCsvExport);
matrixCsvModal.addEventListener('click', event => { if (event.target === matrixCsvModal) closeMatrixCsvExport(); });
document.getElementById('queue-confirm-applied').addEventListener('click', async event => {
  const rows = selectedQueueRows().filter(row => row.status === 'exported');
  if (!rows.length || !window.confirm(`${rows.length}건이 판매처에 실제 업로드 완료되었음을 확인할까요?`)) return;
  const button = event.currentTarget; button.disabled = true;
  try {
    const result = await liveData.confirmChangesApplied(rows.map(row => Number(row.change_id)));
    showToast(`${Number(result?.applied_count || 0)}건을 반영 완료로 기록했습니다.`);
    await loadChangeQueue();
  } catch (error) { showToast(`반영 완료 기록 실패: ${error?.message || error}`); }
  finally { updateQueueSelection(); }
});

function multiLinkKey(row) {
  return `${row?.source_channel || ''}|${row?.product_code || ''}|${row?.option_code || ''}`;
}

function multiLinkChannelLabel(source) {
  return {smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리'}[source] || source || '-';
}

function multiLinkRelationLabel(type, componentCount = 0, listingCount = 0) {
  if (type === 'multi_bundle') return `1:N + 조합 ${componentCount}SKU`;
  if (type === 'bundle') return `조합 ${componentCount}SKU`;
  if (type === 'multi') return `1:N ${listingCount || 2}개`;
  return '일반 1:1';
}

function renderMultiLinkRows() {
  const body = document.getElementById('multi-link-body');
  if (!multiLinkState.rows.length) {
    const copy = multiLinkState.relationType === 'complex'
      ? '현재 조회 조건에 해당하는 다중·조합 연결이 없습니다. 오른쪽에서 새 구성을 추가할 수 있습니다.'
      : '조회 조건에 해당하는 연결이 없습니다.';
    body.innerHTML = `<tr class="multi-link-empty"><td colspan="7">${escapeHtml(copy)}</td></tr>`;
    return;
  }
  const selectedKey = multiLinkKey(multiLinkState.selected);
  body.innerHTML = multiLinkState.rows.map(row => {
    const components = Array.isArray(row.components) ? row.components : [];
    const summary = components.slice(0, 3).map(item => `<span>${escapeHtml(item.sku)} × ${formatNumber(item.qty)}</span>`).join('');
    const overflow = components.length > 3 ? `<em>+${components.length - 3}</em>` : '';
    const stock = row.calculated_stock === null || row.calculated_stock === undefined ? '-' : formatNumber(row.calculated_stock);
    const sellerStock = row.seller_stock === null || row.seller_stock === undefined ? '-' : formatNumber(row.seller_stock);
    const draft = row.inventory_change_id ? `<em>수정안 ${formatNullableNumber(row.inventory_draft_stock)} · ${escapeHtml(QUEUE_STATUS_LABELS[row.inventory_draft_status] || row.inventory_draft_status)}</em>` : '';
    return `<tr class="multi-link-row${selectedKey === multiLinkKey(row) ? ' selected' : ''}${row.inventory_change_id ? ' has-draft' : ''}" data-multi-link-key="${escapeHtml(multiLinkKey(row))}">
      <td><span class="relation-pill ${escapeHtml(row.relation_type)}">${escapeHtml(multiLinkRelationLabel(row.relation_type, row.component_count, row.max_listing_count))}</span></td>
      <td><span class="multi-link-channel ${escapeHtml(row.source_channel)}"><i></i>${escapeHtml(multiLinkChannelLabel(row.source_channel))}</span></td>
      <td class="code-cell">${escapeHtml(row.product_code || '-')}</td><td class="code-cell">${escapeHtml(row.option_code || '-')}</td>
      <td class="multi-link-name"><b title="${escapeHtml(row.product_name || '')}">${escapeHtml(row.product_name || '상품명 없음')}</b><span title="${escapeHtml(row.option_name || '')}">${escapeHtml(row.option_name || '옵션명 없음')}</span></td>
      <td><div class="multi-link-components-summary">${summary}${overflow}</div></td>
      <td class="multi-link-stock${stock === '-' ? ' unknown' : ''}"><b>${sellerStock} → ${stock}</b><small>원본 → 계산</small>${draft}</td>
    </tr>`;
  }).join('');
}

function renderMultiLinkInventoryAction(row) {
  const panel = document.getElementById('multi-link-inventory-action');
  const state = document.getElementById('multi-link-inventory-state');
  const copy = document.getElementById('multi-link-inventory-copy');
  const sellerStock = document.getElementById('multi-link-seller-stock');
  const calculatedStock = document.getElementById('multi-link-calculated-stock');
  const stageButton = document.getElementById('multi-link-stage-stock');
  sellerStock.textContent = formatNullableNumber(row?.seller_stock);
  calculatedStock.textContent = formatNullableNumber(row?.calculated_stock);

  if (!row) {
    panel.classList.add('disabled');
    state.textContent = '연결을 선택해주세요';
    copy.textContent = '명시적으로 저장한 구성만 재고 수정안으로 만들 수 있습니다.';
    stageButton.disabled = true;
    stageButton.textContent = '계산재고를 변경대기에 등록';
    return;
  }

  const hasSellerStock = row.seller_stock !== null && row.seller_stock !== undefined;
  const hasCalculatedStock = row.calculated_stock !== null && row.calculated_stock !== undefined;
  const sameStock = hasSellerStock && hasCalculatedStock && Number(row.seller_stock) === Number(row.calculated_stock);
  const hasDraft = Boolean(row.inventory_change_id);
  const canStage = Boolean(row.is_explicit && hasSellerStock && hasCalculatedStock && (!sameStock || hasDraft));
  panel.classList.toggle('disabled', !canStage);
  stageButton.disabled = !canStage;

  if (!row.is_explicit) {
    state.textContent = '구성 확정 필요';
    copy.textContent = '현재 목록은 기존 매핑에서 추정한 관계입니다. SKU 구성을 한 번 저장해 확정한 뒤에만 재고 수정안을 만들 수 있습니다.';
    stageButton.textContent = '구성 저장 후 사용 가능';
  } else if (!hasCalculatedStock) {
    state.textContent = '계산 불가';
    copy.textContent = '구성 SKU 중 가용재고를 확인할 수 없는 항목이 있습니다.';
    stageButton.textContent = '가용재고 확인 필요';
  } else if (!hasSellerStock) {
    state.textContent = '판매처 원본 확인 필요';
    copy.textContent = '최신 판매처 원본에 현재 재고가 있어야 수정안을 만들 수 있습니다.';
    stageButton.textContent = '최신 원본 확인 필요';
  } else if (hasDraft) {
    state.textContent = `수정안 #${row.inventory_change_id} · ${QUEUE_STATUS_LABELS[row.inventory_draft_status] || row.inventory_draft_status}`;
    copy.textContent = `현재 수정안 ${formatNullableNumber(row.inventory_draft_stock)}개가 변경대기에 있습니다. 다시 등록하면 최신 구성 계산값으로 교체합니다.`;
    stageButton.textContent = sameStock ? '일치 상태 반영 · 기존 수정안 취소' : '최신 계산재고로 수정안 교체';
  } else if (sameStock) {
    state.textContent = '판매처 재고와 일치';
    copy.textContent = '현재 판매처 원본 재고와 조합 계산재고가 같아 새 수정안이 필요하지 않습니다.';
    stageButton.textContent = '재고 일치';
  } else {
    const difference = Number(row.calculated_stock) - Number(row.seller_stock);
    state.textContent = `재고 차이 ${difference > 0 ? '+' : ''}${formatNumber(difference)}`;
    copy.textContent = '등록해도 원본은 바뀌지 않습니다. 변경대기에서 검증한 뒤 기존 XLSX 내보내기를 사용합니다.';
    stageButton.textContent = '계산재고를 변경대기에 등록';
  }
}

function renderMultiLinkEditor(row) {
  multiLinkState.selected = row || null;
  renderMultiLinkRows();
  renderMultiLinkInventoryAction(row);
  const title = document.getElementById('multi-link-editor-title');
  const copy = document.getElementById('multi-link-editor-copy');
  const componentsBox = document.getElementById('multi-link-components');
  if (!row) {
    title.textContent = '새 판매처 구성 등록';
    copy.textContent = '판매처 코드와 셀피아 SKU를 입력하면 새 연결을 만들 수 있습니다.';
    componentsBox.innerHTML = '<div class="multi-link-editor-empty">선택된 판매처 옵션이 없습니다.</div>';
    return;
  }
  title.textContent = `${multiLinkChannelLabel(row.source_channel)} · ${row.product_code}${row.option_code ? ` / ${row.option_code}` : ''}`;
  copy.textContent = `${multiLinkRelationLabel(row.relation_type, row.component_count, row.max_listing_count)} · 계산재고 ${row.calculated_stock ?? '확인 불가'}개 · ${row.is_explicit ? '명시적 구성' : '기존 1:1 호환 연결'}`;
  document.getElementById('multi-link-form-source').value = row.source_channel;
  document.getElementById('multi-link-form-product').value = row.product_code || '';
  document.getElementById('multi-link-form-option').value = row.option_code || '';
  const components = Array.isArray(row.components) ? row.components : [];
  componentsBox.innerHTML = components.map(component => {
    const canRemove = Boolean(component.componentId);
    return `<article class="multi-link-component" data-component-id="${component.componentId || ''}" data-component-sku="${escapeHtml(component.sku)}">
      <div class="multi-link-component-head"><div><b>${escapeHtml(component.sku)}</b><span>${escapeHtml([component.productName, component.optionName].filter(Boolean).join(' · ') || '셀피아 상품정보 없음')}</span></div>${canRemove ? '<button type="button" data-remove-component>연결 해제</button>' : ''}</div>
      <div class="multi-link-component-meta"><span>가용재고<b>${formatNullableNumber(component.availableStock)}</b></span><span>구성수량<b>${formatNumber(component.qty)}</b></span><span>가능세트<b>${component.availableStock === null || component.availableStock === undefined ? '-' : formatNumber(Math.floor(Number(component.availableStock) / Math.max(1, Number(component.qty))))}</b></span></div>
      <div class="multi-link-component-actions"><input data-component-qty type="number" min="1" step="1" value="${Math.max(1, Number(component.qty) || 1)}"><select data-component-role><option value="primary"${component.role === 'primary' ? ' selected' : ''}>기준 구성</option><option value="additional"${component.role === 'additional' ? ' selected' : ''}>추가 구성</option></select><button type="button" data-save-component>수량 저장</button></div>
    </article>`;
  }).join('') || '<div class="multi-link-editor-empty">활성 구성품이 없습니다.</div>';
}

async function loadMultiLinks({resetPage = false, selectKey = ''} = {}) {
  if (!liveData?.loadListingGraph) return false;
  if (resetPage) multiLinkState.page = 1;
  const requestId = ++multiLinkState.requestId;
  multiLinkState.loading = true;
  const body = document.getElementById('multi-link-body');
  body.innerHTML = '<tr class="multi-link-empty loading"><td colspan="7">Supabase에서 판매처 연결 구조를 불러오는 중입니다.</td></tr>';
  try {
    const result = await liveData.loadListingGraph({
      source:multiLinkState.source,
      relationType:multiLinkState.relationType,
      search:multiLinkState.search,
      page:multiLinkState.page,
      pageSize:multiLinkState.pageSize
    });
    if (requestId !== multiLinkState.requestId) return false;
    multiLinkState.rows = result.rows;
    multiLinkState.total = result.count;
    multiLinkState.page = result.page;
    multiLinkState.loaded = true;
    const first = result.count ? ((result.page - 1) * result.pageSize) + 1 : 0;
    const last = Math.min(result.page * result.pageSize, result.count);
    const wantedKey = selectKey || multiLinkKey(multiLinkState.selected);
    multiLinkState.selected = result.rows.find(item => multiLinkKey(item) === wantedKey) || null;
    document.getElementById('multi-link-count').textContent = formatNumber(result.count);
    document.getElementById('multi-link-range').textContent = `${formatNumber(first)}–${formatNumber(last)} / ${formatNumber(result.count)}`;
    document.getElementById('multi-link-page').textContent = result.page;
    document.getElementById('multi-link-prev').disabled = result.page <= 1;
    document.getElementById('multi-link-next').disabled = last >= result.count;
    if (multiLinkState.relationType === 'complex' && multiLinkState.source === 'all' && !multiLinkState.search) {
      document.getElementById('multi-link-badge').textContent = formatNumber(result.count);
    }
    renderMultiLinkEditor(multiLinkState.selected);
    return true;
  } catch (error) {
    console.error('multi-link graph load failed', error);
    body.innerHTML = `<tr class="multi-link-empty error"><td colspan="7">연결 구조를 불러오지 못했습니다. ${escapeHtml(error?.message || '')}</td></tr>`;
    return false;
  } finally {
    if (requestId === multiLinkState.requestId) multiLinkState.loading = false;
  }
}

function openMultiLinkWorkspace(source = 'all', sku = '') {
  multiLinkState.source = source || 'all';
  multiLinkState.relationType = 'complex';
  multiLinkState.search = sku || '';
  document.getElementById('multi-link-source').value = multiLinkState.source;
  document.getElementById('multi-link-type').value = multiLinkState.relationType;
  document.getElementById('multi-link-search').value = multiLinkState.search;
  showPage('multi-links');
  if (multiLinkState.loaded) loadMultiLinks({resetPage:true});
}

document.getElementById('multi-link-body').addEventListener('click', event => {
  const rowElement = event.target.closest('.multi-link-row');
  if (!rowElement) return;
  const row = multiLinkState.rows.find(item => multiLinkKey(item) === rowElement.dataset.multiLinkKey);
  if (row) renderMultiLinkEditor(row);
});

document.getElementById('multi-link-components').addEventListener('click', async event => {
  const card = event.target.closest('.multi-link-component');
  if (!card || !multiLinkState.selected) return;
  if (event.target.closest('[data-save-component]')) {
    const qty = Math.max(1, Math.trunc(Number(card.querySelector('[data-component-qty]').value) || 1));
    const role = card.querySelector('[data-component-role]').value;
    event.target.disabled = true;
    try {
      await liveData.saveListingComponent({source:multiLinkState.selected.source_channel, productCode:multiLinkState.selected.product_code, optionCode:multiLinkState.selected.option_code, sku:card.dataset.componentSku, qty, role});
      const selectedKey = multiLinkKey(multiLinkState.selected);
      await Promise.all([loadMultiLinks({selectKey:selectedKey}), loadLiveMatrix()]);
      showToast(`${card.dataset.componentSku} 구성수량을 저장했습니다.`);
    } catch (error) { showToast(`구성 저장 실패: ${error?.message || error}`); }
    finally { event.target.disabled = false; }
    return;
  }
  if (event.target.closest('[data-remove-component]')) {
    if (!window.confirm(`${card.dataset.componentSku} 구성 연결을 해제할까요? 이력은 보존됩니다.`)) return;
    event.target.disabled = true;
    try {
      await liveData.deactivateListingComponent(card.dataset.componentId);
      const selectedKey = multiLinkKey(multiLinkState.selected);
      await Promise.all([loadMultiLinks({selectKey:selectedKey}), loadLiveMatrix()]);
      showToast(`${card.dataset.componentSku} 연결을 해제했습니다.`);
    } catch (error) { showToast(`연결 해제 실패: ${error?.message || error}`); }
    finally { event.target.disabled = false; }
  }
});

document.getElementById('multi-link-stage-stock').addEventListener('click', async event => {
  const row = multiLinkState.selected;
  if (!row || !liveData?.stageListingInventoryDraft) return;
  const button = event.currentTarget;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = '수정안 저장 중…';
  try {
    const result = await liveData.stageListingInventoryDraft({
      source:row.source_channel,
      productCode:row.product_code,
      optionCode:row.option_code,
      batchId:createRequestId()
    });
    const selectedKey = multiLinkKey(row);
    await Promise.all([
      loadMultiLinks({selectKey:selectedKey}),
      loadChangeQueue({silent:true}),
      loadLiveDashboardMetrics(),
      loadLiveMatrix()
    ]);
    if (result?.draft_status === 'unchanged') {
      showToast(`판매처 재고와 계산재고가 ${formatNullableNumber(result.calculated_stock)}개로 일치합니다.${Number(result.cancelled_count || 0) ? ' 기존 수정안은 취소했습니다.' : ''}`);
    } else {
      showToast(`조합 계산재고 ${formatNullableNumber(result.current_stock)} → ${formatNullableNumber(result.calculated_stock)}개를 변경대기 #${result.change_id}로 저장했습니다.`);
    }
  } catch (error) {
    showToast(`조합 재고 수정안 저장 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
    renderMultiLinkInventoryAction(multiLinkState.selected);
  }
});

document.getElementById('multi-link-open-queue').addEventListener('click', () => showPage('jobs'));

document.getElementById('multi-link-form').addEventListener('submit', async event => {
  event.preventDefault();
  const saveButton = document.getElementById('multi-link-save');
  const payload = {
    source:document.getElementById('multi-link-form-source').value,
    productCode:document.getElementById('multi-link-form-product').value,
    optionCode:document.getElementById('multi-link-form-option').value,
    sku:document.getElementById('multi-link-form-sku').value,
    qty:document.getElementById('multi-link-form-qty').value,
    role:document.getElementById('multi-link-form-role').value
  };
  saveButton.disabled = true;
  saveButton.textContent = '구성 저장 중…';
  try {
    const saved = await liveData.saveListingComponent(payload);
    multiLinkState.source = payload.source;
    multiLinkState.relationType = 'all';
    multiLinkState.search = payload.productCode;
    document.getElementById('multi-link-source').value = payload.source;
    document.getElementById('multi-link-type').value = 'all';
    document.getElementById('multi-link-search').value = payload.productCode;
    const selectedKey = `${payload.source}|${payload.productCode.trim()}|${payload.optionCode.trim()}`;
    await Promise.all([loadMultiLinks({resetPage:true, selectKey:selectedKey}), loadLiveMatrix()]);
    document.getElementById('multi-link-form-sku').value = '';
    document.getElementById('multi-link-form-qty').value = '1';
    showToast(`구성을 저장했습니다.${Number(saved?.promoted_component_count || 0) ? ' 기존 1:1 연결도 함께 보존했습니다.' : ''}`);
  } catch (error) { showToast(`구성 저장 실패: ${error?.message || error}`); }
  finally { saveButton.disabled = false; saveButton.textContent = '구성 저장'; }
});

let multiLinkSearchTimer;
document.getElementById('multi-link-search').addEventListener('input', event => {
  multiLinkState.search = event.target.value.trim();
  clearTimeout(multiLinkSearchTimer);
  multiLinkSearchTimer = setTimeout(() => loadMultiLinks({resetPage:true}), 280);
});
document.getElementById('multi-link-source').addEventListener('change', event => {multiLinkState.source = event.target.value; loadMultiLinks({resetPage:true});});
document.getElementById('multi-link-type').addEventListener('change', event => {multiLinkState.relationType = event.target.value; loadMultiLinks({resetPage:true});});
document.getElementById('multi-link-refresh').addEventListener('click', async event => {
  event.target.disabled = true;
  event.target.textContent = '연결 갱신 중…';
  try {
    await liveData.refreshListingGraphCache();
    await Promise.all([loadMultiLinks(), loadLiveMatrix()]);
    showToast('현재 매트릭스 연결을 다중·조합 목록에 반영했습니다.');
  } catch (error) { showToast(`연결 갱신 실패: ${error?.message || error}`); }
  finally { event.target.disabled = false; event.target.textContent = '새로고침'; }
});
document.getElementById('multi-link-prev').addEventListener('click', () => {if (multiLinkState.page > 1 && !multiLinkState.loading) {multiLinkState.page -= 1; loadMultiLinks();}});
document.getElementById('multi-link-next').addEventListener('click', () => {if (multiLinkState.page * multiLinkState.pageSize < multiLinkState.total && !multiLinkState.loading) {multiLinkState.page += 1; loadMultiLinks();}});

function inventoryFilteredRows() {
  const query = document.getElementById('inventory-search').value.trim().toLowerCase();
  const activityFilter = document.getElementById('inventory-activity-filter').value;
  return inventoryState.rows.filter(row => {
    const matchesSearch = !query || `${row.sellpia_sku_code || ''} ${row.own_code || ''}`.toLowerCase().includes(query);
    const added = Number(row.picked_qty || 0) + Number(row.shortage_drawer_qty || 0);
    const matchesActivity = activityFilter === 'all' || (activityFilter === 'changed' ? added > 0 : added === 0);
    return matchesSearch && matchesActivity;
  });
}

function renderInventorySurvey() {
  const rows = inventoryFilteredRows();
  const allRows = inventoryState.rows;
  const snapshot = inventoryState.snapshot;
  document.getElementById('inventory-snapshot-name').textContent = snapshot?.source_file_name || '업로드된 조사파일 없음';
  document.getElementById('inventory-snapshot-time').textContent = snapshot
    ? `${snapshot.survey_date || '-'} 조사 · ${formatLiveTime(snapshot.completed_at)} 업로드`
    : '원본 업로드에서 재고조사 파일을 등록하세요.';
  document.getElementById('inventory-metric-skus').textContent = formatNumber(allRows.length);
  document.getElementById('inventory-metric-counted').textContent = formatNumber(allRows.reduce((sum, row) => sum + Number(row.counted_qty || 0), 0));
  document.getElementById('inventory-metric-picked').textContent = formatNumber(allRows.reduce((sum, row) => sum + Number(row.picked_qty || 0), 0));
  document.getElementById('inventory-metric-drawer').textContent = formatNumber(allRows.reduce((sum, row) => sum + Number(row.shortage_drawer_qty || 0), 0));
  document.getElementById('inventory-metric-actual').textContent = formatNumber(allRows.reduce((sum, row) => sum + Number(row.actual_stock || 0), 0));
  document.getElementById('inventory-row-count').textContent = `${formatNumber(rows.length)}행 / 전체 ${formatNumber(allRows.length)}행`;
  document.getElementById('inventory-last-refresh').textContent = `마지막 갱신 ${formatLiveTime(inventoryState.activityRefreshedAt)}`;
  const liveBadge = document.getElementById('inventory-live-status');
  liveBadge.textContent = inventoryState.activityRefreshedAt ? '피킹 DB · 1분 갱신' : '피킹 DB 데이터 대기';
  document.getElementById('inventory-body').innerHTML = rows.length
    ? rows.map(row => {
      const picked = Number(row.picked_qty || 0);
      const drawer = Number(row.shortage_drawer_qty || 0);
      return `<tr>
        <td class="code-cell">${escapeHtml(row.sellpia_sku_code)}</td>
        <td>${escapeHtml(row.own_code || '-')}</td>
        <td>${formatNumber(row.counted_qty)}</td>
        <td class="${picked ? 'inventory-added' : 'inventory-zero'}">${formatNumber(picked)}</td>
        <td class="${drawer ? 'inventory-added' : 'inventory-zero'}">${formatNumber(drawer)}</td>
        <td class="inventory-actual">${formatNumber(row.actual_stock)}</td>
        <td class="inventory-event">${formatLiveTime(row.last_event_at)}</td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="7" class="inventory-empty">${snapshot ? '조건에 맞는 SKU가 없습니다.' : '재고조사 파일을 먼저 업로드해주세요.'}</td></tr>`;
}

async function loadInventorySurvey({silent = false} = {}) {
  if (inventoryState.loading || !liveData?.loadInventorySurveyData) return;
  inventoryState.loading = true;
  const requestId = ++inventoryState.requestId;
  const panel = document.querySelector('.inventory-table-panel');
  if (!silent) panel.classList.add('inventory-loading');
  try {
    const result = await liveData.loadInventorySurveyData();
    if (requestId !== inventoryState.requestId) return;
    inventoryState.rows = result.rows || [];
    inventoryState.snapshot = result.snapshot || null;
    inventoryState.activityRefreshedAt = result.activityRefreshedAt || '';
    inventoryState.loaded = true;
    renderInventorySurvey();
  } catch (error) {
    console.error('inventory survey load failed', error);
    document.getElementById('inventory-live-status').textContent = '피킹 DB 연결 오류';
    document.getElementById('inventory-body').innerHTML = `<tr><td colspan="7" class="inventory-empty">${escapeHtml(error?.message || '재고조사 데이터를 불러오지 못했습니다.')}</td></tr>`;
    if (!silent) showToast('재고조사 데이터를 불러오지 못했습니다.');
  } finally {
    inventoryState.loading = false;
    panel.classList.remove('inventory-loading');
  }
}

document.getElementById('inventory-search').addEventListener('input', renderInventorySurvey);
document.getElementById('inventory-activity-filter').addEventListener('change', renderInventorySurvey);
document.getElementById('inventory-refresh').addEventListener('click', () => loadInventorySurvey());
document.getElementById('inventory-upload-open').addEventListener('click', () => {
  sourceSelect.value = 'survey';
  updateSource();
  showPage('upload');
});
window.setInterval(() => {
  if (document.getElementById('inventory').classList.contains('active-page')) loadInventorySurvey({silent:true});
}, 60000);

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === pageId));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active-page');
  if (pageId === 'jobs') loadChangeQueue();
  if (pageId === 'multi-links' && !multiLinkState.loaded) loadMultiLinks({resetPage:true});
  if (pageId === 'inventory') loadInventorySurvey({silent:inventoryState.loaded});
  if (pageId === 'price-rules') window.SystemV3PriceRuleLab?.refresh();
  document.querySelector('.content-area').scrollTop = 0;
}

document.addEventListener('click', event => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) showPage(pageButton.dataset.page);
  const toastButton = event.target.closest('[data-toast]');
  if (toastButton) showToast(toastButton.dataset.toast);
  if (!mappingPopover.hidden && !event.target.closest('#mapping-popover,.mapping-code-button,[data-drawer-link-source]')) closeMappingSearch();
});

const sourceSelect = document.getElementById('source-select');
const sourceInfo = document.getElementById('source-info');
const fileGuide = document.getElementById('file-guide');
const fileSlots = document.getElementById('file-slots');
const uploadButton = document.getElementById('mock-upload-btn');
const uploadCapabilityBadge = document.getElementById('upload-capability-badge');
const sellerUploadMode = document.getElementById('seller-upload-mode');
let selectedFiles = [];

function isPatchableUploadSource(source = sourceSelect.value) {
  return ['sellpia','smartstore','makeshop','ably'].includes(source);
}

function currentUploadMode() {
  return sellerUploadMode?.querySelector('input[name="seller-upload-mode"]:checked')?.value === 'full' ? 'full' : 'patch';
}

function requiredUploadFileCount() {
  const config = sourceConfig[sourceSelect.value];
  return isPatchableUploadSource() && currentUploadMode() === 'patch' ? 1 : config.files;
}

function setUploadCapability() {
  const supported = ['sellpia','smartstore','makeshop','ably'].includes(sourceSelect.value) || sourceSelect.value === 'survey';
  const label = sourceConfig[sourceSelect.value]?.name || '원본';
  uploadButton.disabled = !supported;
  uploadButton.textContent = supported ? 'DB 업로드 시작' : '업로드 연결 예정';
  uploadCapabilityBadge.textContent = supported ? `${label} 실데이터 업로드 연결` : '업로드 연결 예정';
}

function updateSource() {
  const config = sourceConfig[sourceSelect.value];
  selectedFiles = [];
  document.getElementById('mock-file').value = '';
  sourceInfo.innerHTML = `<span class="channel-logo ${config.cls}">${config.initial}</span><div><b>${config.name}</b><p>${config.detail}</p></div><em>필수</em>`;
  sellerUploadMode.hidden = !isPatchableUploadSource();
  if (isPatchableUploadSource()) {
    sellerUploadMode.querySelector(`input[value="${sourceSelect.value === 'sellpia' ? 'full' : 'patch'}"]`).checked = true;
  }
  fileGuide.textContent = isPatchableUploadSource()
    ? sourceSelect.value === 'sellpia'
      ? '셀피아 전체 교체는 분할 원본 3개, 부분 갱신은 수정한 행이 든 파일 1개 이상이 필요합니다.'
      : '부분 갱신은 수정한 파일만 올리면 되고, 전체 교체는 판매처 전체 파일이 필요합니다.'
    : config.guide;
  renderFiles([]);
  document.querySelector('.upload-options').hidden = sourceSelect.value === 'survey';
  setUploadCapability();
}
sourceSelect.addEventListener('change', updateSource);
sellerUploadMode?.addEventListener('change', () => {
  const config = sourceConfig[sourceSelect.value];
  fileGuide.textContent = currentUploadMode() === 'patch'
    ? `부분 갱신 · ${config.name}에서 수정한 행이 든 파일 ${config.files > 1 ? '1개 이상' : '1개'}만 올려도 됩니다. 파일에 없는 항목은 유지됩니다.`
    : `전체 교체 · ${config.guide}`;
  renderFiles(selectedFiles);
});

const fileInput = document.getElementById('mock-file');
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') fileInput.click(); });
fileSlots.addEventListener('click', event => { if (event.target.closest('.slot-button')) fileInput.click(); });
['dragenter','dragover'].forEach(type => dropZone.addEventListener(type, event => {event.preventDefault();dropZone.classList.add('drag');}));
['dragleave','drop'].forEach(type => dropZone.addEventListener(type, event => {event.preventDefault();dropZone.classList.remove('drag');if(type==='drop') renderFiles(event.dataTransfer.files);}));
fileInput.addEventListener('change', () => renderFiles(fileInput.files));
function renderFiles(files) {
  const config = sourceConfig[sourceSelect.value];
  selectedFiles = Array.from(files || []).slice(0, config.files);
  const required = requiredUploadFileCount();
  fileSlots.innerHTML = Array.from({length:config.files},(_,i)=>{
    const file = selectedFiles[i];
    const optional = i >= required;
    return `<div><i>${file?'✓':i+1}</i><span><b>${file?file.name:`파일 ${i+1}${optional ? ' · 선택' : ' · 필수'}`}</b><em>${file?`${(file.size/1024/1024).toFixed(1)}MB · 업로드 준비됨`:optional?'부분 갱신에서는 생략 가능':'선택된 파일 없음'}</em></span><button type="button" class="slot-button">${file?'교체':'파일 선택'}</button></div>`;
  }).join('');
}

function showUploadProgress({percent = 0, title = '처리 중', detail = ''} = {}) {
  const progress = document.getElementById('upload-progress');
  progress.hidden = false;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  document.getElementById('upload-progress-title').textContent = title;
  document.getElementById('upload-progress-percent').textContent = `${safePercent}%`;
  document.getElementById('upload-progress-bar').style.width = `${safePercent}%`;
  document.getElementById('upload-progress-detail').textContent = detail;
}

uploadButton.addEventListener('click', async () => {
  const config = sourceConfig[sourceSelect.value];
  const supported = ['sellpia','smartstore','makeshop','ably'].includes(sourceSelect.value) || sourceSelect.value === 'survey';
  if (!supported) {
    showToast('이 원본은 아직 업로드할 수 없습니다.');
    return;
  }
  const requiredFiles = requiredUploadFileCount();
  if (selectedFiles.length < requiredFiles || (requiredFiles === config.files && selectedFiles.length !== config.files)) {
    showToast(isPatchableUploadSource() && currentUploadMode() === 'patch'
      ? `${config.name} 부분 갱신 파일을 1개 이상 선택해주세요.`
      : `${config.name} 전체 파일 ${config.files}개를 모두 선택해주세요.`);
    return;
  }
  const uploadMethod = sourceSelect.value === 'sellpia'
    ? liveData?.uploadSellpiaSnapshot
    : sourceSelect.value === 'survey'
      ? liveData?.uploadInventorySurvey
      : liveData?.uploadSellerSnapshot;
  if (!uploadMethod) {
    showToast('업로드 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    return;
  }
  const fields = {
    inventory: document.getElementById('upload-field-inventory').checked,
    price: document.getElementById('upload-field-price').checked,
    basic: document.getElementById('upload-field-basic').checked,
    status: document.getElementById('upload-field-status').checked,
    mode: isPatchableUploadSource() ? currentUploadMode() : 'full'
  };
  if (sourceSelect.value !== 'survey' && ![fields.inventory, fields.price, fields.basic, fields.status].some(Boolean)) {
    showToast('갱신할 항목을 하나 이상 선택해주세요.');
    return;
  }
  uploadButton.disabled = true;
  sourceSelect.disabled = true;
  fileInput.disabled = true;
  uploadButton.textContent = '업로드 진행 중…';
  showUploadProgress({
    percent:1,
    title:'파일 확인 중',
    detail:sourceSelect.value === 'sellpia'
      ? fields.mode === 'patch'
        ? '셀피아 부분 갱신 SKU와 선택 필드를 검사합니다. 파일에 없는 SKU는 유지합니다.'
        : '헤더, 연속 행번호, SKU 중복을 검사합니다.'
      : sourceSelect.value === 'survey'
        ? '셀피아 SKU, 자사코드, 조사수량 헤더를 검사합니다.'
        : fields.mode === 'patch'
          ? '부분 갱신 키를 검사합니다. 파일에 없는 기존 판매처 상품은 삭제하지 않습니다.'
          : '전체 교체용 헤더와 상품·옵션 코드 중복을 검사합니다.'
  });
  try {
    const result = sourceSelect.value === 'sellpia'
      ? await uploadMethod(selectedFiles, fields, showUploadProgress)
      : sourceSelect.value === 'survey'
        ? await uploadMethod(selectedFiles[0], showUploadProgress)
        : await uploadMethod(sourceSelect.value, selectedFiles, fields, showUploadProgress);
    if (sourceSelect.value === 'sellpia') {
      try {
        await liveData.waitForSellpiaMatrixRebuild(result.snapshotId, showUploadProgress);
      } catch (rebuildError) {
        console.warn('sellpia matrix rebuild is still pending', rebuildError);
        showUploadProgress({
          percent:98,
          title:'업로드 완료 · 매트릭스 재구성 대기',
          detail:rebuildError?.message || '자동 재구성이 아직 완료되지 않았습니다.'
        });
        showToast('셀피아 업로드 완료 · 매트릭스 자동 재구성 대기 중');
        return;
      }
    }
    const rowLabel = ['sellpia','survey'].includes(sourceSelect.value) ? 'SKU' : '상품·옵션';
    showUploadProgress({
      percent:100,
      title:sourceSelect.value === 'sellpia' ? '업로드·매트릭스 재구성 완료' : 'DB 업로드 완료',
      detail:sourceSelect.value === 'sellpia'
        ? result.uploadMode === 'patch'
          ? `업로드 ${formatNumber(result.uploadedRowCount)}개 SKU의 선택 항목만 갱신하고, 전체 ${formatNumber(result.rowCount)}개 SKU를 유지했습니다.`
          : `${formatNumber(result.rowCount)}개 최신 셀피아 SKU로 매트릭스를 완전히 교체했습니다.`
        : result.uploadMode === 'patch'
          ? `업로드 ${formatNumber(result.uploadedRowCount)}개만 갱신하고, 최신 판매처 원본 ${formatNumber(result.rowCount)}개를 유지했습니다.`
          : `${formatNumber(result.rowCount)}개 ${rowLabel}으로 판매처 원본을 전체 교체했습니다.`
    });
    showToast(result.uploadMode === 'patch'
      ? `${config.name} ${formatNumber(result.uploadedRowCount)}개 부분 갱신 완료`
      : `${config.name} ${formatNumber(result.rowCount)}개 ${rowLabel} 업로드 완료`);
    if (sourceSelect.value === 'survey') {
      inventoryState.loaded = false;
      await loadInventorySurvey();
      window.setTimeout(() => showPage('inventory'), 350);
    } else {
      await refreshLiveData({resetPage:true});
      window.setTimeout(() => showPage('matching'), 500);
    }
  } catch (error) {
    console.error(`${sourceSelect.value} snapshot upload failed`, error);
    showUploadProgress({percent:0, title:'업로드 실패', detail:error?.message || '원본 파일을 다시 확인해주세요.'});
    showToast(`${config.name} 업로드에 실패했습니다. 오류 내용을 확인해주세요.`);
  } finally {
    sourceSelect.disabled = false;
    fileInput.disabled = false;
    setUploadCapability();
  }
});
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !sellerExportModal.hidden) closeSellerExport();
  if (event.key === 'Escape' && !matrixCsvModal.hidden) closeMatrixCsvExport();
  if (event.key === 'Escape' && !viewSettingsModal.hidden) closeViewSettings();
  if (event.key === 'Escape' && !advancedFilterModal.hidden) closeAdvancedFilter();
  if (event.key === 'Escape' && !codeListModal.hidden) closeCodeListModal();
  if (event.key === 'Escape' && !mappingPopover.hidden) closeMappingSearch();
  if (event.key === 'Escape' && !document.getElementById('queue-event-panel').hidden) document.getElementById('queue-event-panel').hidden = true;
  if (event.key === 'Escape' && productDrawer.classList.contains('open')) closeProductDrawer();
});

const startupPreset = findPreset(activePresetId);
activePresetId = startupPreset.id;
applyViewPreset(startupPreset, {id:startupPreset.id, reload:false, announce:false});
updateCodeListFilterUi();

if (liveData) {
  refreshLiveData({resetPage:true});
  window.setInterval(() => Promise.all([loadLiveSourceStatus(), loadLiveDashboardMetrics()]), 60000);
  window.setInterval(() => loadMappingSyncStatus({autoRefresh:true}), 15000);
  window.setInterval(() => {
    if (document.getElementById('jobs').classList.contains('active-page')) loadChangeQueue({silent:true});
  }, 30000);
} else {
  setMatrixConnection('error', 'DB 모듈 없음');
}
