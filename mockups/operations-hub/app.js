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
const matrixState = {page:1, search:'', searchSources:['sellpia','smartstore','makeshop','ably'], status:'all', sort:'sku_asc', total:0, loading:false, requestId:0, codeListSkus:[], codeListRows:[], codeListName:''};
const matrixRowsBySku = new Map();
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
  zoom:100
};
const BUILTIN_PRESETS = Object.freeze({
  all:{id:'all', name:'전체 현황', ...DEFAULT_VIEW_OPTIONS},
  matching:{id:'matching', name:'매칭 검토', ...DEFAULT_VIEW_OPTIONS, showInventory:false, showPrice:false, showAttributes:false, wrapNames:true, status:'attention'},
  inventory:{id:'inventory', name:'재고 작업', ...DEFAULT_VIEW_OPTIONS, showCodes:false, showSellerNames:false, showPrice:false, showAttributes:false, zoom:110},
  price:{id:'price', name:'가격 작업', ...DEFAULT_VIEW_OPTIONS, showCodes:false, showSellerNames:false, showInventory:false, showAttributes:false, zoom:110},
  attributes:{id:'attributes', name:'속성·태그', ...DEFAULT_VIEW_OPTIONS, channels:{smartstore:false, makeshop:false, ably:false}, showStatus:false, showCodes:false, showSellerNames:false, showInventory:false, showPrice:false, status:'all'}
});

function cloneView(view) {
  return {...view, channels:{...view.channels}};
}

function readCustomPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MATRIX_PRESETS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item?.id && item?.name).map(item => ({...cloneView(DEFAULT_VIEW_OPTIONS), ...item, channels:{...DEFAULT_VIEW_OPTIONS.channels, ...item.channels}})) : [];
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
    smartstore:{status:[8], codes:[9,10], names:[11], inventory:[12], price:[13]},
    makeshop:{status:[14], codes:[15,16], names:[17], inventory:[18], price:[19]},
    ably:{status:[20], codes:[21,22], names:[23], inventory:[24], price:[25]}
  };
  Object.entries(channelColumns).forEach(([channel, groups]) => {
    if (!view.channels[channel]) return;
    if (view.showStatus ?? view.showMapping ?? true) groups.status.forEach(index => visible.add(index));
    if (view.showCodes ?? view.showMapping ?? true) groups.codes.forEach(index => visible.add(index));
    if (view.showSellerNames ?? true) groups.names.forEach(index => visible.add(index));
    if (view.showInventory) groups.inventory.forEach(index => visible.add(index));
    if (view.showPrice) groups.price.forEach(index => visible.add(index));
  });
  if (view.showAttributes) [26,27,28].forEach(index => visible.add(index));
  if (view.showSync) visible.add(29);
  return visible;
}

function applyColumnVisibility(view = activeView) {
  const visible = viewColumnIndexes(view);
  const columnHeaders = matrixTable.querySelectorAll('.column-row th');
  for (let index = 3; index <= 29; index += 1) {
    const show = visible.has(index);
    const header = columnHeaders[index - 3];
    if (header) header.hidden = !show;
    matrixBody.querySelectorAll(`tr td:nth-child(${index})`).forEach(cell => { cell.hidden = !show; });
  }
  const groupConfig = [
    ['.smart-group', [8,9,10,11,12,13]],
    ['.make-group', [14,15,16,17,18,19]],
    ['.ably-group', [20,21,22,23,24,25]],
    ['.ops-group', [26,27,28,29]]
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
  document.getElementById('matrix-status-filter').value = activeView.status;
  applyMatrixZoom(activeView.zoom, {syncView:false});
  applyColumnVisibility(activeView);
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
  const codeCells = `<td class="mapping-code-cell"${title}>${mappingCodeButton(product, prefix, label, 'product', productCode, state)}</td><td class="mapping-code-cell">${mappingCodeButton(product, prefix, label, 'option', optionCode, state)}</td>`;
  const stock = product[`${prefix}_stock`];
  const price = product[`${prefix}_price`];
  const sellpiaStock = product.sellpia_current_stock;
  const sellpiaPrice = product.sellpia_sale_price;
  const stockDiff = stock !== null && stock !== undefined && sellpiaStock !== null && sellpiaStock !== undefined && Number(stock) !== Number(sellpiaStock);
  const priceDiff = price !== null && price !== undefined && sellpiaPrice !== null && sellpiaPrice !== undefined && Number(price) !== Number(sellpiaPrice);
  const stockDraft = product.__sellerDrafts?.[`${prefix}:sellpia_current_stock`];
  const priceDraft = product.__sellerDrafts?.[`${prefix}:sellpia_sale_price`];
  const stockDisplay = stockDraft ? stockDraft.after_value : stock;
  const priceDisplay = priceDraft ? priceDraft.after_value : price;
  const draftClass = draft => draft ? ` pending draft-${draft.status}` : '';
  const stockCell = stock === null || stock === undefined
    ? '<td class="data-gap">-</td>'
    : `<td><button class="editable-cell seller-edit${stockDiff && !stockDraft ? ' diff' : ''}${draftClass(stockDraft)}" data-source="${prefix}" data-field-key="sellpia_current_stock" data-field="${label} 재고" data-value="${escapeHtml(stockDisplay)}" data-baseline="${escapeHtml(stock)}" data-value-type="number" data-change-id="${stockDraft?.change_id || ''}" data-draft-status="${stockDraft?.status || ''}" title="${stockDraft ? `수정안 ${formatNullableNumber(stockDisplay)} · 원본 ${formatNullableNumber(stock)}` : '수정 가능한 판매처 재고 · 변경하면 매트릭스 수정안으로 저장됩니다.'}">${formatNullableNumber(stockDisplay)}</button></td>`;
  const priceCell = price === null || price === undefined
    ? '<td class="data-gap">-</td>'
    : `<td><button class="editable-cell seller-edit price-hover-target${priceDiff && !priceDraft ? ' diff' : ''}${draftClass(priceDraft)}" data-source="${prefix}" data-field-key="sellpia_sale_price" data-field="${label} 판매가" data-value="${escapeHtml(priceDisplay)}" data-baseline="${escapeHtml(price)}" data-value-type="number" data-change-id="${priceDraft?.change_id || ''}" data-draft-status="${priceDraft?.status || ''}" tabindex="0" data-price-source="${prefix}" data-price-label="${label}" data-current-price="${escapeHtml(priceDisplay)}" data-base-price="${escapeHtml(sellpiaPrice ?? '')}" data-price-updated="${escapeHtml(product[`${prefix}_inventory_at`] || '')}" title="${priceDraft ? `수정안 ${formatNullableNumber(priceDisplay)} · 원본 ${formatNullableNumber(price)}` : '수정 가능한 판매처 가격 · 변경하면 매트릭스 수정안으로 저장됩니다.'}">${formatNullableNumber(priceDisplay)}</button></td>`;
  return `<td><span class="matrix-status ${state.key}">${state.label}</span></td>${codeCells}${sellerNameCell(product, prefix)}${stockCell}${priceCell}`;
}

function codeListSourceLabel(source) {
  return {sellpia:'셀피아', smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리'}[source] || source || '판매처 확인 필요';
}

function codeListPlaceholderSellerCells(codeRow, source) {
  if (codeRow.source_channel !== source) return '<td class="data-gap">-</td>'.repeat(6);
  const reason = escapeHtml(codeRow.reason || codeListIssueLabel(codeRow.match_status));
  const inputCode = escapeHtml(codeRow.input_code || '-');
  const state = codeRow.match_status === 'unmapped' ? 'review' : 'unmatched';
  return `<td><span class="matrix-status ${state}">${reason}</span></td>
    <td class="code-list-placeholder-code" title="${inputCode}">${inputCode}</td>
    <td class="data-gap">-</td>
    <td class="product-cell"><b>원본 코드 연결 대기</b><em>${escapeHtml(codeListSourceLabel(source))}</em></td>
    <td class="data-gap">-</td><td class="data-gap">-</td>`;
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
    matrixBody.innerHTML = '<tr class="matrix-empty-row"><td colspan="29"><b>검색 결과가 없습니다.</b><span>SKU 또는 자사코드를 다시 확인해주세요.</span></td></tr>';
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
      <td class="data-gap">-</td><td class="data-gap">-</td><td>${mappingTag}</td><td>${formatLiveTime(product.sellpia_override_updated_at || product.updated_at)}</td>
    </tr>`;
  }).join('');
  applyColumnVisibility(activeView);
}

function setMatrixConnection(state, label) {
  const badge = document.getElementById('matrix-live-status');
  badge.className = `live-data-badge ${state}`;
  badge.textContent = label;
}

async function loadLiveMatrix({resetPage = false} = {}) {
  if (!liveData) return;
  if (resetPage) matrixState.page = 1;
  const requestId = ++matrixState.requestId;
  matrixState.loading = true;
  setMatrixConnection('loading', 'DB 조회 중');
  matrixBody.innerHTML = '<tr class="matrix-empty-row loading"><td colspan="29"><b>Supabase에서 실제 SKU를 불러오는 중입니다.</b><span>이미지와 자사코드를 함께 연결합니다.</span></td></tr>';
  try {
    const result = await liveData.loadProducts({
      page:matrixState.page,
      search:matrixState.search,
      searchSources:matrixState.searchSources,
      status:matrixState.status,
      sort:matrixState.sort,
      skus:matrixState.codeListSkus,
      codeListRows:matrixState.codeListRows
    });
    if (requestId !== matrixState.requestId) return;
    matrixState.total = result.count;
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
    setMatrixConnection('connected', matrixState.codeListRows.length
      ? `엑셀 목록 · ${formatNumber(result.count)} 결과 행`
      : `LIVE · ${formatNumber(result.count)} SKU`);
  } catch (error) {
    console.error('operations hub matrix load failed', error);
    matrixBody.innerHTML = '<tr class="matrix-empty-row error"><td colspan="29"><b>실데이터를 불러오지 못했습니다.</b><span>DB 새로고침을 눌러 다시 시도해주세요.</span></td></tr>';
    document.getElementById('live-catalog-state').textContent = '연결 오류';
    setMatrixConnection('error', 'DB 연결 오류');
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
  status.textContent = state.label;
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
  const stockInput = section.querySelector(`[data-drawer-field="${label} 재고"]`);
  const priceInput = section.querySelector(`[data-drawer-field="${label} 가격"]`);
  stockInput.value = formatNullableNumber(product?.[`${dataKey}_stock`]);
  priceInput.value = formatNullableNumber(product?.[`${dataKey}_price`]);
  section.dataset.productCode = productCode;
  section.dataset.optionCode = optionCode;
  section.querySelectorAll('.seller-draft-save').forEach(button => { button.disabled = state.key === 'unmatched'; });
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
  document.querySelectorAll('[data-drawer-field]').forEach(input => { input.value = ''; input.disabled = true; });
  fillDrawerChannel('smart', 'smartstore', '스마트스토어', liveProduct);
  fillDrawerChannel('make', 'makeshop', '메이크샵', liveProduct);
  fillDrawerChannel('ably', 'ably', '에이블리', liveProduct);
  const connectedCount = ['smartstore','makeshop','ably'].filter(channel => liveProduct[`${channel}_match_tier`]).length;
  document.getElementById('drawer-stock').textContent = formatNullableNumber(liveProduct.sellpia_current_stock);
  document.getElementById('drawer-price').textContent = formatNullableNumber(liveProduct.sellpia_sale_price);
  document.getElementById('drawer-channel-count').textContent = `${connectedCount}곳`;
  const attributeSection = document.querySelector('.compact-section');
  attributeSection.querySelectorAll('select,input').forEach(input => { input.disabled = true; });
  attributeSection.querySelector('.wide-label input').value = '속성 DB 적재 전';
  productDrawer.dataset.sku = product.sku;
  matrixBody.querySelectorAll('tr').forEach(item => item.classList.toggle('selected-row', item === row));
  productDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
  productDrawer.setAttribute('aria-hidden', 'false');
}

function closeProductDrawer() {
  productDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  productDrawer.setAttribute('aria-hidden', 'true');
}

const CHANNEL_LABELS = {smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리'};
const CHANNEL_SECTION_KEYS = {smartstore:'smart', makeshop:'make', ably:'ably'};
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
  const current = Number(target.dataset.currentPrice);
  const base = Number(target.dataset.basePrice);
  const hasBase = Number.isFinite(base);
  const difference = hasBase ? current - base : null;
  const diffClass = difference === 0 ? 'ok' : 'warn';
  pricePopover.innerHTML = `<div class="price-popover-head"><b>${escapeHtml(target.dataset.priceLabel)} 가격 정보</b><span>${difference === 0 ? '기준가 일치' : '가격 확인'}</span></div>
    <div class="price-popover-values"><p><span>현재 판매처가</span><b>${formatNullableNumber(current)}원</b></p><p><span>셀피아 기준가</span><b>${hasBase ? `${formatNullableNumber(base)}원` : '-'}</b></p><p class="${diffClass}"><span>가격 차이</span><b>${difference === null ? '-' : `${difference > 0 ? '+' : ''}${formatNullableNumber(difference)}원`}</b></p></div>
    <div class="price-formula"><span>현재 확인식</span><code>판매처가 ${formatNullableNumber(current)} − 셀피아 기준가 ${hasBase ? formatNullableNumber(base) : '-'} = ${difference === null ? '-' : formatNullableNumber(difference)}</code></div>
    <p class="price-policy-note">가격정책 DB는 아직 연결 전입니다. 현재는 실제 판매처가와 셀피아 기준가의 차이를 표시합니다.</p>
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
    removeSavedCellState(snapshot);
    changeModal.hidden = true;
    showToast(`${result.savedCount}건 DB ${automatic ? '자동 ' : ''}저장 · 판매처 반영 대기 ${result.queuedCount}건 등록 완료`);
    if (!pendingChanges.length) await refreshLiveData();
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

function commitEditableCellValue(cell, value) {
  if (!cell?.matches('.sellpia-edit')) return {changed:false, valid:false};
  const row = cell.closest('tr[data-sku]');
  if (!row) return {changed:false, valid:false};
  const before = String(cell.dataset.value ?? '');
  const numeric = cell.dataset.valueType === 'number';
  let after = String(value ?? '').trim();
  if (numeric) after = after.replace(/,/g, '');
  if (numeric && !/^\d+(\.\d+)?$/.test(after)) return {changed:false, valid:false};
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
  if (event.target.closest('.row-check,.inline-editor')) return;
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
    imageSize:document.getElementById('preset-image-size').value
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

matrixBody.addEventListener('click', event => {
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
  const numeric = cell.dataset.valueType === 'number';
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
    let after = save ? input.value.trim() : before;
    if (numeric) after = after.replace(/,/g, '');
    if (save && numeric && !/^\d+(\.\d+)?$/.test(after)) {
      showToast('재고와 판매가는 0 이상의 숫자로 입력해주세요.');
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
        const result = await liveData.saveSellerValueDraft({
          sku:row.dataset.sku,
          source:cell.dataset.source,
          fieldKey:cell.dataset.fieldKey,
          after
        });
        showToast(result?.draft_status === 'unchanged'
          ? `${cell.dataset.field} 수정안을 취소했습니다.`
          : `${cell.dataset.field} 수정안을 매트릭스에 저장했습니다.`);
        await Promise.all([loadLiveMatrix(), loadChangeQueue({silent:true})]);
      } catch (error) {
        console.error('seller draft save failed', error);
        cell.dataset.value = before;
        cell.textContent = formatNullableNumber(before);
        cell.classList.remove('pending');
        cell.disabled = false;
        showToast(`판매처 수정안 저장 실패: ${error?.message || error}`);
      }
      return;
    }
    cell.dataset.value = before;
    cell.textContent = numeric ? formatNullableNumber(before) : (before || '-');
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

document.getElementById('matrix-bulk-btn').addEventListener('click', () => {
  const selected = [...document.querySelectorAll('.row-check:checked')];
  if (!selected.length) {
    showToast('일괄 수정할 상품을 먼저 선택해주세요.');
    return;
  }
  showToast('판매처 정규화 행이 DB에 적재되면 일괄수정이 활성화됩니다.');
});

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
  delete input.closest('.drawer-section').dataset.queueBatchId;
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

function moveDrawerSelection(direction) {
  const rows = [...matrixBody.querySelectorAll('tr[data-sku]')];
  const currentIndex = rows.findIndex(row => row.dataset.sku === productDrawer.dataset.sku);
  const target = rows[currentIndex + direction];
  if (target) openProductDrawer(target);
  else showToast(direction < 0 ? '현재 페이지의 첫 SKU입니다.' : '현재 페이지의 마지막 SKU입니다.');
}
document.getElementById('drawer-prev').addEventListener('click', () => moveDrawerSelection(-1));
document.getElementById('drawer-next').addEventListener('click', () => moveDrawerSelection(1));

document.querySelectorAll('.drawer-tabs button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.drawer-tabs button').forEach(item => item.classList.toggle('active', item === button));
  if (button.textContent !== '판매처 연결') showToast(`${button.textContent} 화면은 다음 목업 단계에서 확장됩니다.`);
}));

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
const sellerExportState = {rows:[], action:'export', running:false};

function selectedExportSources() {
  return [...sellerExportModal.querySelectorAll('.seller-export-source-check:checked')].map(input => input.value);
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
  const rowSources = new Set(rows.flatMap(row => row.source_channel ? [row.source_channel] : (row.target_channels || [])));
  sellerExportModal.querySelectorAll('.seller-export-source-check').forEach(input => {
    input.disabled = false;
    input.checked = !rowSources.size || rowSources.has(input.value);
  });
  const skus = selectedMatrixSkus();
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
      const reviewIds = sellerExportState.rows.filter(row => ['pending','failed'].includes(row.status)).map(row => Number(row.change_id));
      if (reviewIds.length) await liveData.validateChangeQueue(reviewIds);
      changeIds = sellerExportState.rows.map(row => Number(row.change_id));
    } else {
      changeIds = await liveData.validateSellerDraftsForExport(sources);
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

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === pageId));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active-page');
  if (pageId === 'jobs') loadChangeQueue();
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
let selectedFiles = [];

function setUploadCapability() {
  const supported = ['sellpia','smartstore','makeshop','ably'].includes(sourceSelect.value);
  const label = sourceConfig[sourceSelect.value]?.name || '원본';
  uploadButton.disabled = !supported;
  uploadButton.textContent = supported ? 'DB 업로드 시작' : '업로드 연결 예정';
  uploadCapabilityBadge.textContent = supported ? `${label} 실데이터 업로드 연결` : '재고조사 업로드 연결 예정';
}

function updateSource() {
  const config = sourceConfig[sourceSelect.value];
  selectedFiles = [];
  document.getElementById('mock-file').value = '';
  sourceInfo.innerHTML = `<span class="channel-logo ${config.cls}">${config.initial}</span><div><b>${config.name}</b><p>${config.detail}</p></div><em>필수</em>`;
  fileGuide.textContent = config.guide;
  fileSlots.innerHTML = Array.from({length:config.files},(_,i)=>`<div><i>${i+1}</i><span><b>파일 ${i+1}</b><em>선택된 파일 없음</em></span><button type="button" class="slot-button">파일 선택</button></div>`).join('');
  setUploadCapability();
}
sourceSelect.addEventListener('change', updateSource);

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
  fileSlots.innerHTML = Array.from({length:config.files},(_,i)=>{
    const file = selectedFiles[i];
    return `<div><i>${file?'✓':i+1}</i><span><b>${file?file.name:`파일 ${i+1}`}</b><em>${file?`${(file.size/1024/1024).toFixed(1)}MB · 업로드 준비됨`:'선택된 파일 없음'}</em></span><button type="button" class="slot-button">${file?'교체':'파일 선택'}</button></div>`;
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
  const supported = ['sellpia','smartstore','makeshop','ably'].includes(sourceSelect.value);
  if (!supported) {
    showToast('재고조사 파일 업로드는 재고조사 화면과 함께 연결할 예정입니다.');
    return;
  }
  if (selectedFiles.length !== config.files) {
    showToast(`${config.name} 파일 ${config.files}개를 모두 선택해주세요.`);
    return;
  }
  const uploadMethod = sourceSelect.value === 'sellpia' ? liveData?.uploadSellpiaSnapshot : liveData?.uploadSellerSnapshot;
  if (!uploadMethod) {
    showToast('업로드 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    return;
  }
  const fields = {
    inventory: document.getElementById('upload-field-inventory').checked,
    price: document.getElementById('upload-field-price').checked,
    basic: document.getElementById('upload-field-basic').checked,
    status: document.getElementById('upload-field-status').checked
  };
  if (!Object.values(fields).some(Boolean)) {
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
    detail:sourceSelect.value === 'sellpia' ? '헤더, 행번호, SKU 중복을 검사합니다.' : '헤더와 상품·옵션 코드 중복을 검사합니다.'
  });
  try {
    const result = sourceSelect.value === 'sellpia'
      ? await uploadMethod(selectedFiles, fields, showUploadProgress)
      : await uploadMethod(sourceSelect.value, selectedFiles, fields, showUploadProgress);
    const rowLabel = sourceSelect.value === 'sellpia' ? 'SKU' : '상품·옵션';
    showUploadProgress({percent:100, title:'DB 업로드 완료', detail:`${formatNumber(result.rowCount)}개 ${rowLabel}을 새 스냅샷으로 저장했습니다.`});
    showToast(`${config.name} ${formatNumber(result.rowCount)}개 ${rowLabel} 업로드 완료`);
    await refreshLiveData({resetPage:true});
    window.setTimeout(() => showPage('matching'), 500);
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
  if (event.key === 'Escape' && !viewSettingsModal.hidden) closeViewSettings();
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
  window.setInterval(() => {
    if (document.getElementById('jobs').classList.contains('active-page')) loadChangeQueue({silent:true});
  }, 30000);
} else {
  setMatrixConnection('error', 'DB 모듈 없음');
}
