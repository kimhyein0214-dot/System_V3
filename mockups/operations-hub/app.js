const sourceConfig = {
  sellpia: {name:'셀피아 기준 원본', initial:'S', cls:'sellpia', guide:'행번호가 이어지는 셀피아 파일 3개를 올려주세요.', detail:'분할된 파일 3개 · XLSX 또는 CSV', files:3},
  smartstore: {name:'스마트스토어 상품 원본', initial:'N', cls:'smart', guide:'분할된 스마트스토어 상품 파일 2개를 올려주세요.', detail:'분할된 파일 2개 · XLSX', files:2},
  makeshop: {name:'메이크샵 상품 원본', initial:'M', cls:'make', guide:'메이크샵에서 내려받은 상품 파일 1개를 올려주세요.', detail:'파일 1개 · XLSX 또는 XLS', files:1},
  ably: {name:'에이블리 상품 원본', initial:'A', cls:'ably', guide:'에이블리 GOODS_LIST 파일 1개를 올려주세요.', detail:'파일 1개 · CSV', files:1},
  survey: {name:'재고조사 완료 파일', initial:'#', cls:'sellpia', guide:'담당자가 조사 완료한 재고 파일 1개를 올려주세요.', detail:'파일 1개 · 셀피아 SKU 포함', files:1}
};

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
const OPERATIONS_AUTH_STORAGE_KEY = 'system-v3-operations-session-v1';
const operationsAuthGate = document.getElementById('operations-auth-gate');
const operationsAppShell = document.getElementById('operations-app-shell');
const operationsAuthForm = document.getElementById('operations-auth-form');
const operationsAuthUsername = document.getElementById('operations-auth-username');
const operationsAuthPassword = document.getElementById('operations-auth-password');
const operationsAuthSubmit = document.getElementById('operations-auth-submit');
const operationsAuthError = document.getElementById('operations-auth-error');
const operationsAuthStatus = document.getElementById('operations-auth-status');
const operationsAuthLogout = document.getElementById('operations-auth-logout');
const operationsAuthState = {authenticated:false, expiresAt:'', sessionId:'', expiryTimer:null, intervals:[]};
const matrixCsv = window.SystemV3MatrixCsv;
const discountPriceMath = window.SystemV3DiscountPriceMath;
const sourceRefreshVerifier = window.SystemV3SourceRefreshVerifier;
const relationImportParser = window.RelationImportParser;
const bundleImportParser = window.BundleImportParser;
const sellerBundleImportParser = window.SellerBundleImportParser;
const MATRIX_PAGE_SIZE_KEY = 'system-v3-matrix-page-size';
const storedMatrixPageSize = Number(localStorage.getItem(MATRIX_PAGE_SIZE_KEY));
const initialMatrixPageSize = [50, 100, 200].includes(storedMatrixPageSize) ? storedMatrixPageSize : 50;
const MATRIX_SEARCH_DEBOUNCE_MS = 600;
const MATRIX_TRANSIENT_RETRY_DELAYS_MS = [700];
const MAPPING_SYNC_POLL_INTERVAL_MS = 60000;
const matrixState = {page:1, pageSize:initialMatrixPageSize, search:'', searchSources:['sellpia','smartstore','makeshop','ably'], status:'all', sort:'sku_asc', excludeCombinationSkus:false, includeRelatedSkuContext:true, advancedFilter:{logic:'and', conditions:[]}, total:0, directCount:0, relatedCount:0, rows:[], loading:false, requestId:0, requestController:null, codeListSkus:[], codeListRows:[], codeListName:''};
const multiLinkState = {page:1, pageSize:50, search:'', source:'all', relationType:'all', folderId:null, organizationScope:'all', folders:[], foldersLoaded:false, total:0, allTotal:0, loading:false, requestId:0, rows:[], selected:null, loaded:false};
const multiLinkWorkspaceState = {tab:'all', contextRow:null, allLoaded:false};
const relationGraphState = {nodes:[], edges:[], selectedProduct:null, loading:false, requestId:0, searchTimer:null, viewMode:'list', search:'', focusNodeId:null};
const relationCellSelection = {anchor:null, focus:null, dragging:false, selected:new Set(), dragBase:new Set(), dragMode:'replace', editingEdgeId:null};
const multiLinkCellSelection = {anchor:null, focus:null, dragging:false, selected:new Set(), dragBase:new Set(), dragMode:'replace'};
const relationBoardState = {nodes:new Map(), loadedProducts:new Map(), initialEdges:new Map(), levelCount:3, draggingKey:null, pointerDrag:null, connectorDrag:null, dragGhost:null, saving:false};
const relationImportState = {fileName:'', parsed:null, items:new Map(), choices:new Map(), resolving:false, saving:false};
const bundleGraphState = {query:'', bundles:[], loading:false, loaded:false, requestId:0};
const bundleImportState = {fileName:'', parsed:null, items:new Map(), choices:new Map(), resolving:false, saving:false};
const sellerBundleState = {source:'smartstore', productCode:'', optionCode:'', bundleType:'one_plus_one', target:null, loading:false, requestId:0};
const sellerBundleImportState = {fileName:'', parsed:null, resolved:null, resolving:false, saving:false};
const mappingSyncState = {displayedVersion:'', checking:false, autoRefreshing:false, latest:null};
const systemHealthPill = document.getElementById('system-health-pill');
const systemHealthText = document.getElementById('system-health-text');
const topRefreshButton = document.getElementById('top-refresh-btn');
const systemHealthState = {
  refreshing:false,
  components:{matrix:'idle', source:'idle', metrics:'idle', mapping:'idle'},
  lastCompletedAt:null
};
const matrixRowsBySku = new Map();
const drawerState = {
  activeTab:'connections', historyRequestId:0, historySku:'', attributeRequestId:0, priceRequestId:0,
  linkRequestId:0, linkRows:[],
  tags:null, attributeDraft:null, priceRuleTags:[], priceRuleSets:[], priceRuleAssignments:{},
  priceRulePreviews:{}, priceRuleSelections:{}, priceComposers:{}, discountTerms:{}
};
const discountEditorState = {source:'', productCode:'', sku:'', terms:[], product:null, basePrice:null, anchorDiscountedBase:null, anchorFinalPrice:null, anchorOptionPrice:null, anchorSource:'', priceRuleSetId:null, priceRuleSetName:'', autoAdjustBase:false, preview:null};
const inventoryState = {loaded:false, loading:false, rows:[], snapshot:null, activityRefreshedAt:'', requestId:0};
const inboundCostState = {tags:[], loaded:false, editingTagId:null, product:null};
const ATTRIBUTE_OPTIONS = Object.freeze({
  material:['14K','925 실버','써지컬','티타늄','아크릴/투명','실버','기타'],
  productGroup:['부품/소모품','피어싱','귀걸이','목걸이','반지','팔찌/발찌','헤어/잡화','기타'],
  shape:['세트','링','바벨/바','볼','진주','큐빅/스톤','투명/리테이너','체인','모티브','기타']
});
const matrixTable = document.querySelector('.matrix-table');
const matrixShell = document.querySelector('.matrix-shell');
const matrixCellSelection = {anchor:null, focus:null, dragging:false, selected:new Set(), dragBase:new Set(), dragMode:'replace'};
let matrixColumnSelectionAnchor = null;
const matrixContextMenu = document.getElementById('matrix-context-menu');
const matrixContextSourceRefresh = document.getElementById('matrix-context-source-refresh');
const matrixContextSourceRefreshCount = document.getElementById('matrix-context-source-refresh-count');
const matrixContextProductCopy = document.getElementById('matrix-context-product-copy');
const matrixContextProductCopyDetail = document.getElementById('matrix-context-product-copy-detail');
const matrixContextOptionAdd = document.getElementById('matrix-context-option-add');
const matrixContextOptionAddDetail = document.getElementById('matrix-context-option-add-detail');
const matrixContextPriceBasis = document.getElementById('matrix-context-price-basis');
const matrixContextPriceBasisLabel = document.getElementById('matrix-context-price-basis-label');
const matrixContextPriceBasisDetail = document.getElementById('matrix-context-price-basis-detail');
const matrixContextDisconnect = document.getElementById('matrix-context-disconnect');
const matrixContextDisconnectCount = document.getElementById('matrix-context-disconnect-count');
const BULK_SOURCE_REFRESH_FIELDS = Object.freeze({
  system_stock:{label:'기준재고', sourceLabel:'셀피아 원본 재고'},
  system_base_price:{label:'기준가격', sourceLabel:'셀피아 원본 판매가'},
  sellpia_purchase_price:{label:'매입가', sourceLabel:'셀피아 원본 매입가'},
  sellpia_order_unit:{label:'발주단위', sourceLabel:'셀피아 원본 발주단위'},
  sellpia_minimum_order_unit:{label:'최소발주단위', sourceLabel:'셀피아 원본 최소발주단위'}
});
const bulkSourceRefreshState = {previewed:false, running:false, fields:[], results:[]};
let matrixContextTargets = [];
let matrixContextProductCopyTargets = [];
let matrixContextProductCopySkipped = 0;
let matrixContextOptionAddTarget = null;
let matrixContextPriceBasisTarget = null;
let matrixSourceRefreshInFlight = false;
const matrixZoomOut = document.getElementById('matrix-zoom-out');
const matrixZoomValue = document.getElementById('matrix-zoom-value');
const matrixZoomIn = document.getElementById('matrix-zoom-in');
const matrixFreezeToggle = document.getElementById('matrix-freeze-toggle');
const MATRIX_ZOOM_KEY = 'system-v3-matrix-zoom';
const MATRIX_FREEZE_KEY = 'system-v3-matrix-sellpia-freeze';
const MATRIX_COLUMN_WIDTHS_KEY = 'system-v3-matrix-column-widths-v3';
const MATRIX_COLUMN_COUNT = 43;
const MATRIX_ZOOM_MIN = 80;
const MATRIX_ZOOM_MAX = 140;
const MATRIX_ZOOM_STEP = 5;
const MATRIX_COLUMN_MIN_WIDTH = 56;
const MATRIX_COLUMN_MAX_WIDTH = 720;
const MATRIX_COLUMN_DEFAULT_WIDTHS = Object.freeze({
  3:110, 4:260, 5:220, 6:150, 7:104, 8:112, 9:96, 10:88, 11:108, 12:110,
  13:92, 14:150, 15:260, 16:220, 17:96, 18:120, 19:126, 20:102, 21:120,
  22:92, 23:150, 24:260, 25:220, 26:96, 27:120, 28:126, 29:102, 30:120,
  31:92, 32:150, 33:260, 34:220, 35:96, 36:120, 37:126, 38:102, 39:120,
  40:100, 41:110, 42:180, 43:120
});
const MATRIX_PRESETS_KEY = 'system-v3-matrix-presets-v1';
const MATRIX_ACTIVE_PRESET_KEY = 'system-v3-matrix-active-preset';
const DEFAULT_VIEW_OPTIONS = {
  channels:{smartstore:true, makeshop:true, ably:true},
  showStatus:false,
  showCodes:true,
  showSellerNames:true,
  showInventory:true,
  showPrice:true,
  showDiscount:true,
  showAttributes:true,
  showSync:true,
  wrapNames:false,
  imageSize:'default',
  status:'all',
  sort:'sku_asc',
  excludeCombinationSkus:false,
  includeRelatedSkuContext:true,
  advancedFilter:{logic:'and', conditions:[]},
  zoom:100
};
const ADVANCED_FILTER_FIELDS = Object.freeze([
  {group:'셀피아', field:'sellpia_sku_code', label:'셀피아 SKU', type:'text'},
  {group:'셀피아', field:'sellpia_own_code', label:'자사코드', type:'text'},
  {group:'셀피아', field:'sellpia_product_name', label:'상품명', type:'text'},
  {group:'셀피아', field:'sellpia_option_name', label:'옵션명', type:'text'},
  {group:'셀피아 원본', field:'sellpia_current_stock', label:'원본재고', type:'number'},
  {group:'셀피아 원본', field:'sellpia_sale_price', label:'원본 판매가', type:'number'},
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
  text:[['contains','포함'],['not_contains','제외'],['not_empty','있음'],['empty','없음'],['eq','같음'],['neq','다름']],
  number:[['not_empty','있음'],['empty','없음'],['eq','같음'],['neq','다름'],['gte','이상'],['lte','이하'],['gt','초과'],['lt','미만']],
  status:[['eq','같음'],['neq','다름']]
});
const BUILTIN_PRESETS = Object.freeze({
  all:{id:'all', name:'전체 현황', ...DEFAULT_VIEW_OPTIONS},
  matching:{id:'matching', name:'미매칭 확인', ...DEFAULT_VIEW_OPTIONS, showInventory:false, showPrice:false, showDiscount:false, showAttributes:false, wrapNames:true, status:'unmatched'},
  inventory:{id:'inventory', name:'재고 작업', ...DEFAULT_VIEW_OPTIONS, showCodes:false, showSellerNames:false, showPrice:false, showDiscount:false, showAttributes:false, zoom:110},
  price:{id:'price', name:'가격 작업', ...DEFAULT_VIEW_OPTIONS, showCodes:false, showSellerNames:false, showInventory:false, showAttributes:false, zoom:110},
  attributes:{id:'attributes', name:'속성·태그', ...DEFAULT_VIEW_OPTIONS, channels:{smartstore:false, makeshop:false, ably:false}, showStatus:false, showCodes:false, showSellerNames:false, showInventory:false, showPrice:false, showDiscount:false, status:'all'}
});

function readOperationsAuthSession() {
  try {
    const record = JSON.parse(sessionStorage.getItem(OPERATIONS_AUTH_STORAGE_KEY) || 'null');
    const token = String(record?.token || '').trim();
    const expiresAt = String(record?.expiresAt || '').trim();
    if (!/^[0-9a-f]{64}$/i.test(token) || !expiresAt) return null;
    return {token, expiresAt, sessionId:String(record?.sessionId || '')};
  } catch {
    return null;
  }
}

function storeOperationsAuthSession({token, expiresAt, sessionId = ''}) {
  const safeToken = String(token || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(safeToken) || !expiresAt) return false;
  try {
    sessionStorage.setItem(OPERATIONS_AUTH_STORAGE_KEY, JSON.stringify({token:safeToken, expiresAt:String(expiresAt), sessionId:String(sessionId || '')}));
    liveData?.setOperationsHubSessionToken?.(safeToken);
    return true;
  } catch {
    return false;
  }
}

function clearOperationsAuthSession() {
  try { sessionStorage.removeItem(OPERATIONS_AUTH_STORAGE_KEY); } catch {}
  liveData?.setOperationsHubSessionToken?.('');
  operationsAuthState.authenticated = false;
  operationsAuthState.expiresAt = '';
  operationsAuthState.sessionId = '';
}

function operationsAuthMessage(reason, retryAfterSeconds = 0) {
  const seconds = Math.max(1, Math.ceil(Number(retryAfterSeconds) || 0));
  if (reason === 'rate_limited') return `로그인 시도가 잠시 잠겼습니다. 약 ${seconds}초 후 다시 시도해주세요.`;
  if (reason === 'expired_session') return '운영 세션이 만료되었습니다. 다시 로그인해주세요.';
  if (reason === 'revoked_session') return '운영 세션이 회수되었습니다. 다시 로그인해주세요.';
  if (reason === 'permission_denied') return '저장 권한을 확인할 수 없습니다. 다시 로그인해주세요.';
  if (reason === 'invalid_session') return '저장된 운영 세션이 유효하지 않습니다. 다시 로그인해주세요.';
  if (reason === 'invalid_credentials') return '아이디 또는 비밀번호가 올바르지 않습니다.';
  return '';
}

function stopAuthenticatedOperationsHubData() {
  for (const intervalId of operationsAuthState.intervals) window.clearInterval(intervalId);
  operationsAuthState.intervals = [];
  if (operationsAuthState.expiryTimer) window.clearTimeout(operationsAuthState.expiryTimer);
  operationsAuthState.expiryTimer = null;
  matrixState.requestController?.abort();
}

function showOperationsAuthGate(reason = '', {message = '', clearSession = true} = {}) {
  stopAuthenticatedOperationsHubData();
  if (clearSession) clearOperationsAuthSession();
  operationsAuthGate.hidden = false;
  operationsAppShell.inert = true;
  operationsAppShell.setAttribute('aria-hidden', 'true');
  document.body.classList.add('operations-auth-locked');
  operationsAuthLogout.disabled = true;
  operationsAuthError.textContent = message || operationsAuthMessage(reason);
  operationsAuthError.hidden = !operationsAuthError.textContent;
  operationsAuthStatus.textContent = reason === 'rate_limited' ? '로그인 잠금 해제를 기다리는 중입니다.' : '로그인이 필요합니다.';
  operationsAuthPassword.value = '';
  window.requestAnimationFrame(() => operationsAuthUsername.focus());
}

function scheduleOperationsAuthExpiry() {
  if (operationsAuthState.expiryTimer) window.clearTimeout(operationsAuthState.expiryTimer);
  const expiresAtMs = new Date(operationsAuthState.expiresAt).getTime();
  const remainingMs = expiresAtMs - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    showOperationsAuthGate('expired_session');
    return;
  }
  operationsAuthState.expiryTimer = window.setTimeout(
    () => showOperationsAuthGate('expired_session'),
    Math.min(remainingMs + 250, 2147483647)
  );
}

function startAuthenticatedOperationsHubData() {
  if (!operationsAuthState.authenticated || operationsAuthState.intervals.length) return;
  refreshLiveData({resetPage:true});
  operationsAuthState.intervals.push(window.setInterval(() => Promise.all([loadLiveSourceStatus(), loadLiveDashboardMetrics()]), 60000));
  operationsAuthState.intervals.push(window.setInterval(() => {
    const dashboardVisible = document.getElementById('dashboard')?.classList.contains('active-page');
    if (document.hidden || !dashboardVisible || matrixState.loading || sellpiaSaveInFlight || pendingChanges.length) return;
    loadMappingSyncStatus({autoRefresh:true});
  }, MAPPING_SYNC_POLL_INTERVAL_MS));
  operationsAuthState.intervals.push(window.setInterval(() => {
    if (document.getElementById('jobs').classList.contains('active-page')) loadChangeQueue({silent:true});
  }, 30000));
}

function openAuthenticatedOperationsHub(session) {
  operationsAuthState.authenticated = true;
  operationsAuthState.expiresAt = String(session?.expiresAt || session?.expires_at || '');
  operationsAuthState.sessionId = String(session?.sessionId || session?.session_id || '');
  operationsAuthGate.hidden = true;
  operationsAppShell.inert = false;
  operationsAppShell.setAttribute('aria-hidden', 'false');
  document.body.classList.remove('operations-auth-locked');
  operationsAuthLogout.disabled = false;
  operationsAuthError.hidden = true;
  operationsAuthStatus.textContent = '로그인되었습니다.';
  scheduleOperationsAuthExpiry();
  startAuthenticatedOperationsHubData();
}

async function initializeOperationsHubAuth() {
  if (!liveData?.checkOperationsHubSession || !liveData?.loginOperationsHub || !liveData?.logoutOperationsHub) {
    showOperationsAuthGate('', {message:'운영 로그인 모듈을 불러오지 못했습니다. 배포 상태를 확인해주세요.'});
    return;
  }
  const stored = readOperationsAuthSession();
  if (!stored) {
    showOperationsAuthGate();
    return;
  }
  liveData.setOperationsHubSessionToken(stored.token);
  operationsAuthStatus.textContent = '저장된 운영 세션을 확인하는 중입니다.';
  try {
    const result = await liveData.checkOperationsHubSession(stored.token);
    if (!result?.authenticated) {
      showOperationsAuthGate(result?.error_code || 'invalid_session');
      return;
    }
    const verified = {token:stored.token, expiresAt:result.expires_at || stored.expiresAt, sessionId:result.session_id || stored.sessionId};
    if (!storeOperationsAuthSession(verified)) {
      showOperationsAuthGate('', {message:'브라우저 세션 저장소를 사용할 수 없어 로그인을 유지할 수 없습니다.'});
      return;
    }
    openAuthenticatedOperationsHub(verified);
  } catch {
    showOperationsAuthGate('', {message:'운영 세션을 확인하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 로그인해주세요.'});
  }
}

operationsAuthForm.addEventListener('submit', async event => {
  event.preventDefault();
  const username = operationsAuthUsername.value.trim();
  const password = operationsAuthPassword.value;
  if (!username || !password) {
    operationsAuthError.textContent = '아이디와 비밀번호를 모두 입력해주세요.';
    operationsAuthError.hidden = false;
    return;
  }
  operationsAuthSubmit.disabled = true;
  operationsAuthSubmit.textContent = '로그인 확인 중…';
  operationsAuthError.hidden = true;
  operationsAuthStatus.textContent = '운영 계정을 확인하는 중입니다.';
  try {
    const result = await liveData.loginOperationsHub({username, password});
    operationsAuthPassword.value = '';
    if (!result?.authenticated) {
      const reason = result?.error_code || 'invalid_credentials';
      operationsAuthError.textContent = operationsAuthMessage(reason, result?.retry_after_seconds);
      operationsAuthError.hidden = false;
      operationsAuthStatus.textContent = reason === 'rate_limited' ? '로그인 잠금 상태입니다.' : '로그인 정보를 다시 확인해주세요.';
      return;
    }
    const session = {token:result.session_token, expiresAt:result.expires_at, sessionId:result.session_id};
    if (!storeOperationsAuthSession(session)) throw new Error('session_storage_unavailable');
    operationsAuthForm.reset();
    openAuthenticatedOperationsHub(session);
  } catch {
    clearOperationsAuthSession();
    operationsAuthPassword.value = '';
    operationsAuthError.textContent = '로그인 요청을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.';
    operationsAuthError.hidden = false;
    operationsAuthStatus.textContent = '로그인 서버 연결을 확인해주세요.';
  } finally {
    operationsAuthSubmit.disabled = false;
    operationsAuthSubmit.textContent = '로그인';
  }
});

operationsAuthLogout.addEventListener('click', async () => {
  const session = readOperationsAuthSession();
  operationsAuthLogout.disabled = true;
  try {
    await liveData?.logoutOperationsHub?.(session?.token || '');
  } catch {
    // 서버 로그아웃 확인에 실패해도 현재 브라우저의 운영 토큰은 즉시 폐기합니다.
  } finally {
    showOperationsAuthGate('', {message:'로그아웃되었습니다. 다시 사용하려면 로그인해주세요.'});
  }
});

window.addEventListener('operations-hub-auth-required', event => {
  showOperationsAuthGate(event.detail?.reason || 'permission_denied');
});

function normalizeConnectionStatus(value) {
  const status = String(value || 'all').toLowerCase();
  if (status === 'review') return 'connected';
  if (status === 'attention') return 'unmatched';
  return ['all','connected','unmatched'].includes(status) ? status : 'all';
}

function cloneAdvancedFilter(filter) {
  return {
    logic:String(filter?.logic || 'and').toLowerCase() === 'or' ? 'or' : 'and',
    conditions:Array.isArray(filter?.conditions) ? filter.conditions.map(condition => ({
      ...condition,
      value:condition?.field === 'overall_status' ? normalizeConnectionStatus(condition.value) : condition.value
    })) : []
  };
}

function cloneView(view) {
  return {...view, status:normalizeConnectionStatus(view.status), channels:{...view.channels}, advancedFilter:cloneAdvancedFilter(view.advancedFilter)};
}

function readCustomPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MATRIX_PRESETS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item?.id && item?.name).map(item => cloneView({...cloneView(DEFAULT_VIEW_OPTIONS), ...item, showDiscount:item.showDiscount ?? item.showPrice ?? DEFAULT_VIEW_OPTIONS.showDiscount, channels:{...DEFAULT_VIEW_OPTIONS.channels, ...item.channels}})) : [];
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
let matrixColumnWidths = readMatrixColumnWidths();
let matrixColumnResizeState = null;
let matrixColumnResizeGuide = null;

function readMatrixColumnWidths() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MATRIX_COLUMN_WIDTHS_KEY) || '{}');
    return Object.fromEntries(Object.entries(parsed).filter(([index, width]) => {
      const columnIndex = Number(index);
      const columnWidth = Number(width);
      return columnIndex >= 3 && columnIndex <= MATRIX_COLUMN_COUNT && Number.isFinite(columnWidth)
        && columnWidth >= MATRIX_COLUMN_MIN_WIDTH && columnWidth <= MATRIX_COLUMN_MAX_WIDTH;
    }).map(([index, width]) => [index, Math.round(Number(width))]));
  } catch {
    return {};
  }
}

function matrixImageColumnWidth() {
  if (matrixTable.dataset.imageSize === 'compact') return 76;
  if (matrixTable.dataset.imageSize === 'large') return 112;
  return 96;
}

function matrixColumnWidth(index) {
  if (index === 1) return 0;
  if (index === 2) return matrixImageColumnWidth();
  return Math.max(MATRIX_COLUMN_MIN_WIDTH, Math.min(MATRIX_COLUMN_MAX_WIDTH,
    Number(matrixColumnWidths[index]) || MATRIX_COLUMN_DEFAULT_WIDTHS[index] || 112));
}

function saveMatrixColumnWidths() {
  localStorage.setItem(MATRIX_COLUMN_WIDTHS_KEY, JSON.stringify(matrixColumnWidths));
}

function ensureMatrixColumnStructure() {
  let colgroup = matrixTable.querySelector('colgroup[data-matrix-columns]');
  if (!colgroup) {
    colgroup = document.createElement('colgroup');
    colgroup.dataset.matrixColumns = 'true';
    for (let index = 1; index <= MATRIX_COLUMN_COUNT; index += 1) {
      const column = document.createElement('col');
      column.dataset.matrixColumn = String(index);
      column.style.width = `var(--matrix-col-${index}-width)`;
      colgroup.append(column);
    }
    matrixTable.insertBefore(colgroup, matrixTable.tHead);
  }
  const groupHeaders = matrixTable.querySelectorAll('.group-row th');
  if (groupHeaders[0]) groupHeaders[0].dataset.matrixColumn = '1';
  if (groupHeaders[1]) groupHeaders[1].dataset.matrixColumn = '2';
  matrixTable.querySelectorAll('.column-row th').forEach((header, offset) => {
    const index = offset + 3;
    header.dataset.matrixColumn = String(index);
    header.tabIndex = 0;
    header.title = `${header.textContent.trim()} 컬럼 선택 · 우클릭하면 원본값 갱신`;
    if (header.querySelector('.matrix-column-resize-handle')) return;
    const handle = document.createElement('span');
    handle.className = 'matrix-column-resize-handle';
    handle.dataset.resizeColumn = String(index);
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', `${header.textContent.trim()} 열 너비 조절`);
    handle.tabIndex = 0;
    header.append(handle);
  });
}

function bindMatrixColumnWidthsToCells() {
  matrixTable.querySelectorAll('[data-matrix-column]').forEach(cell => {
    const index = Number(cell.dataset.matrixColumn);
    if (index >= 1 && index <= MATRIX_COLUMN_COUNT && !cell.matches('col') && (Number(cell.colSpan) || 1) === 1) {
      cell.style.setProperty('--matrix-cell-width', `var(--matrix-col-${index}-width)`);
    }
  });
}

function applyMatrixColumnWidths(view = activeView) {
  ensureMatrixColumnStructure();
  bindMatrixColumnWidthsToCells();
  const visible = viewColumnIndexes(view);
  let tableWidth = 0;
  for (let index = 1; index <= MATRIX_COLUMN_COUNT; index += 1) {
    const width = matrixColumnWidth(index);
    matrixTable.style.setProperty(`--matrix-col-${index}-width`, `${width}px`);
    const column = matrixTable.querySelector(`col[data-matrix-column="${index}"]`);
    const show = index === 1 ? false : index === 2 || visible.has(index);
    if (column) column.style.display = show ? '' : 'none';
    if (show) tableWidth += width;
  }
  matrixTable.style.width = `${Math.max(900, tableWidth)}px`;
  matrixTable.style.minWidth = `${Math.max(900, tableWidth)}px`;
}

function setMatrixColumnWidth(index, width, {persist = false, announce = false} = {}) {
  if (index < 3 || index > MATRIX_COLUMN_COUNT) return;
  matrixColumnWidths[index] = Math.max(MATRIX_COLUMN_MIN_WIDTH, Math.min(MATRIX_COLUMN_MAX_WIDTH, Math.round(Number(width) || MATRIX_COLUMN_DEFAULT_WIDTHS[index] || 112)));
  applyMatrixColumnWidths(activeView);
  if (persist) saveMatrixColumnWidths();
  if (announce) showToast(`${matrixTable.querySelector(`.column-row th[data-matrix-column="${index}"]`)?.textContent.trim() || '열'} 너비를 저장했습니다.`);
}

function resetMatrixColumnWidth(index = null) {
  if (index === null) matrixColumnWidths = {};
  else delete matrixColumnWidths[index];
  saveMatrixColumnWidths();
  applyMatrixColumnWidths(activeView);
  showToast(index === null ? '모든 열 너비를 기본값으로 되돌렸습니다.' : '열 너비를 기본값으로 되돌렸습니다.');
}

function ensureMatrixColumnResizeGuide() {
  if (matrixColumnResizeGuide) return matrixColumnResizeGuide;
  matrixColumnResizeGuide = document.createElement('div');
  matrixColumnResizeGuide.className = 'matrix-column-resize-guide';
  matrixColumnResizeGuide.setAttribute('aria-hidden', 'true');
  matrixColumnResizeGuide.hidden = true;
  document.body.append(matrixColumnResizeGuide);
  return matrixColumnResizeGuide;
}

function moveMatrixColumnResizeGuide(clientX) {
  const guide = ensureMatrixColumnResizeGuide();
  const shell = matrixTable.closest('.matrix-shell');
  const bounds = shell?.getBoundingClientRect();
  const left = bounds ? Math.max(bounds.left, Math.min(bounds.right, clientX)) : clientX;
  guide.style.left = `${Math.round(left)}px`;
  guide.style.top = `${Math.max(0, Math.round(bounds?.top || 0))}px`;
  guide.style.height = `${Math.max(0, Math.round(Math.min(window.innerHeight, bounds?.bottom || window.innerHeight) - Math.max(0, bounds?.top || 0)))}px`;
  guide.hidden = false;
}

function hideMatrixColumnResizeGuide() {
  if (matrixColumnResizeGuide) matrixColumnResizeGuide.hidden = true;
}

function startMatrixColumnResize(event, handle) {
  if (event.button !== undefined && event.button !== 0) return;
  const index = Number(handle.dataset.resizeColumn);
  if (index < 3 || index > MATRIX_COLUMN_COUNT) return;
  matrixColumnResizeState = {index, startX:event.clientX, currentX:event.clientX, startWidth:matrixColumnWidth(index)};
  document.body.classList.add('matrix-column-resizing');
  handle.classList.add('active');
  moveMatrixColumnResizeGuide(event.clientX);
  handle.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function initializeMatrixColumnResizing() {
  ensureMatrixColumnStructure();
  matrixTable.tHead.addEventListener('click', event => {
    if (event.target.closest('.matrix-column-resize-handle')) return;
    const header = event.target.closest('.column-row th[data-matrix-column]');
    if (!header) return;
    selectMatrixColumn(header, {extend:event.shiftKey, toggle:event.ctrlKey || event.metaKey});
  });
  matrixTable.tHead.addEventListener('contextmenu', event => {
    if (event.target.closest('.matrix-column-resize-handle')) return;
    const header = event.target.closest('.column-row th[data-matrix-column]');
    if (!header) return;
    event.preventDefault();
    if (!header.classList.contains('matrix-column-selected')) selectMatrixColumn(header);
    openMatrixContextMenu(event.clientX, event.clientY, header);
  });
  matrixTable.tHead.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.matrix-column-resize-handle');
    if (handle) startMatrixColumnResize(event, handle);
  });
  matrixTable.tHead.addEventListener('dblclick', event => {
    const handle = event.target.closest('.matrix-column-resize-handle');
    if (!handle) return;
    event.preventDefault();
    event.stopPropagation();
    resetMatrixColumnWidth(Number(handle.dataset.resizeColumn));
  });
  matrixTable.tHead.addEventListener('keydown', event => {
    const handle = event.target.closest('.matrix-column-resize-handle');
    if (!handle || !['ArrowLeft','ArrowRight','Home'].includes(event.key)) return;
    event.preventDefault();
    const index = Number(handle.dataset.resizeColumn);
    if (event.key === 'Home') resetMatrixColumnWidth(index);
    else setMatrixColumnWidth(index, matrixColumnWidth(index) + (event.key === 'ArrowRight' ? 10 : -10), {persist:true, announce:true});
  });
  document.addEventListener('pointermove', event => {
    if (!matrixColumnResizeState) return;
    matrixColumnResizeState.currentX = event.clientX;
    moveMatrixColumnResizeGuide(event.clientX);
  });
  const finishResize = (event, {commit = true} = {}) => {
    if (!matrixColumnResizeState) return;
    if (commit) {
      const zoom = Math.max(.01, matrixZoom / 100);
      const delta = (matrixColumnResizeState.currentX - matrixColumnResizeState.startX) / zoom;
      setMatrixColumnWidth(matrixColumnResizeState.index, matrixColumnResizeState.startWidth + delta, {persist:true});
    }
    matrixColumnResizeState = null;
    hideMatrixColumnResizeGuide();
    document.body.classList.remove('matrix-column-resizing');
    matrixTable.querySelectorAll('.matrix-column-resize-handle.active').forEach(handle => handle.classList.remove('active'));
  };
  document.addEventListener('pointerup', event => finishResize(event, {commit:true}));
  document.addEventListener('pointercancel', event => finishResize(event, {commit:true}));
  document.getElementById('matrix-column-reset').addEventListener('click', () => resetMatrixColumnWidth());
}

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

function normalizeMatrixRelationContext(raw) {
  return raw && typeof raw === 'object' ? raw : {};
}

function matrixRelationContext(product) {
  const raw = normalizeMatrixRelationContext(product?.matrix_context);
  const kind = String(raw.kind || '').trim().toLowerCase() === 'related' ? 'related' : 'direct';
  const rootSku = String(raw.rootSku || '').trim() || String(product?.sellpia_sku_code || '').trim();
  const direction = String(raw.direction || (kind === 'related' ? 'related' : 'self')).trim();
  const depth = Math.max(0, Number(raw.depth) || 0);
  const pathSkus = (Array.isArray(raw.pathSkus) ? raw.pathSkus : []).map(value => String(value || '').trim()).filter(Boolean);
  const relationshipFamily = String(raw.relationshipFamily || raw.relationFamily || (kind === 'related' ? 'relation' : 'direct')).trim().toLowerCase();
  const relationshipType = String(raw.relationshipType || raw.relationType || relationshipFamily || 'direct').trim();
  const relationshipDetails = raw.relationshipDetails || raw.relationDetails || null;
  return {kind, rootSku, direction, depth, pathSkus, relationshipFamily, relationshipType, relationshipDetails};
}

function isRelatedMatrixContext(product) {
  return product?.matrix_context?.kind === 'related';
}

function matrixRelationDirectionLabel(direction) {
  if (direction === 'ancestor') return '상위 관계';
  if (direction === 'descendant') return '하위 관계';
  if (direction === 'bundle_component') return '구성품';
  if (direction === 'bundle_parent') return '세트 부모';
  if (direction === 'seller_bundle_sibling') return '판매처 구성품';
  return '관계 SKU';
}

function matrixRelationshipFamilyLabel(family) {
  return {relation:'관계', canonical_bundle:'공통 세트', seller_bundle:'판매처 번들'}[family] || '관계';
}

function matrixRelationPathBadge(product) {
  const context = matrixRelationContext(product);
  if (context.kind !== 'related') return '';
  const path = context.pathSkus.length ? context.pathSkus.join(' → ') : context.rootSku;
  const label = `${matrixRelationshipFamilyLabel(context.relationshipFamily)} · ${matrixRelationDirectionLabel(context.direction)}${context.depth ? ` · ${context.depth}단계` : ''}`;
  return `<em class="matrix-related-context-badge" title="${escapeHtml(path)}">${escapeHtml(label)}</em>`;
}

function inboundCostCell(product) {
  const cost = formatNullableNumber(product.actual_inbound_cost);
  const tagName = product.inbound_cost_formula_tag_name || '';
  const mode = product.actual_inbound_cost_mode || '';
  const color = product.inbound_cost_formula_tag_color || '#7c3aed';
  const badge = mode === 'formula' && tagName
    ? `<em class="inbound-cost-badge" style="--inbound-tag-color:${escapeHtml(color)}">${escapeHtml(tagName)}</em>`
    : mode === 'manual'
      ? '<em class="inbound-cost-badge manual">직접입력</em>'
      : '<em class="inbound-cost-badge empty">설정</em>';
  return `<button type="button" class="inbound-cost-cell${mode ? ' configured' : ''}" data-inbound-cost-edit data-sku="${escapeHtml(product.sellpia_sku_code)}" title="클릭하여 실입고가 직접 입력 또는 수식태그 설정"><b>${cost}</b>${badge}</button>`;
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
  const visible = new Set([1,2,3,4,5,6]);
  if (view.showInventory) visible.add(7);
  if (view.showPrice) [8,9,10,11,12].forEach(index => visible.add(index));
  const channelColumns = {
    smartstore:{codes:[14,16], names:[15,16], inventory:[17], price:[18,20,21], discount:[19]},
    makeshop:{codes:[23,25], names:[24,25], inventory:[26], price:[27,29,30], discount:[28]},
    ably:{codes:[32,34], names:[33,34], inventory:[35], price:[36,38,39], discount:[37]}
  };
  Object.entries(channelColumns).forEach(([channel, groups]) => {
    if (!view.channels[channel]) return;
    if (view.showCodes ?? view.showMapping ?? true) groups.codes.forEach(index => visible.add(index));
    if (view.showSellerNames ?? true) groups.names.forEach(index => visible.add(index));
    if (view.showInventory) groups.inventory.forEach(index => visible.add(index));
    if (view.showPrice) groups.price.forEach(index => visible.add(index));
    if (view.showDiscount ?? view.showPrice ?? true) groups.discount.forEach(index => visible.add(index));
  });
  if (view.showAttributes) [40,41,42].forEach(index => visible.add(index));
  if (view.showSync) visible.add(43);
  return visible;
}

function indexMatrixBodyColumns() {
  const rows = [...matrixBody.querySelectorAll('tr')];
  const grid = rows.map(() => []);
  rows.forEach((row, rowIndex) => {
    let columnIndex = 0;
    const cells = [...row.children].filter(cell => cell.matches('td'));
    for (const cell of cells) {
      while (grid[rowIndex][columnIndex]) columnIndex += 1;
      const rowSpan = Math.max(1, Number(cell.rowSpan) || 1);
      const colSpan = Math.max(1, Number(cell.colSpan) || 1);
      cell.dataset.matrixColumn = String(columnIndex + 1);
      for (let rowOffset = 0; rowOffset < rowSpan && rowIndex + rowOffset < rows.length; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
          grid[rowIndex + rowOffset][columnIndex + columnOffset] = cell;
        }
      }
      columnIndex += colSpan;
    }
  });
}

function applyMatrixGroupBoundaries(visible) {
  matrixTable.querySelectorAll('[class*="matrix-group-start-"]').forEach(cell => {
    [...cell.classList].filter(name => name.startsWith('matrix-group-start-')).forEach(name => cell.classList.remove(name));
  });
  const columnHeaders = matrixTable.querySelectorAll('.column-row th');
  const groups = [
    {key:'smartstore', header:'.smart-group', indexes:[13,14,15,16,17,18,19,20,21]},
    {key:'makeshop', header:'.make-group', indexes:[22,23,24,25,26,27,28,29,30]},
    {key:'ably', header:'.ably-group', indexes:[31,32,33,34,35,36,37,38,39]},
    {key:'operations', header:'.ops-group', indexes:[40,41,42,43]}
  ];
  groups.forEach(group => {
    const firstVisible = group.indexes.find(index => visible.has(index));
    if (!firstVisible) return;
    const className = `matrix-group-start-${group.key}`;
    matrixTable.querySelector(group.header)?.classList.add(className);
    columnHeaders[firstVisible - 3]?.classList.add(className);
    matrixBody.querySelectorAll(`[data-matrix-column="${firstVisible}"]`).forEach(cell => cell.classList.add(className));
  });
}

function applyColumnVisibility(view = activeView) {
  const visible = viewColumnIndexes(view);
  indexMatrixBodyColumns();
  const columnHeaders = matrixTable.querySelectorAll('.column-row th');
  for (let index = 3; index <= MATRIX_COLUMN_COUNT; index += 1) {
    const show = visible.has(index);
    const header = columnHeaders[index - 3];
    if (header) header.hidden = !show;
    matrixBody.querySelectorAll(`[data-matrix-column="${index}"]`).forEach(cell => { cell.hidden = !show; });
  }
  const groupConfig = [
    ['.sellpia-group', [3,4,5,6,7,8,9,10,11,12]],
    ['.smart-group', [13,14,15,16,17,18,19,20,21]],
    ['.make-group', [22,23,24,25,26,27,28,29,30]],
    ['.ably-group', [31,32,33,34,35,36,37,38,39]],
    ['.ops-group', [40,41,42,43]]
  ];
  groupConfig.forEach(([selector, indexes]) => {
    const header = matrixTable.querySelector(selector);
    const count = indexes.filter(index => visible.has(index)).length;
    header.hidden = count === 0;
    if (count) header.colSpan = count;
  });
  applyMatrixGroupBoundaries(visible);
  matrixTable.dataset.imageSize = ['compact','default','large'].includes(view.imageSize) ? view.imageSize : 'default';
  matrixTable.classList.toggle('wrap-names', Boolean(view.wrapNames));
  applyMatrixColumnWidths(view);
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

function matrixDataViewSignature(view) {
  return JSON.stringify({
    status:view?.status || 'all',
    sort:view?.sort || 'sku_asc',
    excludeCombinationSkus:Boolean(view?.excludeCombinationSkus),
    includeRelatedSkuContext:view?.includeRelatedSkuContext !== false,
    advancedFilter:cloneAdvancedFilter(view?.advancedFilter)
  });
}

function applyViewPreset(view, {id = null, reload = true, announce = true} = {}) {
  const previousDataSignature = matrixDataViewSignature(activeView);
  activeView = cloneView({...cloneView(DEFAULT_VIEW_OPTIONS), ...view, channels:{...DEFAULT_VIEW_OPTIONS.channels, ...view.channels}});
  if (id) {
    activePresetId = id;
    modifiedPresetSourceId = null;
    localStorage.setItem(MATRIX_ACTIVE_PRESET_KEY, id);
  }
  matrixState.status = activeView.status;
  matrixState.sort = activeView.sort;
  matrixState.excludeCombinationSkus = Boolean(activeView.excludeCombinationSkus);
  matrixState.includeRelatedSkuContext = activeView.includeRelatedSkuContext !== false;
  matrixState.advancedFilter = cloneAdvancedFilter(activeView.advancedFilter);
  document.getElementById('matrix-status-filter').value = activeView.status;
  applyMatrixZoom(activeView.zoom, {syncView:false});
  applyColumnVisibility(activeView);
  renderAdvancedFilterBar();
  setActivePresetUi();
  if (reload && previousDataSignature !== matrixDataViewSignature(activeView)) loadLiveMatrix();
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
  return {key:'connected', label:'연결 완료'};
}

function mappingCodeButton(product, prefix, label, kind, value, state) {
  const pendingDraft = product.__sellerProductLinkDrafts?.[prefix];
  const pendingOption = Boolean(pendingDraft && kind === 'option' && !value);
  const display = escapeHtml(pendingOption ? '+ 옵션 추가' : (value || '-'));
  const prompt = pendingDraft
    ? pendingOption
      ? `${label} 상품코드는 복제됨 · 아직 연결하지 않은 옵션 추가`
      : `${label} 상품코드만 복제된 상태 · 옵션은 아직 연결되지 않음`
    : state.key === 'unmatched'
      ? `${label} 판매처 상품 새로 연결`
      : `${label} 조합 연결 확인·관리`;
  const visualState = pendingDraft ? (pendingOption ? 'option-pending' : 'product-pending') : state.key;
  return `<button class="mapping-code-button ${visualState}" data-link-source="${prefix}" data-code-kind="${kind}" title="${prompt}">${display}</button>`;
}

function sellerIdentityCells(product, prefix, label, state, productMerge = null, relationBadge = '') {
  const productName = String(product[`${prefix}_name`] || '').trim();
  const optionName = String(product[`${prefix}_option_name`] || '').trim();
  const productCode = String(product[`${prefix}_product_code`] || '').trim();
  const optionCode = String(product[`${prefix}_option_code`] || '').trim();
  const isDraft = Boolean(product[`${prefix}_name_is_draft`]);
  const pendingDraft = product.__sellerProductLinkDrafts?.[prefix];
  const productTitle = [productCode, productName].filter(Boolean).join(' · ');
  const optionTitle = [optionCode, optionName].filter(Boolean).join(' · ');
  const productRowspan = Math.max(1, Number(productMerge?.rowspan) || 1);
  const productCells = productMerge?.hidden ? '' : `<td class="seller-identity-cell seller-product-code-cell${productRowspan > 1 ? ' seller-identity-merged-cell' : ''}${!productCode ? ' data-gap' : ''}" data-channel="${prefix}"${productRowspan > 1 ? ` rowspan="${productRowspan}"` : ''} title="${escapeHtml(productCode || '판매처 상품코드 없음')}">
      ${mappingCodeButton(product, prefix, label, 'product', productCode, state)}
    </td>
    <td class="seller-identity-cell seller-product-name-cell${productRowspan > 1 ? ' seller-identity-merged-cell' : ''}${!productName ? ' data-gap' : ''}${isDraft ? ' draft' : ''}" data-channel="${prefix}"${productRowspan > 1 ? ` rowspan="${productRowspan}"` : ''} title="${escapeHtml(productTitle || '판매처 상품명 없음')}">
      <em class="${productName ? '' : 'seller-name-missing'}">${escapeHtml(productName || '상품명 없음')}${isDraft ? '<i>초안</i>' : ''}</em>
    </td>`;
  return `${productCells}
    <td class="seller-identity-cell seller-option-identity${!optionCode && !optionName ? ' data-gap' : ''}${pendingDraft ? ' option-selection-pending' : ''}" data-channel="${prefix}" title="${escapeHtml(pendingDraft ? '상품코드 복제 완료 · 옵션 선택 대기' : (optionTitle || '판매처 옵션 정보 없음'))}">
      ${mappingCodeButton(product, prefix, label, 'option', optionCode, state)}<em class="${optionName ? '' : 'seller-name-missing'}">${escapeHtml(pendingDraft ? '옵션 선택 대기' : (optionName || '옵션명 없음'))}</em>${relationBadge}
    </td>`;
}

function systemOperationalCell(product, fieldKey, label, sourceValue) {
  const value = product?.[fieldKey];
  const hasValue = value !== null && value !== undefined && value !== '';
  const hasSource = sourceValue !== null && sourceValue !== undefined && sourceValue !== '';
  const differs = hasValue && hasSource && Number(value) !== Number(sourceValue);
  const updatedAt = {
    system_base_price:product?.system_price_updated_at,
    system_stock:product?.system_stock_updated_at,
    sellpia_purchase_price:product?.sellpia_purchase_price_updated_at,
    sellpia_order_unit:product?.sellpia_order_unit_updated_at,
    sellpia_minimum_order_unit:product?.sellpia_minimum_order_unit_updated_at
  }[fieldKey] || product?.system_updated_at;
  const sourceUpdatedAt = product?.sellpia_source_updated_at;
  const sourceIsNewer = Boolean(sourceUpdatedAt) && (!updatedAt || new Date(sourceUpdatedAt).getTime() > new Date(updatedAt).getTime());
  const sourceState = !hasSource
    ? '원본 없음'
    : !hasValue
      ? '원본 미반영'
      : differs && sourceIsNewer
        ? '원본 갱신 있음'
        : differs
          ? '원본과 다름'
          : '원본과 일치';
  const sourceClass = hasSource && (!hasValue || differs) ? ' source-pending' : '';
  return `<button class="editable-cell sellpia-edit system-master-cell${!hasValue ? ' unset' : ''}${differs ? ' diff' : ''}${sourceClass}" data-source="system" data-field-key="${fieldKey}" data-field="${label}" data-value="${escapeHtml(hasValue ? value : '')}" data-value-type="nullable-number" title="시스템 기준값을 즉시 저장합니다. 원본 숫자는 자동 반영되지 않으며, 선택 셀 원본값 갱신 또는 컬럼 전체 원본값 갱신 작업을 실행할 때만 복사됩니다.">
    <b>${hasValue ? formatNullableNumber(value) : '미설정'}</b>
    <em>${sourceState}${updatedAt ? ` · 저장 ${formatLiveTime(updatedAt)}` : ''}</em>
  </button>`;
}

function channelInventoryCells(product, prefix, label, baseMerge = null, identityMerge = null) {
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
  const stock = product[`${prefix}_stock`];
  const price = product[`${prefix}_price`];
  const priceComponent = product.__sellerPriceComponents?.[prefix] || {};
  const basePrice = priceComponent.source_base_price ?? product[`${prefix}_base_price`] ?? price;
  const discountTerms = priceComponent.source_discount_terms ?? product[`${prefix}_discount_terms`] ?? [];
  const discountedBasePrice = priceComponent.source_discounted_base_price ?? product[`${prefix}_discounted_base_price`] ?? calculateNativeDiscountedBase(basePrice, discountTerms);
  const optionPrice = priceComponent.source_option_price ?? product[`${prefix}_option_price`] ?? 0;
  const finalPrice = priceComponent.source_final_price ?? product[`${prefix}_final_price`] ?? price;
  const policyPrice = product[`${prefix}_policy_price`];
  const policyActive = Boolean(product[`${prefix}_policy_active`]);
  const policyName = product[`${prefix}_policy_name`] || '';
  const sellpiaStock = product.system_stock;
  const sellpiaPrice = product.system_base_price;
  const stockDiff = stock !== null && stock !== undefined && sellpiaStock !== null && sellpiaStock !== undefined && Number(stock) !== Number(sellpiaStock);
  const priceDiff = price !== null && price !== undefined && sellpiaPrice !== null && sellpiaPrice !== undefined && Number(price) !== Number(sellpiaPrice);
  const stockDraft = product.__sellerDrafts?.[`${prefix}:sellpia_current_stock`];
  const priceDraft = product.__sellerDrafts?.[`${prefix}:sellpia_sale_price`];
  const stockDisplay = stockDraft ? stockDraft.after_value : stock;
  const draftBasePrice = priceComponent.draft_base_price ?? priceDraft?.price_base_after ?? null;
  const draftDiscountedBasePrice = priceComponent.draft_discounted_base_price ?? priceDraft?.price_discounted_base_after ?? null;
  const draftDiscountTerms = priceComponent.draft_discount_terms ?? priceDraft?.price_discount_terms_after ?? null;
  const draftOptionPrice = priceComponent.draft_option_price ?? priceDraft?.price_option_after ?? null;
  const draftFinalPrice = priceComponent.draft_final_price ?? priceDraft?.price_final_after ?? priceDraft?.after_value ?? null;
  const effectiveBasePrice = priceDraft ? draftBasePrice : basePrice;
  const effectiveDiscountTerms = priceDraft && Array.isArray(draftDiscountTerms) ? draftDiscountTerms : discountTerms;
  const effectiveDiscountedBasePrice = priceDraft
    ? (draftDiscountedBasePrice ?? calculateNativeDiscountedBase(effectiveBasePrice, effectiveDiscountTerms))
    : discountedBasePrice;
  const effectiveOptionPrice = priceDraft ? draftOptionPrice : optionPrice;
  const effectiveFinalPrice = priceDraft ? draftFinalPrice : finalPrice;
  const priceRuleAssignment = prefix === 'ably' ? null : product.__priceRuleAssignments?.[prefix];
  const priceRuleName = String(priceRuleAssignment?.set_name || '').trim();
  const priceRuleColor = String(priceRuleAssignment?.color || '#1558c0').trim();
  const draftClass = draft => draft ? ` pending draft-${draft.status}` : '';
  const stockCell = stock === null || stock === undefined
    ? `<td class="data-gap" data-channel="${prefix}">-</td>`
    : `<td data-channel="${prefix}"><button class="editable-cell seller-edit${stockDiff && !stockDraft ? ' diff' : ''}${draftClass(stockDraft)}" data-source="${prefix}" data-field-key="sellpia_current_stock" data-field="${label} 재고" data-value="${escapeHtml(stockDisplay)}" data-baseline="${escapeHtml(stock)}" data-value-type="number" data-change-id="${stockDraft?.change_id || ''}" data-draft-status="${stockDraft?.status || ''}" title="${stockDraft ? `수정안 ${formatNullableNumber(stockDisplay)} · 원본 ${formatNullableNumber(stock)}` : '수정 가능한 판매처 재고 · 변경하면 매트릭스 수정안으로 저장됩니다.'}">${formatNullableNumber(stockDisplay)}</button></td>`;
  const componentLayer = (original, draft) => `<span class="price-layer original"><span>원본</span><b>${formatNullableNumber(original)}</b></span>${priceDraft ? `<span class="price-layer draft"><span>수정</span><b>${formatNullableNumber(draft)}</b></span>` : ''}`;
  const discountView = matrixDiscountSummary(effectiveDiscountTerms, effectiveBasePrice, effectiveDiscountedBasePrice);
  const priceRuleSummary = prefix === 'ably' ? '' : `<span class="price-rule-summary">
    <span class="price-rule-badge ${priceRuleAssignment ? 'assigned' : 'none'}${priceDraft ? ' pending' : ''}"${priceRuleAssignment ? ` style="--price-rule-color:${escapeHtml(priceRuleColor)}"` : ''}>fx ${escapeHtml(priceRuleName || '규칙 없음')}${priceDraft ? ' · 내보내기 준비' : ''}</span>
    <span class="price-rule-final">${discountView.hasDiscount ? escapeHtml(discountView.summary) : '할인 없음'} → 최종 ${formatNullableNumber(effectiveFinalPrice)}원</span>
  </span>`;
  const noPrice = finalPrice === null || finalPrice === undefined;
  const mergeHidden = Boolean(baseMerge?.hidden);
  const mergeRowspan = Math.max(1, Number(baseMerge?.rowspan) || 1);
  const mergeAttributes = mergeRowspan > 1
    ? ` rowspan="${mergeRowspan}" class="seller-base-cell seller-base-merged-cell" data-seller-product-code="${escapeHtml(baseMerge.productCode || productCode)}" data-group-size="${mergeRowspan}"`
    : ' class="seller-base-cell"';
  const mergeTitle = mergeRowspan > 1 ? ` · 같은 상품 ${mergeRowspan}개 옵션 공통 판매가` : '';
  const baseCell = mergeHidden
    ? ''
    : noPrice
      ? `<td class="data-gap${mergeRowspan > 1 ? ' seller-base-merged-cell' : ''}" data-channel="${prefix}"${mergeRowspan > 1 ? ` rowspan="${mergeRowspan}"` : ''}>-</td>`
      : `<td data-channel="${prefix}"${mergeAttributes}><button class="editable-cell seller-edit price-layer-cell price-component-base${draftClass(priceDraft)}" data-source="${prefix}" data-field-key="sellpia_sale_price" data-price-component="base" data-field="${label} 판매가" data-value="${escapeHtml(effectiveBasePrice)}" data-baseline="${escapeHtml(basePrice)}" data-option-price="${escapeHtml(effectiveOptionPrice)}" data-value-type="number" data-change-id="${priceDraft?.change_id || ''}" data-draft-status="${priceDraft?.status || ''}" data-seller-product-code="${escapeHtml(baseMerge?.productCode || productCode)}" data-group-size="${mergeRowspan}" title="${escapeHtml(priceRuleName ? `가격규칙 ${priceRuleName}` : '가격규칙 없음')} · ${escapeHtml(nativeDiscountSummary(discountTerms))} · 할인 적용 판매가 ${formatNullableNumber(effectiveDiscountedBasePrice)}${mergeTitle}">${componentLayer(basePrice, effectiveBasePrice)}${priceRuleSummary}</button><button type="button" class="price-edit-trigger" data-price-edit aria-label="${label} 판매가 수정">수정</button></td>`;
  const discountContent = `<b>${escapeHtml(discountView.summary)}</b><em>${discountView.hasDiscount ? `적용가 ${formatNullableNumber(effectiveDiscountedBasePrice)}원` : '할인 없음'}</em>`;
  const discountCell = mergeHidden
    ? ''
    : noPrice
      ? `<td class="data-gap${mergeRowspan > 1 ? ' seller-discount-merged-cell' : ''}" data-channel="${prefix}"${mergeRowspan > 1 ? ` rowspan="${mergeRowspan}"` : ''}>-</td>`
      : `<td class="seller-discount-cell ${discountView.hasDiscount ? 'has-discount' : 'no-discount'}${priceDraft ? ' pending' : ''}${mergeRowspan > 1 ? ' seller-discount-merged-cell' : ''}" data-channel="${prefix}"${mergeRowspan > 1 ? ` rowspan="${mergeRowspan}" data-seller-product-code="${escapeHtml(baseMerge.productCode || productCode)}" data-group-size="${mergeRowspan}"` : ''} title="${escapeHtml(discountView.detail)}${discountView.hasDiscount ? ` · 할인 적용 판매가 ${formatNullableNumber(effectiveDiscountedBasePrice)}원` : ''}${mergeTitle}">${prefix === 'ably' ? discountContent : `<button type="button" class="discount-cell-edit" data-discount-edit data-source="${prefix}" data-product-code="${escapeHtml(baseMerge?.productCode || productCode)}" data-sku="${escapeHtml(product.sellpia_sku_code)}" aria-label="${label} 할인 수정">${discountContent}<span class="discount-edit-icon">수정</span></button>`}</td>`;
  const optionCell = noPrice
    ? `<td class="data-gap" data-channel="${prefix}">-</td>`
    : prefix === 'ably'
      ? `<td class="price-component-cell derived" data-channel="${prefix}" title="에이블리는 별도 옵션가를 사용하지 않습니다.">${componentLayer(optionPrice, effectiveOptionPrice)}</td>`
      : `<td data-channel="${prefix}"><button class="editable-cell seller-edit price-layer-cell price-component-option${draftClass(priceDraft)}" data-source="${prefix}" data-field-key="sellpia_sale_price" data-price-component="option" data-field="${label} 옵션가" data-value="${escapeHtml(effectiveOptionPrice)}" data-baseline="${escapeHtml(optionPrice)}" data-target-final="${escapeHtml(effectiveFinalPrice)}" data-value-type="signed-number" data-change-id="${priceDraft?.change_id || ''}" data-draft-status="${priceDraft?.status || ''}" title="옵션가를 바꾸면 판매가와 원본 할인은 유지되고 최종구매가가 자동 계산됩니다.">${componentLayer(optionPrice, effectiveOptionPrice)}</button></td>`;
  const finalLayers = `<span class="price-layer original"><span>원본</span><b>${formatNullableNumber(finalPrice)}</b></span>${policyActive && policyPrice !== null && policyPrice !== undefined ? `<span class="price-layer policy"><span>수식</span><b>${formatNullableNumber(policyPrice)}</b></span>` : ''}${priceDraft ? `<span class="price-layer draft"><span>수정</span><b>${formatNullableNumber(effectiveFinalPrice)}</b></span>` : ''}`;
  const finalCell = noPrice
    ? `<td class="data-gap" data-channel="${prefix}">-</td>`
    : `<td data-channel="${prefix}"><button class="editable-cell seller-edit price-hover-target price-layer-cell price-component-final${priceDiff && !priceDraft ? ' diff' : ''}${draftClass(priceDraft)}" data-source="${prefix}" data-field-key="sellpia_sale_price" data-price-component="final" data-field="${label} 최종구매가" data-value="${escapeHtml(effectiveFinalPrice)}" data-baseline="${escapeHtml(finalPrice)}" data-option-price="${escapeHtml(effectiveOptionPrice)}" data-value-type="number" data-change-id="${priceDraft?.change_id || ''}" data-draft-status="${priceDraft?.status || ''}" tabindex="0" data-price-source="${prefix}" data-price-label="${label}" data-original-price="${escapeHtml(finalPrice)}" data-policy-price="${escapeHtml(policyPrice ?? '')}" data-policy-active="${policyActive ? 'true' : 'false'}" data-policy-name="${escapeHtml(policyName)}" data-draft-price="${escapeHtml(effectiveFinalPrice ?? '')}" data-base-price="${escapeHtml(sellpiaPrice ?? '')}" data-price-updated="${escapeHtml(product[`${prefix}_inventory_at`] || '')}" title="${priceDraft ? `반영 예정 ${formatNullableNumber(effectiveFinalPrice)} · 원본 ${formatNullableNumber(finalPrice)}` : policyActive ? `원본 ${formatNullableNumber(finalPrice)} · 수식 계산 ${formatNullableNumber(policyPrice)}` : '수정 가능한 판매처 최종구매가'}">${finalLayers}</button></td>`;
  return `<td data-channel="${prefix}"${title}><span class="matrix-status ${state.key}">${state.label}</span></td>${sellerIdentityCells(product, prefix, label, state, identityMerge, relationBadge)}${stockCell}${baseCell}${discountCell}${optionCell}${finalCell}`;
}

function sellpiaProductGroupKey(product) {
  const explicit = product?.__profile?.sellpia_product_code || product?.sellpia_product_code;
  if (explicit) return String(explicit).trim();
  const sku = String(product?.sellpia_sku_code || '').trim();
  return sku.replace(/-\d+$/, '') || sku;
}

function buildProductIdentityMerges(products) {
  const metadata = new Map();
  const sources = ['smartstore', 'makeshop', 'ably'];
  for (const source of sources) {
    let index = 0;
    while (index < products.length) {
      const first = products[index];
      if (first?.__codeListPlaceholder || isRelatedMatrixContext(first)) {
        index += 1;
        continue;
      }
      const sellpiaGroup = sellpiaProductGroupKey(first);
      const productCode = String(first?.[`${source}_product_code`] || '').trim();
      const productName = String(first?.[`${source}_name`] || '').trim();
      const draftState = String(Boolean(first?.[`${source}_name_is_draft`]));
      const signature = JSON.stringify([sellpiaGroup, productCode, productName, draftState]);
      let end = index + 1;
      while (productCode && end < products.length) {
        const candidate = products[end];
        if (candidate?.__codeListPlaceholder || isRelatedMatrixContext(candidate)) break;
        const candidateGroup = sellpiaProductGroupKey(candidate);
        const candidateCode = String(candidate?.[`${source}_product_code`] || '').trim();
        const candidateName = String(candidate?.[`${source}_name`] || '').trim();
        const candidateDraft = String(Boolean(candidate?.[`${source}_name_is_draft`]));
        if (JSON.stringify([candidateGroup, candidateCode, candidateName, candidateDraft]) !== signature) break;
        end += 1;
      }
      const rowspan = productCode ? end - index : 1;
      metadata.set(`${index}|${source}`, {rowspan, hidden:false});
      for (let hiddenIndex = index + 1; hiddenIndex < end; hiddenIndex += 1) metadata.set(`${hiddenIndex}|${source}`, {rowspan:0, hidden:true});
      index = Math.max(end, index + 1);
    }
  }
  return metadata;
}

function sellerBaseMergeSignature(product, source) {
  const price = product?.[`${source}_price`];
  const component = product?.__sellerPriceComponents?.[source] || {};
  const draft = product?.__sellerDrafts?.[`${source}:sellpia_sale_price`];
  const original = component.source_base_price ?? product?.[`${source}_base_price`] ?? price;
  const effective = draft ? (component.draft_base_price ?? draft.price_base_after) : original;
  const sourceTerms = component.source_discount_terms ?? product?.[`${source}_discount_terms`] ?? [];
  const terms = draft ? (component.draft_discount_terms ?? draft.price_discount_terms_after ?? sourceTerms) : sourceTerms;
  const assignment = product?.__priceRuleAssignments?.[source];
  return JSON.stringify([original ?? null, effective ?? null, draft?.status || '', terms, assignment?.price_rule_set_id ?? null, assignment?.set_name || '']);
}

function buildSellerBaseMerges(products) {
  const metadata = new Map();
  for (const source of ['smartstore', 'makeshop', 'ably']) {
    let index = 0;
    while (index < products.length) {
      const first = products[index];
      if (first?.__codeListPlaceholder || isRelatedMatrixContext(first)) {
        index += 1;
        continue;
      }
      const productCode = String(first?.[`${source}_product_code`] || '').trim();
      const sellpiaGroup = sellpiaProductGroupKey(first);
      const signature = sellerBaseMergeSignature(first, source);
      let end = index + 1;
      while (productCode && end < products.length) {
        const candidate = products[end];
        if (candidate?.__codeListPlaceholder || isRelatedMatrixContext(candidate)) break;
        if (sellpiaProductGroupKey(candidate) !== sellpiaGroup) break;
        if (String(candidate?.[`${source}_product_code`] || '').trim() !== productCode) break;
        if (sellerBaseMergeSignature(candidate, source) !== signature) break;
        end += 1;
      }
      const rowspan = productCode ? end - index : 1;
      metadata.set(`${index}|${source}`, {rowspan, hidden:false, productCode});
      for (let hiddenIndex = index + 1; hiddenIndex < end; hiddenIndex += 1) {
        metadata.set(`${hiddenIndex}|${source}`, {rowspan:0, hidden:true, productCode});
      }
      index = Math.max(end, index + 1);
    }
  }
  return metadata;
}

function codeListSourceLabel(source) {
  return {sellpia:'셀피아', smartstore:'스마트스토어', makeshop:'메이크샵', ably:'에이블리'}[source] || source || '판매처 확인 필요';
}

function codeListPlaceholderSellerCells(codeRow, source) {
  if (codeRow.source_channel !== source) return '<td class="data-gap">-</td>'.repeat(9);
  const reason = escapeHtml(codeRow.reason || codeListIssueLabel(codeRow.match_status));
  const inputCode = escapeHtml(codeRow.input_code || '-');
  const state = 'unmatched';
  return `<td><span class="matrix-status ${state}">${reason}</span></td>
    <td class="seller-identity-cell code-list-placeholder-code" title="${inputCode}"><b>${inputCode}</b></td>
    <td class="seller-identity-cell data-gap"><em>상품명 없음</em></td>
    <td class="seller-identity-cell data-gap"><b>-</b><em>${escapeHtml(codeListSourceLabel(source))}</em></td>
    <td class="data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td>`;
}

function renderCodeListPlaceholderRow(product) {
  const codeRow = product.__codeList || {};
  const rowNo = Math.max(1, Number(codeRow.input_row) || 1);
  const sourceLabel = escapeHtml(codeListSourceLabel(codeRow.source_channel));
  const inputCode = escapeHtml(codeRow.input_code || '-');
  const reasonText = codeRow.reason || (codeRow.match_status === 'matched' ? '상품 정보 없음' : codeListIssueLabel(codeRow.match_status));
  const reason = escapeHtml(reasonText);
  const state = 'unmatched';
  return `<tr class="code-list-placeholder-row" data-input-row="${rowNo}" data-status="${state}">
    <td class="sticky-col select-col" aria-hidden="true"></td>
    <td class="sticky-col image-col"><span class="code-list-placeholder-symbol">!</span></td>
    <td class="sticky-col sellpia-sku-col code-list-sku-cell"><b title="${inputCode}">${inputCode}</b></td>
    <td class="sticky-col sellpia-name-col sellpia-text-cell"><span>엑셀 ${rowNo}행 · ${reason}</span></td>
    <td class="sticky-col sellpia-option-name-col sellpia-text-cell"><span>${sourceLabel}</span></td>
    <td class="sticky-col own-code-col data-gap">-</td>
    <td class="sticky-col sellpia-stock-col data-gap">-</td><td class="sticky-col sellpia-price-col data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td><td class="data-gap">-</td>
    ${codeListPlaceholderSellerCells(codeRow, 'smartstore')}
    ${codeListPlaceholderSellerCells(codeRow, 'makeshop')}
    ${codeListPlaceholderSellerCells(codeRow, 'ably')}
    <td class="data-gap">-</td><td class="data-gap">-</td><td><span class="tag">${reason}</span></td><td>엑셀 ${rowNo}행</td>
  </tr>`;
}

function renderLiveMatrixRows(products) {
  clearMatrixCellSelection();
  matrixRowsBySku.clear();
  if (!products.length) {
    matrixBody.innerHTML = `<tr class="matrix-empty-row"><td colspan="${MATRIX_COLUMN_COUNT}"><b>검색 결과가 없습니다.</b><span>SKU 또는 자사코드를 다시 확인해주세요.</span></td></tr>`;
    return;
  }
  const sellerBaseMerges = buildSellerBaseMerges(products);
  const productIdentityMerges = buildProductIdentityMerges(products);
  let previousProductGroup = '';
  let previousResultGroup = '';
  matrixBody.innerHTML = products.map((product, rowIndex) => {
    if (product.__codeListPlaceholder) return renderCodeListPlaceholderRow(product);
    matrixRowsBySku.set(product.sellpia_sku_code, product);
    const sku = escapeHtml(product.sellpia_sku_code);
    const codeRow = product.__codeList || null;
    const inputRow = codeRow ? Math.max(1, Number(codeRow.input_row) || 1) : null;
    const hasRelationshipContext = Boolean(product?.matrix_context && typeof product.matrix_context === 'object');
    const relationContext = matrixRelationContext(product);
    const isRelatedContext = product?.matrix_context?.kind === 'related';
    const relationBadge = matrixRelationPathBadge(product);
    const skuMarkup = codeRow
      ? `<span class="code-list-sku-cell"><b>${sku}</b><em>엑셀 ${inputRow}행</em></span>`
      : isRelatedContext
        ? `<span class="matrix-related-sku"><b>${sku}</b><em>↳ ${escapeHtml(matrixRelationshipFamilyLabel(relationContext.relationshipFamily))} · ${escapeHtml(matrixRelationDirectionLabel(relationContext.direction))}</em></span>`
        : sku;
    const rawOwnCode = product.sellpia_own_code || product.own_code || '';
    const ownCode = escapeHtml(rawOwnCode || '-');
    const liveImageUrl = product.sellpia_override_image_url || product.image_url || '';
    const imageUrl = escapeHtml(liveImageUrl);
    const tiers = [product.smartstore_match_tier, product.makeshop_match_tier, product.ably_match_tier];
    const connectedCount = tiers.filter(Boolean).length;
    const overallState = connectedCount > 0 || normalizeConnectionStatus(product.overall_status) === 'connected' ? 'connected' : 'unmatched';
    const rawDisplayName = product.sellpia_product_name || product.display_name || '';
    const rawOptionName = product.sellpia_option_name || '';
    const displayName = escapeHtml(rawDisplayName || '상품명 원본 적재 대기');
    const optionName = escapeHtml(rawOptionName || '셀피아 옵션명 적재 대기');
    const sellpiaSourceStock = product.sellpia_source_stock ?? product.sellpia_current_stock;
    const sellpiaSourcePrice = product.sellpia_source_sale_price ?? product.sellpia_sale_price;
    const mappingTag = overallState === 'connected'
      ? `<span class="tag">연결 완료${connectedCount ? ` · ${connectedCount}처` : ''}</span>`
      : '<span class="tag">미매칭</span>';
    const profile = product.__profile || {};
    const tagSummary = [profile.shape, profile.tag_summary].filter(Boolean).join(' · ');
    const productGroup = sellpiaProductGroupKey(product);
    const priceBasis = product.__priceBasis || {};
    const isPriceBasis = Number(priceBasis.candidateCount || 0) > 1
      && String(priceBasis.basisSkuCode || '') === String(product.sellpia_sku_code || '');
    const resultGroup = !hasRelationshipContext
      ? 'normal'
      : isRelatedContext
        ? `related:${relationContext.rootSku}:${product.sellpia_sku_code}`
        : `direct:${relationContext.rootSku || product.sellpia_sku_code}`;
    const groupStart = !previousProductGroup || productGroup !== previousProductGroup || resultGroup !== previousResultGroup;
    previousProductGroup = productGroup;
    previousResultGroup = resultGroup;
    const rowClasses = [groupStart ? 'product-group-start' : 'product-group-continuation'];
    if (isRelatedContext) rowClasses.push('matrix-related-context-row');
    if (isPriceBasis) rowClasses.push('price-basis-row');
    return `<tr class="${rowClasses.join(' ')}" data-sku="${sku}" data-product-group="${escapeHtml(productGroup)}" data-own-code="${ownCode}" data-image="${imageUrl}" data-status="${overallState}" data-matrix-context="${escapeHtml(relationContext.kind)}" data-relationship-family="${escapeHtml(relationContext.relationshipFamily)}" data-root-sku="${escapeHtml(relationContext.rootSku)}"${inputRow ? ` data-input-row="${inputRow}"` : ''}>
      <td class="sticky-col select-col" aria-hidden="true"></td>
      <td class="sticky-col image-col image-drop-cell" data-image-drop="${sku}" title="이미지를 이 셀에 놓으면 ${sku}.jpg로 저장됩니다.">${matrixImage(product)}<span class="image-drop-hint">DROP</span></td>
      <td class="sticky-col sellpia-sku-col sellpia-code-cell${isPriceBasis ? ' price-basis-cell' : ''}"><button type="button" class="sellpia-sku-link" data-open-sku-links title="이 SKU의 판매처 연결정보 열기">${skuMarkup}</button></td>
      <td class="sticky-col sellpia-name-col sellpia-text-cell"><span title="${displayName}">${displayName}</span>${relationBadge}</td>
      <td class="sticky-col sellpia-option-name-col sellpia-text-cell"><span title="${optionName}">${optionName}</span></td>
      <td class="sticky-col own-code-col">${sellpiaEditor('sellpia_own_code', '셀피아 자사코드', rawOwnCode, {className:'sellpia-text-compact'})}</td>
      <td class="sticky-col sellpia-stock-col number-cell">${systemOperationalCell(product, 'system_stock', '시스템 기준재고', sellpiaSourceStock)}</td>
      <td class="sticky-col sellpia-price-col number-cell${isPriceBasis ? ' price-basis-cell' : ''}"${isPriceBasis ? ` title="${priceBasis.selectionMode === 'manual' ? '직접 선택' : '그룹 최저가 자동 선택'} 기준가격 SKU"` : ''}>${systemOperationalCell(product, 'system_base_price', '시스템 기준가격', sellpiaSourcePrice)}</td>
      <td class="number-cell">${systemOperationalCell(product, 'sellpia_purchase_price', '매입가', product.sellpia_source_purchase_price)}</td>
      <td class="number-cell">${systemOperationalCell(product, 'sellpia_order_unit', '발주단위', product.sellpia_source_order_unit)}</td>
      <td class="number-cell">${systemOperationalCell(product, 'sellpia_minimum_order_unit', '최소발주단위', product.sellpia_source_minimum_order_unit)}</td>
      <td class="number-cell inbound-cost-column">${inboundCostCell(product)}</td>
      ${channelInventoryCells(product, 'smartstore', '스마트스토어', sellerBaseMerges.get(`${rowIndex}|smartstore`), productIdentityMerges.get(`${rowIndex}|smartstore`))}
      ${channelInventoryCells(product, 'makeshop', '메이크샵', sellerBaseMerges.get(`${rowIndex}|makeshop`), productIdentityMerges.get(`${rowIndex}|makeshop`))}
      ${channelInventoryCells(product, 'ably', '에이블리', sellerBaseMerges.get(`${rowIndex}|ably`), productIdentityMerges.get(`${rowIndex}|ably`))}
      <td class="profile-cell${profile.material ? '' : ' data-gap'}">${escapeHtml(profile.material || '-')}</td><td class="profile-cell${profile.product_group ? '' : ' data-gap'}">${escapeHtml(profile.product_group || '-')}</td><td class="profile-tags-cell">${tagSummary ? `<span class="tag" title="${escapeHtml(tagSummary)}">${escapeHtml(tagSummary)}</span>` : mappingTag}</td><td>${formatLiveTime(product.sellpia_source_updated_at || product.sellpia_inventory_at || product.updated_at)}</td>
    </tr>`;
  }).join('');
  applyColumnVisibility(activeView);
}

function setMatrixConnection(state, label) {
  const badge = document.getElementById('matrix-live-status');
  badge.className = `live-data-badge ${state}`;
  badge.textContent = label;
}

function renderSystemHealth() {
  if (!systemHealthPill || !systemHealthText) return;
  const states = Object.values(systemHealthState.components);
  const checked = states.filter(state => state === 'ok' || state === 'error');
  const failed = states.filter(state => state === 'error');
  let state = 'loading';
  let label = '시스템 확인 중';
  if (systemHealthState.refreshing) {
    label = '데이터 조회 중';
  } else if (checked.length === states.length && failed.length === 0) {
    state = 'healthy';
    label = '시스템 정상';
  } else if (checked.length === states.length && failed.length < states.length) {
    state = 'delayed';
    label = '일부 조회 지연';
  } else if (failed.length === states.length) {
    state = 'error';
    label = 'DB 조회 실패';
  }
  const componentLabels = {matrix:'매트릭스', source:'판매처 상태', metrics:'운영 집계', mapping:'매핑 상태'};
  const failedLabels = Object.entries(systemHealthState.components)
    .filter(([, componentState]) => componentState === 'error')
    .map(([key]) => componentLabels[key]);
  systemHealthPill.dataset.state = state;
  systemHealthText.textContent = label;
  systemHealthPill.title = failedLabels.length
    ? `조회 지연: ${failedLabels.join(', ')}`
    : systemHealthState.lastCompletedAt
      ? `마지막 확인 ${formatLiveTime(systemHealthState.lastCompletedAt)}`
      : 'DB 연결 상태를 확인하고 있습니다.';
  if (topRefreshButton) {
    topRefreshButton.disabled = systemHealthState.refreshing;
    topRefreshButton.setAttribute('aria-busy', String(systemHealthState.refreshing));
    const buttonLabel = topRefreshButton.querySelector('b');
    if (buttonLabel) buttonLabel.textContent = systemHealthState.refreshing ? '조회 중' : '새로고침';
  }
}

function setSystemHealthComponent(component, succeeded) {
  if (!(component in systemHealthState.components)) return;
  systemHealthState.components[component] = succeeded ? 'ok' : 'error';
  renderSystemHealth();
}

function beginSystemRefresh() {
  systemHealthState.refreshing = true;
  for (const component of Object.keys(systemHealthState.components)) systemHealthState.components[component] = 'loading';
  renderSystemHealth();
}

function finishSystemRefresh() {
  systemHealthState.refreshing = false;
  systemHealthState.lastCompletedAt = new Date().toISOString();
  renderSystemHealth();
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
  if (!liveData?.loadMappingSyncStatus) {
    setSystemHealthComponent('mapping', false);
    return null;
  }
  if (mappingSyncState.checking) return mappingSyncState.latest;
  mappingSyncState.checking = true;
  try {
    const status = await liveData.loadMappingSyncStatus();
    setSystemHealthComponent('mapping', true);
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
    setSystemHealthComponent('mapping', false);
    renderMappingSyncStatus({message:error?.message || String(error)}, 'error');
    return null;
  } finally {
    mappingSyncState.checking = false;
    mappingSyncState.autoRefreshing = false;
  }
}

function isMatrixAbortError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = `${error?.code || ''} ${error?.message || error}`.toLowerCase();
  return name === 'aborterror'
    || message.includes('aborterror')
    || message.includes('signal is aborted')
    || message.includes('request was aborted')
    || message.includes('요청이 취소');
}

function waitForMatrixRetry(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const error = new Error('요청이 취소되었습니다.');
      error.name = 'AbortError';
      reject(error);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    const abort = () => {
      clearTimeout(timer);
      const error = new Error('요청이 취소되었습니다.');
      error.name = 'AbortError';
      reject(error);
    };
    signal?.addEventListener('abort', abort, {once:true});
  });
}

async function loadLiveMatrix({resetPage = false, resetScroll = resetPage} = {}) {
  if (!liveData) {
    setSystemHealthComponent('matrix', false);
    return false;
  }
  if (resetPage) matrixState.page = 1;
  matrixState.requestController?.abort();
  const requestController = new AbortController();
  matrixState.requestController = requestController;
  const requestId = ++matrixState.requestId;
  matrixState.loading = true;
  setMatrixConnection('loading', 'DB 조회 중');
  const keepRenderedRows = matrixState.rows.length > 0;
  if (!keepRenderedRows) {
    matrixBody.innerHTML = '<tr class="matrix-empty-row loading"><td colspan="38"><b>Supabase에서 실제 SKU를 불러오는 중입니다.</b><span>이미지와 자사코드를 함께 연결합니다.</span></td></tr>';
  }
  try {
    const request = {
      page:matrixState.page,
      pageSize:matrixState.pageSize,
      search:matrixState.search,
      searchSources:matrixState.searchSources,
      status:matrixState.status,
      sort:matrixState.sort,
      excludeCombinationSkus:matrixState.excludeCombinationSkus,
      includeRelatedSkuContext:matrixState.includeRelatedSkuContext && Boolean(matrixState.search.trim()) && !matrixState.codeListRows.length,
      skus:matrixState.codeListSkus,
      codeListRows:matrixState.codeListRows,
      advancedFilter:matrixState.advancedFilter,
      signal:requestController.signal
    };
    let result;
    for (let attempt = 0; attempt <= MATRIX_TRANSIENT_RETRY_DELAYS_MS.length; attempt += 1) {
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
        if (isMatrixAbortError(error) || !transient || attempt >= MATRIX_TRANSIENT_RETRY_DELAYS_MS.length || requestId !== matrixState.requestId) throw error;
        const retryDelay = MATRIX_TRANSIENT_RETRY_DELAYS_MS[attempt];
        setMatrixConnection('loading', `DB 재시도 중 · ${attempt + 1}/${MATRIX_TRANSIENT_RETRY_DELAYS_MS.length}`);
        await waitForMatrixRetry(retryDelay, requestController.signal);
      }
    }
    if (requestId !== matrixState.requestId) return false;
    const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
    if (matrixState.page > totalPages) {
      matrixState.page = totalPages;
      return loadLiveMatrix({resetScroll});
    }
    matrixState.total = result.count;
    matrixState.directCount = Number(result.directCount ?? result.count ?? 0);
    matrixState.relatedCount = Number(result.relatedCount || 0);
    matrixState.rows = result.rows;
    renderLiveMatrixRows(result.rows);
    const first = result.count ? ((result.page - 1) * result.pageSize) + 1 : 0;
    const last = Math.min(result.page * result.pageSize, result.count);
    document.getElementById('matrix-total-count').textContent = formatNumber(matrixState.directCount);
    const matrixRelatedCount = document.getElementById('matrix-related-count');
    if (matrixRelatedCount) {
      matrixRelatedCount.hidden = !matrixState.relatedCount;
      document.getElementById('matrix-related-count-value').textContent = formatNumber(matrixState.relatedCount);
    }
    document.getElementById('matrix-range').textContent = `${formatNumber(first)}–${formatNumber(last)} / ${formatNumber(matrixState.directCount)}${matrixState.relatedCount ? ` · 관계 SKU ${formatNumber(matrixState.relatedCount)}행 함께 표시` : ''}`;
    const matrixPageInput = document.getElementById('matrix-page');
    matrixPageInput.value = String(result.page);
    matrixPageInput.max = String(totalPages);
    document.getElementById('matrix-total-pages').textContent = `/ ${formatNumber(totalPages)}`;
    document.getElementById('matrix-prev').disabled = result.page <= 1;
    document.getElementById('matrix-next').disabled = last >= result.count;
    if (resetScroll && matrixShell) matrixShell.scrollTop = 0;
    clearMatrixCellSelection();
    updateSelectedCount();
    matrixState.lastLoadedAt = new Date().toISOString();
    setMatrixConnection('connected', matrixState.codeListRows.length
      ? `엑셀 목록 · ${formatNumber(result.count)} 결과 행`
      : `LIVE · ${formatNumber(matrixState.directCount)} SKU${matrixState.relatedCount ? ` · 관계 ${formatNumber(matrixState.relatedCount)}행` : ''}`);
    setSystemHealthComponent('matrix', true);
    return true;
  } catch (error) {
    if (requestId !== matrixState.requestId || isMatrixAbortError(error)) return false;
    console.error('operations hub matrix load failed', error?.code || '', error?.message || String(error));
    if (keepRenderedRows) {
      setMatrixConnection('error', 'DB 조회 지연 · 기존 화면 유지');
      showToast('새 데이터 조회가 지연되어 기존 화면을 유지합니다. 저장된 수정값은 사라지지 않습니다.');
    } else {
      matrixBody.innerHTML = '<tr class="matrix-empty-row error"><td colspan="38"><b>실데이터를 불러오지 못했습니다.</b><span>DB 새로고침을 눌러 다시 시도해주세요.</span></td></tr>';
      document.getElementById('live-catalog-state').textContent = '연결 오류';
      setMatrixConnection('error', 'DB 연결 오류');
    }
    setSystemHealthComponent('matrix', false);
    return false;
  } finally {
    if (requestId === matrixState.requestId) {
      matrixState.loading = false;
      if (matrixState.requestController === requestController) matrixState.requestController = null;
    }
  }
}

function channelCard(source) {
  const className = {smartstore:'smart', makeshop:'make', ably:'ably'}[source];
  return className ? document.querySelector(`.sync-list .channel-logo.${className}`)?.closest('div') : null;
}

function sidebarChannelStatus(source) {
  const className = {smartstore:'smart', makeshop:'make', ably:'ably'}[source];
  return className ? document.querySelector(`.channel-mini .dot.${className}`)?.closest('.channel-mini')?.querySelector('em') : null;
}

function updateJobsErrorBadge() {
  const badge = document.getElementById('jobs-error-badge');
  const sourceErrors = Number(badge.dataset.sourceErrors || 0);
  const queueErrors = Number(badge.dataset.queueErrors || 0);
  badge.textContent = formatNumber(sourceErrors + queueErrors);
  badge.classList.toggle('warn-badge', sourceErrors + queueErrors > 0);
}

async function loadLiveSourceStatus() {
  if (!liveData) {
    setSystemHealthComponent('source', false);
    return false;
  }
  try {
    const {events, latest} = await liveData.loadSourceStatus();
    for (const source of ['smartstore','makeshop','ably']) {
      const event = latest[source];
      const card = channelCard(source);
      const sidebarStatus = sidebarChannelStatus(source);
      if (!card) continue;
      if (!event) {
        card.querySelector('p em').textContent = '실행 기록 없음';
        card.querySelector('time').textContent = '-';
        card.querySelector('.status').textContent = '대기';
        card.querySelector('.status').className = 'status wait';
        if (sidebarStatus) sidebarStatus.textContent = '기록 없음';
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
      if (sidebarStatus) sidebarStatus.textContent = event.status === 'SUCCESS' ? '최근 정상' : event.status === 'ERROR' ? '최근 오류' : staleRunning ? '중단 추정' : '실행 중';
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
    setSystemHealthComponent('source', true);
    return true;
  } catch (error) {
    console.error('operations hub source status load failed', error);
    setSystemHealthComponent('source', false);
    return false;
  }
}

async function loadLiveDashboardMetrics() {
  if (!liveData?.loadDashboardMetrics) {
    setSystemHealthComponent('metrics', false);
    document.getElementById('live-today-picked').textContent = '-';
    document.getElementById('live-shortage-drawer').textContent = '주문 DB 연결 대기';
    return false;
  }
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
    setSystemHealthComponent('metrics', true);
    return true;
  } catch (error) {
    console.error('operations hub dashboard metrics load failed', error);
    document.getElementById('live-catalog-state').textContent = '집계 오류';
    document.getElementById('live-today-picked').textContent = '-';
    document.getElementById('live-shortage-drawer').textContent = '조회 실패 · 주문 DB 상태 확인';
    setSystemHealthComponent('metrics', false);
    return false;
  }
}

async function refreshLiveData(options = {}) {
  beginSystemRefresh();
  let result = {matrix:false, source:false, metrics:false, mapping:false};
  try {
    const [matrix, source, metrics] = await Promise.all([
      loadLiveMatrix(options),
      loadLiveSourceStatus(),
      loadLiveDashboardMetrics()
    ]);
    const mapping = await loadMappingSyncStatus({markDisplayed:true});
    result = {matrix:matrix === true, source:source === true, metrics:metrics === true, mapping:Boolean(mapping)};
    return result;
  } finally {
    finishSystemRefresh();
  }
}

async function refreshMatrixSkus(skus = []) {
  const targets = [...new Set(skus.map(sku => String(sku || '').trim()).filter(Boolean))];
  if (!targets.length || !liveData?.loadProductsBySkus) return [];
  const rows = await liveData.loadProductsBySkus(targets);
  const refreshedBySku = new Map(rows.map(product => [String(product.sellpia_sku_code || '').trim(), product]));
  matrixState.rows = matrixState.rows.map(product => refreshedBySku.get(String(product.sellpia_sku_code || '').trim()) || product);
  renderLiveMatrixRows(matrixState.rows);
  return rows;
}

function matrixRowName(row) {
  const sku = String(row?.dataset?.sku || '').trim();
  const product = matrixRowsBySku.get(sku) || {};
  return {
    sku,
    ownCode: row.dataset.ownCode || '-',
    image: row.dataset.image || '',
    name:String(product.sellpia_product_name || product.display_name || row.querySelector('.sellpia-name-col span')?.textContent || '상품명 없음').trim(),
    option:String(product.sellpia_option_name || row.querySelector('.sellpia-option-name-col span')?.textContent || '옵션명 없음').trim()
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
  const disconnectButton = section.querySelector('[data-drawer-disconnect-source]');
  if (disconnectButton) {
    disconnectButton.disabled = state.key === 'unmatched' || !productCode;
    disconnectButton.title = disconnectButton.disabled
      ? `${label}에 저장된 연결이 없습니다.`
      : `${label} ${productCode}${optionCode ? ` / ${optionCode}` : ''}와 현재 SKU의 연결만 해제합니다.`;
  }
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
    const step = steps.find(item => String(item.tag_id) === String(tag.tag_id));
    const roleLabel = tag.tag_role === 'discount' ? `${CHANNEL_LABELS[tag.discount_source_channel] || '판매처'} 할인` : '판매가';
    const calculation = step ? `${roleLabel} · ${formatNullableNumber(step.before)}원 → ${formatNullableNumber(step.after)}원` : `${roleLabel} · 계산 대기`;
    return `<span class="price-tag-step" style="--price-tag-color:${escapeHtml(tag.color || ruleSet.color || '#2f6fd1')}"><i>${index + 1}</i><b>${escapeHtml(tag.tag_name)}</b><em>${escapeHtml(calculation)}</em></span>`;
  }).join('')}</div>`;
}

function priceRuleTagSummary(tag) {
  if (!tag) return '-';
  const role = tag.tag_role === 'discount' ? `${CHANNEL_LABELS[tag.discount_source_channel] || '판매처'} 할인 · ` : '판매가 · ';
  if (tag.replace_price !== null && tag.replace_price !== undefined) return `${role}${formatNullableNumber(tag.replace_price)}원 고정`;
  const value = Number(tag.modify_value || 0);
  if (tag.modify_type === 'percent') return `${role}${Math.abs(value)}% ${value < 0 ? '할인' : '인상'}`;
  if (tag.modify_type === 'add') return `${role}${formatNullableNumber(Math.abs(value))}원 ${value < 0 ? '할인' : '추가'}`;
  return `${role}기준가 그대로`;
}

function calculateLocalPriceRule(basePrice, tag) {
  const base = Number(basePrice);
  if (!Number.isFinite(base) || !tag) return null;
  if (tag.tag_role === 'discount') return base;
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
    tagRole:tag.tag_role || 'price',
    discountSource:tag.discount_source_channel || null,
    discountRuleCode:tag.discount_rule_code || null,
    replacePrice:tag.replace_price,
    modifyType:tag.modify_type || 'none',
    modifyValue:Number(tag.modify_value || 0),
    minPrice:tag.min_price,
    maxPrice:tag.max_price,
    roundingUnit:Number(tag.rounding_unit || 1),
    roundingMode:tag.rounding_mode || 'nearest',
    note:'상품 상세에서 만든 가격 조합 단계'
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
      <div class="price-tag-composer-step-summary"><i>${index + 1}</i><span><b>${escapeHtml(tag.tag_name)}</b><em>${escapeHtml(priceRuleTagSummary(tag))} · ${formatNullableNumber(before)}원 → ${formatNullableNumber(current)}원</em></span><div><button type="button" data-composer-edit aria-label="계산 태그 수정">✎</button><button type="button" data-composer-move="up" aria-label="위로">↑</button><button type="button" data-composer-move="down" aria-label="아래로">↓</button><button type="button" data-composer-remove aria-label="삭제">×</button></div></div>
      ${editing ? `<div class="price-tag-composer-step-editor">
        <label><span>계산 태그 이름</span><input data-composer-tag-name maxlength="40" value="${escapeHtml(tag.tag_name)}"></label>
        <label><span>계산 방식</span><select data-composer-tag-mode>
          <option value="none" ${simple.mode === 'none' ? 'selected' : ''}>기준가 그대로</option><option value="percent_discount" ${simple.mode === 'percent_discount' ? 'selected' : ''}>퍼센트 할인</option><option value="percent_markup" ${simple.mode === 'percent_markup' ? 'selected' : ''}>퍼센트 인상</option><option value="amount_discount" ${simple.mode === 'amount_discount' ? 'selected' : ''}>금액 할인</option><option value="amount_add" ${simple.mode === 'amount_add' ? 'selected' : ''}>금액 추가</option><option value="fixed" ${simple.mode === 'fixed' ? 'selected' : ''}>최종가 고정</option>
        </select></label>
        <label><span>값</span><input data-composer-tag-value type="number" min="0" step="1" value="${simple.value}"></label>
        <details><summary>최저·최고·끝자리</summary><div><label><span>최저가</span><input data-composer-tag-min type="number" min="0" value="${escapeHtml(tag.min_price ?? '')}"></label><label><span>최고가</span><input data-composer-tag-max type="number" min="0" value="${escapeHtml(tag.max_price ?? '')}"></label><label><span>끝자리 단위</span><input data-composer-tag-round-unit type="number" min="1" value="${escapeHtml(tag.rounding_unit ?? 1)}"></label><label><span>처리</span><select data-composer-tag-round-mode><option value="nearest" ${tag.rounding_mode === 'nearest' ? 'selected' : ''}>반올림</option><option value="up" ${tag.rounding_mode === 'up' ? 'selected' : ''}>올림</option><option value="down" ${tag.rounding_mode === 'down' ? 'selected' : ''}>내림</option></select></label></div></details>
        <p>수정본은 새 계산 태그로 저장되어 기존 가격 조합에는 영향을 주지 않습니다.</p>
      </div>` : ''}
    </article>`;
  }).join('');
  const canSave = composer.name.trim() && composer.tagIds.length;
  return `<details class="price-tag-composer" ${composer.open ? 'open' : ''}>
    <summary>+ 새 가격 조합을 여기서 바로 만들기</summary>
    <div class="price-tag-composer-body">
      <label><span>가격 조합 이름</span><input data-price-composer-name maxlength="50" value="${escapeHtml(composer.name)}" placeholder="예: 10% 할인 + 배송비"></label>
      <label><span>계산 단계 추가</span><select data-price-composer-add><option value="">계산 태그 선택…</option>${(ruleTags || []).filter(tag => !composer.tagIds.includes(Number(tag.price_rule_tag_id))).map(tag => `<option value="${tag.price_rule_tag_id}">${escapeHtml(tag.tag_name)} · ${escapeHtml(priceRuleTagSummary(tag))}</option>`).join('')}</select></label>
      <div class="price-tag-composer-steps">${selectedRows || '<p>계산 단계를 하나 이상 추가해주세요.</p>'}</div>
      <div class="price-tag-composer-result"><span>시스템 기준가격 ${formatNullableNumber(basePrice)}원</span><b>${composer.tagIds.length ? `미리보기 ${formatNullableNumber(current)}원` : '단계 미선택'}</b></div>
      <button type="button" class="btn primary price-tag-composer-save" ${canSave ? '' : 'disabled'}>조합 저장 · 현재 상품에 배정</button>
    </div>
  </details>`;
}

function renderDrawerPricePolicy(source, label, originalBasePrice, draftBasePrice, sellpiaPrice, ruleSets = null, assignment = null, preview = null, selectedRuleSetId = null, ruleTags = []) {
  const current = Number(originalBasePrice);
  const base = Number(sellpiaPrice);
  const draft = Number(draftBasePrice);
  const hasCurrent = originalBasePrice !== '' && originalBasePrice !== null && originalBasePrice !== undefined && Number.isFinite(current);
  const hasBase = sellpiaPrice !== '' && sellpiaPrice !== null && sellpiaPrice !== undefined && Number.isFinite(base);
  const hasDraft = draftBasePrice !== '' && draftBasePrice !== null && draftBasePrice !== undefined && Number.isFinite(draft);
  const difference = hasCurrent && hasBase ? current - base : null;
  const differenceText = difference === null ? '-' : `${difference > 0 ? '+' : ''}${formatNullableNumber(difference)}원`;
  const currentFormula = `${label} 원본가 ${hasCurrent ? formatNullableNumber(current) : '-'}원 · 시스템 기준가격 ${hasBase ? formatNullableNumber(base) : '-'}원 · 차이 ${differenceText}`;
  if (!ruleSets) return `<div class="drawer-price-policy loading"><div class="drawer-price-policy-head"><b>판매처 가격 태그</b><span>불러오는 중</span></div><div class="price-formula"><span>현재 가격 비교</span><code>${escapeHtml(currentFormula)}</code></div></div>`;
  const savedRuleSetId = assignment?.price_rule_set_id ? String(assignment.price_rule_set_id) : '';
  const selectedId = selectedRuleSetId === null ? savedRuleSetId : String(selectedRuleSetId || '');
  const selectedSet = ruleSets.find(ruleSet => String(ruleSet.price_rule_set_id) === selectedId) || null;
  const dirty = selectedId !== savedRuleSetId;
  const calculatedPrice = selectedSet && preview?.final_price !== null && preview?.final_price !== undefined ? preview.final_price : null;
  const discountedPrice = selectedSet && preview?.discounted_base_price !== null && preview?.discounted_base_price !== undefined ? preview.discounted_base_price : null;
  const applyLabel = calculatedPrice === null
    ? '계산 판매가 없음'
    : discountedPrice !== null && Number(discountedPrice) !== Number(calculatedPrice)
      ? `판매가 ${formatNullableNumber(calculatedPrice)}원 + 할인 태그 적용`
      : `${formatNullableNumber(calculatedPrice)}원을 판매가 수정안으로 적용`;
  return `<div class="drawer-price-policy${selectedSet ? ' active-policy' : ''}" data-policy-source="${source}" data-calculated-base-price="${escapeHtml(calculatedPrice ?? '')}" data-saved-rule-set-id="${escapeHtml(savedRuleSetId)}">
    <div class="drawer-price-policy-head"><b>판매처 가격 태그</b><span>${savedRuleSetId ? '상품에 배정됨' : '태그 미배정'}</span></div>
    <div class="drawer-price-layer-summary"><span>판매처 원본 판매가<b>${hasCurrent ? formatNullableNumber(current) : '-'}원</b></span><span>시스템 기준가격<b>${hasBase ? formatNullableNumber(base) : '-'}원</b></span><span class="policy">태그 계산 판매가<b>${calculatedPrice === null ? '-' : `${formatNullableNumber(calculatedPrice)}원`}</b></span><span class="draft">할인 적용가<b>${discountedPrice === null ? '-' : `${formatNullableNumber(discountedPrice)}원`}</b></span></div>
    <label class="price-tag-selector"><span>이 상품에 적용할 가격 조합</span><select data-price-rule-set><option value="">조합 사용 안 함</option>${ruleSets.map(ruleSet => `<option value="${ruleSet.price_rule_set_id}" ${String(ruleSet.price_rule_set_id) === selectedId ? 'selected' : ''}>${escapeHtml(ruleSet.set_name)}</option>`).join('')}</select></label>
    <div data-price-tag-preview>${renderPriceRuleSetSteps(selectedSet, preview)}</div>
    ${renderPriceTagComposer(source, sellpiaPrice, ruleTags)}
    <div class="price-formula"><span>현재 가격 비교</span><code>${escapeHtml(currentFormula)}</code></div>
    <p class="price-policy-summary">${selectedSet ? `시스템 기준가격 ${formatNullableNumber(base)}원에서 판매가 태그와 ${label} 할인 태그를 각각 계산합니다.` : hasBase ? '가격 조합을 배정하지 않으면 판매처 내보내기 값이 자동 생성되지 않습니다.' : '시스템 기준가격을 먼저 저장해야 가격 조합을 배정할 수 있습니다.'}</p>
    <div class="price-policy-actions"><button class="btn price-tag-assignment-save" ${dirty ? '' : 'disabled'}>${selectedId ? '태그 배정 저장' : '태그 배정 해제'}</button><button class="btn primary price-tag-apply" ${selectedSet && !dirty && calculatedPrice !== null ? '' : 'disabled'}>${dirty ? '태그 배정을 먼저 저장' : applyLabel}</button></div>
    <footer>판매가와 할인은 역산하지 않고 독립 계산합니다. 계산 결과를 검토한 뒤 ‘수정안으로 적용’을 눌러야 내보내기 준비 목록에 포함됩니다.</footer>
  </div>`;
}

function renderCurrentPricePolicy(source, product, selectedRuleSetId = null) {
  const host = document.querySelector(`[data-price-policy-host="${source}"]`);
  if (!host || !product) return;
  const selectedId = selectedRuleSetId === null
    ? (drawerState.priceRuleSelections[source] ?? drawerState.priceRuleAssignments[source]?.price_rule_set_id ?? '')
    : selectedRuleSetId;
  const component = product?.__sellerPriceComponents?.[source] || {};
  const originalBase = component.source_base_price ?? product?.[`${source}_base_price`] ?? product?.[`${source}_price`];
  const draftBase = component.draft_base_price ?? product?.__sellerDrafts?.[`${source}:sellpia_sale_price`]?.price_base_after;
  host.innerHTML = renderDrawerPricePolicy(
    source,
    CHANNEL_LABELS[source],
    originalBase,
    draftBase,
    product.system_base_price,
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
    const previews = await Promise.all(assignments.map((assignment, index) => {
      if (!assignment) return Promise.resolve(null);
      const source = ['smartstore','makeshop','ably'][index];
      const component = product?.__sellerPriceComponents?.[source] || {};
      return liveData.previewPriceRuleSet({
        basePrice:product.system_base_price,
        ruleSetId:assignment.price_rule_set_id,
        source,
        sourceDiscountTerms:component.draft_discount_terms ?? component.source_discount_terms ?? product?.[`${source}_discount_terms`] ?? []
      });
    }));
    if (requestId !== drawerState.priceRequestId || productDrawer.dataset.sku !== sku) return;
    drawerState.priceRuleTags = ruleTags;
    drawerState.priceRuleSets = ruleSets;
    drawerState.priceRuleAssignments = Object.fromEntries(['smartstore','makeshop','ably'].map((source, index) => [source, assignments[index]]));
    drawerState.priceRulePreviews = Object.fromEntries(['smartstore','makeshop','ably'].map((source, index) => [source, previews[index]]));
    drawerState.priceRuleSelections = Object.fromEntries(['smartstore','makeshop','ably'].map((source, index) => [source, assignments[index]?.price_rule_set_id || '']));
    ['smartstore','makeshop','ably'].forEach((source, index) => {
      const host = document.querySelector(`[data-price-policy-host="${source}"]`);
      const component = product?.__sellerPriceComponents?.[source] || {};
      const originalBase = component.source_base_price ?? product?.[`${source}_base_price`] ?? product?.[`${source}_price`];
      const draftBase = component.draft_base_price ?? product?.__sellerDrafts?.[`${source}:sellpia_sale_price`]?.price_base_after;
      if (host) host.innerHTML = renderDrawerPricePolicy(source, CHANNEL_LABELS[source], originalBase, draftBase, product.system_base_price, ruleSets, assignments[index], previews[index], assignments[index]?.price_rule_set_id || '', ruleTags);
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
  const stockDraft = product?.__sellerDrafts?.[`${source}:sellpia_current_stock`];
  const priceDraft = product?.__sellerDrafts?.[`${source}:sellpia_sale_price`];
  const sourceBasePrice = component.source_base_price ?? product?.[`${source}_base_price`] ?? product?.[`${source}_price`];
  const sourceDiscountTerms = component.source_discount_terms ?? product?.[`${source}_discount_terms`] ?? [];
  const savedDiscountTerms = priceDraft?.price_discount_terms_after ?? sourceDiscountTerms;
  drawerState.discountTerms[source] = structuredClone(Array.isArray(savedDiscountTerms) ? savedDiscountTerms : []);
  const sourceDiscountedBasePrice = component.source_discounted_base_price ?? product?.[`${source}_discounted_base_price`] ?? calculateNativeDiscountedBase(sourceBasePrice, sourceDiscountTerms);
  const sourceOptionPrice = component.source_option_price ?? product?.[`${source}_option_price`] ?? 0;
  const sourceFinalPrice = component.source_final_price ?? product?.[`${source}_final_price`] ?? product?.[`${source}_price`];
  const draftState = state.key === 'unmatched' ? state : drawerDraftState([stockDraft, priceDraft]);
  const stockValue = stockDraft?.after_value ?? stock ?? '';
  const basePriceValue = component.draft_base_price ?? priceDraft?.price_base_after ?? sourceBasePrice ?? '';
  const discountedBasePriceValue = component.draft_discounted_base_price ?? priceDraft?.price_discounted_base_after ?? sourceDiscountedBasePrice ?? '';
  const optionPriceValue = component.draft_option_price ?? priceDraft?.price_option_after ?? sourceOptionPrice ?? 0;
  const finalPriceValue = component.draft_final_price ?? priceDraft?.price_final_after ?? priceDraft?.after_value ?? sourceFinalPrice ?? '';
  const stockDisabled = state.key === 'unmatched' || stock === null || stock === undefined;
  const priceDisabled = state.key === 'unmatched' || sourceFinalPrice === null || sourceFinalPrice === undefined;
  return `<section class="drawer-section drawer-inventory-channel" data-source="${source}" data-saved-discount-terms="${escapeHtml(JSON.stringify(savedDiscountTerms))}">
    <div class="drawer-section-title"><h4><i class="dot ${{smartstore:'smart',makeshop:'make',ably:'ably'}[source]}"></i>${label}</h4><span class="matrix-status ${draftState.key}">${draftState.label}</span></div>
    <div class="drawer-inventory-meta"><span>상품 ${escapeHtml(product?.[`${source}_product_code`] || '-')}</span><span>옵션 ${escapeHtml(product?.[`${source}_option_code`] || '-')}</span></div>
    <div class="form-grid drawer-stock-grid">
      <label>판매처 재고<input type="number" min="0" step="1" data-drawer-value="sellpia_current_stock" data-saved-value="${escapeHtml(stockValue)}" data-original-value="${escapeHtml(stock ?? '')}" value="${escapeHtml(stockValue)}" ${stockDisabled ? 'disabled' : ''}></label>
    </div>
    <div class="drawer-price-component-grid">
      <label>판매가 <small>직접 수정</small><input type="number" min="0" step="1" data-drawer-price-component="base" data-saved-value="${escapeHtml(basePriceValue)}" data-original-value="${escapeHtml(sourceBasePrice ?? '')}" value="${escapeHtml(basePriceValue)}" ${priceDisabled ? 'disabled' : ''}></label>
      <label>할인 적용 판매가 <small>${escapeHtml(nativeDiscountSummary(sourceDiscountTerms))}</small><output data-drawer-discounted-base>${formatNullableNumber(discountedBasePriceValue)}</output></label>
      <label>옵션가 <small>${source === 'ably' ? '미사용' : '직접 수정'}</small><input type="number" step="1" data-drawer-price-component="option" data-saved-value="${escapeHtml(optionPriceValue)}" data-original-value="${escapeHtml(sourceOptionPrice ?? 0)}" value="${escapeHtml(optionPriceValue)}" ${priceDisabled || source === 'ably' ? 'disabled' : ''}></label>
      <label>최종구매가 <small>직접 입력 시 옵션가 자동 계산</small><input type="number" min="0" step="1" data-drawer-price-component="final" data-saved-value="${escapeHtml(finalPriceValue)}" data-original-value="${escapeHtml(sourceFinalPrice ?? '')}" value="${escapeHtml(finalPriceValue)}" ${priceDisabled ? 'disabled' : ''}></label>
    </div>
    ${renderNativeDiscountEditor(source, drawerState.discountTerms[source], priceDisabled)}
    <p class="drawer-price-equation">판매가 ${formatNullableNumber(basePriceValue)} → 원본 할인 적용 ${formatNullableNumber(discountedBasePriceValue)} + 옵션가 ${formatNullableNumber(optionPriceValue)} = 최종구매가 ${formatNullableNumber(finalPriceValue)}</p>
    <div class="drawer-value-comparison"><span>시스템 기준재고 <b>${formatNullableNumber(product?.system_stock)}</b> <em>원본 ${formatNullableNumber(product?.sellpia_source_stock ?? product?.sellpia_current_stock)}</em></span><span>시스템 기준가격 <b>${formatNullableNumber(product?.system_base_price)}</b> <em>원본 ${formatNullableNumber(product?.sellpia_source_sale_price ?? product?.sellpia_sale_price)}</em></span></div>
    <div data-price-policy-host="${source}">${renderDrawerPricePolicy(source, label, sourceBasePrice, basePriceValue, product?.system_base_price)}</div>
    <div class="drawer-section-actions"><span>${stockDraft || priceDraft ? '파란 값은 내보내기 준비에 저장됨' : '수정하면 내보내기 준비에 즉시 저장됨'}</span><button class="btn primary drawer-value-save" ${state.key === 'unmatched' || (stockDisabled && priceDisabled) ? 'disabled' : ''}>내보내기 값 저장</button></div>
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
    sellpia_purchase_price:'매입가', sellpia_order_unit:'발주단위', sellpia_minimum_order_unit:'최소발주단위',
    seller_product_name:'판매처 상품명', seller_option_name:'판매처 옵션명'
  }[fieldKey] || fieldKey || '변경사항';
}

function drawerStatusLabel(status) {
  return {pending:'반영 대기',validated:'검증 완료',processing:'기존 파일 처리 이력',exported:'기존 파일 내보내기 이력',applied:'반영 완료',failed:'실패',saved:'DB 초안',cancelled:'취소'}[status] || status || '기록';
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
  list.innerHTML = '<div class="drawer-empty-state loading"><b>변경이력을 불러오는 중입니다.</b><span>내보내기 준비와 연결 감사로그를 조회합니다.</span></div>';
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
    inventory:'판매처 재고·가격은 내보내기 준비에 저장한 뒤 파일로 내보냅니다.',
    attributes:'상품 공통 속성과 SKU 예외 태그를 Supabase에 즉시 저장합니다.',
    history:'SKU 단위 연결·수정·검증·내보내기 이력을 표시합니다.'
  }[tabName] || '';
  if (tabName === 'history' && loadHistory) loadDrawerHistory();
  if (tabName === 'connections') loadDrawerListingLinks();
}

function discountTermTemplates(source) {
  if (source === 'smartstore') return [
    {term_key:'basic',term_type:'basic',title:'즉시할인 기본할인',unit:'percent',is_baseline:true,rounding_mode:'nearest',rounding_unit:1},
    {term_key:'mobile',term_type:'mobile',title:'모바일 즉시할인',unit:'percent',is_baseline:false,rounding_mode:'nearest',rounding_unit:1},
    {term_key:'reservation',term_type:'reservation',title:'예약 할인',unit:'percent',is_baseline:false,rounding_mode:'nearest',rounding_unit:1},
    {term_key:'multi_buy',term_type:'multi_buy',title:'복수구매 할인',unit:'percent',is_baseline:false,rounding_mode:'nearest',rounding_unit:1}
  ];
  if (source === 'makeshop') return [
    {term_key:'period',term_type:'period',title:'기간 할인',unit:'percent',is_baseline:true,rounding_mode:'none',rounding_unit:1},
    {term_key:'membership',term_type:'membership',title:'회원등급 할인',unit:'percent',is_baseline:false,rounding_mode:'none',rounding_unit:1}
  ];
  return [{term_key:'reported_result',term_type:'reported_result',title:'원본 할인 차액',unit:'amount',is_baseline:true,rounding_mode:'none',rounding_unit:1}];
}

function editableDiscountTerms(source, terms) {
  const byKey = new Map((Array.isArray(terms) ? terms : []).map(term => [term.term_key, term]));
  const templates = discountTermTemplates(source).map(template => ({...template,...(byKey.get(template.term_key) || {}), enabled:byKey.has(template.term_key)}));
  for (const term of Array.isArray(terms) ? terms : []) if (!templates.some(item => item.term_key === term.term_key)) templates.push({...term,enabled:true});
  return templates;
}

function renderNativeDiscountEditor(source, terms, disabled) {
  const rows = editableDiscountTerms(source, terms);
  drawerState.discountTerms[source] = rows;
  if (source === 'smartstore' || source === 'makeshop') {
    const editableKey = discountEditorPrimaryKey(source);
    const primary = rows.find(term => term.term_key === editableKey && term.enabled);
    const conditional = rows.filter(term => term.term_key !== editableKey && term.enabled);
    return `<details class="drawer-native-discounts"><summary>판매처 할인정보 <span>${escapeHtml(nativeDiscountSummary(terms))}</span></summary><p>${source === 'smartstore' ? '기본할인은 매트릭스 할인정보 열에서 원 단위로 수정합니다.' : '기간할인은 매트릭스 할인정보 열에서 M10·M15·M20 코드로 수정합니다.'} 조건부 할인은 그대로 보존됩니다.</p><div class="drawer-discount-readonly"><b>${escapeHtml(primary ? `${primary.title || primary.term_key} ${formatNullableNumber(primary.value)}${primary.unit === 'percent' ? '%' : '원'}` : '기본 할인 없음')}</b><span>${escapeHtml(conditional.length ? `보존: ${conditional.map(term => term.title || term.term_key).join(' · ')}` : '보존할 조건부 할인 없음')}</span></div></details>`;
  }
  return `<details class="drawer-native-discounts" open><summary>판매처 원본 할인필드 <span>${escapeHtml(nativeDiscountSummary(terms))}</span></summary><p>체크된 할인만 원본에 반영됩니다. 조건부 할인은 보존하지만 최종구매가 계산에는 포함하지 않습니다.</p><div class="drawer-discount-rows">${rows.map((term,index) => `<label class="drawer-discount-row"><input type="checkbox" data-discount-enabled data-discount-index="${index}" ${term.enabled ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${escapeHtml(term.title || term.term_key)}</span><input type="number" min="0" step="1" data-discount-value data-discount-index="${index}" value="${escapeHtml(term.value ?? '')}" placeholder="0" ${disabled ? 'disabled' : ''}><select data-discount-unit data-discount-index="${index}" ${disabled ? 'disabled' : ''}><option value="percent"${term.unit === 'percent' ? ' selected' : ''}>%</option><option value="amount"${term.unit === 'amount' ? ' selected' : ''}>원</option></select><em>${term.is_baseline ? '최종가 계산' : '조건부/표시용'}</em></label>`).join('')}</div></details>`;
}

function readDrawerDiscountTerms(section) {
  const source = section.dataset.source;
  const terms = drawerState.discountTerms[source] || [];
  if (!section.querySelector('[data-discount-enabled]')) return terms.filter(term => term.enabled).map(term => ({...term,enabled:undefined}));
  return terms.flatMap((term,index) => {
    const enabled = section.querySelector(`[data-discount-enabled][data-discount-index="${index}"]`)?.checked;
    const value = Number(section.querySelector(`[data-discount-value][data-discount-index="${index}"]`)?.value || 0);
    const unit = section.querySelector(`[data-discount-unit][data-discount-index="${index}"]`)?.value || term.unit;
    return enabled && value > 0 ? [{...term,enabled:undefined,value,unit}] : [];
  });
}

function drawerRelationLabel(row) {
  return multiLinkRelationLabel(row?.relation_type, row?.component_count, row?.max_listing_count);
}

function renderDrawerListingLinks(rows, sku) {
  const host = document.getElementById('drawer-link-manager');
  if (!host) return;
  if (!rows.length) {
    host.innerHTML = `<div class="drawer-empty-state"><b>저장된 구성 연결이 없습니다.</b><span>현재 SKU의 판매처 연결을 먼저 확인하거나 전체 관리 화면에서 새 구성을 추가하세요.</span></div>`;
    return;
  }
  host.innerHTML = rows.map((row, rowIndex) => {
    const components = Array.isArray(row.components) ? row.components : [];
    const componentCards = components.map(component => `<article class="drawer-link-component" data-component-id="${component.componentId || ''}" data-component-sku="${escapeHtml(component.sku)}">
      <div><b>${escapeHtml(component.sku)}</b><span>${escapeHtml([component.productName, component.optionName].filter(Boolean).join(' · ') || '셀피아 상품정보 없음')}</span></div>
      <label>수량<input data-drawer-component-qty type="number" min="1" step="1" value="${Math.max(1, Number(component.qty) || 1)}"></label>
      <label>역할<select data-drawer-component-role><option value="primary"${component.role === 'primary' ? ' selected' : ''}>기준</option><option value="additional"${component.role === 'additional' ? ' selected' : ''}>추가</option></select></label>
      <button type="button" data-drawer-component-save>저장</button><button type="button" class="danger" data-drawer-component-remove>연결만 해제</button>
    </article>`).join('');
    return `<article class="drawer-link-listing" data-drawer-link-row="${rowIndex}">
      <header><div><span class="multi-link-channel ${escapeHtml(row.source_channel)}"><i></i>${escapeHtml(CHANNEL_LABELS[row.source_channel] || row.source_channel)}</span><b>${escapeHtml(row.product_code || '-')} / ${escapeHtml(row.option_code || '-')}</b></div><span class="relation-pill ${escapeHtml(row.relation_type)}">${escapeHtml(drawerRelationLabel(row))}</span></header>
      <p>${escapeHtml(row.product_name || '상품명 없음')} · ${escapeHtml(row.option_name || '옵션명 없음')}</p>
      <div class="drawer-link-stock"><span>판매처 원본 <b>${formatNullableNumber(row.seller_stock)}</b></span><span>구성 계산 <b>${formatNullableNumber(row.calculated_stock)}</b></span><button type="button" data-drawer-stage-stock ${!row.is_explicit || row.calculated_stock === null || row.seller_stock === null ? 'disabled' : ''}>계산재고 수정안 등록</button></div>
      <div class="drawer-link-components">${componentCards}</div>
      <form class="drawer-link-add"><input name="sku" placeholder="추가할 셀피아 SKU" required><input name="qty" type="number" min="1" step="1" value="1" aria-label="구성수량"><select name="role"><option value="additional">추가 구성</option><option value="primary">기준 구성</option></select><button type="submit">구성 추가</button></form>
    </article>`;
  }).join('');
}

async function loadDrawerListingLinks({force = false} = {}) {
  const sku = productDrawer.dataset.sku;
  const host = document.getElementById('drawer-link-manager');
  if (!sku || !host || !liveData?.loadListingGraph) return;
  if (!force && drawerState.linkRowsSku === sku && drawerState.linkRows.length) {
    renderDrawerListingLinks(drawerState.linkRows, sku);
    return;
  }
  const requestId = ++drawerState.linkRequestId;
  host.innerHTML = '<div class="drawer-empty-state loading"><b>연결 구성을 불러오는 중입니다.</b><span>현재 SKU가 포함된 판매처 옵션을 조회합니다.</span></div>';
  try {
    const result = await liveData.loadListingGraph({source:'all', relationType:'all', search:sku, page:1, pageSize:100});
    if (requestId !== drawerState.linkRequestId || productDrawer.dataset.sku !== sku) return;
    drawerState.linkRowsSku = sku;
    drawerState.linkRows = result.rows || [];
    renderDrawerListingLinks(drawerState.linkRows, sku);
  } catch (error) {
    if (requestId === drawerState.linkRequestId) host.innerHTML = `<div class="drawer-empty-state error"><b>연결 구성을 불러오지 못했습니다.</b><span>${escapeHtml(error?.message || error)}</span></div>`;
  }
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
  document.getElementById('drawer-stock').textContent = formatNullableNumber(liveProduct.system_stock);
  document.getElementById('drawer-price').textContent = formatNullableNumber(liveProduct.system_base_price);
  document.getElementById('drawer-channel-count').textContent = `${connectedCount}곳`;
  drawerState.historySku = '';
  drawerState.linkRowsSku = '';
  drawerState.linkRows = [];
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
    source_discounted_base_price:result?.source_discounted_base_price ?? existing.source_discounted_base_price ?? product[`${source}_discounted_base_price`],
    source_option_price:result?.source_option_price ?? existing.source_option_price ?? product[`${source}_option_price`] ?? 0,
    source_final_price:result?.source_final_price ?? existing.source_final_price ?? product[`${source}_final_price`] ?? product[`${source}_price`],
    draft_base_price:result?.draft_status === 'unchanged' ? null : result?.draft_base_price,
    draft_discounted_base_price:result?.draft_status === 'unchanged' ? null : result?.draft_discounted_base_price,
    draft_option_price:result?.draft_status === 'unchanged' ? null : result?.draft_option_price,
    draft_final_price:result?.draft_status === 'unchanged' ? null : result?.draft_final_price,
    option_price_source:result?.saved_option_price_source || existing.option_price_source || 'original',
    base_price_source:result?.saved_base_price_source || existing.base_price_source || 'source',
    price_rule_set_id:result?.saved_price_rule_set_id || existing.price_rule_set_id || null,
    pricing_input_mode:result?.saved_input_mode || existing.pricing_input_mode || 'option',
    draft_discount_terms:result?.draft_status === 'unchanged' ? null : (result?.draft_discount_terms || existing.draft_discount_terms || null),
    price_calculation_version:2
  };
  product.__sellerPriceComponents[source] = component;
  const draft = applyLocalSellerDraft(product, source, 'sellpia_sale_price', result?.draft_final_price, result);
  if (draft) {
    Object.assign(draft, {
      price_base_before:component.source_base_price,
      price_base_after:component.draft_base_price,
      price_discounted_base_before:component.source_discounted_base_price,
      price_discounted_base_after:component.draft_discounted_base_price,
      price_option_before:component.source_option_price,
      price_option_after:component.draft_option_price,
      price_final_before:component.source_final_price,
      price_final_after:component.draft_final_price,
      price_discount_terms_before:component.source_discount_terms || [],
      price_discount_terms_after:component.draft_discount_terms || component.source_discount_terms || [],
      option_price_source:component.option_price_source,
      base_price_source:component.base_price_source,
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
  if (actionCopy) actionCopy.textContent = stockDraft || priceDraft ? '파란 값은 내보내기 준비에 저장됨' : '수정하면 내보내기 준비에 즉시 저장됨';
  const draftPrice = section.querySelector('[data-policy-source] .drawer-price-layer-summary .draft b');
  if (draftPrice) draftPrice.textContent = priceDraft ? `${formatNullableNumber(priceDraft.after_value)}원` : '-';
}

function refreshChangeQueueInBackground() {
  window.setTimeout(() => { void loadChangeQueue({silent:true}); }, 250);
}

const listingLinkModal = document.getElementById('listing-link-modal');
const listingLinkComponents = document.getElementById('listing-link-components');
const listingLinkAddForm = document.getElementById('listing-link-add-form');
const listingLinkState = {source:'', sku:'', productCode:'', optionCode:'', anchor:null, row:null, matrixProduct:null, requestId:0};

function listingLinkIdentity(row) {
  return `${row?.source_channel || ''}|${row?.product_code || ''}|${row?.option_code || ''}`;
}

function closeListingLinkManager() {
  listingLinkState.requestId += 1;
  listingLinkModal.hidden = true;
  listingLinkAddForm.hidden = true;
}

function renderListingLinkManager(row, {error = ''} = {}) {
  listingLinkState.row = row || null;
  const sourceLabel = CHANNEL_LABELS[listingLinkState.source] || listingLinkState.source;
  const productCode = listingLinkState.productCode;
  const optionCode = listingLinkState.optionCode;
  const sellerName = [listingLinkState.matrixProduct?.[`${listingLinkState.source}_name`], listingLinkState.matrixProduct?.[`${listingLinkState.source}_option_name`]].filter(Boolean).join(' · ');
  document.getElementById('listing-link-kicker').textContent = `${sourceLabel} 조합 연결`;
  document.getElementById('listing-link-title').textContent = productCode ? '조합 연결 관리' : '판매처 상품 연결';
  document.getElementById('listing-link-seller-key').textContent = productCode ? `${productCode}${optionCode ? ` / ${optionCode}` : ' / 옵션코드 없음'}` : '판매처 상품 미연결';
  document.getElementById('listing-link-seller-name').textContent = sellerName || (productCode ? '이 판매처 옵션에 연결된 SKU 전체를 관리합니다.' : '먼저 판매처 상품을 찾아 현재 SKU에 연결합니다.');
  document.getElementById('listing-link-anchor-sku').textContent = listingLinkState.sku || '-';

  const addToggle = document.getElementById('listing-link-add-toggle');
  const summary = document.getElementById('listing-link-summary');
  if (error) {
    summary.textContent = '연결 정보를 불러오지 못했습니다.';
    listingLinkComponents.innerHTML = `<div class="listing-link-empty error">${escapeHtml(error)}</div>`;
    addToggle.hidden = true;
    return;
  }

  const components = Array.isArray(row?.components) ? row.components : [];
  if (!productCode) {
    summary.innerHTML = `현재 <b>0개</b> 판매처 상품이 연결되어 있습니다.`;
    listingLinkComponents.innerHTML = '<div class="listing-link-empty">현재 SKU에 이 판매처 상품 연결이 없습니다.</div>';
    addToggle.hidden = false;
    addToggle.classList.add('unmatched');
    addToggle.textContent = '+ 판매처 상품 찾아 연결';
    document.getElementById('listing-link-foot-note').textContent = '판매처 상품을 고른 뒤 현재 SKU에 연결합니다.';
    return;
  }

  summary.innerHTML = `현재 판매처 옵션에 <b>${formatNumber(components.length)}개</b> 셀피아 SKU가 연결되어 있습니다. · ${escapeHtml(row?.is_explicit ? '저장된 조합' : '기존 매칭에서 확인된 연결')}`;
  listingLinkComponents.innerHTML = components.map(component => {
    const explicit = Boolean(component.componentId);
    const roleLabel = component.role === 'primary' ? '기준 구성' : '추가 구성';
    return `<article class="listing-link-component" data-link-manager-component-id="${component.componentId || ''}" data-link-manager-sku="${escapeHtml(component.sku)}">
      <div class="listing-link-component-main"><div><h4><b>${escapeHtml(component.sku)}</b><span>${escapeHtml([component.productName, component.optionName].filter(Boolean).join(' · ') || '셀피아 상품정보 없음')}</span></h4><em class="listing-link-provenance${explicit ? ' explicit' : ''}">${explicit ? '저장된 구성' : '기존 매칭'}</em></div>
      <div class="listing-link-meta"><span>구성수량<b>${formatNumber(component.qty || 1)}</b></span><span>역할<b>${escapeHtml(roleLabel)}</b></span><span>가용재고<b>${formatNullableNumber(component.availableStock)}</b></span></div></div>
      <div class="listing-link-component-actions"><button type="button" data-link-manager-remove>연결 끊기</button></div>
    </article>`;
  }).join('') || '<div class="listing-link-empty">연결된 셀피아 SKU가 없습니다.</div>';
  addToggle.hidden = false;
  addToggle.classList.remove('unmatched');
  addToggle.textContent = '+ SKU 추가 연결';
  document.getElementById('listing-link-foot-note').textContent = '연결 끊기 이력은 DB에 보존됩니다.';
}

async function loadListingLinkManager({allowMatrixFallback = false} = {}) {
  const requestId = ++listingLinkState.requestId;
  listingLinkComponents.innerHTML = '<div class="listing-link-empty loading">연결된 셀피아 SKU를 확인하고 있습니다.</div>';
  document.getElementById('listing-link-summary').textContent = '현재 연결을 불러오는 중입니다.';
  document.getElementById('listing-link-add-toggle').hidden = true;
  listingLinkAddForm.hidden = true;
  if (!listingLinkState.productCode) {
    renderListingLinkManager(null);
    return;
  }
  try {
    const row = await liveData.loadListingConnection({source:listingLinkState.source, productCode:listingLinkState.productCode, optionCode:listingLinkState.optionCode});
    if (requestId !== listingLinkState.requestId) return;
    let resolvedRow = row || null;
    if (!resolvedRow && allowMatrixFallback) {
      const product = listingLinkState.matrixProduct || {};
      resolvedRow = {
        source_channel:listingLinkState.source,
        product_code:listingLinkState.productCode,
        option_code:listingLinkState.optionCode,
        is_explicit:false,
        components:[{
          componentId:null,
          sku:listingLinkState.sku,
          qty:1,
          role:'primary',
          productName:product.sellpia_product_name || product.sellpia_name || '',
          optionName:product.sellpia_option_name || '',
          availableStock:product.system_stock ?? product.sellpia_current_stock ?? null
        }]
      };
    }
    if (!resolvedRow) {
      resolvedRow = {
        source_channel:listingLinkState.source,
        product_code:listingLinkState.productCode,
        option_code:listingLinkState.optionCode,
        is_explicit:true,
        components:[]
      };
    }
    renderListingLinkManager(resolvedRow);
  } catch (error) {
    if (requestId !== listingLinkState.requestId) return;
    console.error('listing link manager load failed', error);
    renderListingLinkManager(null, {error:error?.message || String(error)});
  }
}

function openListingLinkManager({source, sku, anchor}) {
  const product = matrixRowsBySku.get(sku) || {};
  listingLinkState.source = source;
  listingLinkState.sku = sku;
  listingLinkState.productCode = String(product[`${source}_product_code`] || '').trim();
  listingLinkState.optionCode = String(product[`${source}_option_code`] || '').trim();
  listingLinkState.anchor = anchor;
  listingLinkState.matrixProduct = product;
  listingLinkState.row = null;
  listingLinkModal.hidden = false;
  renderListingLinkManager(null);
  void loadListingLinkManager({allowMatrixFallback:true});
}

document.getElementById('listing-link-close').addEventListener('click', closeListingLinkManager);
document.getElementById('listing-link-done').addEventListener('click', closeListingLinkManager);
document.getElementById('listing-link-add-toggle').addEventListener('click', event => {
  if (!listingLinkState.productCode) {
    event.stopPropagation();
    const anchor = listingLinkState.anchor;
    const source = listingLinkState.source;
    const sku = listingLinkState.sku;
    closeListingLinkManager();
    openMappingSearch({source, sku, anchor});
    return;
  }
  listingLinkAddForm.hidden = false;
  document.getElementById('listing-link-add-sku').value = '';
  document.getElementById('listing-link-add-qty').value = '1';
  document.getElementById('listing-link-add-role').value = 'additional';
  document.getElementById('listing-link-add-sku').focus();
});
document.getElementById('listing-link-add-cancel').addEventListener('click', () => { listingLinkAddForm.hidden = true; });
listingLinkAddForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!listingLinkState.productCode) return;
  const button = document.getElementById('listing-link-add-save');
  const sku = document.getElementById('listing-link-add-sku').value.trim();
  if (!sku) return;
  button.disabled = true;
  try {
    await liveData.saveListingComponent({
      source:listingLinkState.source,
      productCode:listingLinkState.productCode,
      optionCode:listingLinkState.optionCode,
      sku,
      qty:document.getElementById('listing-link-add-qty').value,
      role:document.getElementById('listing-link-add-role').value
    });
    await Promise.all([loadListingLinkManager(), loadLiveMatrix()]);
    showToast(`${sku} SKU를 조합에 추가했습니다.`);
  } catch (error) {
    showToast(`SKU 연결 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
});
listingLinkComponents.addEventListener('click', async event => {
  const button = event.target.closest('[data-link-manager-remove]');
  const component = event.target.closest('[data-link-manager-sku]');
  if (!button || !component || !listingLinkState.row) return;
  const sku = component.dataset.linkManagerSku;
  if (!window.confirm(`${sku} 연결을 끊을까요? 연결 이력은 보존됩니다.`)) return;
  button.disabled = true;
  try {
    await liveData.removeListingComponent({
      componentId:component.dataset.linkManagerComponentId || null,
      source:listingLinkState.source,
      productCode:listingLinkState.productCode,
      optionCode:listingLinkState.optionCode,
      sku
    });
    await Promise.all([loadListingLinkManager(), loadLiveMatrix()]);
    showToast(`${sku} 연결을 끊었습니다.`);
  } catch (error) {
    showToast(`연결 끊기 실패: ${error?.message || error}`);
    button.disabled = false;
  }
});
listingLinkModal.addEventListener('click', event => { if (event.target === listingLinkModal) closeListingLinkManager(); });

const mappingPopover = document.getElementById('mapping-popover');
const mappingSearchInput = document.getElementById('mapping-search-input');
const mappingSearchResults = document.getElementById('mapping-search-results');
const mappingState = {source:'', sku:'', anchor:null, requestId:0, timer:null, page:1, pageSize:24, count:0, mode:'search', fixedProductCode:''};

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

function openMappingSearch({source, sku, anchor, initialQuery = '', fixedProductCode = ''}) {
  const exactProductCode = String(fixedProductCode || '').trim();
  mappingState.source = source;
  mappingState.sku = sku;
  mappingState.anchor = anchor;
  mappingState.page = 1;
  mappingState.count = 0;
  mappingState.mode = exactProductCode ? 'remaining-options' : 'search';
  mappingState.fixedProductCode = exactProductCode;
  mappingPopover.classList.toggle('remaining-options-mode', Boolean(exactProductCode));
  document.getElementById('mapping-source-label').textContent = exactProductCode
    ? `${CHANNEL_LABELS[source] || source} · 상품코드 ${exactProductCode}`
    : CHANNEL_LABELS[source] || source;
  document.getElementById('mapping-target-sku').textContent = sku;
  mappingSearchInput.readOnly = Boolean(exactProductCode);
  mappingSearchInput.value = exactProductCode || (initialQuery === '-' ? '' : initialQuery);
  document.getElementById('mapping-search-help').textContent = exactProductCode
    ? `같은 상품코드 ${exactProductCode}에서 아직 다른 SKU에 연결되지 않은 옵션코드와 옵션명만 표시합니다.`
    : '코드 또는 상품명으로 검색합니다. 상품명 / 옵션명 형식은 두 조건의 교집합입니다.';
  mappingSearchResults.innerHTML = exactProductCode
    ? '<div class="mapping-empty loading"><b>남은 옵션 확인 중</b><span>이미 연결된 옵션은 제외합니다.</span></div>'
    : '<div class="mapping-empty">검색어를 입력해주세요.</div>';
  mappingPopover.hidden = false;
  positionFloatingPanel(mappingPopover, anchor);
  if (exactProductCode) {
    void runMappingSearch();
  } else {
    mappingSearchInput.focus();
    mappingSearchInput.select();
    if (mappingSearchInput.value.trim()) runMappingSearch();
  }
}

function renderMappingResults(result) {
  const items = Array.isArray(result?.rows) ? result.rows : [];
  const remainingOptionsMode = mappingState.mode === 'remaining-options';
  mappingState.count = Number(result?.count || 0);
  mappingState.page = Number(result?.page || 1);
  const pageSize = Number(result?.pageSize || mappingState.pageSize);
  const totalPages = Math.max(1, Math.ceil(mappingState.count / pageSize));
  if (!items.length) {
    mappingSearchResults.innerHTML = remainingOptionsMode
      ? '<div class="mapping-empty"><b>남은 옵션이 없습니다.</b><span>이 상품코드의 옵션이 모두 연결됐거나 원본에 옵션이 없습니다.</span></div>'
      : '<div class="mapping-empty"><b>검색 결과가 없습니다.</b><span>코드 일부 또는 상품명으로 다시 검색해주세요.</span></div>';
    return;
  }
  const rows = items.map(item => {
    const linked = Array.isArray(item.linked_skus) ? item.linked_skus : [];
    if (remainingOptionsMode) {
      return `<article class="mapping-result-item mapping-remaining-option">
        <button data-map-product="${escapeHtml(item.product_code)}" data-map-option="${escapeHtml(item.option_code || '')}" data-linked-skus="[]">
          <span class="mapping-result-codes"><b>${escapeHtml(item.option_code || '옵션코드 없음')}</b><em>옵션코드</em></span>
          <span class="mapping-result-names"><b>${escapeHtml(item.option_name || '옵션명 없음')}</b><em>옵션명</em></span>
          <span class="mapping-result-meta"><span class="mapping-free">연결 가능</span></span>
        </button>
      </article>`;
    }
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
  mappingSearchResults.innerHTML = remainingOptionsMode
    ? `${rows}<nav class="mapping-pagination mapping-remaining-count" aria-label="남은 옵션 수"><span>남은 옵션 ${formatNumber(mappingState.count)}개</span></nav>`
    : `${rows}<nav class="mapping-pagination" aria-label="검색 결과 페이지">
      <span>전체 ${formatNumber(mappingState.count)}개 · ${mappingState.page}/${totalPages}쪽</span>
      <div><button type="button" data-mapping-page="${mappingState.page - 1}" ${mappingState.page <= 1 ? 'disabled' : ''}>이전</button><button type="button" data-mapping-page="${mappingState.page + 1}" ${mappingState.page >= totalPages ? 'disabled' : ''}>다음</button></div>
    </nav>`;
}

async function runMappingSearch(page = mappingState.page) {
  const keyword = mappingState.mode === 'remaining-options' ? mappingState.fixedProductCode : mappingSearchInput.value.trim();
  if (!keyword) {
    mappingSearchResults.innerHTML = '<div class="mapping-empty">검색어를 입력해주세요.</div>';
    return;
  }
  const requestId = ++mappingState.requestId;
  mappingSearchResults.innerHTML = '<div class="mapping-empty loading"><b>원본 검색 중</b><span>최신 정규화 데이터를 확인합니다.</span></div>';
  try {
    let resolved;
    if (mappingState.mode === 'remaining-options') {
      const rows = await liveData.loadSellerProductOptions(mappingState.source, mappingState.fixedProductCode);
      const remaining = rows.filter(item => !Array.isArray(item.linked_skus) || item.linked_skus.length === 0);
      resolved = {rows:remaining, count:remaining.length, page:1, pageSize:Math.max(1, remaining.length)};
    } else {
      resolved = await liveData.searchSellerItems(mappingState.source, keyword, page, mappingState.pageSize);
    }
    if (requestId !== mappingState.requestId) return;
    renderMappingResults(resolved);
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

function applyLocalSellerLink(linked) {
  const sku = String(linked?.sellpia_sku_code || mappingState.sku || '').trim();
  const source = String(linked?.source_channel || mappingState.source || '').trim();
  const product = matrixRowsBySku.get(sku);
  if (!product || !['smartstore', 'makeshop', 'ably'].includes(source)) return null;
  product[`${source}_product_code`] = linked?.product_code || '';
  product[`${source}_option_code`] = linked?.option_code || '';
  product[`${source}_name`] = linked?.product_name || '';
  product[`${source}_option_name`] = linked?.option_name || '';
  product[`${source}_match_tier`] = 'MANUAL_LINKED';
  product[`${source}_match_score`] = 100;
  product[`${source}_listing_count`] = Math.max(1, Number(product[`${source}_listing_count`] || 0));
  product[`${source}_name_is_draft`] = false;
  product.__manualLinks = {...(product.__manualLinks || {}), [source]:linked};
  if (product.__sellerProductLinkDrafts?.[source]) {
    product.__sellerProductLinkDrafts = {...product.__sellerProductLinkDrafts};
    delete product.__sellerProductLinkDrafts[source];
  }
  if (product.__linkSuppressions?.[source]) {
    product.__linkSuppressions = {...product.__linkSuppressions};
    delete product.__linkSuppressions[source];
  }
  product.overall_status = 'connected';
  return product;
}

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
    let linked;
    if (mappingState.mode === 'remaining-options') {
      linked = await liveData.linkProductDraftOption({
        sku:mappingState.sku,
        source:mappingState.source,
        optionCode:button.dataset.mapOption
      });
    } else {
      linked = await liveData.linkSellerItem({
        sku:mappingState.sku,
        source:mappingState.source,
        productCode:button.dataset.mapProduct,
        optionCode:button.dataset.mapOption
      });
    }
    const sourceLabel = CHANNEL_LABELS[mappingState.source] || mappingState.source;
    const sku = mappingState.sku;
    applyLocalSellerLink(linked || {
      source_channel:mappingState.source,
      sellpia_sku_code:sku,
      product_code:button.dataset.mapProduct,
      option_code:button.dataset.mapOption
    });
    closeMappingSearch();
    closeProductDrawer();
    renderLiveMatrixRows(matrixState.rows);
    showToast(`${sku} · ${sourceLabel} 연결을 저장했습니다.`);
    void refreshMatrixSkus([sku]).catch(error => {
      console.error('saved seller link targeted refresh failed', error);
      showToast(`${sku} 연결은 저장됐지만 최신 상세값 조회가 지연됩니다. 화면 연결값은 유지합니다.`);
    });
    void loadLiveDashboardMetrics().catch(error => {
      console.error('saved seller link dashboard refresh failed', error);
    });
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
    <div class="price-popover-values"><p><span>판매처 원본가</span><b>${hasOriginal ? `${formatNullableNumber(original)}원` : '-'}</b></p><p><span>시스템 기준가격</span><b>${hasBase ? `${formatNullableNumber(base)}원` : '-'}</b></p><p class="policy"><span>판매처별 수식 계산가</span><b>${hasPolicy ? `${formatNullableNumber(policy)}원` : '정책 꺼짐'}</b></p><p class="draft"><span>내보내기 예정가</span><b>${hasDraft ? `${formatNullableNumber(draft)}원` : '준비값 없음'}</b></p></div>
    <div class="price-formula"><span>원본 비교</span><code>판매처 원본가 ${hasOriginal ? formatNullableNumber(original) : '-'} − 시스템 기준가격 ${hasBase ? formatNullableNumber(base) : '-'} = ${difference === null ? '-' : formatNullableNumber(difference)}</code></div>
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
    ? '시스템 기준값을 Supabase에 자동 저장하고 있습니다.'
    : sellpiaSaveError
      ? `자동 저장 실패 · ${sellpiaSaveError}`
      : '연속 입력을 잠깐 묶은 뒤 Supabase에 자동 저장합니다.');
  const discard = document.getElementById('discard-changes');
  const preview = document.getElementById('preview-changes');
  if (discard) discard.disabled = sellpiaSaveInFlight || pendingChanges.length === 0;
  if (preview) preview.disabled = sellpiaSaveInFlight || pendingChanges.length === 0;
  updateSourceRefreshAction();
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

function applySavedSellpiaChanges(savedChanges, result = {}) {
  const updatedAt = new Date().toISOString();
  for (const saved of savedChanges) {
    const product = matrixRowsBySku.get(saved.sku);
    if (!product) continue;
    product[saved.fieldKey] = saved.after;
    if (saved.fieldKey === 'sellpia_own_code') product.own_code = saved.after;
    if (!saved.fieldKey.startsWith('system_')) product.sellpia_override_updated_at = updatedAt;
  }
  for (const savedRow of result.systemRows || []) {
    const product = matrixRowsBySku.get(savedRow.sellpia_sku_code);
    if (!product) continue;
    Object.assign(product, savedRow);
  }
  for (const repriced of result.repricedRows || []) {
    const product = matrixRowsBySku.get(repriced.sellpia_sku_code);
    if (!product) continue;
    product.__sellerPriceComponents = repriced.__sellerPriceComponents || product.__sellerPriceComponents || {};
    product.__sellerDrafts = repriced.__sellerDrafts || product.__sellerDrafts || {};
    product.__priceRuleAssignments = repriced.__priceRuleAssignments || product.__priceRuleAssignments || {};
    for (const source of ['smartstore','makeshop']) {
      const component = product.__sellerPriceComponents?.[source];
      if (!component) continue;
      product[`${source}_base_price`] = component.source_base_price;
      product[`${source}_discounted_base_price`] = component.source_discounted_base_price;
      product[`${source}_option_price`] = component.source_option_price;
      product[`${source}_final_price`] = component.source_final_price;
      product[`${source}_discount_terms`] = component.source_discount_terms || [];
    }
  }
  const openProduct = matrixRowsBySku.get(productDrawer?.dataset?.sku || '');
  if (openProduct) {
    document.getElementById('drawer-stock').textContent = formatNullableNumber(openProduct.system_stock);
    document.getElementById('drawer-price').textContent = formatNullableNumber(openProduct.system_base_price);
  }
  if (savedChanges.some(change => ['system_base_price','system_stock','sellpia_sale_price'].includes(change.fieldKey)) || (result.repricedRows || []).length) {
    renderLiveMatrixRows(matrixState.rows);
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
    applySavedSellpiaChanges(snapshot, result);
    removeSavedCellState(snapshot);
    changeModal.hidden = true;
    const savedBasePrice = snapshot.some(change => change.fieldKey === 'system_base_price');
    showToast(result.queuedCount
      ? `${result.savedCount}건 DB ${automatic ? '자동 ' : ''}저장 · 가격규칙 자동 재계산 ${result.queuedCount}건 반영 대기`
      : savedBasePrice
        ? `시스템 기준가격 ${result.savedCount}건 DB ${automatic ? '자동 ' : ''}저장 완료 · 판매처 원본은 유지`
        : `${result.savedCount}건 DB ${automatic ? '자동 ' : ''}저장 완료`);
    if (result.repriceRefreshError) setTimeout(() => showToast('저장은 완료됐지만 재계산 표시 갱신이 지연됐습니다. DB 새로고침으로 확인해주세요.'), 900);
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
    showToast(`시스템 기준값 자동 저장 실패: ${sellpiaSaveError}`);
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
  const rows = [...matrixBody.querySelectorAll('tr[data-sku]')];
  const grid = rows.map(() => []);
  rows.forEach((row, rowIndex) => {
    let columnIndex = 0;
    const cells = [...row.children].filter(cell => cell.matches('td:not(.select-col)'));
    for (const cell of cells) {
      while (grid[rowIndex][columnIndex]) columnIndex += 1;
      const rowSpan = Math.max(1, Number(cell.rowSpan) || 1);
      const colSpan = Math.max(1, Number(cell.colSpan) || 1);
      for (let rowOffset = 0; rowOffset < rowSpan && rowIndex + rowOffset < rows.length; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
          grid[rowIndex + rowOffset][columnIndex + columnOffset] = cell;
        }
      }
      columnIndex += colSpan;
    }
  });
  return grid;
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

function matrixCellsInRectangle(grid = matrixCellGrid()) {
  const bounds = selectionRectangle(grid);
  const cells = new Set();
  if (!bounds) return cells;
  for (let rowIndex = bounds.top; rowIndex <= bounds.bottom; rowIndex += 1) {
    for (let columnIndex = bounds.left; columnIndex <= bounds.right; columnIndex += 1) {
      const cell = grid[rowIndex]?.[columnIndex];
      if (cell) cells.add(cell);
    }
  }
  return cells;
}

function matrixSelectedBounds(grid = matrixCellGrid()) {
  const selected = matrixCellSelection.selected;
  let top = Infinity;
  let bottom = -1;
  let left = Infinity;
  let right = -1;
  grid.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (!cell || !selected.has(cell)) return;
    top = Math.min(top, rowIndex);
    bottom = Math.max(bottom, rowIndex);
    left = Math.min(left, columnIndex);
    right = Math.max(right, columnIndex);
  }));
  return bottom < 0 ? null : {top, bottom, left, right};
}

function applyMatrixDragSelection(grid = matrixCellGrid()) {
  const rectangle = matrixCellsInRectangle(grid);
  if (matrixCellSelection.dragMode === 'toggle') {
    const next = new Set(matrixCellSelection.dragBase);
    rectangle.forEach(cell => next.has(cell) ? next.delete(cell) : next.add(cell));
    matrixCellSelection.selected = next;
  } else {
    matrixCellSelection.selected = rectangle;
  }
  paintMatrixCellSelection();
}

function matrixColumnCells(index, {reindex = true} = {}) {
  if (reindex) indexMatrixBodyColumns();
  return [...matrixBody.querySelectorAll(`tr[data-sku] > td[data-matrix-column="${Number(index)}"]:not([hidden])`)];
}

function selectedMatrixColumnLabels() {
  return [...matrixTable.querySelectorAll('.column-row th.matrix-column-selected')]
    .map(header => header.childNodes[0]?.textContent?.trim() || header.textContent.replace(/열 너비 조절/g, '').trim())
    .filter(Boolean);
}

function selectMatrixColumn(header, {extend = false, toggle = false} = {}) {
  if (!header?.matches('.column-row th[data-matrix-column]')) return;
  const index = Number(header.dataset.matrixColumn);
  if (!Number.isInteger(index) || index < 3) return;
  const from = extend && Number.isInteger(matrixColumnSelectionAnchor) ? matrixColumnSelectionAnchor : index;
  const indexes = [];
  for (let candidate = Math.min(from, index); candidate <= Math.max(from, index); candidate += 1) {
    const candidateHeader = matrixTable.querySelector(`.column-row th[data-matrix-column="${candidate}"]`);
    if (candidateHeader && !candidateHeader.hidden) indexes.push(candidate);
  }
  indexMatrixBodyColumns();
  const cells = indexes.flatMap(candidate => matrixColumnCells(candidate, {reindex:false}));
  if (!cells.length) return;
  if (toggle) {
    const next = new Set(matrixCellSelection.selected);
    const remove = cells.every(cell => next.has(cell));
    cells.forEach(cell => remove ? next.delete(cell) : next.add(cell));
    matrixCellSelection.selected = next;
  } else {
    matrixCellSelection.selected = new Set(cells);
  }
  matrixColumnSelectionAnchor = extend && Number.isInteger(matrixColumnSelectionAnchor) ? matrixColumnSelectionAnchor : index;
  matrixCellSelection.anchor = cells[0] || null;
  matrixCellSelection.focus = cells[cells.length - 1] || null;
  matrixCellSelection.dragging = false;
  matrixCellSelection.dragBase = new Set();
  matrixCellSelection.dragMode = 'replace';
  paintMatrixCellSelection();
}

function selectedSourceRefreshTargets() {
  const targets = [];
  const seen = new Set();
  const sourceFields = {
    system_stock:'sellpia_source_stock',
    system_base_price:'sellpia_source_sale_price',
    sellpia_purchase_price:'sellpia_source_purchase_price',
    sellpia_order_unit:'sellpia_source_order_unit',
    sellpia_minimum_order_unit:'sellpia_source_minimum_order_unit'
  };
  for (const cell of matrixBody.querySelectorAll('td.matrix-cell-selected')) {
    const row = cell.closest('tr[data-sku]');
    if (!row) continue;
    const sku = row.dataset.sku;
    const product = matrixRowsBySku.get(sku);
    const systemEditor = cell.querySelector('.system-master-cell[data-field-key]');
    if (systemEditor) {
      const fieldKey = systemEditor.dataset.fieldKey;
      const sourceField = sourceFields[fieldKey];
      const key = `system\u0000${sku}\u0000${fieldKey}`;
      if (!sourceField || seen.has(key)) continue;
      seen.add(key);
      const sourceValue = product?.[sourceField];
      const hasSource = sourceValue !== null && sourceValue !== undefined && sourceValue !== '' && Number.isFinite(Number(sourceValue));
      targets.push({
        kind:'system',
        sku,
        field:systemEditor.dataset.field || BULK_SOURCE_REFRESH_FIELDS[fieldKey]?.label || fieldKey,
        fieldKey,
        before:String(product?.[fieldKey] ?? ''),
        after:hasSource ? String(sourceValue) : '',
        hasSource
      });
      continue;
    }

    const sellerEditor = cell.querySelector('.seller-edit[data-source][data-field-key]');
    if (sellerEditor) {
      const source = sellerEditor.dataset.source;
      const fieldKey = sellerEditor.dataset.fieldKey;
      const priceComponent = sellerEditor.dataset.priceComponent || '';
      const productCode = String(sellerEditor.dataset.sellerProductCode || product?.[`${source}_product_code`] || '').trim();
      const groupSize = Math.max(1, Number(sellerEditor.dataset.groupSize) || 1);
      const keyScope = priceComponent === 'base' && groupSize > 1 && productCode ? productCode : sku;
      const key = `seller\u0000${source}\u0000${fieldKey}\u0000${priceComponent}\u0000${keyScope}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sourceValue = sellerEditor.dataset.baseline;
      const hasSource = sourceValue !== undefined && sourceValue !== '' && Number.isFinite(Number(sourceValue));
      targets.push({
        kind:fieldKey === 'sellpia_current_stock' ? 'seller_stock' : 'seller_price',
        sku,
        source,
        productCode,
        groupSize,
        priceComponent,
        field:sellerEditor.dataset.field || `${CHANNEL_LABELS[source] || source} 원본값`,
        fieldKey,
        before:String(sellerEditor.dataset.value ?? ''),
        after:hasSource ? String(sourceValue) : '',
        hasSource
      });
      continue;
    }

    const discountEditor = cell.querySelector('[data-discount-edit][data-source]');
    if (discountEditor) {
      const source = discountEditor.dataset.source;
      const productCode = String(discountEditor.dataset.productCode || product?.[`${source}_product_code`] || '').trim();
      const groupSize = Math.max(1, Number(cell.dataset.groupSize) || 1);
      const keyScope = groupSize > 1 && productCode ? productCode : sku;
      const key = `seller\u0000${source}\u0000discount\u0000${keyScope}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const component = product?.__sellerPriceComponents?.[source] || {};
      const sourceTerms = component.source_discount_terms ?? product?.[`${source}_discount_terms`] ?? [];
      const draftTerms = component.draft_discount_terms;
      targets.push({
        kind:'seller_discount',
        sku,
        source,
        productCode,
        groupSize,
        field:`${CHANNEL_LABELS[source] || source} 할인정보`,
        fieldKey:'sellpia_sale_price',
        before:JSON.stringify(Array.isArray(draftTerms) ? draftTerms : sourceTerms),
        after:JSON.stringify(Array.isArray(sourceTerms) ? sourceTerms : []),
        sourceTerms:Array.isArray(sourceTerms) ? sourceTerms : [],
        hasSource:Boolean(productCode)
      });
    }
  }
  return targets;
}

function updateSourceRefreshAction() {
  if (!matrixContextSourceRefresh || !matrixContextSourceRefreshCount) return;
  const targets = selectedSourceRefreshTargets();
  const available = targets.filter(target => target.hasSource).length;
  const selectedColumns = selectedMatrixColumnLabels();
  matrixContextSourceRefresh.disabled = matrixSourceRefreshInFlight || sellpiaSaveInFlight || available === 0;
  matrixContextSourceRefreshCount.textContent = matrixSourceRefreshInFlight
    ? 'DB 저장·확인 중…'
    : available
      ? `${selectedColumns.length ? `현재 화면 ${selectedColumns.join('·')} · ` : ''}원본값 ${formatNumber(available)}셀`
      : '갱신할 셀 없음';
  matrixContextSourceRefresh.title = targets.length === 0
    ? '원본값을 가진 기준값 또는 판매처 셀을 선택해주세요.'
    : available === 0
      ? `선택한 ${targets.length}개 셀에 적용할 원본값이 없습니다.`
      : `선택한 셀 중 원본값이 있는 ${available}개를 원본 상태로 저장합니다.`;
}

function paintMatrixCellSelection() {
  matrixTable.querySelectorAll('.column-row th.matrix-column-selected').forEach(header => {
    header.classList.remove('matrix-column-selected');
    header.setAttribute('aria-selected', 'false');
  });
  matrixBody.querySelectorAll('td.matrix-cell-selected,td.matrix-cell-anchor').forEach(cell => {
    cell.classList.remove('matrix-cell-selected', 'matrix-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
  matrixCellSelection.selected = new Set([...matrixCellSelection.selected].filter(cell => cell?.isConnected));
  matrixCellSelection.selected.forEach(cell => {
    cell.classList.add('matrix-cell-selected');
    cell.setAttribute('aria-selected', 'true');
  });
  if (matrixCellSelection.anchor?.isConnected && matrixCellSelection.selected.has(matrixCellSelection.anchor)) {
    matrixCellSelection.anchor.classList.add('matrix-cell-anchor');
  }
  indexMatrixBodyColumns();
  matrixTable.querySelectorAll('.column-row th[data-matrix-column]').forEach(header => {
    const cells = matrixColumnCells(Number(header.dataset.matrixColumn), {reindex:false});
    const selected = cells.length > 0 && cells.every(cell => matrixCellSelection.selected.has(cell));
    header.classList.toggle('matrix-column-selected', selected);
    header.setAttribute('aria-selected', String(selected));
  });
  updateSelectedCount();
  updateSourceRefreshAction();
}

function selectMatrixCell(cell, {extend = false, toggle = false} = {}) {
  if (!cell?.matches('td') || !cell.closest('tr[data-sku]')) return;
  if (toggle) {
    matrixCellSelection.dragBase = new Set(matrixCellSelection.selected);
    matrixCellSelection.dragMode = 'toggle';
    matrixCellSelection.anchor = cell;
    matrixCellSelection.focus = cell;
    applyMatrixDragSelection();
    return;
  }
  if (!extend || !matrixCellSelection.anchor?.isConnected) matrixCellSelection.anchor = cell;
  matrixCellSelection.focus = cell;
  matrixCellSelection.dragBase = new Set();
  matrixCellSelection.dragMode = 'replace';
  applyMatrixDragSelection();
}

function clearMatrixCellSelection() {
  matrixCellSelection.dragging = false;
  matrixCellSelection.anchor = null;
  matrixCellSelection.focus = null;
  matrixCellSelection.selected.clear();
  matrixCellSelection.dragBase.clear();
  matrixCellSelection.dragMode = 'replace';
  matrixColumnSelectionAnchor = null;
  matrixTable.querySelectorAll('.column-row th.matrix-column-selected').forEach(header => {
    header.classList.remove('matrix-column-selected');
    header.setAttribute('aria-selected', 'false');
  });
  matrixBody.querySelectorAll('td.matrix-cell-selected,td.matrix-cell-anchor').forEach(cell => {
    cell.classList.remove('matrix-cell-selected', 'matrix-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
  document.body.classList.remove('matrix-cell-selecting');
  updateSelectedCount();
  updateSourceRefreshAction();
}

async function refreshSelectedSystemValuesFromSource() {
  if (matrixSourceRefreshInFlight || sellpiaSaveInFlight || !liveData?.saveSellpiaChanges || !liveData?.loadProductsBySkus) return;
  let targets = selectedSourceRefreshTargets();
  if (!targets.length) {
    showToast('원본값을 적용할 기준값 또는 판매처 셀을 선택해주세요.');
    return;
  }
  if (pendingChanges.length) {
    await flushPendingSellpiaChanges({automatic:true});
    if (pendingChanges.length || sellpiaSaveInFlight) {
      showToast('먼저 진행 중인 시스템 기준값 저장을 확인해주세요.');
      return;
    }
    targets = selectedSourceRefreshTargets();
  }
  const available = targets.filter(target => target.hasSource);
  const missingCount = targets.length - available.length;
  const changes = available.filter(target => target.kind === 'seller_discount'
    ? target.before !== target.after
    : target.before === '' || Number(target.before) !== Number(target.after));
  if (!changes.length) {
    const suffix = missingCount ? ` · 원본값 없음 ${missingCount}개` : '';
    showToast(`선택한 셀은 이미 원본값과 같습니다.${suffix}`);
    return;
  }
  const selectedColumns = selectedMatrixColumnLabels();
  if (selectedColumns.length && !window.confirm(`선택한 컬럼의 현재 화면 원본값을 갱신할까요?\n\n컬럼: ${selectedColumns.join(', ')}\n변경 대상: ${formatNumber(changes.length)}셀${missingCount ? `\n원본값 없음: ${formatNumber(missingCount)}셀 제외` : ''}\n\n화면에 불러온 행만 처리하고 저장 후 DB 값을 다시 확인합니다.`)) return;
  matrixSourceRefreshInFlight = true;
  updateSourceRefreshAction();
  const verificationTargets = [];
  const attemptedSkus = new Set(changes.map(target => target.sku));
  const requireSellerSave = (result, target) => {
    if (!result || !['pending', 'unchanged'].includes(String(result.draft_status || ''))) {
      throw new Error(`${target.field} 저장 결과를 확인할 수 없습니다.`);
    }
    return result;
  };
  const registerSellerItems = (items, target) => {
    const normalized = Array.isArray(items) ? items : [];
    if (!normalized.length) throw new Error(`${target.field} 저장 결과가 비어 있습니다.`);
    for (const saved of normalized) {
      const sku = String(saved?.sku || target.sku || '').trim();
      if (!sku) throw new Error(`${target.field} 저장 SKU를 확인할 수 없습니다.`);
      requireSellerSave(saved.result, target);
      attemptedSkus.add(sku);
      verificationTargets.push({...target, sku, groupSize:1});
    }
  };
  const reloadAndRender = async skus => {
    const rows = await liveData.loadProductsBySkus([...new Set(skus)].filter(Boolean));
    const refreshedBySku = new Map(rows.map(product => [String(product.sellpia_sku_code || '').trim(), product]));
    matrixState.rows = matrixState.rows.map(product => refreshedBySku.get(String(product.sellpia_sku_code || '').trim()) || product);
    renderLiveMatrixRows(matrixState.rows);
    return rows;
  };
  try {
    const systemChanges = changes.filter(target => target.kind === 'system');
    if (systemChanges.length) {
      const result = await liveData.saveSellpiaChanges(systemChanges, createRequestId(), {
        systemChangeSource:'source_accept',
        systemMetadata:{ui:'matrix-source-refresh', selected_cell_count:targets.length}
      });
      if (!result || Number(result.savedCount) !== systemChanges.length || (result.systemRows || []).length !== systemChanges.length) {
        throw new Error(`시스템 기준값 저장 결과가 요청 ${systemChanges.length}건과 일치하지 않습니다.`);
      }
      verificationTargets.push(...systemChanges);
    }

    for (const target of changes.filter(item => item.kind !== 'system')) {
      const product = matrixRowsBySku.get(target.sku);
      if (!product) throw new Error(`화면 데이터에서 SKU ${target.sku}를 찾지 못했습니다.`);
      if (target.kind === 'seller_stock') {
        const result = await liveData.saveSellerValueDraft({
          sku:target.sku,
          source:target.source,
          fieldKey:'sellpia_current_stock',
          after:Number(target.after)
        });
        registerSellerItems([{sku:target.sku, result}], target);
        continue;
      }

      if (target.kind === 'seller_discount') {
        const result = target.productCode && target.groupSize > 1 && liveData.saveSellerProductDiscountDrafts
          ? await liveData.saveSellerProductDiscountDrafts({
              source:target.source,
              productCode:target.productCode,
              anchorSku:target.sku,
              discountTerms:target.sourceTerms,
              ruleCode:null
            })
          : {items:[{
              sku:target.sku,
              result:await liveData.saveSellerDiscountDraft({
                sku:target.sku,
                source:target.source,
                discountTerms:target.sourceTerms,
                inputMode:'option',
                optionPrice:product.__sellerPriceComponents?.[target.source]?.draft_option_price
                  ?? product.__sellerPriceComponents?.[target.source]?.source_option_price
                  ?? 0
              })
            }]};
        registerSellerItems(result.items, target);
        continue;
      }

      const component = product.__sellerPriceComponents?.[target.source] || {};
      const currentBase = component.draft_base_price ?? component.source_base_price ?? product[`${target.source}_base_price`] ?? product[`${target.source}_price`];
      const currentOption = component.draft_option_price ?? component.source_option_price ?? product[`${target.source}_option_price`] ?? 0;
      if (target.priceComponent === 'base' && target.productCode && target.groupSize > 1 && liveData.saveSellerProductBaseDrafts) {
        const result = await liveData.saveSellerProductBaseDrafts({
          source:target.source,
          productCode:target.productCode,
          targetBasePrice:Number(target.after),
          basePriceSource:'source'
        });
        registerSellerItems(result.items, target);
        continue;
      }
      const result = await liveData.saveSellerPriceDraft({
        sku:target.sku,
        source:target.source,
        targetBasePrice:target.priceComponent === 'base' ? Number(target.after) : Number(currentBase),
        inputMode:target.priceComponent === 'final' ? 'final' : 'option',
        targetFinalPrice:target.priceComponent === 'final' ? Number(target.after) : null,
        optionPrice:target.priceComponent === 'option' ? Number(target.after) : Number(currentOption),
        optionPriceSource:target.priceComponent === 'option' ? 'original' : (component.option_price_source || 'original'),
        basePriceSource:target.priceComponent === 'base' ? 'source' : (component.base_price_source || 'source'),
        priceRuleSetId:component.price_rule_set_id || null
      });
      registerSellerItems([{sku:target.sku, result}], target);
    }

    if (!verificationTargets.length) throw new Error('DB에서 확인할 저장 대상이 없습니다.');
    if (matrixContextSourceRefreshCount) matrixContextSourceRefreshCount.textContent = 'DB 저장 확인 중…';
    const refreshedRows = await reloadAndRender(verificationTargets.map(target => target.sku));
    const verification = sourceRefreshVerifier?.verifySourceRefreshTargets(verificationTargets, refreshedRows);
    if (!verification || verification.failures.length) {
      const failure = verification?.failures?.[0];
      const target = failure?.target;
      const labelText = target ? `${target.sku} ${target.field}` : '선택 원본값';
      throw new Error(`${labelText} DB 재조회 값이 원본과 일치하지 않습니다.`);
    }
    const notes = [
      missingCount ? `원본값 없음 ${missingCount}개 제외` : '',
      available.length - changes.length ? `이미 동일 ${available.length - changes.length}개` : ''
    ].filter(Boolean);
    showToast(`원본값 DB 저장·확인 완료 · 선택 ${changes.length}셀 · 확인 ${verification.verifiedCount}항목${notes.length ? ` · ${notes.join(' · ')}` : ''}`);
    void loadLiveDashboardMetrics();
  } catch (error) {
    console.error('selected source refresh failed', error);
    try {
      if (attemptedSkus.size) await reloadAndRender([...attemptedSkus]);
    } catch (refreshError) {
      console.error('selected source refresh recovery reload failed', refreshError);
    }
    showToast(`원본값 저장·확인 실패: ${error?.message || error}`);
  } finally {
    matrixSourceRefreshInFlight = false;
    updateSourceRefreshAction();
  }
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
  const bounds = matrixSelectedBounds(grid);
  if (!bounds) return '';
  const rows = [];
  for (let rowIndex = bounds.top; rowIndex <= bounds.bottom; rowIndex += 1) {
    const values = [];
    for (let columnIndex = bounds.left; columnIndex <= bounds.right; columnIndex += 1) {
      const cell = grid[rowIndex]?.[columnIndex];
      values.push(matrixCellSelection.selected.has(cell) ? matrixCellClipboardValue(cell) : '');
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
  const nullableNumber = valueType === 'nullable-number';
  const numeric = valueType === 'number' || nullableNumber || signedNumber;
  let normalized = String(value ?? '').trim();
  if (numeric) normalized = normalized.replace(/,/g, '');
  const valid = !numeric || (nullableNumber && normalized === '') || (signedNumber
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
  const selectionModifier = event.ctrlKey || event.metaKey;
  if (event.target.closest('.row-check,.inline-editor')) return;
  if (!selectionModifier && event.target.closest('[data-open-multi-link],[data-open-sku-links],[data-discount-edit]')) return;
  const cell = event.target.closest('td');
  if (!cell || event.button !== 0) return;
  selectMatrixCell(cell, {extend:event.shiftKey, toggle:selectionModifier});
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
  applyMatrixDragSelection();
});

document.addEventListener('mouseup', () => {
  matrixCellSelection.dragging = false;
  relationCellSelection.dragging = false;
  multiLinkCellSelection.dragging = false;
  document.body.classList.remove('matrix-cell-selecting');
});

matrixBody.addEventListener('contextmenu', event => {
  const cell = event.target.closest('td');
  if (!cell || !cell.closest('tr[data-sku]')) return;
  event.preventDefault();
  if (!cell.classList.contains('matrix-cell-selected')) selectMatrixCell(cell);
  openMatrixContextMenu(event.clientX, event.clientY, cell);
});

document.addEventListener('click', event => {
  if (matrixContextMenu?.hidden || event.target.closest('#matrix-context-menu')) return;
  closeMatrixContextMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMatrixContextMenu();
});
window.addEventListener('resize', closeMatrixContextMenu);
window.addEventListener('scroll', closeMatrixContextMenu, true);

document.addEventListener('copy', event => {
  if (!matrixCellSelection.anchor?.isConnected || isClipboardTypingTarget(document.activeElement)) return;
  const text = matrixSelectionClipboardText();
  if (!text) return;
  event.clipboardData?.setData('text/plain', text);
  event.preventDefault();
  const count = matrixCellSelection.selected.size;
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
    showToast('붙여넣기는 자사코드·기준값·판매처 재고·가격 셀에서 시작해주세요.');
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
  matrixCellSelection.dragMode = 'replace';
  matrixCellSelection.dragBase = new Set();
  applyMatrixDragSelection();
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
  const count = selectedMatrixSkus().length;
  document.getElementById('selected-count').textContent = count;
}

function calculateNativeDiscountedBase(basePrice, terms = []) {
  if (discountPriceMath?.discountedBase) return discountPriceMath.discountedBase(basePrice, terms);
  let value = Number(basePrice);
  if (!Number.isFinite(value)) return null;
  for (const term of Array.isArray(terms) ? terms : []) {
    if (!term?.is_baseline) continue;
    const amount = Math.abs(Number(term.value));
    if (!Number.isFinite(amount)) continue;
    if (term.unit === 'percent') value *= (1 - amount / 100);
    if (term.unit === 'amount') value -= amount;
    const unit = Math.max(1, Number(term.rounding_unit) || 1);
    if (term.rounding_mode === 'down') value = Math.floor(value / unit) * unit;
    if (term.rounding_mode === 'up') value = Math.ceil(value / unit) * unit;
    if (term.rounding_mode === 'nearest') value = Math.round(value / unit) * unit;
  }
  return Math.max(0, value);
}

function nativeDiscountSummary(terms = []) {
  const baseline = (Array.isArray(terms) ? terms : []).filter(term => term?.is_baseline);
  if (!baseline.length) return '원본 할인 없음';
  return baseline.map(term => {
    const value = formatNullableNumber(term.value);
    return `${term.title || '원본 할인'} ${value}${term.unit === 'percent' ? '%' : '원'}`;
  }).join(' → ');
}

function matrixDiscountSummary(terms = [], basePrice = null, discountedBasePrice = null) {
  const activeTerms = (Array.isArray(terms) ? terms : []).filter(term => {
    const value = Math.abs(Number(term?.value));
    return term && term.enabled !== false && Number.isFinite(value) && value > 0;
  });
  const reportedDiscount = Number.isFinite(Number(basePrice))
    && Number.isFinite(Number(discountedBasePrice))
    && Number(discountedBasePrice) < Number(basePrice);
  if (!activeTerms.length) {
    return reportedDiscount
      ? {hasDiscount:true, summary:'판매처 할인가', detail:'판매처가 제공한 할인 적용 판매가'}
      : {hasDiscount:false, summary:'없음', detail:'할인 없음'};
  }
  const labels = activeTerms.map(term => {
    const suffix = term.unit === 'percent' ? '%' : '원';
    const condition = term.is_baseline ? '' : ' (조건부)';
    return `${term.title || '할인'} ${formatNullableNumber(term.value)}${suffix}${condition}`;
  });
  const summary = `${labels.slice(0, 2).join(' · ')}${labels.length > 2 ? ` 외 ${labels.length - 2}건` : ''}`;
  return {hasDiscount:true, summary, detail:labels.join(' · ')};
}

function discountEditorPrimaryKey(source) {
  return source === 'smartstore' ? 'basic' : 'period';
}

function discountEditorConditionalTerms(source, terms = discountEditorState.terms) {
  const primaryKey = discountEditorPrimaryKey(source);
  return (Array.isArray(terms) ? terms : []).filter(term => term?.term_key !== primaryKey);
}

function makeDiscountRuleTerms(ruleCode) {
  const catalog = {M10:{value:10,rounding_unit:10},M15:{value:15,rounding_unit:10},M20:{value:20,rounding_unit:100}};
  const rule = catalog[ruleCode];
  if (!rule) return [];
  return [{term_key:'period',term_type:'period',title:'기간 할인',rule_code:ruleCode,unit:'percent',value:rule.value,is_baseline:true,rounding_mode:'down',rounding_unit:rule.rounding_unit}];
}

function makeDiscountRuleCode(terms = []) {
  const period = (Array.isArray(terms) ? terms : []).find(term => term?.term_key === 'period');
  if (!period) return 'NONE';
  if (['M10','M15','M20'].includes(period.rule_code)) return period.rule_code;
  if (Number(period.value) === 10) return 'M10';
  if (Number(period.value) === 15) return 'M15';
  if (Number(period.value) === 20) return 'M20';
  return 'PRESERVE';
}

function discountEditorDraftTerms() {
  const source = discountEditorState.source;
  const conditional = discountEditorConditionalTerms(source);
  if (source === 'smartstore') {
    const amount = Number(document.getElementById('discount-editor-amount').value || 0);
    const basic = amount > 0 ? [{term_key:'basic',term_type:'basic',title:'즉시할인 기본할인',input_source:'manual',unit:'amount',value:amount,is_baseline:true,rounding_mode:'nearest',rounding_unit:1}] : [];
    return [...basic, ...conditional];
  }
  const ruleCode = document.getElementById('discount-editor-rule-code').value;
  return ruleCode === 'PRESERVE' ? [...discountEditorState.terms] : [...makeDiscountRuleTerms(ruleCode), ...conditional];
}

function updateDiscountEditorPreview() {
  const terms = discountEditorDraftTerms();
  const discountedPrice = discountPriceMath?.discountedBase?.(discountEditorState.basePrice, terms);
  const exact = Number.isFinite(discountedPrice);
  const preview = {
    basePrice:discountEditorState.basePrice,
    discountedPrice,
    finalPrice:exact ? discountedPrice + Number(discountEditorState.anchorOptionPrice || 0) : null,
    exact,
    reason:exact ? '' : '현재 판매가에 할인조건을 적용하지 못했습니다.'
  };
  discountEditorState.preview = preview;
  document.getElementById('discount-editor-preview-label').textContent = '현재 판매가 유지';
  document.getElementById('discount-editor-base-price').textContent = preview.basePrice === null ? '-' : `${formatNullableNumber(preview.basePrice)}원`;
  document.getElementById('discount-editor-preview-price').textContent = preview.discountedPrice === null ? '-' : `${formatNullableNumber(preview.discountedPrice)}원`;
  const displayedFinalPrice = preview.finalPrice;
  document.getElementById('discount-editor-anchor-final-price').textContent = Number.isFinite(Number(displayedFinalPrice)) ? `${formatNullableNumber(displayedFinalPrice)}원` : '-';
  const note = document.getElementById('discount-editor-preview-note');
  note.classList.toggle('error', !preview.exact);
  note.textContent = !preview.exact
    ? preview.reason
    : `판매가는 ${formatNullableNumber(preview.basePrice)}원으로 유지됩니다. 할인 적용가 ${formatNullableNumber(preview.discountedPrice)}원 + 옵션가 ${formatNullableNumber(discountEditorState.anchorOptionPrice)}원 = 예상 최종구매가 ${formatNullableNumber(preview.finalPrice)}원입니다.`;
  document.getElementById('discount-editor-save').disabled = !preview.exact;
}

function closeDiscountEditor() {
  document.getElementById('discount-editor-modal').hidden = true;
  discountEditorState.source = '';
  discountEditorState.product = null;
  discountEditorState.preview = null;
}

async function openDiscountEditor(button) {
  const source = button.dataset.source;
  if (!['smartstore','makeshop'].includes(source)) return;
  const modal = document.getElementById('discount-editor-modal');
  modal.hidden = false;
  const targetSku = String(button.dataset.sku || '').trim();
  const targetProductCode = String(button.dataset.productCode || '').trim();
  const product = matrixRowsBySku.get(targetSku)
    || matrixState.rows.find(row => String(row?.sellpia_sku_code || '').trim() === targetSku)
    || matrixState.rows.find(row => String(row?.[`${source}_product_code`] || '').trim() === targetProductCode);
  if (!product) {
    modal.hidden = true;
    console.warn('discount editor product not found', {source,targetSku,targetProductCode});
    showToast('할인을 수정할 판매처 상품을 현재 화면에서 찾지 못했습니다.');
    return;
  }
  const component = product.__sellerPriceComponents?.[source] || {};
  const priceDraft = product.__sellerDrafts?.[`${source}:sellpia_sale_price`];
  const sourceTerms = component.source_discount_terms ?? product[`${source}_discount_terms`] ?? [];
  const terms = priceDraft ? (component.draft_discount_terms ?? priceDraft.price_discount_terms_after ?? sourceTerms) : sourceTerms;
  const basePrice = priceDraft
    ? (component.draft_base_price ?? priceDraft.price_base_after)
    : (component.source_base_price ?? product[`${source}_base_price`] ?? product[`${source}_price`]);
  const numericPrice = value => value === null || value === undefined || value === '' ? Number.NaN : Number(value);
  const anchorOptionPrice = numericPrice(priceDraft
    ? (component.draft_option_price ?? priceDraft.price_option_after ?? component.source_option_price ?? 0)
    : (component.source_option_price ?? product[`${source}_option_price`] ?? 0));
  const currentFinalPrice = numericPrice(priceDraft
    ? (component.draft_final_price ?? priceDraft.price_final_after ?? priceDraft.after_value)
    : (component.source_final_price ?? product[`${source}_final_price`] ?? product[`${source}_price`]));
  if (basePrice === null || basePrice === undefined || basePrice === '' || ![basePrice, anchorOptionPrice, currentFinalPrice].every(value => Number.isFinite(Number(value)))) {
    modal.hidden = true;
    showToast('최신 판매처 원본 가격이 없어 할인정보를 수정할 수 없습니다. 판매처 원본을 먼저 갱신해주세요.');
    return;
  }
  let assignment = null;
  let rulePreview = null;
  let priceRuleSetName = '';
  try {
    assignment = await liveData.loadPriceRuleAssignment({sku:targetSku, source});
    if (assignment) {
      const [preview, ruleSets] = await Promise.all([
        liveData.previewPriceRuleSet({basePrice:product.system_base_price, ruleSetId:assignment.price_rule_set_id, source, sourceDiscountTerms:terms}),
        liveData.loadPriceRuleSets()
      ]);
      rulePreview = preview;
      priceRuleSetName = ruleSets.find(ruleSet => String(ruleSet.price_rule_set_id) === String(assignment.price_rule_set_id))?.set_name || '배정된 가격 태그';
    }
  } catch (error) {
    modal.hidden = true;
    console.error('discount editor price-rule lookup failed', error);
    showToast(`가격 태그를 확인하지 못해 할인 편집을 열 수 없습니다: ${error?.message || error}`);
    return;
  }
  const autoAdjustBase = false;
  const anchorFinalPrice = currentFinalPrice;
  const anchorDiscountedBase = anchorFinalPrice-anchorOptionPrice;
  if (!Number.isFinite(anchorFinalPrice) || !Number.isFinite(anchorDiscountedBase) || anchorDiscountedBase < 0) {
    modal.hidden = true;
    showToast('가격 태그 목표가와 현재 옵션가를 함께 적용할 수 없습니다. 가격 태그 또는 옵션가를 확인해주세요.');
    return;
  }
  const anchorSource = assignment ? `가격 태그 ‘${priceRuleSetName}’ 배정됨 · 수동 할인은 판매가 유지` : '현재 판매가 유지';
  Object.assign(discountEditorState, {
    source,
    productCode:button.dataset.productCode || product[`${source}_product_code`],
    sku:button.dataset.sku,
    terms:structuredClone(Array.isArray(terms) ? terms : []),
    product,
    basePrice,
    anchorOptionPrice,
    anchorFinalPrice,
    anchorDiscountedBase,
    anchorSource,
    priceRuleSetId:assignment?.price_rule_set_id || null,
    priceRuleSetName,
    autoAdjustBase
  });
  const isSmartstore = source === 'smartstore';
  document.getElementById('discount-editor-kicker').textContent = `${CHANNEL_LABELS[source]} 할인정보`;
  document.getElementById('discount-editor-title').textContent = isSmartstore ? '기본할인 금액 수정' : '기간 할인코드 수정';
  document.getElementById('discount-editor-product-code').textContent = discountEditorState.productCode || '-';
  document.getElementById('discount-editor-anchor-source').textContent = anchorSource;
  document.getElementById('discount-editor-anchor-price-label').textContent = '예상 최종구매가';
  document.getElementById('discount-editor-anchor-final-price').textContent = `${formatNullableNumber(anchorFinalPrice)}원`;
  const groupSize = Math.max(1, Number(button.closest('td')?.dataset.groupSize) || 1);
  document.getElementById('discount-editor-group-size').textContent = `같은 상품의 ${groupSize}개 옵션을 한 번에 저장합니다.`;
  document.getElementById('discount-editor-smartstore').hidden = !isSmartstore;
  document.getElementById('discount-editor-makeshop').hidden = isSmartstore;
  if (isSmartstore) {
    const basic = discountEditorState.terms.find(term => term?.term_key === 'basic');
    const discounted = calculateNativeDiscountedBase(basePrice, basic ? [basic] : []);
    const amount = basic?.unit === 'amount' ? Number(basic.value || 0) : Math.max(0, Number(basePrice || 0) - Number(discounted ?? basePrice ?? 0));
    const input = document.getElementById('discount-editor-amount');
    input.value = String(Math.round(amount));
    input.removeAttribute('max');
  } else {
    const select = document.getElementById('discount-editor-rule-code');
    select.querySelector('option[value="PRESERVE"]')?.remove();
    const ruleCode = makeDiscountRuleCode(discountEditorState.terms);
    if (ruleCode === 'PRESERVE') select.insertAdjacentHTML('afterbegin', '<option value="PRESERVE">현재 원본 기간할인 유지 · 지원 코드 선택 필요</option>');
    select.value = ruleCode;
  }
  const preserved = discountEditorConditionalTerms(source);
  document.getElementById('discount-editor-preserved-terms').textContent = preserved.length
    ? preserved.map(term => `${term.title || term.term_key} ${formatNullableNumber(term.value)}${term.unit === 'percent' ? '%' : '원'}`).join(' · ')
    : '보존할 조건부 할인 없음';
  updateDiscountEditorPreview();
  setTimeout(() => (isSmartstore ? document.getElementById('discount-editor-amount') : document.getElementById('discount-editor-rule-code')).focus(), 0);
}
async function saveDiscountEditor() {
  const source = discountEditorState.source;
  const productCode = discountEditorState.productCode;
  if (!source || !productCode) return;
  const amountInput = document.getElementById('discount-editor-amount');
  const ruleSelect = document.getElementById('discount-editor-rule-code');
  if (source === 'smartstore') {
    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount < 0) {
      showToast('기본할인은 0원 이상으로 입력해주세요.');
      amountInput.focus();
      return;
    }
  }
  if (source === 'makeshop' && ruleSelect.value === 'PRESERVE') {
    showToast('저장할 메이크샵 할인코드를 선택해주세요.');
    ruleSelect.focus();
    return;
  }
  if (!discountEditorState.preview?.exact) {
    showToast(discountEditorState.preview?.reason || '목표 최종구매가를 유지할 판매가를 계산하지 못했습니다.');
    return;
  }
  const button = document.getElementById('discount-editor-save');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = '상품 전체 저장 중…';
  try {
    const saved = await liveData.saveSellerProductDiscountDrafts({
      source,
      productCode,
      anchorSku:discountEditorState.sku,
      discountTerms:discountEditorDraftTerms(),
      ruleCode:source === 'makeshop' ? ruleSelect.value : null
    });
    for (const item of saved.items) applyLocalSellerPriceDraft(matrixRowsBySku.get(item.sku), source, item.result);
    renderLiveMatrixRows(matrixState.rows);
    const drawerProduct = matrixRowsBySku.get(productDrawer.dataset.sku);
    if (productDrawer.getAttribute('aria-hidden') === 'false' && drawerProduct) renderDrawerInventory(drawerProduct);
    refreshChangeQueueInBackground();
    void loadLiveDashboardMetrics();
    closeDiscountEditor();
    const pending = saved.items.filter(item => item.result?.draft_status === 'pending').length;
    const unchanged = saved.items.length - pending;
    showToast(`${CHANNEL_LABELS[source]} 상품 할인 수정안 ${pending}건 저장 · 판매가 유지·할인 후 최종가 변경${unchanged ? ` · 원본값 유지 ${unchanged}건` : ''}`);
  } catch (error) {
    console.error('product discount draft save failed', error);
    showToast(`할인 수정안 저장 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

document.getElementById('discount-editor-close').addEventListener('click', closeDiscountEditor);
document.getElementById('discount-editor-cancel').addEventListener('click', closeDiscountEditor);
document.getElementById('discount-editor-save').addEventListener('click', saveDiscountEditor);
document.getElementById('discount-editor-modal').addEventListener('click', event => { if (event.target.id === 'discount-editor-modal') closeDiscountEditor(); });
document.getElementById('discount-editor-amount').addEventListener('input', updateDiscountEditorPreview);
document.getElementById('discount-editor-rule-code').addEventListener('change', updateDiscountEditorPreview);

const viewSettingsModal = document.getElementById('view-settings-modal');
function fillViewSettingsForm(view = activeView) {
  document.getElementById('preset-name').value = view.name || '';
  document.getElementById('preset-channel-smartstore').checked = view.channels.smartstore;
  document.getElementById('preset-channel-makeshop').checked = view.channels.makeshop;
  document.getElementById('preset-channel-ably').checked = view.channels.ably;
  document.getElementById('preset-show-codes').checked = view.showCodes ?? view.showMapping ?? true;
  document.getElementById('preset-show-seller-names').checked = view.showSellerNames ?? true;
  document.getElementById('preset-show-inventory').checked = view.showInventory;
  document.getElementById('preset-show-price').checked = view.showPrice;
  document.getElementById('preset-show-discount').checked = view.showDiscount ?? view.showPrice ?? true;
  document.getElementById('preset-show-attributes').checked = view.showAttributes;
  document.getElementById('preset-show-sync').checked = view.showSync;
  document.getElementById('preset-wrap-names').checked = Boolean(view.wrapNames);
  document.getElementById('preset-exclude-combination-skus').checked = Boolean(view.excludeCombinationSkus);
  document.getElementById('preset-include-related-sku-context').checked = view.includeRelatedSkuContext !== false;
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
    showStatus:false,
    showCodes:document.getElementById('preset-show-codes').checked,
    showSellerNames:document.getElementById('preset-show-seller-names').checked,
    showInventory:document.getElementById('preset-show-inventory').checked,
    showPrice:document.getElementById('preset-show-price').checked,
    showDiscount:document.getElementById('preset-show-discount').checked,
    showAttributes:document.getElementById('preset-show-attributes').checked,
    showSync:document.getElementById('preset-show-sync').checked,
    wrapNames:document.getElementById('preset-wrap-names').checked,
    excludeCombinationSkus:document.getElementById('preset-exclude-combination-skus').checked,
    includeRelatedSkuContext:document.getElementById('preset-include-related-sku-context').checked,
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

const bulkSourceRefreshModal = document.getElementById('bulk-source-refresh-modal');
const bulkSourceRefreshColumns = document.getElementById('bulk-source-refresh-columns');
const bulkSourceRefreshPreview = document.getElementById('bulk-source-refresh-preview');
const bulkSourceRefreshPreviewButton = document.getElementById('bulk-source-refresh-preview-run');
const bulkSourceRefreshApplyButton = document.getElementById('bulk-source-refresh-apply');
const bulkSourceRefreshConfirm = document.getElementById('bulk-source-refresh-confirm');

function selectedBulkSourceRefreshFields() {
  return [...bulkSourceRefreshColumns.querySelectorAll('input[type="checkbox"]:checked')]
    .map(input => input.value)
    .filter(fieldKey => Boolean(BULK_SOURCE_REFRESH_FIELDS[fieldKey]));
}

function bulkSourceRefreshConfirmationPhrase(fields = bulkSourceRefreshState.fields) {
  return `전체 원본값 갱신: ${fields.map(fieldKey => BULK_SOURCE_REFRESH_FIELDS[fieldKey].label).join(', ')}`;
}

function normalizeBulkSourceRefreshResult(result, fieldKey, requestId, dryRun) {
  const row = Array.isArray(result) ? result[0] : (result || {});
  return {
    requestId:String(row.request_id || requestId || ''),
    fieldKey:String(row.field_key || fieldKey || ''),
    totalCount:Number(row.total_sku_count || 0),
    sourceCount:Number(row.source_value_count || 0),
    changedCount:Number(row.affected_count ?? row.changed_count ?? 0),
    unchangedCount:Number(row.skipped_count ?? row.unchanged_count ?? 0),
    missingCount:Number(row.source_missing_count ?? row.missing_source_count ?? 0),
    dryRun:row.dry_run === undefined ? Boolean(dryRun) : Boolean(row.dry_run),
    completedAt:row.completed_at || ''
  };
}

function setBulkSourceRefreshBusy(busy, label = '') {
  bulkSourceRefreshState.running = Boolean(busy);
  bulkSourceRefreshColumns.querySelectorAll('input').forEach(input => { input.disabled = busy || bulkSourceRefreshState.previewed; });
  bulkSourceRefreshPreviewButton.disabled = busy;
  document.getElementById('bulk-source-refresh-preview-reset').disabled = busy;
  document.getElementById('bulk-source-refresh-cancel').disabled = busy;
  document.getElementById('bulk-source-refresh-close').disabled = busy;
  bulkSourceRefreshApplyButton.disabled = busy || bulkSourceRefreshConfirm.value.trim() !== bulkSourceRefreshConfirmationPhrase();
  if (label) (bulkSourceRefreshState.previewed ? bulkSourceRefreshApplyButton : bulkSourceRefreshPreviewButton).textContent = label;
}

function resetBulkSourceRefresh({clearSelection = true} = {}) {
  bulkSourceRefreshState.previewed = false;
  bulkSourceRefreshState.running = false;
  bulkSourceRefreshState.fields = [];
  bulkSourceRefreshState.results = [];
  if (clearSelection) bulkSourceRefreshColumns.querySelectorAll('input').forEach(input => { input.checked = false; });
  bulkSourceRefreshColumns.querySelectorAll('input').forEach(input => { input.disabled = false; });
  bulkSourceRefreshPreview.hidden = true;
  bulkSourceRefreshPreviewButton.hidden = false;
  bulkSourceRefreshPreviewButton.disabled = false;
  bulkSourceRefreshPreviewButton.textContent = '영향 미리보기';
  bulkSourceRefreshApplyButton.hidden = true;
  bulkSourceRefreshApplyButton.disabled = true;
  bulkSourceRefreshApplyButton.textContent = '전체 DB 갱신 실행';
  bulkSourceRefreshConfirm.value = '';
  document.getElementById('bulk-source-refresh-error').hidden = true;
}

function openBulkSourceRefresh() {
  if (!liveData?.refreshMasterColumnFromSource) {
    showToast('컬럼 전체 원본값 갱신 기능을 불러오지 못했습니다. DB 배포 상태를 확인해주세요.');
    return;
  }
  resetBulkSourceRefresh();
  bulkSourceRefreshModal.hidden = false;
  bulkSourceRefreshColumns.querySelector('input')?.focus();
}

function closeBulkSourceRefresh() {
  if (bulkSourceRefreshState.running) return;
  bulkSourceRefreshModal.hidden = true;
  resetBulkSourceRefresh();
}

function renderBulkSourceRefreshPreview() {
  const totals = bulkSourceRefreshState.results.reduce((sum, row) => ({
    total:sum.total + row.totalCount,
    source:sum.source + row.sourceCount,
    changed:sum.changed + row.changedCount,
    unchanged:sum.unchanged + row.unchangedCount,
    missing:sum.missing + row.missingCount
  }), {total:0, source:0, changed:0, unchanged:0, missing:0});
  document.getElementById('bulk-source-refresh-preview-cards').innerHTML = bulkSourceRefreshState.results.map(row => {
    const info = BULK_SOURCE_REFRESH_FIELDS[row.fieldKey] || {label:row.fieldKey, sourceLabel:'셀피아 원본'};
    return `<article data-bulk-source-field="${escapeHtml(row.fieldKey)}"><header><b>${escapeHtml(info.label)}</b><span>${escapeHtml(info.sourceLabel)}</span></header><div><span>전체 SKU<b>${formatNumber(row.totalCount)}</b></span><span>변경 대상<b>${formatNumber(row.changedCount)}</b></span><span>이미 동일<b>${formatNumber(row.unchangedCount)}</b></span><span>원본 없음<b>${formatNumber(row.missingCount)}</b></span></div></article>`;
  }).join('') + `<p class="bulk-source-refresh-total">선택 컬럼 합계 · 변경 대상 <b>${formatNumber(totals.changed)}</b>건 · 이미 동일 ${formatNumber(totals.unchanged)}건 · 원본 없음 ${formatNumber(totals.missing)}건</p>`;
  document.getElementById('bulk-source-refresh-preview-time').textContent = 'DB 값을 변경하지 않은 dry-run 결과입니다.';
  document.getElementById('bulk-source-refresh-confirm-phrase').textContent = bulkSourceRefreshConfirmationPhrase();
  bulkSourceRefreshPreview.hidden = false;
  bulkSourceRefreshPreviewButton.hidden = true;
  bulkSourceRefreshApplyButton.hidden = false;
  bulkSourceRefreshApplyButton.disabled = true;
  bulkSourceRefreshConfirm.value = '';
  bulkSourceRefreshConfirm.focus();
}

async function previewBulkSourceRefresh() {
  const fields = selectedBulkSourceRefreshFields();
  if (!fields.length) {
    showToast('원본값을 적용할 컬럼을 하나 이상 선택해주세요.');
    return;
  }
  const errorBox = document.getElementById('bulk-source-refresh-error');
  errorBox.hidden = true;
  bulkSourceRefreshState.fields = fields;
  bulkSourceRefreshState.results = [];
  setBulkSourceRefreshBusy(true, 'DB 미리보기 중…');
  try {
    for (const fieldKey of fields) {
      const requestId = createRequestId();
      const result = await liveData.refreshMasterColumnFromSource({fieldKey, actor:'operations-hub', requestId, dryRun:true});
      const normalized = normalizeBulkSourceRefreshResult(result, fieldKey, requestId, true);
      if (!normalized.dryRun) throw new Error(`${BULK_SOURCE_REFRESH_FIELDS[fieldKey].label} 미리보기가 dry-run으로 처리되지 않았습니다.`);
      bulkSourceRefreshState.results.push(normalized);
    }
    bulkSourceRefreshState.previewed = true;
    renderBulkSourceRefreshPreview();
  } catch (error) {
    console.error('bulk source refresh preview failed', error);
    errorBox.textContent = `미리보기 실패: ${error?.message || error}`;
    errorBox.hidden = false;
  } finally {
    setBulkSourceRefreshBusy(false);
    bulkSourceRefreshPreviewButton.textContent = '영향 미리보기';
  }
}

async function applyBulkSourceRefresh() {
  const phrase = bulkSourceRefreshConfirmationPhrase();
  if (!bulkSourceRefreshState.previewed || bulkSourceRefreshConfirm.value.trim() !== phrase) {
    showToast('화면에 표시된 실행 확인 문구를 그대로 입력해주세요.');
    return;
  }
  const errorBox = document.getElementById('bulk-source-refresh-error');
  errorBox.hidden = true;
  setBulkSourceRefreshBusy(true, '전체 DB 갱신 중…');
  const completed = [];
  try {
    for (const preview of bulkSourceRefreshState.results) {
      const result = await liveData.refreshMasterColumnFromSource({
        fieldKey:preview.fieldKey,
        actor:'operations-hub',
        requestId:preview.requestId || createRequestId(),
        dryRun:false
      });
      const normalized = normalizeBulkSourceRefreshResult(result, preview.fieldKey, preview.requestId, false);
      if (normalized.dryRun) throw new Error(`${BULK_SOURCE_REFRESH_FIELDS[preview.fieldKey].label}이 실제 갱신으로 처리되지 않았습니다.`);
      completed.push(normalized);
    }
    const changedCount = completed.reduce((sum, row) => sum + row.changedCount, 0);
    await loadLiveMatrix();
    void loadLiveDashboardMetrics();
    bulkSourceRefreshState.running = false;
    closeBulkSourceRefresh();
    showToast(`컬럼 전체 원본값 갱신 완료 · ${completed.length}개 컬럼 · ${formatNumber(changedCount)}건 저장`);
  } catch (error) {
    console.error('bulk source refresh apply failed', error);
    const completedLabels = completed.map(row => BULK_SOURCE_REFRESH_FIELDS[row.fieldKey]?.label).filter(Boolean);
    errorBox.textContent = `전체 갱신 실패: ${error?.message || error}${completedLabels.length ? ` · 완료된 컬럼: ${completedLabels.join(', ')}` : ''} · 처리 여부가 불확실할 수 있으니 DB 새로고침 후 다시 미리보기하세요.`;
    errorBox.hidden = false;
  } finally {
    if (!bulkSourceRefreshModal.hidden) {
      setBulkSourceRefreshBusy(false);
      bulkSourceRefreshApplyButton.textContent = '전체 DB 갱신 실행';
    }
  }
}

document.getElementById('matrix-bulk-source-refresh-btn').addEventListener('click', openBulkSourceRefresh);
document.getElementById('view-settings-bulk-source-refresh').addEventListener('click', () => {
  closeViewSettings();
  openBulkSourceRefresh();
});
document.getElementById('bulk-source-refresh-close').addEventListener('click', closeBulkSourceRefresh);
document.getElementById('bulk-source-refresh-cancel').addEventListener('click', closeBulkSourceRefresh);
document.getElementById('bulk-source-refresh-preview-reset').addEventListener('click', () => resetBulkSourceRefresh({clearSelection:false}));
document.getElementById('bulk-source-refresh-preview-run').addEventListener('click', previewBulkSourceRefresh);
document.getElementById('bulk-source-refresh-apply').addEventListener('click', applyBulkSourceRefresh);
bulkSourceRefreshConfirm.addEventListener('input', () => {
  bulkSourceRefreshApplyButton.disabled = bulkSourceRefreshState.running || bulkSourceRefreshConfirm.value.trim() !== bulkSourceRefreshConfirmationPhrase();
});
bulkSourceRefreshModal.addEventListener('click', event => { if (event.target === bulkSourceRefreshModal) closeBulkSourceRefresh(); });

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
  return [...groups.entries()].map(([group, fields]) => `<optgroup label="${escapeHtml(group)}">${fields.map(item => `<option value="${item.field}"${item.field === selectedField ? ' selected' : ''}>${escapeHtml(`${group} · ${item.label}`)}</option>`).join('')}</optgroup>`).join('');
}

function advancedFilterOperatorOptions(type, selectedOperator) {
  return (ADVANCED_FILTER_OPERATORS[type] || ADVANCED_FILTER_OPERATORS.text).map(([value, label]) => `<option value="${value}"${value === selectedOperator ? ' selected' : ''}>${label}</option>`).join('');
}

function advancedFilterValueControl(condition, fieldInfo, index) {
  const noValue = ['empty','not_empty'].includes(condition.operator);
  if (fieldInfo.type === 'status') {
    const options = [['connected','연결 완료'],['unmatched','미매칭']];
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
  const statusLabels = {connected:'연결 완료', review:'연결 완료', unmatched:'미매칭'};
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
  if ((event.ctrlKey || event.metaKey) && event.target.closest('td')) return;
  const priceEditButton = event.target.closest('[data-price-edit]');
  if (priceEditButton) {
    const editable = priceEditButton.closest('td')?.querySelector('.price-component-base');
    if (editable) openMatrixInlineEditor(editable);
    return;
  }
  const inboundCostButton = event.target.closest('[data-inbound-cost-edit]');
  if (inboundCostButton) {
    openInboundCostModal(matrixRowsBySku.get(inboundCostButton.dataset.sku));
    return;
  }
  const discountButton = event.target.closest('[data-discount-edit]');
  if (discountButton) {
    openDiscountEditor(discountButton);
    return;
  }
  const skuLink = event.target.closest('[data-open-sku-links]');
  if (skuLink) {
    const row = skuLink.closest('tr[data-sku]');
    if (row) {
      drawerState.activeTab = 'connections';
      openProductDrawer(row);
    }
    return;
  }
  const multiLinkButton = event.target.closest('[data-open-multi-link]');
  if (multiLinkButton) {
    openMultiLinkWorkspace(multiLinkButton.dataset.openMultiLink, multiLinkButton.dataset.linkSku);
    return;
  }
  const mappingButton = event.target.closest('.mapping-code-button');
  if (mappingButton) {
    const row = mappingButton.closest('tr[data-sku]');
    const source = mappingButton.dataset.linkSource;
    const product = matrixRowsBySku.get(row?.dataset.sku);
    const pendingDraft = product?.__sellerProductLinkDrafts?.[source];
    if (pendingDraft) {
      if (mappingButton.dataset.codeKind === 'option') {
        openMappingSearch({
          source,
          sku:row.dataset.sku,
          anchor:mappingButton,
          fixedProductCode:pendingDraft.product_code
        });
      } else {
        showToast(`${pendingDraft.product_code} 상품코드만 복제된 상태입니다. 옵션 셀의 ‘+ 옵션 추가’를 눌러 연결하세요.`);
      }
      return;
    }
    openListingLinkManager({
      source,
      sku:row.dataset.sku,
      anchor:mappingButton
    });
    return;
  }
  if (event.target.closest('.row-check')) return;
  const cell = event.target.closest('td');
  if (cell && !event.ctrlKey && !event.metaKey) selectMatrixCell(cell, {extend:event.shiftKey});
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

function openMatrixInlineEditor(cell) {
  if (!cell) return;
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
      showToast(signedNumber ? '옵션가는 음수를 포함한 숫자로 입력해주세요.' : `${cell.dataset.field || '값'}은 0 이상의 숫자로 입력해주세요.`);
      after = before;
      save = false;
    }
    if (save && after !== before) {
      if (cell.matches('.sellpia-edit')) {
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
        const currentPrice = product?.__sellerPriceComponents?.[cell.dataset.source] || {};
        const currentBasePrice = currentPrice.draft_base_price ?? currentPrice.source_base_price ?? product?.[`${cell.dataset.source}_base_price`] ?? product?.[`${cell.dataset.source}_price`];
        const currentOptionPrice = currentPrice.draft_option_price ?? currentPrice.source_option_price ?? product?.[`${cell.dataset.source}_option_price`] ?? 0;
        const sellerProductCode = priceComponent === 'base' ? String(cell.dataset.sellerProductCode || '').trim() : '';
        const mergedGroupSize = Math.max(1, Number(cell.dataset.groupSize) || 1);
        const groupResult = sellerProductCode && mergedGroupSize > 1 && liveData.saveSellerProductBaseDrafts
          ? await liveData.saveSellerProductBaseDrafts({
              source:cell.dataset.source,
              productCode:sellerProductCode,
              targetBasePrice:Number(after)
            })
          : null;
        const result = groupResult || (priceComponent
          ? await liveData.saveSellerPriceDraft({
              sku:row.dataset.sku,
              source:cell.dataset.source,
              targetBasePrice:priceComponent === 'base' ? Number(after) : Number(currentBasePrice),
              inputMode:priceComponent === 'final' ? 'final' : 'option',
              targetFinalPrice:priceComponent === 'final' ? Number(after) : null,
              optionPrice:priceComponent === 'option' ? Number(after) : Number(currentOptionPrice),
              optionPriceSource:priceComponent === 'option' ? 'manual' : (currentPrice.option_price_source || 'original'),
              basePriceSource:priceComponent === 'base' ? 'manual' : (currentPrice.base_price_source || 'source'),
              priceRuleSetId:currentPrice.price_rule_set_id || null
            })
          : await liveData.saveSellerValueDraft({
              sku:row.dataset.sku,
              source:cell.dataset.source,
              fieldKey:cell.dataset.fieldKey,
              after
            }));
        if (groupResult) {
          for (const saved of groupResult.items || []) {
            applyLocalSellerPriceDraft(matrixRowsBySku.get(saved.sku), cell.dataset.source, saved.result);
          }
        } else if (priceComponent) applyLocalSellerPriceDraft(product, cell.dataset.source, result);
        else applyLocalSellerDraft(product, cell.dataset.source, cell.dataset.fieldKey, after, result);
        showToast(groupResult
          ? `${cell.dataset.field}를 같은 판매처 상품 ${groupResult.savedCount}개 옵션에 저장했습니다.`
          : result?.draft_status === 'unchanged'
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
}

matrixBody.addEventListener('dblclick', event => {
  if (event.target.closest('.mapping-code-button,.row-check,[data-discount-edit],[data-price-edit],[data-inbound-cost-edit]')) return;
  const tableCell = event.target.closest('td');
  const cell = event.target.closest('.editable-cell') || tableCell?.querySelector('.sellpia-edit');
  if (!cell) {
    const row = event.target.closest('tr[data-sku]');
    if (row) openProductDrawer(row);
    return;
  }
  openMatrixInlineEditor(cell);
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
    return CODE_LIST_SOURCES.some(source => source.aliases.some(alias => headers.includes(normalizeCodeListHeader(alias))));
  });
  if (headerIndex < 0) throw new Error('셀피아·스마트스토어·메이크샵·에이블리 중 코드 열을 찾지 못했습니다.');
  const headers = (rows[headerIndex] || []).map(normalizeCodeListHeader);
  const indexes = Object.fromEntries(CODE_LIST_SOURCES.map(source => [
    source.key,
    headers.findIndex(header => source.aliases.some(alias => header === normalizeCodeListHeader(alias)))
  ]));
  const entries = [];
  const invalid = [];
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const rowNo = headerIndex + offset + 2;
    const values = CODE_LIST_SOURCES.filter(source => indexes[source.key] >= 0).map(source => ({
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

let matrixSearchTimer;
codeListSearchInput.addEventListener('input', event => {
  matrixState.search = event.target.value.trim();
  clearTimeout(matrixSearchTimer);
  matrixSearchTimer = setTimeout(() => loadLiveMatrix({resetPage:true}), MATRIX_SEARCH_DEBOUNCE_MS);
});
codeListSearchInput.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.isComposing) return;
  event.preventDefault();
  clearTimeout(matrixSearchTimer);
  matrixState.search = event.currentTarget.value.trim();
  loadLiveMatrix({resetPage:true});
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
const priceRuleBulkState = {
  running:false, cancelRequested:false, ruleSets:[], ruleTags:[], composerTagIds:[],
  selectedSkus:[]
};

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

function fillPriceRuleBulkSetSelect(selectedId = '') {
  const select = document.getElementById('price-rule-bulk-set');
  select.innerHTML = '<option value="">가격 조합 선택…</option>' + priceRuleBulkState.ruleSets.map(ruleSet => `<option value="${Number(ruleSet.price_rule_set_id)}">${escapeHtml(ruleSet.set_name)}</option>`).join('');
  select.value = selectedId ? String(selectedId) : '';
  updatePriceRuleBulkSetSummary();
}

function resetPriceRuleBulkComposer() {
  priceRuleBulkState.composerTagIds = [];
  document.getElementById('price-rule-bulk-composer-name').value = '';
  renderPriceRuleBulkComposer();
}

function renderPriceRuleBulkComposer() {
  const tagsById = new Map(priceRuleBulkState.ruleTags.map(tag => [Number(tag.price_rule_tag_id), tag]));
  const selected = priceRuleBulkState.composerTagIds.map((tagId, index) => {
    const tag = tagsById.get(Number(tagId));
    if (!tag) return '';
    return `<article data-bulk-composer-index="${index}"><strong>${index + 1}</strong><span><b>${escapeHtml(tag.tag_name)}</b><em>${escapeHtml(priceRuleTagSummary(tag))}</em></span><div><button type="button" data-bulk-composer-move="up" aria-label="위로">↑</button><button type="button" data-bulk-composer-move="down" aria-label="아래로">↓</button><button type="button" data-bulk-composer-remove aria-label="삭제">×</button></div></article>`;
  }).join('');
  document.getElementById('price-rule-bulk-composer-steps').innerHTML = selected || '<p>계산 태그를 하나 이상 추가해주세요.</p>';
  document.getElementById('price-rule-bulk-composer-add').innerHTML = '<option value="">계산 태그 선택…</option>' + priceRuleBulkState.ruleTags
    .filter(tag => !priceRuleBulkState.composerTagIds.includes(Number(tag.price_rule_tag_id)))
    .map(tag => `<option value="${Number(tag.price_rule_tag_id)}">${escapeHtml(tag.tag_name)} · ${escapeHtml(priceRuleTagSummary(tag))}</option>`).join('');
  const hasName = Boolean(document.getElementById('price-rule-bulk-composer-name').value.trim());
  document.getElementById('price-rule-bulk-composer-save').disabled = !hasName || !priceRuleBulkState.composerTagIds.length || priceRuleBulkState.running;
}

function syncPriceRuleBulkSources() {
  priceRuleBulkModal.querySelectorAll('.price-rule-bulk-sources input').forEach(input => {
    input.disabled = false;
  });
}

async function openPriceRuleBulk() {
  if (!liveData?.loadPriceRuleTags || !liveData?.loadPriceRuleSets || !liveData?.savePriceRuleSet || !liveData?.savePriceRuleAssignmentsBulk || !liveData?.stageAssignedPriceDraftsBulk) {
    showToast('선택 SKU 가격 조합 배정 기능을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    return;
  }
  const selectedTargets = selectedMatrixTargets();
  priceRuleBulkState.selectedSkus = selectedTargets.skus;
  if (!priceRuleBulkState.selectedSkus.length) {
    showToast('가격 조합을 적용할 셀을 먼저 선택해주세요. 선택한 셀이 속한 SKU 행만 작업합니다.');
    return;
  }
  document.getElementById('price-rule-bulk-selected-count').textContent = `${formatNumber(priceRuleBulkState.selectedSkus.length)}개 SKU`;
  const selectedScope = priceRuleBulkModal.querySelector('input[name="price-rule-bulk-scope"][value="selected"]');
  selectedScope.checked = true;
  selectedScope.disabled = false;
  priceRuleBulkModal.querySelectorAll('.price-rule-bulk-sources input').forEach(input => {
    input.checked = true;
  });
  syncPriceRuleBulkSources();
  resetPriceRuleBulkComposer();
  document.getElementById('price-rule-bulk-progress').hidden = true;
  document.getElementById('price-rule-bulk-run').disabled = true;
  document.getElementById('price-rule-bulk-stage').disabled = false;
  document.getElementById('price-rule-bulk-run').textContent = '규칙 불러오는 중…';
  document.getElementById('price-rule-bulk-cancel').textContent = '취소';
  priceRuleBulkModal.hidden = false;
  try {
    [priceRuleBulkState.ruleTags, priceRuleBulkState.ruleSets] = await Promise.all([
      liveData.loadPriceRuleTags(), liveData.loadPriceRuleSets()
    ]);
    fillPriceRuleBulkSetSelect();
    renderPriceRuleBulkComposer();
    document.getElementById('price-rule-bulk-run').disabled = !priceRuleBulkState.ruleSets.length;
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
  return [...priceRuleBulkState.selectedSkus];
}

async function resolvePriceRuleBulkTargetGroups(sources) {
  const skus = [...new Set((await resolvePriceRuleBulkSkus()).map(value => String(value || '').trim()).filter(Boolean))];
  return skus.length ? [{sources, skus}] : [];
}

async function runPriceRuleBulk() {
  if (priceRuleBulkState.running) return;
  const ruleSetId = Number(document.getElementById('price-rule-bulk-set').value || 0);
  const sources = [...priceRuleBulkModal.querySelectorAll('.price-rule-bulk-sources input:checked')].map(input => input.value);
  if (!priceRuleBulkState.selectedSkus.length) { showToast('가격 수정안을 만들 셀을 먼저 선택해주세요.'); return; }
  if (!sources.length) { showToast('판매처를 하나 이상 선택해주세요.'); return; }
  if (!ruleSetId) { showToast('배정할 가격 조합을 선택해주세요.'); return; }
  priceRuleBulkState.running = true;
  priceRuleBulkState.cancelRequested = false;
  const runButton = document.getElementById('price-rule-bulk-run');
  const stageButton = document.getElementById('price-rule-bulk-stage');
  runButton.disabled = true;
  stageButton.disabled = true;
  runButton.textContent = '배정 저장 중…';
  try {
    showPriceRuleBulkProgress(2, '상품 범위 확인 중', '현재 화면의 선택 조건을 SKU 목록으로 확인합니다.');
    const targetGroups = await resolvePriceRuleBulkTargetGroups(sources);
    if (!targetGroups.length) throw new Error('배정할 셀피아 SKU와 판매처 셀을 찾지 못했습니다.');
    const totalTargets = targetGroups.reduce((sum, group) => sum + group.skus.length * group.sources.length, 0);
    let processedTargets = 0;
    let assignedRows = 0;
    let skippedSkus = 0;
    const batchSize = 500;
    for (const group of targetGroups) {
      let offset = 0;
      while (offset < group.skus.length) {
        if (priceRuleBulkState.cancelRequested) throw new Error('선택 SKU 가격 조합 배정을 중단했습니다.');
        const batch = group.skus.slice(offset, offset + batchSize);
        const result = await liveData.savePriceRuleAssignmentsBulk({skus:batch, sources:group.sources, ruleSetId});
        offset += batch.length;
        processedTargets += batch.length * group.sources.length;
        assignedRows += Number(result.assigned_rows || 0);
        skippedSkus += Number(result.skipped_skus || 0);
        showPriceRuleBulkProgress(30 + (processedTargets / totalTargets) * 68, '가격 규칙 배정 중', `${formatNumber(processedTargets)} / ${formatNumber(totalTargets)}개 판매처 셀 · ${formatNumber(assignedRows)}개 배정 저장`);
        await new Promise(resolve => window.setTimeout(resolve, 0));
      }
    }
    showPriceRuleBulkProgress(100, '배정 완료', `${formatNumber(assignedRows)}개 판매처 셀 규칙 저장${skippedSkus ? ` · 미발견 ${formatNumber(skippedSkus)}개` : ''}`);
    showToast('선택한 SKU 행에 가격 조합을 저장했습니다. 실제 가격 수정안은 아직 만들지 않았습니다.');
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
  if (!priceRuleBulkState.selectedSkus.length) { showToast('가격 조합을 적용할 셀을 먼저 선택해주세요.'); return; }
  if (!sources.length) { showToast('판매처를 하나 이상 선택해주세요.'); return; }
  priceRuleBulkState.running = true;
  priceRuleBulkState.cancelRequested = false;
  const runButton = document.getElementById('price-rule-bulk-run');
  const stageButton = document.getElementById('price-rule-bulk-stage');
  runButton.disabled = true;
  stageButton.disabled = true;
  stageButton.textContent = '가격 수정안 생성 중…';
  try {
    showPriceRuleBulkProgress(2, '상품 범위 확인 중', '배정된 가격 조합과 시스템 기준가격을 확인합니다.');
    const targetGroups = await resolvePriceRuleBulkTargetGroups(sources);
    if (!targetGroups.length) throw new Error('가격 수정안을 만들 셀피아 SKU와 판매처 셀을 찾지 못했습니다.');
    const totalTargets = targetGroups.reduce((sum, group) => sum + group.skus.length * group.sources.length, 0);
    const batchId = createRequestId();
    let processedTargets = 0;
    let pendingDrafts = 0;
    let unchangedDrafts = 0;
    let failedRows = 0;
    let unassignedRows = 0;
    const errors = [];
    const batchSize = 100;
    for (const group of targetGroups) {
      let offset = 0;
      while (offset < group.skus.length) {
        if (priceRuleBulkState.cancelRequested) throw new Error('가격 수정안 생성을 중단했습니다.');
        const batch = group.skus.slice(offset, offset + batchSize);
        const result = await liveData.stageAssignedPriceDraftsBulk({skus:batch, sources:group.sources, batchId});
        offset += batch.length;
        processedTargets += batch.length * group.sources.length;
        pendingDrafts += Number(result.pending_drafts || 0);
        unchangedDrafts += Number(result.unchanged_drafts || 0);
        failedRows += Number(result.failed_rows || 0);
        unassignedRows += Number(result.unassigned_rows || 0);
        errors.push(...(Array.isArray(result.errors) ? result.errors : []));
        showPriceRuleBulkProgress(30 + (processedTargets / totalTargets) * 68, '가격 수정안 생성 중', `${formatNumber(processedTargets)} / ${formatNumber(totalTargets)}개 판매처 셀 · 수정안 ${formatNumber(pendingDrafts)}건 · 동일가 ${formatNumber(unchangedDrafts)}건`);
        await new Promise(resolve => window.setTimeout(resolve, 0));
      }
    }
    const errorSummary = errors.slice(0, 3).map(item => `${item.sku || '-'} ${CHANNEL_LABELS[item.source] || item.source}: ${item.message}`).join(' / ');
    showPriceRuleBulkProgress(100, '가격 수정안 생성 완료', `수정안 ${formatNumber(pendingDrafts)}건 · 동일가 ${formatNumber(unchangedDrafts)}건 · 미배정 ${formatNumber(unassignedRows)}건 · 실패 ${formatNumber(failedRows)}건${errorSummary ? ` · ${errorSummary}` : ''}`);
    showToast('배정된 가격 규칙으로 검토용 수정안을 만들었습니다. 매트릭스에서 판매가·옵션가·최종구매가를 확인해주세요.');
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
document.getElementById('price-rule-bulk-composer-name').addEventListener('input', renderPriceRuleBulkComposer);
document.getElementById('price-rule-bulk-composer-add').addEventListener('change', event => {
  const tagId = Number(event.target.value || 0);
  if (tagId && !priceRuleBulkState.composerTagIds.includes(tagId)) priceRuleBulkState.composerTagIds.push(tagId);
  renderPriceRuleBulkComposer();
});
document.getElementById('price-rule-bulk-composer-steps').addEventListener('click', event => {
  const row = event.target.closest('[data-bulk-composer-index]');
  if (!row) return;
  const index = Number(row.dataset.bulkComposerIndex);
  if (event.target.closest('[data-bulk-composer-remove]')) priceRuleBulkState.composerTagIds.splice(index, 1);
  if (event.target.dataset.bulkComposerMove === 'up' && index > 0) [priceRuleBulkState.composerTagIds[index - 1], priceRuleBulkState.composerTagIds[index]] = [priceRuleBulkState.composerTagIds[index], priceRuleBulkState.composerTagIds[index - 1]];
  if (event.target.dataset.bulkComposerMove === 'down' && index < priceRuleBulkState.composerTagIds.length - 1) [priceRuleBulkState.composerTagIds[index + 1], priceRuleBulkState.composerTagIds[index]] = [priceRuleBulkState.composerTagIds[index], priceRuleBulkState.composerTagIds[index + 1]];
  renderPriceRuleBulkComposer();
});
document.getElementById('price-rule-bulk-composer-reset').addEventListener('click', resetPriceRuleBulkComposer);
document.getElementById('price-rule-bulk-composer-save').addEventListener('click', async event => {
  const setName = document.getElementById('price-rule-bulk-composer-name').value.trim();
  if (!setName || !priceRuleBulkState.composerTagIds.length || priceRuleBulkState.running) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = '조합 저장 중…';
  try {
    const savedSet = await liveData.savePriceRuleSet({
      setName,
      color:'#1558c0',
      tagIds:priceRuleBulkState.composerTagIds,
      note:'선택 SKU 가격 조합 배정 팝업에서 생성'
    });
    priceRuleBulkState.ruleSets = await liveData.loadPriceRuleSets();
    fillPriceRuleBulkSetSelect(savedSet.price_rule_set_id);
    resetPriceRuleBulkComposer();
    document.getElementById('price-rule-bulk-run').disabled = !priceRuleBulkScope();
    void window.SystemV3PriceRuleLab?.refresh?.();
    showToast(`‘${savedSet.set_name}’ 가격 조합을 저장하고 선택했습니다. 아직 상품에는 배정하지 않았습니다.`);
  } catch (error) {
    console.error('bulk price combination save failed', error);
    showToast(`가격 조합 저장 실패: ${error?.message || error}`);
  } finally {
    button.textContent = '조합 저장 후 선택';
    renderPriceRuleBulkComposer();
  }
});
document.getElementById('matrix-refresh-btn').addEventListener('click', () => refreshLiveData());
topRefreshButton?.addEventListener('click', async () => {
  if (systemHealthState.refreshing || topRefreshButton.disabled) return;
  try {
    const result = await refreshLiveData();
    const failed = Object.entries(result).filter(([, succeeded]) => !succeeded).map(([component]) => component);
    if (!failed.length) showToast('운영 데이터를 최신 상태로 다시 조회했습니다.');
    else if (failed.length < Object.keys(result).length) showToast(`새로고침 일부 지연 · ${formatNumber(failed.length)}개 조회를 다시 확인해주세요.`);
    else showToast('DB 조회에 실패했습니다. 기존 화면은 유지됩니다.');
  } catch (error) {
    console.error('operations hub global refresh failed', error);
    showToast('DB 조회에 실패했습니다. 기존 화면은 유지됩니다.');
  }
});
document.getElementById('matrix-prev').addEventListener('click', () => {
  if (matrixState.loading || matrixState.page <= 1) return;
  matrixState.page -= 1;
  loadLiveMatrix({resetScroll:true});
});
document.getElementById('matrix-next').addEventListener('click', () => {
  if (matrixState.loading || matrixState.page * matrixState.pageSize >= matrixState.total) return;
  matrixState.page += 1;
  loadLiveMatrix({resetScroll:true});
});

const matrixPageInput = document.getElementById('matrix-page');
function moveToEnteredMatrixPage() {
  const totalPages = Math.max(1, Math.ceil(matrixState.total / matrixState.pageSize));
  if (matrixState.loading) {
    matrixPageInput.value = String(matrixState.page);
    return;
  }
  const enteredPage = Number(matrixPageInput.value);
  if (!Number.isFinite(enteredPage)) {
    matrixPageInput.value = String(matrixState.page);
    return;
  }
  const targetPage = Math.max(1, Math.min(totalPages, Math.trunc(enteredPage)));
  matrixPageInput.value = String(targetPage);
  if (targetPage === matrixState.page) return;
  matrixState.page = targetPage;
  loadLiveMatrix({resetScroll:true});
}
matrixPageInput.addEventListener('focus', event => event.target.select());
matrixPageInput.addEventListener('change', moveToEnteredMatrixPage);
matrixPageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    moveToEnteredMatrixPage();
    matrixPageInput.blur();
  } else if (event.key === 'Escape') {
    matrixPageInput.value = String(matrixState.page);
    matrixPageInput.blur();
  }
});

const matrixPageSizeSelect = document.getElementById('matrix-page-size');
matrixPageSizeSelect.value = String(matrixState.pageSize);
matrixPageSizeSelect.addEventListener('change', event => {
  const nextPageSize = Number(event.target.value);
  if (![50, 100, 200].includes(nextPageSize) || nextPageSize === matrixState.pageSize) return;
  matrixState.pageSize = nextPageSize;
  localStorage.setItem(MATRIX_PAGE_SIZE_KEY, String(nextPageSize));
  loadLiveMatrix({resetPage:true, resetScroll:true});
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
  const input = event.target.closest('[data-drawer-value],[data-drawer-price-component],[data-discount-enabled],[data-discount-value],[data-discount-unit]');
  if (!input) return;
  const section = input.closest('.drawer-inventory-channel');
  const discountTerms = readDrawerDiscountTerms(section);
  const discountChanged = JSON.stringify(discountTerms) !== (section.dataset.savedDiscountTerms || '[]');
  const changed = discountChanged || [...section.querySelectorAll('[data-drawer-value],[data-drawer-price-component]')].some(item => item.value.trim() !== item.dataset.savedValue);
  section.classList.toggle('drawer-dirty', changed);
  const baseInput = section.querySelector('[data-drawer-price-component="base"]');
  const optionInput = section.querySelector('[data-drawer-price-component="option"]');
  const finalInput = section.querySelector('[data-drawer-price-component="final"]');
  if (input.dataset.drawerPriceComponent) {
    section.dataset.priceInputMode = input.dataset.drawerPriceComponent === 'final' ? 'final' : 'option';
  }
  if (optionInput && finalInput && baseInput) {
    const baseValue = Number(baseInput.value || 0);
    const source = section.dataset.source;
    const discountedBase = calculateNativeDiscountedBase(baseValue, discountTerms);
    const option = Number(optionInput.value || 0);
    let finalPrice = Number(finalInput.value || 0);
    let calculatedOption = option;
    if (input.dataset.drawerPriceComponent === 'base' || input.dataset.drawerPriceComponent === 'option' || input.dataset.discountIndex !== undefined) {
      finalPrice = Number(discountedBase || 0) + option;
      finalInput.value = Number.isFinite(finalPrice) ? String(finalPrice) : '';
    } else if (input.dataset.drawerPriceComponent === 'final') {
      calculatedOption = finalPrice - Number(discountedBase || 0);
      optionInput.value = Number.isFinite(calculatedOption) ? String(calculatedOption) : '';
    }
    const discountedOutput = section.querySelector('[data-drawer-discounted-base]');
    if (discountedOutput) discountedOutput.textContent = formatNullableNumber(discountedBase);
    const equation = section.querySelector('.drawer-price-equation');
    if (equation) equation.textContent = `판매가 ${formatNullableNumber(baseValue)} → 원본 할인 적용 ${formatNullableNumber(discountedBase)} + 옵션가 ${formatNullableNumber(calculatedOption)} = 최종구매가 ${formatNullableNumber(finalPrice)}`;
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
      basePrice:product?.system_base_price,
      ruleSetId:selectedRuleSetId,
      source,
      sourceDiscountTerms:product?.__sellerPriceComponents?.[source]?.draft_discount_terms
        ?? product?.__sellerPriceComponents?.[source]?.source_discount_terms
        ?? product?.[`${source}_discount_terms`] ?? []
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
      showToast('가격 조합 이름과 계산 단계를 입력해주세요.');
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
      const preview = await liveData.previewPriceRuleSet({
        basePrice:product.system_base_price,
        ruleSetId:savedSet.price_rule_set_id,
        source,
        sourceDiscountTerms:product?.__sellerPriceComponents?.[source]?.draft_discount_terms
          ?? product?.__sellerPriceComponents?.[source]?.source_discount_terms
          ?? product?.[`${source}_discount_terms`] ?? []
      });
      drawerState.priceRuleTags = ruleTags;
      drawerState.priceRuleSets = ruleSets;
      drawerState.priceRuleAssignments[source] = savedAssignment;
      drawerState.priceRuleSelections[source] = savedSet.price_rule_set_id;
      drawerState.priceRulePreviews[source] = preview;
      drawerState.priceComposers[source] = {name:'', tagIds:[], tagEdits:{}, editingTagId:null, open:false};
      renderCurrentPricePolicy(source, product, savedSet.price_rule_set_id);
      showToast(`‘${savedSet.set_name}’ 가격 조합을 만들고 ${CHANNEL_LABELS[source]} 현재 상품에 배정했습니다.`);
    } catch (error) {
      console.error('inline price tag composer save failed', error);
      composerSave.disabled = false;
      composerSave.textContent = originalLabel;
      showToast(`가격 조합 저장 실패: ${error?.message || error}`);
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
      const calculatedBasePrice = policyBox.dataset.calculatedBasePrice;
      if (calculatedBasePrice === '') return;
      const originalLabel = tagApply.textContent;
      tagApply.disabled = true;
      tagApply.textContent = '수정안 저장 중…';
      try {
        const result = await liveData.stageAssignedPriceDraftsBulk({skus:[sku], sources:[source], batchId:createRequestId()});
        if (Number(result?.failed_rows || 0) > 0) throw new Error(result?.errors?.[0]?.message || '가격·할인 태그 수정안을 만들지 못했습니다.');
        await loadLiveMatrix();
        const refreshedProduct = matrixRowsBySku.get(sku);
        if (refreshedProduct && productDrawer.getAttribute('aria-hidden') === 'false') renderDrawerInventory(refreshedProduct);
        refreshChangeQueueInBackground();
        void loadLiveDashboardMetrics();
        showToast(Number(result?.pending_drafts || 0) > 0
          ? `${CHANNEL_LABELS[source]} 판매가·할인 태그 수정안 ${Number(result.pending_drafts)}건을 저장했습니다.`
          : `${CHANNEL_LABELS[source]} 원본값과 태그 계산값이 같아 새 수정안이 없습니다.`);
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
      const preview = saved ? await liveData.previewPriceRuleSet({
        basePrice:product?.system_base_price,
        ruleSetId:saved.price_rule_set_id,
        source,
        sourceDiscountTerms:product?.__sellerPriceComponents?.[source]?.draft_discount_terms
          ?? product?.__sellerPriceComponents?.[source]?.source_discount_terms
          ?? product?.[`${source}_discount_terms`] ?? []
      }) : null;
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
  const baseInput = section.querySelector('[data-drawer-price-component="base"]');
  const optionInput = section.querySelector('[data-drawer-price-component="option"]');
  const finalInput = section.querySelector('[data-drawer-price-component="final"]');
  const stockChanged = stockInput && !stockInput.disabled && stockInput.value.trim() !== stockInput.dataset.savedValue;
  const baseChanged = baseInput && !baseInput.disabled && baseInput.value.trim() !== baseInput.dataset.savedValue;
  const optionChanged = optionInput && !optionInput.disabled && optionInput.value.trim() !== optionInput.dataset.savedValue;
  const finalChanged = finalInput && !finalInput.disabled && finalInput.value.trim() !== finalInput.dataset.savedValue;
  const discountTerms = readDrawerDiscountTerms(section);
  const discountChanged = JSON.stringify(discountTerms) !== (section.dataset.savedDiscountTerms || '[]');
  if (!stockChanged && !baseChanged && !optionChanged && !finalChanged && !discountChanged) {
    showToast('바뀐 재고·가격 값이 없습니다.');
    return;
  }
  if ((stockChanged && !/^\d+(\.\d+)?$/.test(stockInput.value.trim()))
      || (baseChanged && !/^\d+(\.\d+)?$/.test(baseInput.value.trim()))
      || (finalChanged && !/^\d+(\.\d+)?$/.test(finalInput.value.trim()))
      || (optionChanged && !/^-?\d+(\.\d+)?$/.test(optionInput.value.trim()))) {
    showToast('재고·판매가·최종구매가는 0 이상, 옵션가는 음수를 포함한 숫자로 입력해주세요.');
    return;
  }
  const targetFinalPrice = Number(finalInput?.value || 0);
  const targetBasePrice = Number(baseInput?.value || 0);
  const targetOptionPrice = Number(optionInput?.value || 0);
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
    if (baseChanged) {
      const saved = await liveData.saveSellerProductBaseDrafts({source, productCode:product?.[`${source}_product_code`], targetBasePrice});
      const currentResult = saved.items.find(item => item.sku === sku)?.result || saved.items[0]?.result;
      results.push(...saved.items.map(item => item.result));
      applyLocalSellerPriceDraft(product, source, currentResult);
    }
    if (optionChanged || finalChanged) {
      const result = await liveData.saveSellerPriceDraft({
        sku,
        source,
        targetBasePrice,
        inputMode:section.dataset.priceInputMode || (finalChanged ? 'final' : 'option'),
        targetFinalPrice,
        optionPrice:targetOptionPrice,
        optionPriceSource:optionChanged ? 'manual' : (product?.__sellerPriceComponents?.[source]?.option_price_source || 'original'),
        basePriceSource:baseChanged ? 'manual' : (product?.__sellerPriceComponents?.[source]?.base_price_source || 'source'),
        priceRuleSetId:product?.__sellerPriceComponents?.[source]?.price_rule_set_id || null,
        batchId
      });
      results.push(result);
      applyLocalSellerPriceDraft(product, source, result);
    }
    if (discountChanged) {
      const saved = await liveData.saveSellerProductDiscountDrafts({
        source,
        productCode:product?.[`${source}_product_code`],
        anchorSku:sku,
        discountTerms
      });
      const result = saved.items.find(item => item.sku === sku)?.result || saved.items[0]?.result;
      results.push(...saved.items.map(item => item.result));
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
document.getElementById('drawer-open-multi-links')?.addEventListener('click', () => {
  const sku = productDrawer.dataset.sku;
  closeProductDrawer();
  openMultiLinkWorkspace('all', sku);
});
document.querySelectorAll('[data-drawer-disconnect-source]').forEach(button => button.addEventListener('click', async event => {
  const source = event.currentTarget.dataset.drawerDisconnectSource;
  const sectionKey = CHANNEL_SECTION_KEYS[source];
  const section = sectionKey ? document.getElementById(`drawer-${sectionKey}`) : null;
  const sku = String(productDrawer.dataset.sku || '').trim();
  const productCode = String(section?.dataset.productCode || '').trim();
  const optionCode = String(section?.dataset.optionCode || '').trim();
  const sourceLabel = CHANNEL_LABELS[source] || source;
  if (!sku || !productCode || !liveData?.removeListingComponent) {
    showToast(`${sourceLabel}에서 해제할 현재 연결이 없습니다.`);
    return;
  }
  const connectionLabel = `${productCode}${optionCode ? ` / ${optionCode}` : ''}`;
  if (!window.confirm(`${sourceLabel} ${connectionLabel}와 셀피아 SKU ${sku}의 연결만 해제할까요?\n\n판매처 원본 상품은 삭제하거나 수정하지 않습니다.`)) return;
  const originalLabel = event.currentTarget.textContent;
  event.currentTarget.disabled = true;
  event.currentTarget.textContent = '해제 중…';
  try {
    await liveData.removeListingComponent({source, productCode, optionCode, sku});
    drawerState.linkRowsSku = '';
    await loadLiveMatrix();
    const refreshedRow = matrixBody.querySelector(`tr[data-sku="${CSS.escape(sku)}"]`);
    if (refreshedRow) {
      drawerState.activeTab = 'connections';
      openProductDrawer(refreshedRow);
    } else {
      closeProductDrawer();
    }
    showToast(`${sourceLabel} ${connectionLabel} 연결만 해제했습니다.`);
  } catch (error) {
    console.error('drawer seller connection remove failed', error);
    showToast(`연결 해제 실패: ${error?.message || error}`);
    event.currentTarget.disabled = false;
  } finally {
    event.currentTarget.textContent = originalLabel;
  }
}));
document.getElementById('drawer-link-manager')?.addEventListener('click', async event => {
  const listing = event.target.closest('[data-drawer-link-row]');
  if (!listing) return;
  const row = drawerState.linkRows[Number(listing.dataset.drawerLinkRow)];
  if (!row) return;
  const component = event.target.closest('.drawer-link-component');
  const refresh = async () => {
    drawerState.linkRowsSku = '';
    await Promise.all([loadDrawerListingLinks({force:true}), loadLiveMatrix()]);
  };
  if (event.target.closest('[data-drawer-component-save]') && component) {
    const button = event.target.closest('button');
    button.disabled = true;
    try {
      await liveData.saveListingComponent({source:row.source_channel, productCode:row.product_code, optionCode:row.option_code, sku:component.dataset.componentSku, qty:component.querySelector('[data-drawer-component-qty]').value, role:component.querySelector('[data-drawer-component-role]').value});
      await refresh();
      showToast(`${component.dataset.componentSku} 구성수량을 저장했습니다.`);
    } catch (error) { showToast(`구성 저장 실패: ${error?.message || error}`); }
    finally { button.disabled = false; }
    return;
  }
  if (event.target.closest('[data-drawer-component-remove]') && component) {
    if (!window.confirm(`${component.dataset.componentSku} 구성 연결을 해제할까요?`)) return;
    const button = event.target.closest('button');
    button.disabled = true;
    try {
      await liveData.removeListingComponent({componentId:component.dataset.componentId || null, source:row.source_channel, productCode:row.product_code, optionCode:row.option_code, sku:component.dataset.componentSku});
      await refresh();
      showToast(`${component.dataset.componentSku} 연결을 해제했습니다.`);
    } catch (error) { showToast(`연결 해제 실패: ${error?.message || error}`); }
    finally { button.disabled = false; }
    return;
  }
  if (event.target.closest('[data-drawer-stage-stock]')) {
    const button = event.target.closest('button');
    button.disabled = true;
    try {
      const result = await liveData.stageListingInventoryDraft({source:row.source_channel, productCode:row.product_code, optionCode:row.option_code, batchId:createRequestId()});
      await Promise.all([refresh(), loadChangeQueue({silent:true}), loadLiveDashboardMetrics()]);
      showToast(result?.draft_status === 'unchanged' ? '판매처 재고와 구성 계산재고가 일치합니다.' : `계산재고 ${formatNullableNumber(result.calculated_stock)}개를 내보내기 준비에 등록했습니다.`);
    } catch (error) { showToast(`계산재고 등록 실패: ${error?.message || error}`); }
    finally { button.disabled = false; }
  }
});
document.getElementById('drawer-link-manager')?.addEventListener('submit', async event => {
  const form = event.target.closest('.drawer-link-add');
  if (!form) return;
  event.preventDefault();
  const listing = form.closest('[data-drawer-link-row]');
  const row = drawerState.linkRows[Number(listing?.dataset.drawerLinkRow)];
  if (!row) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const addedSku = form.elements.sku.value.trim();
    await liveData.saveListingComponent({source:row.source_channel, productCode:row.product_code, optionCode:row.option_code, sku:addedSku, qty:form.elements.qty.value, role:form.elements.role.value});
    drawerState.linkRowsSku = '';
    await Promise.all([loadDrawerListingLinks({force:true}), loadLiveMatrix()]);
    showToast(`${addedSku}를 구성에 추가했습니다.`);
  } catch (error) { showToast(`구성 추가 실패: ${error?.message || error}`); }
  finally { button.disabled = false; }
});
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
  pending:'검증 대기', validated:'검증 완료', applied:'반영 완료',
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

function queueExportAuditMarkup(row) {
  if (Number(row.exported_file_count || 0) > 0) {
    return `<small class="queue-export-audit ready" title="최근 내보내기 ${escapeHtml(formatLiveTime(row.latest_exported_at))}">내보낸 파일 ${formatNumber(row.exported_file_count)}건</small>`;
  }
  if (Number(row.applied_file_count || 0) > 0) return `<small class="queue-export-audit applied">반영 확인 파일 ${formatNumber(row.applied_file_count)}건</small>`;
  if (Number(row.stale_file_count || 0) > 0) return `<small class="queue-export-audit stale">만료된 파일 ${formatNumber(row.stale_file_count)}건</small>`;
  return '';
}

function renderChangeQueue(rows) {
  queueState.rows = rows;
  if (!rows.length) {
    queueBody.innerHTML = '<tr class="queue-empty"><td colspan="10">현재 조건에 해당하는 내보내기 준비 항목이 없습니다.</td></tr>';
  } else {
    queueBody.innerHTML = rows.map(row => {
      const selectable = ['pending','validated','failed'].includes(row.status);
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
        <td><span class="queue-status ${escapeHtml(row.status)}">${escapeHtml(QUEUE_STATUS_LABELS[row.status] || row.status)}</span>${queueExportAuditMarkup(row)}</td>
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
  document.getElementById('queue-confirm-applied').disabled = !selected.some(row => row.status === 'validated' && row.has_exported_file);
}

async function loadChangeQueue({silent = false} = {}) {
  if (!liveData?.loadChangeQueue || queueState.loading) return;
  queueState.loading = true;
  const badge = document.getElementById('queue-live-status');
  if (!silent) {
    badge.className = 'live-data-badge loading';
    badge.textContent = 'DB 조회 중';
    queueBody.innerHTML = '<tr class="queue-empty"><td colspan="10">내보내기 준비 목록을 불러오는 중입니다.</td></tr>';
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
    queueBody.innerHTML = `<tr class="queue-empty"><td colspan="10">내보내기 준비 목록을 불러오지 못했습니다. ${escapeHtml(error?.message || error)}</td></tr>`;
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
    showToast(`내보내기 준비 작업 실패: ${error?.message || error}`);
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
  detailNode.textContent = sellerExportState.rows.length ? '선택한 내보내기 준비 항목을 확인합니다.' : '선택한 범위의 저장된 수정안을 확인합니다.';
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
      const scopeLabels = {filtered:'현재 검색·필터 결과', selected:'선택한 셀 범위의 SKU', all:'전체 내보내기 준비'};
      detailNode.textContent = `${scopeLabels[scope]} · ${sources.map(source => CHANNEL_LABELS[source] || source).join('·')}`;
    }
    countNode.textContent = `${formatNumber(count)}건`;
    if (sellerExportState.rows.length) detailNode.textContent = `내보내기 준비에서 선택한 항목 · ${sources.map(source => CHANNEL_LABELS[source] || source).join('·')}`;
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
  return selectedMatrixTargets().skus;
}

function selectedMatrixTargets() {
  const grid = matrixCellGrid();
  const rows = [...matrixBody.querySelectorAll('tr[data-sku]')];
  const selectedCells = matrixCellSelection.selected;
  if (!selectedCells.size) return {cells:[], skus:[], sources:[], sourceSkus:{smartstore:[], makeshop:[], ably:[]}};
  const cells = new Set();
  const skus = new Set();
  const sources = new Set();
  const sourceSkuSets = {smartstore:new Set(), makeshop:new Set(), ably:new Set()};
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < grid[rowIndex].length; columnIndex += 1) {
      const cell = grid[rowIndex]?.[columnIndex];
      if (!cell || !selectedCells.has(cell)) continue;
      cells.add(cell);
      const sku = rows[rowIndex]?.dataset.sku;
      if (sku) skus.add(sku);
      if (cell.dataset.channel) {
        sources.add(cell.dataset.channel);
        if (sku && sourceSkuSets[cell.dataset.channel]) sourceSkuSets[cell.dataset.channel].add(sku);
      }
    }
  }
  return {
    cells:[...cells],
    skus:[...skus],
    sources:[...sources],
    sourceSkus:Object.fromEntries(Object.entries(sourceSkuSets).map(([source, values]) => [source, [...values]]))
  };
}

function selectedMatrixDisconnectTargets() {
  const selected = selectedMatrixTargets();
  const targets = [];
  const seen = new Set();
  for (const [source, skus] of Object.entries(selected.sourceSkus)) {
    for (const sku of skus) {
      const product = matrixRowsBySku.get(sku) || {};
      if (product.__sellerProductLinkDrafts?.[source] && !product[`${source}_match_tier`]) continue;
      const productCode = String(product[`${source}_product_code`] || '').trim();
      const optionCode = String(product[`${source}_option_code`] || '').trim();
      if (!productCode) continue;
      const key = [source, productCode, optionCode, sku].join('\u0000');
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({
        source,
        sku,
        productCode,
        optionCode,
        productName:String(product[`${source}_name`] || '').trim(),
        optionName:String(product[`${source}_option_name`] || '').trim()
      });
    }
  }
  return targets;
}

function matrixSellerIdentityContext(anchorCell) {
  const cell = anchorCell?.closest?.('td');
  if (!cell?.matches('.seller-product-code-cell,.seller-option-identity')) {
    return {cell:null, source:'', sku:'', product:null, detail:'상품코드 또는 옵션 셀에서 사용'};
  }
  const source = String(cell.dataset.channel || '').trim();
  const row = cell.closest('tr[data-sku]');
  const sku = String(row?.dataset.sku || '').trim();
  const product = matrixRowsBySku.get(sku);
  if (!product || !['smartstore', 'makeshop', 'ably'].includes(source)) {
    return {cell, source, sku, product:null, detail:'연결할 판매처 행을 확인해주세요'};
  }
  return {cell, source, sku, product, detail:''};
}

function matrixProductCopyContext(anchorCell) {
  const context = matrixSellerIdentityContext(anchorCell);
  if (!context.product) return {enabled:false, detail:context.detail};
  const {cell, source, sku, product} = context;
  const currentProductCode = String(product[`${source}_product_code`] || '').trim();
  if (product.__sellerProductLinkDrafts?.[source]) return {enabled:false, detail:`${currentProductCode} · 복제 완료`};
  if (currentProductCode) return {enabled:false, detail:'이미 실제 연결이 있는 행'};
  const productGroup = sellpiaProductGroupKey(product);
  const candidateCodes = [...new Set([...matrixRowsBySku.values()]
    .filter(candidate => sellpiaProductGroupKey(candidate) === productGroup)
    .map(candidate => String(candidate?.[`${source}_product_code`] || '').trim())
    .filter(Boolean))];
  if (!candidateCodes.length) return {enabled:false, detail:'같은 상품군에 복사할 코드 없음'};
  if (candidateCodes.length > 1) return {enabled:false, detail:`상품코드 후보 ${formatNumber(candidateCodes.length)}개`};
  const productCode = candidateCodes[0];
  return {
    enabled:true,
    source,
    sku,
    productCode,
    anchor:cell,
    detail:`${productCode} · 코드만 복제`
  };
}

function selectedMatrixProductCopyContexts(anchorCell) {
  const selectedProductCodeCells = selectedMatrixTargets().cells
    .filter(cell => cell.matches('.seller-product-code-cell'));
  const candidateCells = selectedProductCodeCells.length ? selectedProductCodeCells : [anchorCell];
  const targets = [];
  const seen = new Set();
  let skipped = 0;
  let firstDisabledDetail = '';
  for (const cell of candidateCells) {
    const target = matrixProductCopyContext(cell);
    if (!target.enabled) {
      skipped += 1;
      if (!firstDisabledDetail) firstDisabledDetail = target.detail;
      continue;
    }
    const key = [target.source, target.sku].join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(target);
  }
  return {
    targets,
    skipped,
    detail:targets.length
      ? `${formatNumber(targets.length)}개 행 · 상품코드만 복제${skipped ? ` · ${formatNumber(skipped)}개 제외` : ''}`
      : firstDisabledDetail || '복제할 행을 선택해주세요'
  };
}

function applyLocalProductLinkDraft(target, savedDraft = null) {
  const product = matrixRowsBySku.get(target.sku);
  if (!product) return null;
  const draft = {
    source_channel:target.source,
    sellpia_sku_code:target.sku,
    product_code:target.productCode,
    product_name:'',
    ...(savedDraft || {})
  };
  product.__sellerProductLinkDrafts = {...(product.__sellerProductLinkDrafts || {}), [target.source]:draft};
  product[`${target.source}_product_code`] = draft.product_code;
  product[`${target.source}_name`] = draft.product_name || '';
  product[`${target.source}_option_code`] = null;
  product[`${target.source}_option_name`] = null;
  product[`${target.source}_match_tier`] = null;
  product[`${target.source}_name_is_draft`] = true;
  return product;
}

function matrixOptionAddContext(anchorCell) {
  const context = matrixSellerIdentityContext(anchorCell);
  if (!context.product) return {enabled:false, detail:context.detail};
  const {cell, source, sku, product} = context;
  const draft = product.__sellerProductLinkDrafts?.[source];
  if (!draft) {
    const actualCode = String(product[`${source}_product_code`] || '').trim();
    return {enabled:false, detail:actualCode ? '이미 실제 연결된 행' : '상품코드를 먼저 복제해주세요'};
  }
  return {
    enabled:true,
    source,
    sku,
    productCode:String(draft.product_code || '').trim(),
    anchor:cell,
    detail:`${draft.product_code} · 미연결 옵션만 보기`
  };
}

function matrixPriceBasisContext(anchorCell) {
  const row = anchorCell?.closest?.('tr[data-sku]');
  const sku = String(row?.dataset.sku || '').trim();
  const product = matrixRowsBySku.get(sku);
  const basis = product?.__priceBasis || null;
  const sellpiaProductCode = String(basis?.sellpiaProductCode || sellpiaProductGroupKey(product)).trim();
  const candidateCount = Number(basis?.candidateCount || 0);
  if (!product || !basis || !sellpiaProductCode || candidateCount < 2) {
    return {enabled:false, detail:candidateCount === 1 ? '단일 SKU 상품은 별도 선택이 필요 없습니다.' : '기준가격 상품군을 확인할 수 없습니다.'};
  }
  const isCurrentBasis = String(basis.basisSkuCode || '') === sku;
  const resetToAutomatic = isCurrentBasis && basis.selectionMode === 'manual';
  return {
    enabled:true,
    sku,
    sellpiaProductCode,
    basisSkuCode:resetToAutomatic ? null : sku,
    resetToAutomatic,
    label:resetToAutomatic ? '최저가 자동선택으로 되돌리기' : '이 SKU를 기준가격으로 선택',
    detail:resetToAutomatic
      ? `${sellpiaProductCode} · 현재 직접 선택 ${sku}`
      : `${sellpiaProductCode} · ${sku} 선택 · 현재 ${basis.basisSkuCode || '확인 중'}`
  };
}

function closeMatrixContextMenu() {
  if (!matrixContextMenu) return;
  matrixContextMenu.hidden = true;
  matrixContextTargets = [];
  matrixContextProductCopyTargets = [];
  matrixContextProductCopySkipped = 0;
  matrixContextOptionAddTarget = null;
  matrixContextPriceBasisTarget = null;
}

function openMatrixContextMenu(clientX, clientY, anchorCell) {
  if (!matrixContextMenu || !matrixContextSourceRefresh || !matrixContextSourceRefreshCount || !matrixContextProductCopy || !matrixContextProductCopyDetail || !matrixContextOptionAdd || !matrixContextOptionAddDetail || !matrixContextPriceBasis || !matrixContextPriceBasisLabel || !matrixContextPriceBasisDetail || !matrixContextDisconnect || !matrixContextDisconnectCount) return;
  matrixContextTargets = selectedMatrixDisconnectTargets();
  const productCopyContext = selectedMatrixProductCopyContexts(anchorCell);
  matrixContextProductCopyTargets = productCopyContext.targets;
  matrixContextProductCopySkipped = productCopyContext.skipped;
  matrixContextOptionAddTarget = matrixOptionAddContext(anchorCell);
  matrixContextPriceBasisTarget = matrixPriceBasisContext(anchorCell);
  const labels = [...new Set(matrixContextTargets.map(target => CHANNEL_LABELS[target.source] || target.source))];
  matrixContextDisconnect.disabled = matrixContextTargets.length === 0;
  matrixContextDisconnectCount.textContent = matrixContextTargets.length
    ? `${labels.length === 1 ? `${labels[0]} ` : ''}연결 ${formatNumber(matrixContextTargets.length)}건`
    : '해제할 연결 없음';
  matrixContextProductCopy.disabled = matrixContextProductCopyTargets.length === 0;
  matrixContextProductCopyDetail.textContent = productCopyContext.detail;
  matrixContextOptionAdd.disabled = !matrixContextOptionAddTarget.enabled;
  matrixContextOptionAddDetail.textContent = matrixContextOptionAddTarget.detail;
  matrixContextPriceBasis.disabled = !matrixContextPriceBasisTarget.enabled;
  matrixContextPriceBasisLabel.textContent = matrixContextPriceBasisTarget.label || '기준가격 SKU 선택';
  matrixContextPriceBasisDetail.textContent = matrixContextPriceBasisTarget.detail;
  updateSourceRefreshAction();
  matrixContextMenu.hidden = false;
  const fallbackRect = anchorCell?.getBoundingClientRect?.() || {left:12, bottom:12};
  const wantedLeft = Number(clientX) > 0 ? Number(clientX) : fallbackRect.left;
  const wantedTop = Number(clientY) > 0 ? Number(clientY) : fallbackRect.bottom;
  matrixContextMenu.style.left = `${Math.max(8, Math.min(wantedLeft, window.innerWidth - matrixContextMenu.offsetWidth - 8))}px`;
  matrixContextMenu.style.top = `${Math.max(8, Math.min(wantedTop, window.innerHeight - matrixContextMenu.offsetHeight - 8))}px`;
  const preferredAction = !matrixContextPriceBasis.disabled
    ? matrixContextPriceBasis
    : !matrixContextProductCopy.disabled
    ? matrixContextProductCopy
    : !matrixContextOptionAdd.disabled
      ? matrixContextOptionAdd
    : !matrixContextSourceRefresh.disabled
      ? matrixContextSourceRefresh
      : matrixContextDisconnect;
  preferredAction.focus({preventScroll:true});
}

function matrixDisconnectTargetLabel(target) {
  const seller = CHANNEL_LABELS[target.source] || target.source;
  const option = target.optionCode ? ` / 옵션 ${target.optionCode}` : '';
  return `${target.sku} ↔ ${seller} ${target.productCode}${option}`;
}

async function resolveMatrixDisconnectComponentIds(targets) {
  const listingKeys = new Map();
  for (const target of targets) {
    const key = [target.source, target.productCode, target.optionCode].join('\u0000');
    if (!listingKeys.has(key)) listingKeys.set(key, target);
  }
  const settled = await Promise.allSettled([...listingKeys.entries()].map(async ([key, target]) => {
    const graph = await liveData.loadListingConnection({
      source:target.source,
      productCode:target.productCode,
      optionCode:target.optionCode
    });
    return [key, graph];
  }));
  const graphs = new Map(settled.filter(result => result.status === 'fulfilled').map(result => result.value));
  return targets.map(target => {
    const key = [target.source, target.productCode, target.optionCode].join('\u0000');
    const components = Array.isArray(graphs.get(key)?.components) ? graphs.get(key).components : [];
    const component = components.find(item => String(item?.sku || '').trim() === target.sku);
    return {...target, componentId:component?.componentId || null};
  });
}

async function disconnectSelectedMatrixLinks() {
  const targets = [...matrixContextTargets];
  if (!targets.length || !liveData?.removeListingComponent) return;
  const preview = targets.slice(0, 8).map(matrixDisconnectTargetLabel);
  const more = targets.length > preview.length ? `\n외 ${formatNumber(targets.length - preview.length)}건` : '';
  const confirmed = window.confirm(`선택한 연결 ${formatNumber(targets.length)}건을 해제할까요?\n\n${preview.join('\n')}${more}\n\n각 SKU의 해당 판매처 연결만 해제하며, 같은 조합의 다른 구성 SKU는 유지됩니다.`);
  if (!confirmed) return;
  closeMatrixContextMenu();
  matrixContextDisconnect.disabled = true;
  matrixContextDisconnectCount.textContent = '연결 해제 중…';
  const resolvedTargets = await resolveMatrixDisconnectComponentIds(targets);
  const failures = [];
  let successCount = 0;
  for (let offset = 0; offset < resolvedTargets.length; offset += 3) {
    const batch = resolvedTargets.slice(offset, offset + 3);
    const settled = await Promise.allSettled(batch.map(target => liveData.removeListingComponent({
      componentId:target.componentId,
      source:target.source,
      productCode:target.productCode,
      optionCode:target.optionCode,
      sku:target.sku
    })));
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') successCount += 1;
      else failures.push({target:batch[index], error:result.reason});
    });
  }
  if (successCount) {
    await loadLiveMatrix();
    void loadLiveDashboardMetrics();
  }
  if (!failures.length) {
    showToast(`선택 연결 ${formatNumber(successCount)}건을 해제했습니다.`);
  } else if (successCount) {
    showToast(`연결 해제 ${formatNumber(successCount)}건 완료 · ${formatNumber(failures.length)}건 실패`);
  } else {
    showToast(`연결 해제 실패: ${failures[0]?.error?.message || failures[0]?.error || 'DB 오류'}`);
  }
}

matrixContextSourceRefresh?.addEventListener('click', event => {
  event.stopPropagation();
  closeMatrixContextMenu();
  void refreshSelectedSystemValuesFromSource();
});

matrixContextPriceBasis?.addEventListener('click', async event => {
  event.stopPropagation();
  const target = matrixContextPriceBasisTarget;
  if (!target?.enabled || !liveData?.savePriceBasisSelection) return;
  closeMatrixContextMenu();
  try {
    const saved = await liveData.savePriceBasisSelection({
      sellpiaProductCode:target.sellpiaProductCode,
      basisSkuCode:target.basisSkuCode
    });
    for (const product of matrixState.rows) {
      if (product.__codeListPlaceholder || sellpiaProductGroupKey(product) !== target.sellpiaProductCode) continue;
      product.__priceBasis = {
        ...(product.__priceBasis || {}),
        ...(saved || {}),
        sellpiaSkuCode:product.sellpia_sku_code,
        sellpiaProductCode:target.sellpiaProductCode
      };
    }
    renderLiveMatrixRows(matrixState.rows);
    showToast(target.resetToAutomatic
      ? `${target.sellpiaProductCode} 기준가격 SKU를 최저가 자동선택으로 되돌렸습니다.`
      : `${target.sellpiaProductCode} 기준가격 SKU를 ${target.sku}로 선택했습니다.`);
  } catch (error) {
    showToast(`기준가격 SKU 저장 실패: ${error?.message || error}`);
  }
});

matrixContextProductCopy?.addEventListener('click', async event => {
  event.stopPropagation();
  const targets = [...matrixContextProductCopyTargets];
  const skipped = matrixContextProductCopySkipped;
  if (!targets.length) return;
  closeMatrixContextMenu();
  const successes = [];
  const failures = [];
  for (let offset = 0; offset < targets.length; offset += 3) {
    const batch = targets.slice(offset, offset + 3);
    const settled = await Promise.allSettled(batch.map(target => liveData.saveProductLinkDraft({
      sku:target.sku,
      source:target.source,
      productCode:target.productCode
    })));
    settled.forEach((result, index) => {
      const target = batch[index];
      if (result.status === 'fulfilled') {
        successes.push(target);
        applyLocalProductLinkDraft(target, result.value);
      } else {
        failures.push({target, error:result.reason});
      }
    });
  }
  if (successes.length) {
    renderLiveMatrixRows(matrixState.rows);
    const skus = [...new Set(successes.map(target => target.sku))];
    void refreshMatrixSkus(skus).catch(error => {
      console.error('saved product link drafts targeted refresh failed', error);
      showToast(`상품코드 ${formatNumber(successes.length)}건은 저장됐지만 최신 상세값 조회가 지연됩니다. 화면 복제값은 유지합니다.`);
    });
  }
  if (!failures.length) {
    showToast(`선택한 ${formatNumber(successes.length)}개 행에 상품코드만 복제했습니다.${skipped ? ` · ${formatNumber(skipped)}개 행 제외` : ''} 옵션은 아직 연결되지 않았습니다.`);
  } else if (successes.length) {
    showToast(`상품코드 복제 ${formatNumber(successes.length)}건 완료 · ${formatNumber(failures.length)}건 실패${skipped ? ` · ${formatNumber(skipped)}개 제외` : ''}`);
  } else {
    console.error('seller product code draft saves failed', failures);
    showToast(`상품코드 복제 실패: ${failures[0]?.error?.message || failures[0]?.error || 'DB 오류'}`);
  }
});

matrixContextOptionAdd?.addEventListener('click', event => {
  event.stopPropagation();
  const target = matrixContextOptionAddTarget;
  if (!target?.enabled) return;
  closeMatrixContextMenu();
  openMappingSearch({
    source:target.source,
    sku:target.sku,
    anchor:target.anchor,
    fixedProductCode:target.productCode
  });
});

matrixContextDisconnect?.addEventListener('click', event => {
  event.stopPropagation();
  void disconnectSelectedMatrixLinks();
});

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
  document.getElementById('seller-export-selected-count').textContent = skus.length ? `선택한 ${formatNumber(skus.length)}개 SKU` : '선택한 SKU 없음';
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
  const isDraftAction = sellerExportState.action === 'draft';
  if (isDraftAction && !liveData?.stageSellerInventoryDraftBatch) {
    showToast('재고 수정안 생성 기능을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    return;
  }
  if (!isDraftAction && (!sellerExport || !liveData?.prepareSellerExport)) {
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
    if (isDraftAction) {
      const skus = selectedMatrixSkus();
      showSellerExportProgress(5, '재고 차이 계산 준비', `${skus.length ? `선택 ${formatNumber(skus.length)}개 SKU` : '전체 매트릭스'}를 안전한 묶음으로 나눠 확인합니다.`);
      let afterSku = null;
      let processed = 0;
      let total = skus.length || 0;
      let staged = 0;
      let cancelled = 0;
      let hasMore = true;
      while (hasMore) {
        const result = await liveData.stageSellerInventoryDraftBatch({sources, skus, batchId, afterSku, batchSize:100});
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

    showSellerExportProgress(4, '수정안 확인 중', '검토한 판매처 수정안으로 파일 생성 대상을 확정합니다. 수정 상태는 그대로 유지됩니다.');
    let changeIds;
    if (sellerExportState.rows.length) {
      const scopedRows = sellerExportRowsForSources(sellerExportState.rows, sources);
      const reviewIds = scopedRows.filter(row => ['pending','failed'].includes(row.status)).map(row => Number(row.change_id));
      if (reviewIds.length) await liveData.validateChangeQueue(reviewIds);
      changeIds = scopedRows.map(row => Number(row.change_id));
    } else {
      const scope = selectedSellerExportScope();
      const scopeSkus = await resolveSellerExportScopeSkus();
      if (scope !== 'all' && !scopeSkus.length) throw new Error(scope === 'selected' ? '선택한 셀 범위의 SKU가 없습니다.' : '현재 검색·필터 결과에 해당하는 SKU가 없습니다.');
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
    console.error(isDraftAction ? 'seller inventory draft staging failed' : 'seller export failed', error);
    if (prepared) {
      try { await liveData.completeSellerExport({batchId, success:false, errorMessage:error?.message || String(error)}); } catch (completeError) { console.error('seller export failure state update failed', completeError); }
    }
    showSellerExportProgress(
      0,
      isDraftAction ? '수정안 생성 실패' : '내보내기 중단',
      error?.message || (isDraftAction ? 'DB 연결 상태를 확인한 뒤 다시 시도해주세요.' : '원본 파일을 확인해주세요.')
    );
    showToast(`${isDraftAction ? '수정안 생성' : '원본 내보내기'} 실패: ${error?.message || error}`);
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
  const statusLabels = {all:'전체 연결상태', attention:'미매칭', connected:'연결 완료', review:'연결 완료', unmatched:'미매칭'};
  parts.push(statusLabels[matrixState.status] || matrixState.status);
  if (matrixState.advancedFilter.conditions.length) parts.push(`상세조건 ${matrixState.advancedFilter.conditions.length}개 ${matrixState.advancedFilter.logic === 'or' ? 'OR' : 'AND'}`);
  if (matrixState.excludeCombinationSkus) parts.push('종속 조합 SKU 제외');
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
  if (matrixState.excludeCombinationSkus && !matrixState.codeListRows.length) {
    showToast('조합 SKU 제외는 현재 매트릭스 보기 전용입니다. 정확한 CSV를 위해 해당 옵션을 끈 뒤 저장해주세요.');
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
  const rows = selectedQueueRows().filter(row => row.status === 'validated' && row.has_exported_file);
  if (!rows.length || !window.confirm(`${rows.length}건이 판매처에 실제 업로드 완료되었음을 확인할까요?`)) return;
  const button = event.currentTarget; button.disabled = true;
  try {
    const result = await liveData.confirmChangesApplied(rows.map(row => Number(row.change_id)));
    showToast(`${Number(result?.applied_count || 0)}건을 반영 완료로 기록했습니다.`);
    await loadChangeQueue();
  } catch (error) { showToast(`반영 완료 기록 실패: ${error?.message || error}`); }
  finally { updateQueueSelection(); }
});

function initializeMultiLinkWorkspaceShell() {
  const relationPanel = document.getElementById('multi-link-tab-relation');
  const bundlePanel = document.getElementById('multi-link-tab-bundle');
  const allPanel = document.getElementById('multi-link-tab-all');
  const relationWorkspace = document.querySelector('.relation-workspace');
  const relationNodes = [
    relationWorkspace?.querySelector('.relation-workspace-head'),
    relationWorkspace?.querySelector('.relation-edge-summary'),
    document.getElementById('relation-edge-list'),
    document.getElementById('relation-graph-board'),
    document.getElementById('multi-link-organization-form')
  ].filter(Boolean);
  relationNodes.forEach(node => relationPanel?.appendChild(node));

  const bundleWorkspace = document.getElementById('bundle-management-panel');
  if (bundleWorkspace && bundlePanel) {
    bundleWorkspace.open = true;
    bundlePanel.appendChild(bundleWorkspace);
  }

  const allWorkspace = document.querySelector('.multi-link-all-workspace');
  if (allWorkspace && allPanel) {
    allWorkspace.querySelector(':scope > summary')?.remove();
    allPanel.appendChild(allWorkspace);
  }

  const editor = document.querySelector('.multi-link-editor');
  const modalBody = document.getElementById('multi-link-sku-action-body');
  if (editor && modalBody) modalBody.appendChild(editor);
}

function closeMultiLinkWorkspaceContextMenu() {
  const menu = document.getElementById('multi-link-workspace-context-menu');
  if (menu) menu.hidden = true;
}

function closeMultiLinkSkuActionModal() {
  const modal = document.getElementById('multi-link-sku-action-modal');
  if (modal) modal.hidden = true;
}

function openMultiLinkSkuActionModal(row = multiLinkWorkspaceState.contextRow) {
  if (!row) return;
  multiLinkWorkspaceState.contextRow = row;
  renderMultiLinkEditor(row);
  document.getElementById('multi-link-sku-action-title').textContent = `${multiLinkChannelLabel(row.source_channel)} ${row.product_code}${row.option_code ? ` / ${row.option_code}` : ''}`;
  document.getElementById('multi-link-sku-action-modal').hidden = false;
  closeMultiLinkWorkspaceContextMenu();
}

function openMultiLinkWorkspaceContextMenu(x, y, row) {
  const menu = document.getElementById('multi-link-workspace-context-menu');
  if (!menu || !row) return;
  multiLinkWorkspaceState.contextRow = row;
  menu.hidden = false;
  const width = 230;
  const height = 82;
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - height - 8))}px`;
}

function setMultiLinkWorkspaceTab(tab, {load = true} = {}) {
  const next = ['all','relation','bundle'].includes(tab) ? tab : 'all';
  if (multiLinkWorkspaceState.tab !== next) {
    clearMultiLinkCellSelection();
    closeRelationEdgeEditorDrawer();
  }
  multiLinkWorkspaceState.tab = next;
  document.querySelectorAll('[data-multi-link-tab]').forEach(button => {
    const active = button.dataset.multiLinkTab === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-multi-link-panel]').forEach(panel => {
    const active = panel.dataset.multiLinkPanel === next;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  if (!load) return;
  if (next === 'all') loadManagedConnections();
  if (next === 'relation') Promise.all([loadRelationFolders(), loadRelationGraph()]);
  if (next === 'bundle' && !bundleGraphState.loading) loadBundleGraph({query:bundleGraphState.query});
}

initializeMultiLinkWorkspaceShell();

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

const RELATION_KIND_LABELS = Object.freeze({individual:'개별상품', collection:'모음전·기획전', one_plus_one:'1+1', set:'세트', custom:'직접 분류'});

function relationFolderRows() {
  const folders = multiLinkState.folders;
  const children = new Map();
  folders.forEach(folder => {
    const parentKey = folder.parentFolderId === null || folder.parentFolderId === undefined ? '' : String(folder.parentFolderId);
    if (!children.has(parentKey)) children.set(parentKey, []);
    children.get(parentKey).push(folder);
  });
  const sortFolders = items => items.sort((a, b) => Number(a.sortOrder || 100) - Number(b.sortOrder || 100) || String(a.name || '').localeCompare(String(b.name || ''), 'ko') || Number(a.folderId) - Number(b.folderId));
  children.forEach(sortFolders);
  const rows = [];
  const visited = new Set();
  const visit = (folder, depth) => {
    const key = String(folder.folderId);
    if (visited.has(key)) return;
    visited.add(key);
    rows.push({...folder, __depth:depth});
    (children.get(key) || []).forEach(child => visit(child, depth + 1));
  };
  (children.get('') || []).forEach(folder => visit(folder, 0));
  folders.forEach(folder => visit(folder, 0));
  return rows;
}

function relationFolderDescendantIds(folderId, {includeSelf = true} = {}) {
  const wanted = String(folderId ?? '');
  const descendants = new Set(includeSelf && wanted ? [wanted] : []);
  let changed = true;
  while (changed) {
    changed = false;
    multiLinkState.folders.forEach(folder => {
      const parentKey = folder.parentFolderId === null || folder.parentFolderId === undefined ? '' : String(folder.parentFolderId);
      const key = String(folder.folderId);
      if (descendants.has(parentKey) && !descendants.has(key)) {
        descendants.add(key);
        changed = true;
      }
    });
  }
  return descendants;
}

function relationFolderPath(folderId) {
  const byId = new Map(multiLinkState.folders.map(folder => [String(folder.folderId), folder]));
  const names = [];
  const visited = new Set();
  let folder = byId.get(String(folderId));
  while (folder && !visited.has(String(folder.folderId))) {
    visited.add(String(folder.folderId));
    names.unshift(folder.name);
    folder = folder.parentFolderId === null || folder.parentFolderId === undefined ? null : byId.get(String(folder.parentFolderId));
  }
  return names.join(' / ');
}

function renderRelationFolders() {
  const list = document.getElementById('relation-folder-list');
  const activeKey = multiLinkState.organizationScope === 'unorganized' ? 'unorganized' : (multiLinkState.folderId === null ? 'all' : String(multiLinkState.folderId));
  const graphLoaded = relationGraphState.nodes.length > 0;
  const unorganizedCount = graphLoaded ? relationGraphState.nodes.filter(node => !node.folderId).length : Number(multiLinkState.unorganizedExplicitCount || 0);
  const fixed = [
    `<button class="${activeKey === 'all' ? 'active' : ''}" data-relation-folder="all"><span>전체 연결</span><b>${formatNumber(graphLoaded ? relationGraphState.nodes.length : multiLinkState.allTotal)}</b></button>`,
    `<button class="${activeKey === 'unorganized' ? 'active' : ''}" data-relation-folder="unorganized"><span>미분류</span><b>${formatNumber(unorganizedCount)}</b></button>`
  ];
  const folderRows = relationFolderRows();
  const folders = folderRows.map(folder => {
    const descendantIds = relationFolderDescendantIds(folder.folderId);
    const count = graphLoaded
      ? relationGraphState.nodes.filter(node => descendantIds.has(String(node.folderId || ''))).length
      : Number(folder.descendantNodeCount || folder.directNodeCount || 0);
    return `<div class="relation-folder-item${activeKey === String(folder.folderId) ? ' active' : ''}" data-folder-id="${Number(folder.folderId)}" style="--folder-depth:${Number(folder.__depth || 0)}">
      <button type="button" data-relation-folder="${Number(folder.folderId)}" title="${escapeHtml(relationFolderPath(folder.folderId))}"><span><i>▾</i>${escapeHtml(folder.name)}</span><b>${formatNumber(count)}</b></button>
      <span class="relation-folder-actions"><button type="button" data-folder-child title="하위 폴더 추가">＋</button><button type="button" data-folder-edit title="폴더 수정·이동">✎</button><button type="button" data-folder-archive title="폴더 보관">×</button></span>
    </div>`;
  });
  list.innerHTML = [...fixed, ...folders].join('');
  const select = document.getElementById('multi-link-folder');
  const selected = select.value;
  select.innerHTML = '<option value="">미분류</option>' + folderRows.map(folder => `<option value="${Number(folder.folderId)}">${'— '.repeat(Number(folder.__depth || 0))}${escapeHtml(folder.name)} · ${escapeHtml(RELATION_KIND_LABELS[folder.kind] || '직접 분류')}</option>`).join('');
  select.value = multiLinkState.folders.some(folder => String(folder.folderId) === selected) ? selected : '';
  const scope = document.getElementById('relation-workspace-scope');
  if (scope) {
    const folder = multiLinkState.folders.find(item => String(item.folderId) === String(multiLinkState.folderId));
    scope.textContent = multiLinkState.organizationScope === 'unorganized' ? '미분류' : (folder ? relationFolderPath(folder.folderId) : '전체 연결');
  }
}

async function loadRelationFolders({force = false} = {}) {
  if (!liveData?.loadRelationFolders || (multiLinkState.foldersLoaded && !force)) return;
  const result = await liveData.loadRelationFolders();
  multiLinkState.folders = result.folders;
  multiLinkState.unorganizedExplicitCount = result.unorganizedExplicitCount;
  multiLinkState.foldersLoaded = true;
  renderRelationFolders();
}

function relationNodeLabel(node) {
  const identity = node.nodeType === 'sellpia_product'
    ? `셀피아 ${node.sellpiaProductCode || ''}`
    : node.nodeType === 'sellpia_sku'
      ? `셀피아 SKU ${node.sellpiaSkuCode || ''}`
    : node.nodeType === 'seller_listing'
      ? `${multiLinkChannelLabel(node.source)} ${node.sellerProductCode || ''}${node.sellerOptionCode ? ` / ${node.sellerOptionCode}` : ''}`
      : '직접 노드';
  return `${identity} · ${node.displayName || '이름 없음'}`;
}

function relationScopeNodes() {
  if (multiLinkState.organizationScope === 'unorganized') return relationGraphState.nodes.filter(node => !node.folderId);
  if (multiLinkState.folderId !== null) {
    const folderIds = relationFolderDescendantIds(multiLinkState.folderId);
    return relationGraphState.nodes.filter(node => folderIds.has(String(node.folderId || '')));
  }
  return relationGraphState.nodes;
}

function relationIncidentEdges(nodeId) {
  const key = String(nodeId);
  return relationGraphState.edges.filter(edge => String(edge.parentNodeId) === key || String(edge.childNodeId) === key);
}

function relationNodeThumb(node) {
  return renderBundleThumb(
    node?.imageUrl || node?.image_url || '',
    node?.productName || node?.displayName || '상품명 없음',
    node?.optionName || ''
  );
}

function relationNodeCard(node, currentEdgeId = null, {showThumb = true} = {}) {
  const incidentCount = relationIncidentEdges(node.nodeId).length;
  const otherCount = Math.max(0, incidentCount - (currentEdgeId ? 1 : 0));
  const identity = node.nodeType === 'sellpia_product'
    ? `셀피아 ${node.sellpiaProductCode || '-'}`
    : node.nodeType === 'sellpia_sku'
      ? `셀피아 SKU ${node.sellpiaSkuCode || '-'}`
    : node.nodeType === 'seller_listing'
      ? `${multiLinkChannelLabel(node.source)} ${node.sellerProductCode || '-'}${node.sellerOptionCode ? ` / ${node.sellerOptionCode}` : ''}`
      : '직접 노드';
  return `<div class="relation-compact-node multi-link-product-cell ${escapeHtml(node.nodeType)}" data-relation-node-id="${Number(node.nodeId)}">
    ${showThumb ? relationNodeThumb(node) : ''}
    <div><span>${escapeHtml(identity)}</span><b title="${escapeHtml(node.displayName || '')}">${escapeHtml(node.displayName || '이름 없음')}</b></div>
    <em>${escapeHtml(RELATION_KIND_LABELS[node.relationKind] || '직접 분류')}</em>
    ${otherCount > 0 ? `<button type="button" data-explore-relation-node="${Number(node.nodeId)}">다른 관계 ${formatNumber(otherCount)}개</button>` : ''}
    ${incidentCount === 0 ? `<button type="button" data-archive-relation-node="${Number(node.nodeId)}" class="relation-node-delete">삭제</button>` : ''}
  </div>`;
}

function relationCellGrid() {
  return [...document.querySelectorAll('#relation-edge-list .relation-matrix tbody tr[data-relation-edge-id]')]
    .map(row => [...row.querySelectorAll(':scope > td')]);
}

function relationCellPosition(cell, grid = relationCellGrid()) {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const columnIndex = grid[rowIndex].indexOf(cell);
    if (columnIndex >= 0) return {rowIndex, columnIndex};
  }
  return null;
}

function relationCellsInRectangle(grid = relationCellGrid()) {
  const anchor = relationCellPosition(relationCellSelection.anchor, grid);
  const focus = relationCellPosition(relationCellSelection.focus, grid);
  const cells = new Set();
  if (!anchor || !focus) return cells;
  for (let rowIndex = Math.min(anchor.rowIndex, focus.rowIndex); rowIndex <= Math.max(anchor.rowIndex, focus.rowIndex); rowIndex += 1) {
    for (let columnIndex = Math.min(anchor.columnIndex, focus.columnIndex); columnIndex <= Math.max(anchor.columnIndex, focus.columnIndex); columnIndex += 1) {
      const cell = grid[rowIndex]?.[columnIndex];
      if (cell) cells.add(cell);
    }
  }
  return cells;
}

function paintRelationCellSelection() {
  const list = document.getElementById('relation-edge-list');
  list.querySelectorAll('td.relation-cell-selected,td.relation-cell-anchor').forEach(cell => {
    cell.classList.remove('relation-cell-selected', 'relation-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
  relationCellSelection.selected = new Set([...relationCellSelection.selected].filter(cell => cell?.isConnected));
  relationCellSelection.selected.forEach(cell => {
    cell.classList.add('relation-cell-selected');
    cell.setAttribute('aria-selected', 'true');
  });
  if (relationCellSelection.anchor?.isConnected && relationCellSelection.selected.has(relationCellSelection.anchor)) {
    relationCellSelection.anchor.classList.add('relation-cell-anchor');
  }
}

function applyRelationCellSelection() {
  const rectangle = relationCellsInRectangle();
  if (relationCellSelection.dragMode === 'toggle') {
    const next = new Set(relationCellSelection.dragBase);
    rectangle.forEach(cell => next.has(cell) ? next.delete(cell) : next.add(cell));
    relationCellSelection.selected = next;
  } else {
    relationCellSelection.selected = rectangle;
  }
  paintRelationCellSelection();
}

function selectRelationCell(cell, {extend = false, toggle = false} = {}) {
  if (!cell?.matches('td') || !cell.closest('tr[data-relation-edge-id]')) return;
  if (toggle) {
    relationCellSelection.dragBase = new Set(relationCellSelection.selected);
    relationCellSelection.dragMode = 'toggle';
    relationCellSelection.anchor = cell;
    relationCellSelection.focus = cell;
    applyRelationCellSelection();
    return;
  }
  if (!extend || !relationCellSelection.anchor?.isConnected) relationCellSelection.anchor = cell;
  relationCellSelection.focus = cell;
  relationCellSelection.dragBase = new Set();
  relationCellSelection.dragMode = 'replace';
  applyRelationCellSelection();
}

function clearRelationCellSelection() {
  relationCellSelection.anchor = null;
  relationCellSelection.focus = null;
  relationCellSelection.dragging = false;
  relationCellSelection.selected.clear();
  relationCellSelection.dragBase.clear();
  relationCellSelection.dragMode = 'replace';
  document.querySelectorAll('#relation-edge-list td.relation-cell-selected,#relation-edge-list td.relation-cell-anchor').forEach(cell => {
    cell.classList.remove('relation-cell-selected', 'relation-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
}

function renderRelationEdgeList() {
  clearRelationCellSelection();
  const box = document.getElementById('relation-edge-list');
  const summary = document.getElementById('relation-edge-summary');
  const byId = new Map(relationGraphState.nodes.map(node => [String(node.nodeId), node]));
  const scopedNodes = relationScopeNodes();
  const scopedIds = new Set(scopedNodes.map(node => String(node.nodeId)));
  const edges = relationGraphState.edges.filter(edge => multiLinkState.organizationScope === 'all' || scopedIds.has(String(edge.parentNodeId)) || scopedIds.has(String(edge.childNodeId)));
  const linkedIds = new Set(edges.flatMap(edge => [String(edge.parentNodeId), String(edge.childNodeId)]));
  const pending = scopedNodes.filter(node => !linkedIds.has(String(node.nodeId)));
  summary.textContent = `${formatNumber(edges.length)}개 관계 · 연결 대기 ${formatNumber(pending.length)}개`;
  if (!edges.length && !pending.length) {
    box.innerHTML = '<div class="relation-workspace-empty"><b>이 분류에 등록된 관계가 없습니다.</b><span>‘관계 추가’를 눌러 상품 두 개의 상위·하위를 지정하세요.</span></div>';
    return;
  }
  const edgeRows = edges.map(edge => {
    const parent = byId.get(String(edge.parentNodeId));
    const child = byId.get(String(edge.childNodeId));
    if (!parent || !child) return '';
    return `<tr class="relation-edge-row" data-relation-edge-id="${Number(edge.edgeId)}">
      <td class="relation-photo-cell">${relationNodeThumb(parent)}</td>
      <td>${relationNodeCard(parent, edge.edgeId, {showThumb:false})}</td>
      <td class="relation-edge-action"><span>관계 1건</span><i>→</i><button type="button" data-remove-relation-edge="${Number(edge.edgeId)}">연결 해제</button></td>
      <td class="relation-photo-cell">${relationNodeThumb(child)}</td>
      <td>${relationNodeCard(child, edge.edgeId, {showThumb:false})}</td>
    </tr>`;
  }).join('');
  const pendingRows = pending.length ? `<section class="relation-pending-nodes"><header><b>연결 대기</b><span>노드는 준비됐지만 아직 상위·하위가 지정되지 않았습니다.</span></header><div class="relation-pending-matrix">${pending.map(node => relationNodeCard(node)).join('')}</div></section>` : '';
  box.innerHTML = `<div class="multi-link-cell-matrix-shell"><table class="multi-link-cell-matrix relation-matrix"><thead><tr><th>상위 사진</th><th>상위 상품</th><th>관계</th><th>하위 사진</th><th>하위 상품</th></tr></thead><tbody>${edgeRows}</tbody></table></div>${pendingRows}`;
}

function renderRelationNodeSelectors(preferred = {}) {
  const options = relationGraphState.nodes.map(node => `<option value="${Number(node.nodeId)}">${escapeHtml(relationNodeLabel(node))}</option>`).join('');
  const parent = document.getElementById('relation-parent-node');
  const child = document.getElementById('relation-child-node');
  const previousParent = preferred.parentNodeId || parent.value;
  const previousChild = preferred.childNodeId || child.value;
  parent.innerHTML = '<option value="">상위를 선택해주세요</option>' + options;
  child.innerHTML = '<option value="">하위를 선택해주세요</option>' + options;
  if (relationGraphState.nodes.some(node => String(node.nodeId) === String(previousParent))) parent.value = String(previousParent);
  if (relationGraphState.nodes.some(node => String(node.nodeId) === String(previousChild))) child.value = String(previousChild);
  document.getElementById('relation-edge-save').disabled = !parent.value || !child.value || parent.value === child.value;
}

function resetRelationEdgeEditor({clearSelectors = true} = {}) {
  relationCellSelection.editingEdgeId = null;
  const saveButton = document.getElementById('relation-edge-save');
  saveButton.textContent = '상위 → 하위 연결 저장';
  if (clearSelectors) {
    document.getElementById('relation-parent-node').value = '';
    document.getElementById('relation-child-node').value = '';
    saveButton.disabled = true;
  }
  document.querySelectorAll('#relation-edge-list tr.relation-edge-editing,#multi-link-body tr.relation-edge-editing').forEach(row => row.classList.remove('relation-edge-editing'));
}

function relationEdgeEditorOptions(selectedNodeId) {
  return '<option value="">상품을 선택해주세요</option>' + relationGraphState.nodes.map(node => `<option value="${Number(node.nodeId)}"${String(node.nodeId) === String(selectedNodeId) ? ' selected' : ''}>${escapeHtml(relationNodeLabel(node))}</option>`).join('');
}

function updateRelationEdgeEditorSaveState() {
  const parent = document.getElementById('relation-edge-editor-parent').value;
  const child = document.getElementById('relation-edge-editor-child').value;
  document.getElementById('relation-edge-editor-save').disabled = !parent || !child || parent === child;
}

function closeRelationEdgeEditorDrawer({reset = true} = {}) {
  const drawer = document.getElementById('relation-edge-editor-drawer');
  if (drawer) drawer.hidden = true;
  document.querySelectorAll('#relation-edge-list tr.relation-edge-editing,#multi-link-body tr.relation-edge-editing').forEach(row => row.classList.remove('relation-edge-editing'));
  if (reset) relationCellSelection.editingEdgeId = null;
}

function openRelationEdgeEditor(edgeId) {
  const edge = relationGraphState.edges.find(candidate => String(candidate.edgeId) === String(edgeId));
  if (!edge) return;
  const parent = relationGraphState.nodes.find(node => String(node.nodeId) === String(edge.parentNodeId));
  const child = relationGraphState.nodes.find(node => String(node.nodeId) === String(edge.childNodeId));
  relationCellSelection.editingEdgeId = Number(edge.edgeId);
  document.getElementById('relation-edge-editor-parent').innerHTML = relationEdgeEditorOptions(edge.parentNodeId);
  document.getElementById('relation-edge-editor-child').innerHTML = relationEdgeEditorOptions(edge.childNodeId);
  document.getElementById('relation-edge-editor-title').textContent = `관계 #${Number(edge.edgeId)}`;
  document.getElementById('relation-edge-editor-copy').textContent = `${relationNodeLabel(parent)} → ${relationNodeLabel(child)}`;
  document.querySelectorAll('#relation-edge-list tr.relation-edge-editing,#multi-link-body tr.relation-edge-editing').forEach(row => row.classList.remove('relation-edge-editing'));
  document.querySelectorAll(`[data-relation-edge-id="${Number(edge.edgeId)}"]`).forEach(row => row.classList.add('relation-edge-editing'));
  document.getElementById('relation-edge-editor-drawer').hidden = false;
  updateRelationEdgeEditorSaveState();
}

function renderRelationTree() {
  const box = document.getElementById('relation-tree');
  const search = relationGraphState.search.trim().toLocaleLowerCase();
  const allNodes = relationGraphState.nodes;
  const allEdges = relationGraphState.edges;
  const seeds = relationGraphState.focusNodeId
    ? allNodes.filter(node => String(node.nodeId) === String(relationGraphState.focusNodeId))
    : search
      ? allNodes.filter(node => relationNodeLabel(node).toLocaleLowerCase().includes(search))
      : relationScopeNodes();
  if (!seeds.length) {
    box.innerHTML = `<span>${search ? '검색어와 일치하는 관계 노드가 없습니다.' : '등록된 관계 노드가 없습니다.'}</span>`;
    document.getElementById('relation-graph-copy').textContent = search ? `“${relationGraphState.search}” 검색 결과가 없습니다.` : '검색하거나 ‘다른 관계’ 배지를 누르면 연결된 모든 위치를 표시합니다.';
    return;
  }
  const includedIds = new Set(seeds.map(node => String(node.nodeId)));
  let changed = true;
  while (changed) {
    changed = false;
    allEdges.forEach(edge => {
      const parent = String(edge.parentNodeId);
      const child = String(edge.childNodeId);
      if (includedIds.has(parent) || includedIds.has(child)) {
        if (!includedIds.has(parent)) { includedIds.add(parent); changed = true; }
        if (!includedIds.has(child)) { includedIds.add(child); changed = true; }
      }
    });
  }
  const nodes = allNodes.filter(node => includedIds.has(String(node.nodeId)));
  const edges = allEdges.filter(edge => includedIds.has(String(edge.parentNodeId)) && includedIds.has(String(edge.childNodeId)));
  const byId = new Map(nodes.map(node => [String(node.nodeId), node]));
  const depths = new Map(nodes.map(node => [String(node.nodeId), 0]));
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let moved = false;
    edges.forEach(edge => {
      const nextDepth = (depths.get(String(edge.parentNodeId)) || 0) + 1;
      if (nextDepth > (depths.get(String(edge.childNodeId)) || 0)) {
        depths.set(String(edge.childNodeId), nextDepth);
        moved = true;
      }
    });
    if (!moved) break;
  }
  const maxDepth = Math.max(0, ...depths.values());
  const incoming = new Map();
  const outgoing = new Map();
  edges.forEach(edge => {
    const childKey = String(edge.childNodeId);
    const parentKey = String(edge.parentNodeId);
    if (!incoming.has(childKey)) incoming.set(childKey, []);
    if (!outgoing.has(parentKey)) outgoing.set(parentKey, []);
    incoming.get(childKey).push(edge);
    outgoing.get(parentKey).push(edge);
  });
  const columns = Array.from({length:maxDepth + 1}, (_, depth) => nodes.filter(node => depths.get(String(node.nodeId)) === depth));
  box.innerHTML = `<div class="relation-graph-columns">${columns.map((column, depth) => `<section class="relation-graph-column">
    <header><span>${depth + 1}단계</span><b>${depth === 0 ? '상위' : depth === 1 ? '하위' : depth === 2 ? '손자' : `${depth + 1}단계 하위`}</b></header>
    <div>${column.map(node => {
      const parentEdges = incoming.get(String(node.nodeId)) || [];
      const childEdges = outgoing.get(String(node.nodeId)) || [];
      return `<article class="relation-graph-node${String(node.nodeId) === String(relationGraphState.focusNodeId || '') ? ' focused' : ''}">
        ${relationNodeThumb(node)}
        <span>${escapeHtml(node.nodeType === 'sellpia_product' ? `셀피아 ${node.sellpiaProductCode || '-'}` : node.nodeType === 'sellpia_sku' ? `셀피아 SKU ${node.sellpiaSkuCode || '-'}` : `${multiLinkChannelLabel(node.source)} ${node.sellerProductCode || '-'}`)}</span>
        <b>${escapeHtml(node.displayName || '이름 없음')}</b>
        <em>${escapeHtml(RELATION_KIND_LABELS[node.relationKind] || '직접 분류')} · 상위 ${parentEdges.length} · 하위 ${childEdges.length}</em>
        ${parentEdges.length ? `<div class="relation-graph-parent-links">${parentEdges.map(edge => `<button type="button" data-focus-relation-node="${Number(edge.parentNodeId)}">← ${escapeHtml(byId.get(String(edge.parentNodeId))?.displayName || '상위')}</button>`).join('')}</div>` : ''}
      </article>`;
    }).join('') || '<p>해당 단계의 상품이 없습니다.</p>'}</div>
  </section>`).join('')}</div>`;
  const focus = relationGraphState.focusNodeId ? byId.get(String(relationGraphState.focusNodeId)) : null;
  document.getElementById('relation-graph-copy').textContent = focus
    ? `${focus.displayName || relationNodeLabel(focus)} 상품이 속한 ${formatNumber(edges.length)}개 관계입니다.`
    : search
      ? `“${relationGraphState.search}” 검색과 연결된 ${formatNumber(nodes.length)}개 상품입니다.`
      : `현재 보기와 연결된 ${formatNumber(nodes.length)}개 상품입니다.`;
}

function setRelationViewMode(mode) {
  relationGraphState.viewMode = mode === 'graph' ? 'graph' : 'list';
  document.getElementById('relation-edge-list').hidden = relationGraphState.viewMode !== 'list';
  document.getElementById('relation-graph-board').hidden = relationGraphState.viewMode !== 'graph';
  document.getElementById('relation-view-list').classList.toggle('active', relationGraphState.viewMode === 'list');
  document.getElementById('relation-view-graph').classList.toggle('active', relationGraphState.viewMode === 'graph');
  if (relationGraphState.viewMode === 'graph') renderRelationTree();
}

function renderRelationWorkspace(preferred = {}) {
  renderRelationFolders();
  renderRelationEdgeList();
  renderRelationNodeSelectors(preferred);
  setRelationViewMode(relationGraphState.viewMode);
}

async function loadRelationGraph(preferred = {}) {
  if (!liveData?.loadRelationNodes) return;
  const requestId = ++relationGraphState.requestId;
  relationGraphState.loading = true;
  try {
    const result = await liveData.loadRelationNodes({limit:1000});
    if (requestId !== relationGraphState.requestId) return;
    relationGraphState.nodes = result.nodes;
    relationGraphState.edges = result.edges;
    const skuNodes = relationGraphState.nodes.filter(node => node.nodeType === 'sellpia_sku' && node.sellpiaSkuCode);
    if (skuNodes.length && liveData?.loadSellpiaRelationVisuals) {
      try {
        const visuals = await liveData.loadSellpiaRelationVisuals(skuNodes.map(node => node.sellpiaSkuCode));
        if (requestId !== relationGraphState.requestId) return;
        const bySku = new Map((visuals || []).map(visual => [String(visual.sellpia_sku_code || ''), visual]));
        skuNodes.forEach(node => {
          const visual = bySku.get(String(node.sellpiaSkuCode));
          if (!visual) return;
          node.imageUrl = visual.sellpia_override_image_url || visual.image_url || '';
          node.productName = visual.sellpia_product_name || node.displayName || '';
          node.optionName = visual.sellpia_option_name || '';
        });
        relationGraphState.nodes.filter(node => node.nodeType === 'sellpia_product' && node.sellpiaProductCode).forEach(node => {
          const representative = skuNodes.find(candidate => String(candidate.sellpiaSkuCode).replace(/-[^-]+$/, '') === String(node.sellpiaProductCode));
          if (!representative) return;
          node.imageUrl ||= representative.imageUrl || '';
          node.productName ||= representative.productName || node.displayName || '';
        });
      } catch (visualError) { console.warn('relation workspace visual enrichment failed', visualError); }
    }
    renderRelationWorkspace(preferred);
  } catch (error) {
    document.getElementById('relation-edge-list').innerHTML = `<div class="relation-workspace-empty error">관계 목록 조회 실패: ${escapeHtml(error?.message || error)}</div>`;
    document.getElementById('relation-tree').innerHTML = `<span class="error">관계 구조 조회 실패: ${escapeHtml(error?.message || error)}</span>`;
  } finally {
    if (requestId === relationGraphState.requestId) relationGraphState.loading = false;
  }
}

function renderSellpiaRelationResults(groups) {
  const box = document.getElementById('relation-sellpia-results');
  if (!groups.length) {
    box.hidden = false;
    box.innerHTML = '<span>일치하는 셀피아 상품이 없습니다.</span>';
    return;
  }
  box.hidden = false;
  box.innerHTML = groups.map(group => `<button type="button" data-relation-product-code="${escapeHtml(group.productCode)}"><b>${escapeHtml(group.productCode)}</b><span>${escapeHtml(group.productName || '상품명 없음')}</span><em>${formatNumber(group.optionCount || 0)}개 옵션</em></button>`).join('');
}

function renderSellpiaRelationPreview(product) {
  const box = document.getElementById('relation-sellpia-preview');
  const button = document.getElementById('relation-create-sellpia-node');
  relationGraphState.selectedProduct = product || null;
  button.disabled = !product;
  if (!product) {
    box.innerHTML = '<span>셀피아 상품을 선택해주세요.</span>';
    return;
  }
  box.innerHTML = `<div class="relation-sellpia-product"><b>${escapeHtml(product.productCode)} · ${escapeHtml(product.productName || '상품명 없음')}</b><span>${formatNumber(product.optionCount || 0)}개 하위 옵션</span></div><div class="relation-sellpia-options">${(product.options || []).map(option => `<span><b>${escapeHtml(option.sku)}</b><em>${escapeHtml(option.optionName || '옵션명 없음')}</em></span>`).join('')}</div>`;
}

function relationBoardIdentityFromGraph(node) {
  if (node.nodeType === 'sellpia_sku') return `sellpia-sku|${node.sellpiaSkuCode || ''}`;
  if (node.nodeType === 'seller_listing') return `seller|${node.source || ''}|${node.sellerProductCode || ''}|${node.sellerOptionCode || ''}`;
  if (node.nodeType === 'sellpia_product') return `sellpia-product|${node.sellpiaProductCode || ''}`;
  return `node|${node.nodeId}`;
}

function relationBoardNodeFromGraph(node) {
  return {
    key:relationBoardIdentityFromGraph(node),
    nodeId:Number(node.nodeId),
    nodeType:node.nodeType,
    source:node.source || (node.nodeType.startsWith('sellpia') ? 'sellpia' : ''),
    productCode:node.sellerProductCode || node.sellpiaProductCode || '',
    optionCode:node.sellerOptionCode || '',
    sku:node.sellpiaSkuCode || '',
    displayName:node.displayName || '이름 없음',
    productName:'',
    optionName:'',
    imageUrl:'',
    linkedSkus:[],
    folderId:node.folderId ?? null,
    relationKind:node.relationKind || 'custom',
    parentKeys:[],
    level:null,
    touched:false,
    loaded:false,
    existing:true
  };
}

function relationBoardDisplayIdentity(node) {
  if (node.nodeType === 'sellpia_sku') return `셀피아 SKU ${node.sku || '-'}`;
  if (node.nodeType === 'sellpia_product') return `셀피아 상품 ${node.productCode || '-'}`;
  if (node.nodeType === 'seller_listing') return `${multiLinkChannelLabel(node.source)} ${node.productCode || '-'}${node.optionCode ? ` / ${node.optionCode}` : ''}`;
  return '기존 관계 노드';
}

function relationBoardCardLabels(node) {
  const displayName = String(node.displayName || '').trim();
  const parts = displayName.split(' · ').map(value => value.trim()).filter(Boolean);
  const productName = String(node.productName || parts.shift() || displayName || '상품명 없음').trim();
  const optionName = String(node.optionName || parts.join(' · ') || '').trim();
  return {productName, optionName};
}

function relationBoardCardImage(node) {
  const imageUrl = String(node.imageUrl || '').trim();
  const labels = relationBoardCardLabels(node);
  if (!imageUrl) return '<span class="relation-board-node-image empty" aria-hidden="true">NO</span>';
  return `<button class="relation-board-node-image" type="button" data-relation-image="${escapeHtml(imageUrl)}" data-relation-image-title="${escapeHtml(labels.productName)}" data-relation-image-option="${escapeHtml(labels.optionName)}" aria-label="${escapeHtml(labels.productName)} 상품 이미지 확대"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('empty');this.parentNode.removeAttribute('data-relation-image');this.remove()"></button>`;
}

function openRelationImageModal(trigger) {
  const url = String(trigger?.dataset?.relationImage || '').trim();
  if (!url) return;
  const productName = String(trigger.dataset.relationImageTitle || '상품명 없음').trim();
  const optionName = String(trigger.dataset.relationImageOption || '옵션명 없음').trim() || '옵션명 없음';
  const modal = document.getElementById('relation-image-modal');
  const image = document.getElementById('relation-image-preview');
  image.src = url;
  image.alt = `${productName} ${optionName} 상품 이미지`;
  document.getElementById('relation-image-product-name').textContent = productName;
  document.getElementById('relation-image-option-name').textContent = optionName;
  modal.hidden = false;
}

function closeRelationImageModal() {
  const modal = document.getElementById('relation-image-modal');
  modal.hidden = true;
  document.getElementById('relation-image-preview').removeAttribute('src');
}

async function hydrateRelationBoardVisuals() {
  const skus = [];
  relationBoardState.nodes.forEach(node => {
    if (node.nodeType === 'sellpia_sku' && node.sku) skus.push(node.sku);
    (node.linkedSkus || []).forEach(sku => skus.push(sku));
  });
  if (!skus.length) return;
  let rows = [];
  try {
    rows = await liveData.loadSellpiaRelationVisuals(skus);
  } catch (error) {
    console.warn('relation board visuals unavailable', error);
    return;
  }
  const bySku = new Map(rows.map(row => [String(row.sellpia_sku_code || '').trim(), row]));
  relationBoardState.nodes.forEach(node => {
    const visual = bySku.get(String(node.sku || '').trim())
      || (node.linkedSkus || []).map(sku => bySku.get(String(sku || '').trim())).find(Boolean);
    if (!visual) return;
    if (node.nodeType === 'sellpia_sku') {
      node.productName = node.productName || visual.sellpia_product_name || '';
      node.optionName = node.optionName || visual.sellpia_option_name || '';
    }
    node.imageUrl = visual.sellpia_override_image_url || visual.image_url || node.imageUrl || '';
  });
}

function relationBoardDescendantKeys(rootKey) {
  const descendants = new Set();
  const queue = [rootKey];
  while (queue.length) {
    const parentKey = queue.shift();
    relationBoardState.nodes.forEach(node => {
      if (!descendants.has(node.key) && node.parentKeys.includes(parentKey)) {
        descendants.add(node.key);
        queue.push(node.key);
      }
    });
  }
  descendants.delete(rootKey);
  return descendants;
}

function normalizeRelationBoardBranch(rootKey) {
  const root = relationBoardState.nodes.get(rootKey);
  if (!root || root.level === null) return;
  const queue = [root];
  const visited = new Set([root.key]);
  while (queue.length) {
    const parent = queue.shift();
    relationBoardState.nodes.forEach(child => {
      if (visited.has(child.key) || !child.parentKeys.includes(parent.key)) return;
      child.level = Number(parent.level) + 1;
      child.touched = true;
      visited.add(child.key);
      queue.push(child);
    });
  }
}

function moveRelationBoardNode(key, level, parentKey = null) {
  const node = relationBoardState.nodes.get(key);
  if (!node) return;
  const descendants = relationBoardDescendantKeys(key);
  if (parentKey && (parentKey === key || descendants.has(parentKey))) {
    showToast('자기 자신이나 현재 하위 상품 아래로는 이동할 수 없습니다.');
    return;
  }
  if (level === null) {
    node.level = null;
    node.parentKeys = [];
    node.touched = true;
    descendants.forEach(childKey => {
      const child = relationBoardState.nodes.get(childKey);
      if (child) { child.level = null; child.touched = true; }
    });
  } else {
    node.level = Math.max(0, Number(level) || 0);
    node.parentKeys = parentKey ? [parentKey] : [];
    node.touched = true;
    normalizeRelationBoardBranch(key);
  }
  relationBoardState.levelCount = Math.max(relationBoardState.levelCount, node.level === null ? 3 : node.level + 1);
  renderRelationBoard();
}

function hydrateRelationBoardGraphContext(seedKeys = []) {
  const graphByKey = new Map(relationGraphState.nodes.map(node => [relationBoardIdentityFromGraph(node), node]));
  const graphById = new Map(relationGraphState.nodes.map(node => [String(node.nodeId), node]));
  const includedIds = new Set(seedKeys.map(key => graphByKey.get(key)).filter(Boolean).map(node => String(node.nodeId)));
  let changed = true;
  while (changed) {
    changed = false;
    relationGraphState.edges.forEach(edge => {
      const parent = String(edge.parentNodeId);
      const child = String(edge.childNodeId);
      if (includedIds.has(parent) || includedIds.has(child)) {
        if (!includedIds.has(parent)) { includedIds.add(parent); changed = true; }
        if (!includedIds.has(child)) { includedIds.add(child); changed = true; }
      }
    });
  }
  includedIds.forEach(nodeId => {
    const graphNode = graphById.get(nodeId);
    if (!graphNode) return;
    const key = relationBoardIdentityFromGraph(graphNode);
    const staged = relationBoardState.nodes.get(key);
    if (staged) {
      staged.nodeId = Number(graphNode.nodeId);
      staged.existing = true;
      staged.displayName = staged.displayName || graphNode.displayName;
    } else {
      relationBoardState.nodes.set(key, relationBoardNodeFromGraph(graphNode));
    }
  });
  relationGraphState.edges.forEach(edge => {
    const parent = graphById.get(String(edge.parentNodeId));
    const child = graphById.get(String(edge.childNodeId));
    if (!parent || !child || !includedIds.has(String(parent.nodeId)) || !includedIds.has(String(child.nodeId))) return;
    const parentKey = relationBoardIdentityFromGraph(parent);
    const childKey = relationBoardIdentityFromGraph(child);
    relationBoardState.initialEdges.set(`${parentKey}\u0000${childKey}`, {edgeId:Number(edge.edgeId), parentKey, childKey, sortOrder:Number(edge.sortOrder || 100)});
  });
  const incidentKeys = new Set();
  relationBoardState.initialEdges.forEach(edge => { incidentKeys.add(edge.parentKey); incidentKeys.add(edge.childKey); });
  relationBoardState.nodes.forEach(node => {
    if (node.touched) return;
    node.parentKeys = [...relationBoardState.initialEdges.values()].filter(edge => edge.childKey === node.key).map(edge => edge.parentKey);
    node.level = incidentKeys.has(node.key) ? 0 : null;
  });
  for (let pass = 0; pass < relationBoardState.nodes.size; pass += 1) {
    let moved = false;
    relationBoardState.nodes.forEach(node => {
      if (node.touched || !node.parentKeys.length) return;
      const parentDepths = node.parentKeys.map(key => relationBoardState.nodes.get(key)?.level).filter(level => level !== null && level !== undefined);
      if (!parentDepths.length) return;
      const next = Math.max(...parentDepths) + 1;
      if (node.level !== next) { node.level = next; moved = true; }
    });
    if (!moved) break;
  }
  const maxLevel = Math.max(0, ...[...relationBoardState.nodes.values()].map(node => node.level ?? 0));
  relationBoardState.levelCount = Math.max(relationBoardState.levelCount, maxLevel + 1);
}

function relationBoardDesiredEdges() {
  const result = new Map();
  relationBoardState.nodes.forEach(node => {
    if (node.level === null) return;
    node.parentKeys.forEach((parentKey, index) => {
      const parent = relationBoardState.nodes.get(parentKey);
      if (!parent || parent.level === null) return;
      result.set(`${parentKey}\u0000${node.key}`, {parentKey, childKey:node.key, sortOrder:(index + 1) * 100});
    });
  });
  return result;
}

function relationBoardChanges() {
  const desired = relationBoardDesiredEdges();
  const additions = [...desired.entries()].filter(([key]) => !relationBoardState.initialEdges.has(key)).map(([, edge]) => edge);
  const removals = [...relationBoardState.initialEdges.entries()].filter(([key]) => !desired.has(key)).map(([, edge]) => edge);
  return {desired, additions, removals};
}

function renderRelationBoardProducts() {
  const box = document.getElementById('relation-board-products');
  const products = [...relationBoardState.loadedProducts.values()];
  box.innerHTML = products.length ? products.map(product => `<article><span>${escapeHtml(product.source === 'sellpia' ? '셀피아' : multiLinkChannelLabel(product.source))}</span><b>${escapeHtml(product.productCode)} · ${escapeHtml(product.productName || '상품명 없음')}</b><em>${formatNumber(product.optionCount)}개 옵션</em></article>`).join('') : '<span>아직 불러온 상품이 없습니다.</span>';
}

function renderRelationBoardCard(node) {
  const parentCount = node.parentKeys.length;
  const labels = relationBoardCardLabels(node);
  return `<article class="relation-board-node${node.loaded ? ' loaded' : ' context'}${node.level !== null && node.level > 0 && !parentCount ? ' unlinked' : ''}" data-board-node-key="${escapeHtml(node.key)}">
    <button class="relation-board-port input" type="button" data-board-link-in="${escapeHtml(node.key)}" aria-label="이 상품을 자식으로 연결" title="부모의 연결선을 여기에 놓으세요"></button>
    ${relationBoardCardImage(node)}
    <div class="relation-board-node-copy"><span>${escapeHtml(relationBoardDisplayIdentity(node))}</span><b title="${escapeHtml(labels.productName)}">${escapeHtml(labels.productName)}</b><strong title="${escapeHtml(labels.optionName || '옵션명 없음')}">${escapeHtml(labels.optionName || '옵션명 없음')}</strong><em>${parentCount ? `연결 ${formatNumber(parentCount)}개` : node.existing ? '저장된 노드' : '저장 전'}</em></div>
    <div class="relation-board-node-actions"><button type="button" data-board-root="${escapeHtml(node.key)}">최상위</button><button type="button" data-board-unassign="${escapeHtml(node.key)}">미배치</button></div>
    <button class="relation-board-port output" type="button" data-board-link-out="${escapeHtml(node.key)}" aria-label="이 상품에서 자식 연결 시작" title="${node.level === null ? '카드를 단계에 먼저 배치하세요' : '여기서 자식 카드까지 선을 끌어 연결하세요'}"${node.level === null ? ' disabled' : ''}></button>
  </article>`;
}

function relationBoardPathData(startX, startY, endX, endY) {
  const distance = Math.max(46, Math.abs(endX - startX) * .5);
  return `M ${startX} ${startY} C ${startX + distance} ${startY}, ${endX - distance} ${endY}, ${endX} ${endY}`;
}

function renderRelationBoardConnections() {
  const canvas = document.querySelector('#relation-drag-board .relation-board-canvas');
  const svg = canvas?.querySelector('.relation-board-links');
  if (!canvas || !svg) return;
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(canvas.scrollWidth, canvas.clientWidth);
  const height = Math.max(canvas.scrollHeight, canvas.clientHeight);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  const desired = relationBoardDesiredEdges();
  svg.innerHTML = [...desired.entries()].map(([edgeKey, edge]) => {
    const output = canvas.querySelector(`[data-board-link-out="${CSS.escape(edge.parentKey)}"]`);
    const input = canvas.querySelector(`[data-board-link-in="${CSS.escape(edge.childKey)}"]`);
    if (!output || !input) return '';
    const from = output.getBoundingClientRect();
    const to = input.getBoundingClientRect();
    const startX = from.left - bounds.left + from.width / 2;
    const startY = from.top - bounds.top + from.height / 2;
    const endX = to.left - bounds.left + to.width / 2;
    const endY = to.top - bounds.top + to.height / 2;
    const state = relationBoardState.initialEdges.has(edgeKey) ? 'saved' : 'new';
    return `<path class="relation-board-link ${state}" d="${relationBoardPathData(startX, startY, endX, endY)}"></path>`;
  }).join('') + '<path class="relation-board-link preview" data-board-link-preview hidden></path>';
}

function scheduleRelationBoardConnections() {
  window.requestAnimationFrame(renderRelationBoardConnections);
}

function renderRelationBoard() {
  const board = document.getElementById('relation-drag-board');
  renderRelationBoardProducts();
  const nodes = [...relationBoardState.nodes.values()];
  if (!nodes.length) {
    board.innerHTML = '<div class="relation-board-empty">상품을 먼저 불러와주세요.</div>';
    document.getElementById('relation-board-summary').textContent = '상품을 불러오면 모든 옵션이 미배치 칸에 나타납니다.';
    document.getElementById('relation-board-change-count').textContent = '변경 없음';
    document.getElementById('relation-board-save').disabled = true;
    return;
  }
  const unassigned = nodes.filter(node => node.level === null);
  const maxLevel = Math.max(relationBoardState.levelCount - 1, ...nodes.map(node => node.level ?? 0));
  const columns = [];
  columns.push(`<section class="relation-board-column unassigned"><header><span>대기</span><b>미배치 옵션</b><em>${formatNumber(unassigned.length)}</em></header><div class="relation-board-column-drop" data-board-drop="unassigned">카드를 이곳에 놓으면 관계에서 빠집니다.</div><div class="relation-board-node-list">${unassigned.map(renderRelationBoardCard).join('') || '<p>미배치 옵션이 없습니다.</p>'}</div></section>`);
  for (let level = 0; level <= maxLevel; level += 1) {
    const levelNodes = nodes.filter(node => node.level === level);
    const emptyCopy = level === 0 ? '최상위 상품을 놓아주세요.' : '카드를 놓은 뒤 왼쪽 카드에서 연결선을 끌어주세요.';
    const body = `<div class="relation-board-column-drop" data-board-drop-level="${level}">${level === 0 ? '최상위 카드 놓기' : `${level + 1}단계 카드 놓기`}</div><div class="relation-board-node-list">${levelNodes.map(renderRelationBoardCard).join('') || `<p class="relation-board-level-empty">${emptyCopy}</p>`}</div>`;
    const title = level === 0 ? '최상위 부모' : level === 1 ? '자식' : level === 2 ? '손자' : `${level + 1}단계 하위`;
    columns.push(`<section class="relation-board-column" data-board-level="${level}"><header><span>${level + 1}단계</span><b>${title}</b><em>${formatNumber(levelNodes.length)}</em></header>${body}</section>`);
  }
  board.innerHTML = `<div class="relation-board-canvas"><svg class="relation-board-links" aria-hidden="true"></svg>${columns.join('')}</div>`;
  const changes = relationBoardChanges();
  const assignedCount = nodes.filter(node => node.level !== null).length;
  document.getElementById('relation-board-summary').textContent = `${formatNumber(nodes.length)}개 옵션·노드 · 배치 ${formatNumber(assignedCount)}개 · 미배치 ${formatNumber(unassigned.length)}개`;
  document.getElementById('relation-board-change-count').textContent = changes.additions.length || changes.removals.length ? `추가 ${formatNumber(changes.additions.length)}건 · 해제 ${formatNumber(changes.removals.length)}건` : '변경 없음';
  document.getElementById('relation-board-change-copy').textContent = changes.additions.length || changes.removals.length ? '저장하면 표시된 관계 변경을 한 번에 반영합니다.' : '드래그한 관계는 저장 버튼을 누르기 전까지 DB에 반영되지 않습니다.';
  document.getElementById('relation-board-save').disabled = relationBoardState.saving || (!changes.additions.length && !changes.removals.length);
  scheduleRelationBoardConnections();
}

function resetRelationBoard({confirmChanges = false} = {}) {
  const changes = relationBoardChanges();
  if (confirmChanges && (changes.additions.length || changes.removals.length) && !window.confirm('저장하지 않은 관계 변경을 취소할까요?')) return false;
  relationBoardState.nodes.clear();
  relationBoardState.loadedProducts.clear();
  relationBoardState.initialEdges.clear();
  relationBoardState.levelCount = 3;
  relationBoardState.draggingKey = null;
  relationBoardState.connectorDrag = null;
  relationBoardState.dragGhost?.remove();
  relationBoardState.dragGhost = null;
  renderRelationBoard();
  return true;
}

async function loadRelationBoardProduct(source, productCode) {
  const folder = multiLinkState.folders.find(item => String(item.folderId) === String(multiLinkState.folderId));
  const folderId = multiLinkState.folderId;
  const relationKind = folder?.kind || (source === 'sellpia' ? 'individual' : 'custom');
  let productName = '';
  let options = [];
  if (source === 'sellpia') {
    const product = await liveData.loadSellpiaRelationProduct(productCode);
    if (!product) throw new Error(`셀피아 상품코드 ${productCode}를 찾을 수 없습니다.`);
    productName = product.productName || '';
    options = (product.options || []).map(option => ({
      key:`sellpia-sku|${option.sku}`,
      nodeType:'sellpia_sku', source:'sellpia', productCode:product.productCode, optionCode:'', sku:option.sku,
      productName:product.productName || '', optionName:option.optionName || '', imageUrl:'', linkedSkus:[option.sku],
      displayName:[product.productName, option.optionName].filter(Boolean).join(' · ') || option.sku,
      folderId, relationKind, loaded:true
    }));
  } else {
    const rows = await liveData.loadSellerProductOptions(source, productCode);
    if (!rows.length) throw new Error(`${multiLinkChannelLabel(source)} 상품코드 ${productCode}의 옵션을 찾을 수 없습니다.`);
    productName = rows[0]?.product_name || '';
    options = rows.map(row => ({
      key:`seller|${source}|${row.product_code}|${row.option_code || ''}`,
      nodeType:'seller_listing', source, productCode:row.product_code, optionCode:row.option_code || '', sku:'',
      productName:row.product_name || '', optionName:row.option_name || '', imageUrl:'', linkedSkus:Array.isArray(row.linked_skus) ? row.linked_skus : [],
      displayName:[row.product_name, row.option_name].filter(Boolean).join(' · ') || `${row.product_code} / ${row.option_code || '-'}`,
      folderId, relationKind, loaded:true
    }));
  }
  const graphByKey = new Map(relationGraphState.nodes.map(node => [relationBoardIdentityFromGraph(node), node]));
  options.forEach(option => {
    const existing = graphByKey.get(option.key);
    const previous = relationBoardState.nodes.get(option.key);
    relationBoardState.nodes.set(option.key, {
      ...relationBoardNodeFromGraph(existing || {nodeId:0, nodeType:option.nodeType, displayName:option.displayName}),
      ...previous,
      ...option,
      nodeId:existing ? Number(existing.nodeId) : (previous?.nodeId || null),
      existing:Boolean(existing || previous?.existing),
      parentKeys:previous?.parentKeys || [],
      level:previous?.level ?? null,
      touched:Boolean(previous?.touched)
    });
  });
  relationBoardState.loadedProducts.set(`${source}|${productCode}`, {source, productCode, productName, optionCount:options.length});
  hydrateRelationBoardGraphContext(options.map(option => option.key));
  await hydrateRelationBoardVisuals();
  renderRelationBoard();
  return options.length;
}

async function saveRelationBoard() {
  const changes = relationBoardChanges();
  if (!changes.additions.length && !changes.removals.length) return;
  const assignedKeys = new Set();
  changes.desired.forEach(edge => { assignedKeys.add(edge.parentKey); assignedKeys.add(edge.childKey); });
  const nodes = [...assignedKeys].map(key => relationBoardState.nodes.get(key)).filter(Boolean).map(node => node.nodeId ? {
    clientKey:node.key, nodeId:node.nodeId
  } : node.nodeType === 'sellpia_sku' ? {
    clientKey:node.key, nodeType:'sellpia_sku', sellpiaSkuCode:node.sku, folderId:node.folderId, relationKind:node.relationKind
  } : {
    clientKey:node.key, nodeType:'seller_listing', source:node.source, productCode:node.productCode, optionCode:node.optionCode,
    folderId:node.folderId, relationKind:node.relationKind
  });
  const edges = [...changes.desired.values()].map(edge => ({parentKey:edge.parentKey, childKey:edge.childKey, sortOrder:edge.sortOrder}));
  const removeEdgeIds = changes.removals.map(edge => edge.edgeId).filter(Boolean);
  if (!window.confirm(`관계 ${changes.additions.length}건을 추가하고 ${changes.removals.length}건을 해제할까요?\n상품 원본·가격·재고는 변경되지 않습니다.`)) return;
  const button = document.getElementById('relation-board-save');
  relationBoardState.saving = true;
  button.disabled = true;
  button.textContent = '관계 저장 중…';
  try {
    const result = await liveData.applyRelationBoard({nodes, edges, removeEdgeIds});
    await loadRelationGraph();
    resetRelationBoard();
    showToast(`관계 변경을 저장했습니다. 추가 ${formatNumber(changes.additions.length)}건 · 해제 ${formatNumber(changes.removals.length)}건`);
  } catch (error) {
    showToast(`관계 작업판 저장 실패: ${error?.message || error}`);
  } finally {
    relationBoardState.saving = false;
    button.textContent = '관계 변경 저장';
    renderRelationBoard();
  }
}

function relationImportCandidateKey(candidate) {
  return candidate?.nodeType === 'sellpia_sku'
    ? `sellpia-sku|${candidate.sellpiaSkuCode || candidate.optionCode || ''}`
    : `seller|${candidate?.source || ''}|${candidate?.productCode || ''}|${candidate?.optionCode || ''}`;
}

function relationImportCandidateLabel(candidate) {
  const source = candidate?.source === 'sellpia' ? '셀피아' : multiLinkChannelLabel(candidate?.source);
  const identity = candidate?.nodeType === 'sellpia_sku'
    ? candidate.sellpiaSkuCode
    : `${candidate?.productCode || '-'}-${candidate?.optionCode || ''}`;
  return `${source} · ${identity} · ${candidate?.displayName || '상품명 없음'}`;
}

function selectedRelationImportCandidate(item) {
  const candidates = Array.isArray(item?.candidates) ? item.candidates : [];
  if (item?.status === 'matched' && candidates.length === 1 && candidates[0].relationReady) return candidates[0];
  const choice = relationImportState.choices.get(item?.inputCode);
  return candidates.find(candidate => relationImportCandidateKey(candidate) === choice && candidate.relationReady) || null;
}

function buildRelationImportPlan() {
  const parsed = relationImportState.parsed;
  const errors = [];
  if (!parsed?.valid) return {valid:false, nodes:[], edges:[], errors:parsed?.errors || ['엑셀 검토가 끝나지 않았습니다.']};
  const candidatesByCode = new Map();
  parsed.codes.forEach(code => {
    const item = relationImportState.items.get(code);
    const candidate = selectedRelationImportCandidate(item);
    if (!candidate) errors.push(`${code}: 정확한 관계 노드를 선택할 수 없습니다.`);
    else candidatesByCode.set(code, candidate);
  });
  if (errors.length) return {valid:false, nodes:[], edges:[], errors};

  const folder = multiLinkState.folders.find(item => String(item.folderId) === String(multiLinkState.folderId));
  const folderId = multiLinkState.folderId;
  const nodeMap = new Map();
  candidatesByCode.forEach(candidate => {
    const key = relationImportCandidateKey(candidate);
    if (nodeMap.has(key)) return;
    const relationKind = folder?.kind || (candidate.nodeType === 'sellpia_sku' ? 'individual' : 'custom');
    nodeMap.set(key, candidate.nodeId ? {clientKey:key, nodeId:Number(candidate.nodeId)} : candidate.nodeType === 'sellpia_sku' ? {
      clientKey:key, nodeType:'sellpia_sku', sellpiaSkuCode:candidate.sellpiaSkuCode, folderId, relationKind
    } : {
      clientKey:key, nodeType:'seller_listing', source:candidate.source, productCode:candidate.productCode,
      optionCode:candidate.optionCode || '', folderId, relationKind
    });
  });
  const edgeMap = new Map();
  parsed.edges.forEach((edge, index) => {
    const parentKey = relationImportCandidateKey(candidatesByCode.get(edge.parentCode));
    const childKey = relationImportCandidateKey(candidatesByCode.get(edge.childCode));
    if (parentKey === childKey) {
      errors.push(`${edge.rowNo}행: ${edge.parentCode}와 ${edge.childCode}가 같은 관계 노드로 확인됩니다.`);
      return;
    }
    const key = `${parentKey}\u0000${childKey}`;
    if (!edgeMap.has(key)) edgeMap.set(key, {parentKey, childKey, sortOrder:((index % 100) + 1) * 100});
  });
  const cycle = relationImportParser.findCycle([...edgeMap.values()].map(edge => ({parentCode:edge.parentKey, childCode:edge.childKey})));
  if (cycle) errors.push('선택한 실제 상품·옵션 기준으로 순환 관계가 생깁니다.');
  return {valid:errors.length === 0, nodes:[...nodeMap.values()], edges:[...edgeMap.values()], errors};
}

function renderRelationImport() {
  const result = document.getElementById('relation-import-result');
  const reset = document.getElementById('relation-import-reset');
  const save = document.getElementById('relation-import-save');
  reset.disabled = !relationImportState.parsed && !relationImportState.fileName;
  if (relationImportState.resolving) {
    result.innerHTML = '<span>상품코드-옵션코드를 원본과 정확히 대조하는 중입니다…</span>';
    save.disabled = true;
    return;
  }
  const parsed = relationImportState.parsed;
  if (!parsed) {
    result.innerHTML = '<span>파일을 선택하면 행·코드·관계와 오류를 먼저 검토합니다.</span>';
    save.disabled = true;
    return;
  }
  const items = parsed.codes.map(code => relationImportState.items.get(code) || {inputCode:code, status:'not_found', candidates:[]});
  const selectedCount = items.filter(item => selectedRelationImportCandidate(item)).length;
  const ambiguousCount = items.filter(item => item.status === 'ambiguous' && !selectedRelationImportCandidate(item)).length;
  const blockedCount = items.filter(item => ['not_found', 'unlinked'].includes(item.status)).length;
  const plan = buildRelationImportPlan();
  const errors = [...parsed.errors, ...plan.errors.filter(error => !parsed.errors.includes(error))];
  const rows = items.map(item => {
    const candidate = selectedRelationImportCandidate(item);
    let control = '';
    let status = '';
    if (item.status === 'ambiguous') {
      control = `<select data-relation-import-choice="${escapeHtml(item.inputCode)}"><option value="">판매처·상품을 선택…</option>${(item.candidates || []).map(option => `<option value="${escapeHtml(relationImportCandidateKey(option))}" ${relationImportState.choices.get(item.inputCode) === relationImportCandidateKey(option) ? 'selected' : ''} ${option.relationReady ? '' : 'disabled'}>${escapeHtml(relationImportCandidateLabel(option))}${option.relationReady ? '' : ' · 먼저 매칭 필요'}</option>`).join('')}</select>`;
      status = candidate ? '<span class="relation-import-status ok">선택 완료</span>' : '<span class="relation-import-status warn">출처 선택 필요</span>';
    } else if (item.status === 'matched') {
      control = escapeHtml(relationImportCandidateLabel(candidate));
      status = '<span class="relation-import-status ok">확인 완료</span>';
    } else if (item.status === 'unlinked') {
      control = escapeHtml(relationImportCandidateLabel(item.candidates?.[0]));
      status = '<span class="relation-import-status error">먼저 SKU 매칭 필요</span>';
    } else {
      control = '최신 원본에서 찾지 못함';
      status = '<span class="relation-import-status error">코드 없음</span>';
    }
    return `<tr><td>${escapeHtml(item.inputCode)}</td><td>${control}</td><td>${status}</td></tr>`;
  }).join('');
  result.innerHTML = `<div class="relation-import-stats"><span>파일<b>${escapeHtml(relationImportState.fileName || '-')}</b></span><span>유효 행<b>${formatNumber(parsed.rows.length)}</b></span><span>고유 코드<b>${formatNumber(parsed.codes.length)}</b></span><span>관계<b>${formatNumber(parsed.edges.length)}</b></span><span>중복 합침<b>${formatNumber(parsed.duplicateEdgeCount)}</b></span></div>
    ${errors.length ? `<ul class="relation-import-errors">${errors.slice(0, 30).map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : ''}
    ${items.length ? `<table class="relation-import-table"><thead><tr><th>입력 코드</th><th>정확히 확인된 상품·옵션</th><th>상태</th></tr></thead><tbody>${rows}</tbody></table>` : ''}`;
  save.textContent = relationImportState.saving ? '관계 저장 중…' : `검토한 관계 ${formatNumber(parsed.edges.length)}건 저장`;
  save.disabled = relationImportState.saving || !plan.valid || selectedCount !== parsed.codes.length || ambiguousCount > 0 || blockedCount > 0;
}

function resetRelationImport() {
  relationImportState.fileName = '';
  relationImportState.parsed = null;
  relationImportState.items.clear();
  relationImportState.choices.clear();
  relationImportState.resolving = false;
  relationImportState.saving = false;
  document.getElementById('relation-import-file').value = '';
  renderRelationImport();
}

async function loadRelationImportFile(file) {
  if (!file || !relationImportParser || !window.XLSX) return;
  relationImportState.fileName = file.name;
  relationImportState.items.clear();
  relationImportState.choices.clear();
  try {
    const isCsv = /\.csv$/i.test(file.name);
    const workbook = XLSX.read(isCsv ? await file.text() : await file.arrayBuffer(), {type:isCsv ? 'string' : 'array', cellDates:false});
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, {header:1, raw:false, defval:'', blankrows:false});
    relationImportState.parsed = relationImportParser.parseRelationHierarchyRows(rows, {maxCodes:500, maxEdges:1000});
    renderRelationImport();
    if (!relationImportState.parsed.valid) return;
    relationImportState.resolving = true;
    renderRelationImport();
    const items = await liveData.resolveRelationImportCodes(relationImportState.parsed.codes);
    relationImportState.items = new Map(items.map(item => [item.inputCode, item]));
  } catch (error) {
    relationImportState.parsed = {valid:false, headers:[], rows:[], codes:[], edges:[], duplicateEdgeCount:0, errors:[error?.message || String(error)]};
  } finally {
    relationImportState.resolving = false;
    renderRelationImport();
  }
}

async function saveRelationImport() {
  const boardChanges = relationBoardChanges();
  if (boardChanges.additions.length || boardChanges.removals.length) {
    showToast('작업판의 관계 변경을 먼저 저장하거나 취소해주세요.');
    return;
  }
  const plan = buildRelationImportPlan();
  if (!plan.valid) {
    renderRelationImport();
    showToast('코드 확인과 관계 오류를 먼저 해결해주세요.');
    return;
  }
  if (!window.confirm(`엑셀의 상위·하위 관계 ${plan.edges.length}건을 추가할까요?\n기존 관계는 해제하지 않으며 상품 원본·가격·재고도 변경하지 않습니다.`)) return;
  relationImportState.saving = true;
  renderRelationImport();
  try {
    await liveData.applyRelationBoard({nodes:plan.nodes, edges:plan.edges, removeEdgeIds:[]});
    await loadRelationGraph();
    resetRelationImport();
    document.getElementById('relation-import-panel').open = false;
    showToast(`엑셀 관계 ${formatNumber(plan.edges.length)}건을 저장했습니다.`);
  } catch (error) {
    showToast(`엑셀 관계 저장 실패: ${error?.message || error}`);
  } finally {
    relationImportState.saving = false;
    renderRelationImport();
  }
}

function bundleValue(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function normalizeBundleRole() {
  return 'component';
}

function normalizeBundleCandidate(raw = {}, fallbackCode = '') {
  return {
    skuCode:String(bundleValue(raw, 'sellpiaSkuCode', 'sellpia_sku_code', 'skuCode', 'sku', 'code') || fallbackCode).trim(),
    productName:String(bundleValue(raw, 'productName', 'product_name', 'sellpiaProductName', 'sellpia_product_name')).trim(),
    optionName:String(bundleValue(raw, 'optionName', 'option_name', 'sellpiaOptionName', 'sellpia_option_name')).trim(),
    imageUrl:String(bundleValue(raw, 'imageUrl', 'image_url', 'sellpiaOverrideImageUrl', 'sellpia_override_image_url')).trim()
  };
}

function normalizeBundleResolveItem(raw = {}, fallbackCode = '') {
  const inputCode = String(bundleValue(raw, 'inputCode', 'input_code', 'code') || fallbackCode).trim();
  let candidates = Array.isArray(raw.candidates) ? raw.candidates.map(candidate => normalizeBundleCandidate(candidate, inputCode)) : [];
  const direct = normalizeBundleCandidate(raw, inputCode);
  if (!candidates.length && direct.skuCode && bundleValue(raw, 'sellpiaSkuCode', 'sellpia_sku_code', 'skuCode', 'sku')) candidates = [direct];
  let status = String(raw.status || '').trim().toLowerCase();
  if (['ok', 'exact', 'resolved', 'success'].includes(status)) status = 'matched';
  if (['missing', 'notfound'].includes(status)) status = 'not_found';
  if (!status) status = candidates.length === 1 ? 'matched' : (candidates.length > 1 ? 'ambiguous' : 'not_found');
  return {inputCode, status, candidates};
}

function bundleCandidateLabel(candidate) {
  return `${candidate?.skuCode || '-'} · ${candidate?.productName || '상품명 없음'}${candidate?.optionName ? ` / ${candidate.optionName}` : ''}`;
}

function selectedBundleCandidate(item) {
  const candidates = Array.isArray(item?.candidates) ? item.candidates : [];
  if (item?.status === 'matched' && candidates.length === 1) return candidates[0];
  const choice = bundleImportState.choices.get(item?.inputCode);
  return candidates.find(candidate => candidate.skuCode === choice) || null;
}

function buildBundleImportPlan() {
  const parsed = bundleImportState.parsed;
  const errors = [];
  if (!parsed?.valid) return {valid:false, rows:[], errors:parsed?.errors || ['엑셀 검토가 끝나지 않았습니다.']};
  const resolved = new Map();
  parsed.codes.forEach(code => {
    const candidate = selectedBundleCandidate(bundleImportState.items.get(code));
    if (!candidate?.skuCode) errors.push(`${code}: 최신 셀피아 원본에서 정확한 SKU를 확인할 수 없습니다.`);
    else resolved.set(code, candidate);
  });
  if (errors.length) return {valid:false, rows:[], errors};
  const seen = new Set();
  const rows = [];
  parsed.rows.forEach((row, index) => {
    const bundleSkuCode = resolved.get(row.bundleCode)?.skuCode || '';
    const componentSkuCode = resolved.get(row.componentCode)?.skuCode || '';
    const qty = Number(row.quantity);
    if (bundleSkuCode === componentSkuCode) {
      errors.push(`${row.rowNo || index + 2}행: 세트 SKU와 구성품 SKU가 같습니다.`);
      return;
    }
    if (!Number.isSafeInteger(qty) || qty <= 0 || qty > 2147483647) {
      errors.push(`${row.rowNo || index + 2}행: 구성수량은 1 이상 2,147,483,647 이하의 정수여야 합니다.`);
      return;
    }
    const key = `${bundleSkuCode}\u0000${componentSkuCode}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      bundle_sku_code:bundleSkuCode,
      component_sku_code:componentSkuCode,
      component_qty:qty,
      component_role:'component',
      sort_order:(rows.length + 1) * 100
    });
  });
  return {valid:errors.length === 0, rows, errors};
}

function renderBundleImport() {
  const result = document.getElementById('bundle-import-result');
  const reset = document.getElementById('bundle-import-reset');
  const save = document.getElementById('bundle-import-save');
  reset.disabled = !bundleImportState.parsed && !bundleImportState.fileName;
  if (bundleImportState.resolving) {
    result.innerHTML = '<span>세트와 구성품 코드를 최신 셀피아 원본에서 확인하는 중입니다…</span>';
    save.disabled = true;
    return;
  }
  const parsed = bundleImportState.parsed;
  if (!parsed) {
    result.innerHTML = '<span>파일을 선택하면 코드·수량·중복·오류를 먼저 검토합니다.</span>';
    save.disabled = true;
    return;
  }
  const plan = buildBundleImportPlan();
  const errors = [...(parsed.errors || []), ...plan.errors.filter(error => !(parsed.errors || []).includes(error))];
  const items = (parsed.codes || []).map(code => bundleImportState.items.get(code) || {inputCode:code, status:'not_found', candidates:[]});
  const unresolvedCount = items.filter(item => !selectedBundleCandidate(item)).length;
  const resolutionRows = items.map(item => {
    const selected = selectedBundleCandidate(item);
    let control;
    let status;
    if (item.status === 'ambiguous') {
      control = `<select data-bundle-import-choice="${escapeHtml(item.inputCode)}"><option value="">셀피아 SKU 선택…</option>${item.candidates.map(candidate => `<option value="${escapeHtml(candidate.skuCode)}"${selected?.skuCode === candidate.skuCode ? ' selected' : ''}>${escapeHtml(bundleCandidateLabel(candidate))}</option>`).join('')}</select>`;
      status = selected ? '<span class="relation-import-status ok">선택 완료</span>' : '<span class="relation-import-status warn">선택 필요</span>';
    } else if (selected) {
      control = escapeHtml(bundleCandidateLabel(selected));
      status = '<span class="relation-import-status ok">확인 완료</span>';
    } else {
      control = '최신 셀피아 원본에서 찾지 못함';
      status = '<span class="relation-import-status error">코드 없음</span>';
    }
    return `<tr><td>${escapeHtml(item.inputCode)}</td><td>${control}</td><td>${status}</td></tr>`;
  }).join('');
  const compositionRows = (parsed.rows || []).map(row => {
    const bundle = selectedBundleCandidate(bundleImportState.items.get(row.bundleCode));
    const component = selectedBundleCandidate(bundleImportState.items.get(row.componentCode));
    const ready = Boolean(bundle && component);
    return `<tr><td>${escapeHtml(row.rowNo || '-')}</td><td>${escapeHtml(row.bundleCode)}</td><td>→ ${escapeHtml(row.componentCode)}</td><td>${formatNumber(row.quantity)}</td><td><span class="relation-import-status ${ready ? 'ok' : 'error'}">${ready ? '저장 준비' : '코드 확인 필요'}</span></td></tr>`;
  }).join('');
  result.innerHTML = `<div class="relation-import-stats"><span>파일<b>${escapeHtml(bundleImportState.fileName || '-')}</b></span><span>유효 행<b>${formatNumber(parsed.rows?.length || 0)}</b></span><span>고유 코드<b>${formatNumber(parsed.codes?.length || 0)}</b></span><span>저장 예정<b>${formatNumber(plan.rows.length)}</b></span><span>중복 합침<b>${formatNumber(parsed.duplicateCount || parsed.duplicateRowCount || 0)}</b></span><span>오류<b>${formatNumber(errors.length)}</b></span></div>
    ${errors.length ? `<ul class="relation-import-errors">${errors.slice(0, 30).map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : ''}
    ${compositionRows ? `<table class="relation-import-table bundle-import-preview"><thead><tr><th>행</th><th>세트</th><th>구성품</th><th>수량</th><th>상태</th></tr></thead><tbody>${compositionRows}</tbody></table>` : ''}
    ${resolutionRows ? `<table class="relation-import-table"><thead><tr><th>입력 코드</th><th>확인된 셀피아 상품 / 옵션</th><th>상태</th></tr></thead><tbody>${resolutionRows}</tbody></table>` : ''}`;
  save.textContent = bundleImportState.saving ? '세트 구성 저장 중…' : `검토한 세트 구성 ${formatNumber(plan.rows.length)}건 저장`;
  save.disabled = bundleImportState.saving || !plan.valid || unresolvedCount > 0 || !plan.rows.length;
}

function resetBundleImport() {
  bundleImportState.fileName = '';
  bundleImportState.parsed = null;
  bundleImportState.items.clear();
  bundleImportState.choices.clear();
  bundleImportState.resolving = false;
  bundleImportState.saving = false;
  document.getElementById('bundle-import-file').value = '';
  renderBundleImport();
}

async function loadBundleImportFile(file) {
  if (!file) return;
  bundleImportState.fileName = file.name;
  bundleImportState.items.clear();
  bundleImportState.choices.clear();
  if (!bundleImportParser?.parseBundleCompositionRows) {
    bundleImportState.parsed = {valid:false, rows:[], codes:[], errors:['세트 구성 엑셀 검사 모듈을 불러오지 못했습니다. 페이지를 새로고침해주세요.']};
    renderBundleImport();
    return;
  }
  if (!window.XLSX) {
    bundleImportState.parsed = {valid:false, rows:[], codes:[], errors:['엑셀 파일 모듈을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.']};
    renderBundleImport();
    return;
  }
  try {
    const isCsv = /\.csv$/i.test(file.name);
    const workbook = XLSX.read(isCsv ? await file.text() : await file.arrayBuffer(), {type:isCsv ? 'string' : 'array', cellDates:false});
    const preferredSheet = workbook.SheetNames.find(name => name.trim() === '세트구성') || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[preferredSheet];
    const rows = XLSX.utils.sheet_to_json(worksheet, {header:1, raw:false, defval:'', blankrows:false});
    bundleImportState.parsed = bundleImportParser.parseBundleCompositionRows(rows, {maxCodes:500, maxRows:1000});
    renderBundleImport();
    if (!bundleImportState.parsed.valid) return;
    bundleImportState.resolving = true;
    renderBundleImport();
    if (!liveData?.resolveBundleImportCodes) throw new Error('현재 배포에는 세트 코드 확인 기능이 없습니다. DB 기능 배포 후 다시 시도해주세요.');
    const resolved = await liveData.resolveBundleImportCodes(bundleImportState.parsed.codes);
    bundleImportState.items = new Map(bundleImportState.parsed.codes.map(code => {
      const raw = resolved.find(item => String(bundleValue(item, 'inputCode', 'input_code', 'code')).trim() === code) || {};
      const item = normalizeBundleResolveItem(raw, code);
      return [code, item];
    }));
  } catch (error) {
    bundleImportState.parsed = {valid:false, rows:[], codes:[], duplicateCount:0, errors:[error?.message || String(error)]};
  } finally {
    bundleImportState.resolving = false;
    renderBundleImport();
  }
}

async function saveBundleImport() {
  const plan = buildBundleImportPlan();
  if (!plan.valid || !plan.rows.length) {
    renderBundleImport();
    showToast('세트 코드와 구성수량 오류를 먼저 해결해주세요.');
    return;
  }
  if (!window.confirm(`검토한 세트 구성 ${plan.rows.length}건을 저장할까요?\n관계 그래프·판매처 연결·가격·재고는 변경하지 않습니다.`)) return;
  bundleImportState.saving = true;
  renderBundleImport();
  try {
    if (!liveData?.applyBundleImport) throw new Error('현재 배포에는 세트 구성 저장 기능이 없습니다. DB 기능 배포 후 다시 시도해주세요.');
    const result = await liveData.applyBundleImport(plan.rows);
    if (result?.applied === false || (Array.isArray(result?.errors) && result.errors.length)) {
      throw new Error((result.errors || []).join('\n') || '세트 구성 검증에 실패해 저장하지 않았습니다.');
    }
    resetBundleImport();
    await loadBundleGraph({query:bundleGraphState.query});
    showToast(`세트 구성 ${formatNumber(plan.rows.length)}건을 저장했습니다.`);
  } catch (error) {
    showToast(`세트 구성 저장 실패: ${error?.message || error}`);
  } finally {
    bundleImportState.saving = false;
    renderBundleImport();
  }
}

function normalizeBundleComponent(raw = {}, fallbackBundleSku = '') {
  return {
    componentId:Number(bundleValue(raw, 'componentId', 'component_id', 'bundleComponentId', 'bundle_component_id')) || null,
    bundleSkuCode:String(bundleValue(raw, 'bundleSkuCode', 'bundle_sku_code') || fallbackBundleSku).trim(),
    componentSkuCode:String(bundleValue(raw, 'componentSkuCode', 'component_sku_code', 'sellpiaSkuCode', 'sellpia_sku_code')).trim(),
    qty:Number(bundleValue(raw, 'componentQty', 'component_qty', 'quantity', 'qty')) || 1,
    role:normalizeBundleRole(bundleValue(raw, 'componentRole', 'component_role', 'role')),
    sortOrder:Number(bundleValue(raw, 'sortOrder', 'sort_order')) || 100,
    nestedBundleId:Number(bundleValue(raw, 'nestedBundleId', 'nested_bundle_id')) || null,
    productName:String(bundleValue(raw, 'componentProductName', 'component_product_name', 'productName', 'product_name', 'sellpiaProductName', 'sellpia_product_name')).trim(),
    optionName:String(bundleValue(raw, 'componentOptionName', 'component_option_name', 'optionName', 'option_name', 'sellpiaOptionName', 'sellpia_option_name')).trim(),
    imageUrl:String(bundleValue(raw, 'componentImageUrl', 'component_image_url', 'imageUrl', 'image_url')).trim()
  };
}

function normalizeBundleGraph(payload) {
  const definitions = Array.isArray(payload?.definitions) ? payload.definitions : [];
  const detachedComponents = Array.isArray(payload?.components) ? payload.components : [];
  const rawRows = definitions.length ? definitions.map(definition => {
    const bundleId = String(bundleValue(definition, 'bundleId', 'bundle_id'));
    const bundleSkuCode = String(bundleValue(definition, 'bundleSkuCode', 'bundle_sku_code'));
    return {
      ...definition,
      components:detachedComponents.filter(component => {
        const componentBundleId = String(bundleValue(component, 'bundleId', 'bundle_id'));
        const componentBundleSku = String(bundleValue(component, 'bundleSkuCode', 'bundle_sku_code'));
        return (bundleId && componentBundleId === bundleId) || (bundleSkuCode && componentBundleSku === bundleSkuCode);
      })
    };
  }) : (Array.isArray(payload) ? payload : (payload?.bundles || payload?.items || payload?.rows || payload?.graph || []));
  const bySku = new Map();
  rawRows.forEach(raw => {
    const bundleSkuCode = String(bundleValue(raw, 'bundleSkuCode', 'bundle_sku_code', 'sellpiaSkuCode', 'sellpia_sku_code')).trim();
    if (!bundleSkuCode) return;
    let bundle = bySku.get(bundleSkuCode);
    if (!bundle) {
      bundle = {
        bundleSkuCode,
        productName:String(bundleValue(raw, 'bundleProductName', 'bundle_product_name', 'productName', 'product_name')).trim(),
        optionName:String(bundleValue(raw, 'bundleOptionName', 'bundle_option_name', 'optionName', 'option_name')).trim(),
        imageUrl:String(bundleValue(raw, 'bundleImageUrl', 'bundle_image_url', 'imageUrl', 'image_url')).trim(),
        components:[]
      };
      bySku.set(bundleSkuCode, bundle);
    }
    const nested = Array.isArray(raw.components) ? raw.components : (Array.isArray(raw.children) ? raw.children : null);
    if (nested) bundle.components.push(...nested.map(component => normalizeBundleComponent(component, bundleSkuCode)).filter(component => component.componentSkuCode));
    else {
      const component = normalizeBundleComponent(raw, bundleSkuCode);
      if (component.componentSkuCode) bundle.components.push(component);
    }
  });
  return [...bySku.values()].map(bundle => ({...bundle, components:[...new Map(bundle.components.map(component => [`${component.componentId || ''}|${component.componentSkuCode}`, component])).values()].sort((a, b) => a.sortOrder - b.sortOrder)}));
}

function renderBundleThumb(imageUrl, productName, optionName) {
  if (!imageUrl) return '<span class="relation-board-node-image empty" aria-hidden="true">NO</span>';
  return `<button class="relation-board-node-image" type="button" data-relation-image="${escapeHtml(imageUrl)}" data-relation-image-title="${escapeHtml(productName || '상품명 없음')}" data-relation-image-option="${escapeHtml(optionName || '옵션명 없음')}" aria-label="${escapeHtml(productName || '상품')} 이미지 확대"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('empty');this.parentNode.removeAttribute('data-relation-image');this.remove()"></button>`;
}

function renderBundleGraph() {
  const list = document.getElementById('bundle-graph-list');
  if (bundleGraphState.loading) {
    list.innerHTML = '<div class="bundle-empty">세트 구성과 상품 정보를 불러오는 중입니다…</div>';
    return;
  }
  if (!bundleGraphState.bundles.length) {
    list.innerHTML = `<div class="bundle-empty">${bundleGraphState.loaded ? '검색 조건에 맞는 세트 구성이 없습니다.' : '세트 구성 관리 패널을 펼치면 DB에서 구성을 조회합니다.'}</div>`;
    return;
  }
  const rows = bundleGraphState.bundles.flatMap(bundle => {
    const components = bundle.components.length ? bundle.components : [null];
    return components.map((component, index) => `<tr class="bundle-component-row" data-bundle-component-id="${component?.componentId || ''}" data-bundle-sku="${escapeHtml(bundle.bundleSkuCode)}" data-component-sku="${escapeHtml(component?.componentSkuCode || '')}" data-sort-order="${component?.sortOrder || 100}">
      ${index === 0 ? `<td class="bundle-matrix-product" rowspan="${components.length}">${renderBundleThumb(bundle.imageUrl, bundle.productName, bundle.optionName)}<div class="bundle-card-copy"><span>세트 SKU ${escapeHtml(bundle.bundleSkuCode)}</span><b title="${escapeHtml(bundle.productName || '상품명 없음')}">${escapeHtml(bundle.productName || '상품명 없음')}</b><strong>${escapeHtml(bundle.optionName || '옵션명 없음')}</strong><em>구성 ${formatNumber(bundle.components.length)}개</em></div></td>` : ''}
      <td class="bundle-matrix-arrow">→</td>
      <td class="bundle-matrix-product">${component ? renderBundleThumb(component.imageUrl, component.productName, component.optionName) : '<span class="relation-board-node-image empty">NO</span>'}<div class="bundle-component-copy"><span>${component ? `${component.nestedBundleId ? '하위 세트' : '구성품'} SKU ${escapeHtml(component.componentSkuCode)}` : '구성품 없음'}</span><b title="${escapeHtml(component?.productName || '상품명 없음')}">${escapeHtml(component?.productName || '상품명 없음')}</b><strong>${escapeHtml(component?.optionName || '옵션명 없음')}</strong></div></td>
      <td>${component ? `<label class="bundle-matrix-field"><span>구성수량</span><input data-bundle-component-qty type="number" min="0.001" step="0.001" value="${escapeHtml(component.qty)}"></label>` : '-'}</td>
      <td><div class="bundle-component-actions">${component ? `<button class="btn" type="button" data-bundle-component-save>저장</button><button class="btn danger" type="button" data-bundle-component-remove${component.componentId ? '' : ' disabled title="연결 ID를 확인할 수 없어 해제할 수 없습니다."'}>해제</button>` : ''}</div></td>
    </tr>`);
  }).join('');
  list.innerHTML = `<div class="multi-link-cell-matrix-shell"><table class="multi-link-cell-matrix bundle-matrix"><thead><tr><th>세트 SKU</th><th>관계</th><th>구성품 SKU</th><th>구성수량</th><th>작업</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function loadBundleGraph({query = bundleGraphState.query} = {}) {
  const requestId = ++bundleGraphState.requestId;
  bundleGraphState.query = String(query || '').trim();
  bundleGraphState.loading = true;
  renderBundleGraph();
  try {
    if (!liveData?.listBundleGraph) throw new Error('현재 배포에는 세트 구성 조회 기능이 없습니다. DB 기능 배포 후 다시 시도해주세요.');
    const payload = await liveData.listBundleGraph(bundleGraphState.query);
    if (requestId !== bundleGraphState.requestId) return;
    const bundles = normalizeBundleGraph(payload);
    if (liveData?.loadSellpiaRelationVisuals && bundles.length) {
      const skus = [...new Set(bundles.flatMap(bundle => [bundle.bundleSkuCode, ...bundle.components.map(component => component.componentSkuCode)]))];
      try {
        const visuals = await liveData.loadSellpiaRelationVisuals(skus);
        if (requestId !== bundleGraphState.requestId) return;
        const visualBySku = new Map((visuals || []).map(visual => [String(visual.sellpia_sku_code || ''), visual]));
        bundles.forEach(bundle => {
          const bundleVisual = visualBySku.get(bundle.bundleSkuCode);
          if (bundleVisual) {
            bundle.productName ||= bundleVisual.sellpia_product_name || '';
            bundle.optionName ||= bundleVisual.sellpia_option_name || '';
            bundle.imageUrl ||= bundleVisual.sellpia_override_image_url || bundleVisual.image_url || '';
          }
          bundle.components.forEach(component => {
            const componentVisual = visualBySku.get(component.componentSkuCode);
            if (!componentVisual) return;
            component.productName ||= componentVisual.sellpia_product_name || '';
            component.optionName ||= componentVisual.sellpia_option_name || '';
            component.imageUrl ||= componentVisual.sellpia_override_image_url || componentVisual.image_url || '';
          });
        });
      } catch (visualError) {
        console.warn('bundle visual enrichment failed', visualError);
      }
    }
    bundleGraphState.bundles = bundles;
    bundleGraphState.loaded = true;
  } catch (error) {
    if (requestId !== bundleGraphState.requestId) return;
    bundleGraphState.bundles = [];
    bundleGraphState.loaded = true;
    document.getElementById('bundle-graph-list').innerHTML = `<div class="bundle-empty">세트 구성을 불러오지 못했습니다. ${escapeHtml(error?.message || error)}</div>`;
    return;
  } finally {
    if (requestId === bundleGraphState.requestId) bundleGraphState.loading = false;
  }
  renderBundleGraph();
}

function downloadBundleTemplate() {
  if (!window.XLSX) {
    showToast('엑셀 템플릿 모듈을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
    return;
  }
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['세트 상품코드-옵션코드', '구성품 상품코드-옵션코드', '구성수량'],
    ['1000-1', '2000-1', 1]
  ]);
  worksheet['!cols'] = [{wch:28}, {wch:32}, {wch:12}];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '세트구성');
  XLSX.writeFile(workbook, 'system_v3_bundle_components_template.xlsx');
}

function sellerBundleChannelLabel(source) {
  return CHANNEL_LABELS[source] || multiLinkChannelLabel(source) || source;
}

function sellerBundleErrorMessage(error, fallback = '알 수 없는 오류') {
  if (typeof error === 'string') return error;
  return String(error?.message || error?.error || error?.code || fallback);
}

function normalizeSellerBundleComponent(raw = {}) {
  return {
    componentId:Number(bundleValue(raw, 'componentId', 'component_id', 'listingComponentId', 'listing_component_id')) || null,
    sku:String(bundleValue(raw, 'componentSkuCode', 'component_sku_code', 'sellpiaSkuCode', 'sellpia_sku_code', 'sku')).trim(),
    qty:Math.max(1, Math.trunc(Number(bundleValue(raw, 'componentQty', 'component_qty', 'qty', 'quantity')) || 1)),
    role:String(bundleValue(raw, 'componentRole', 'component_role', 'role') || 'additional').trim(),
    productName:String(bundleValue(raw, 'componentProductName', 'component_product_name', 'productName', 'product_name')).trim(),
    optionName:String(bundleValue(raw, 'componentOptionName', 'component_option_name', 'optionName', 'option_name')).trim(),
    imageUrl:String(bundleValue(raw, 'componentImageUrl', 'component_image_url', 'imageUrl', 'image_url')).trim()
  };
}

function normalizeSellerBundleTargets(payload, fallback = {}) {
  if (payload && !Array.isArray(payload) && Array.isArray(payload.components) && !payload.listings && !payload.rows) {
    return [{
      source:String(bundleValue(payload, 'sourceChannel', 'source_channel', 'source') || fallback.source || '').trim(),
      productCode:String(bundleValue(payload, 'productCode', 'product_code') || fallback.productCode || '').trim(),
      optionCode:String(bundleValue(payload, 'optionCode', 'option_code') || fallback.optionCode || '').trim(),
      productName:String(bundleValue(payload, 'productName', 'product_name')).trim(),
      optionName:String(bundleValue(payload, 'optionName', 'option_name')).trim(),
      bundleType:String(bundleValue(payload, 'relationKind', 'relation_kind', 'bundleType', 'bundle_type') || fallback.bundleType || 'set').trim(),
      components:payload.components.map(normalizeSellerBundleComponent).filter(component => component.sku)
    }];
  }
  const listings = Array.isArray(payload) ? payload : (payload?.listings || payload?.rows || payload?.items || []);
  const detachedComponents = Array.isArray(payload?.components) ? payload.components : [];
  return listings.map(listing => {
    const listingId = String(bundleValue(listing, 'listingId', 'listing_id'));
    const source = String(bundleValue(listing, 'sourceChannel', 'source_channel', 'source')).trim();
    const productCode = String(bundleValue(listing, 'productCode', 'product_code')).trim();
    const optionCode = String(bundleValue(listing, 'optionCode', 'option_code')).trim();
    const nested = Array.isArray(listing.components) ? listing.components : detachedComponents.filter(component => {
      const componentListingId = String(bundleValue(component, 'listingId', 'listing_id'));
      if (listingId && componentListingId) return componentListingId === listingId;
      return String(bundleValue(component, 'sourceChannel', 'source_channel', 'source')).trim() === source
        && String(bundleValue(component, 'productCode', 'product_code')).trim() === productCode
        && String(bundleValue(component, 'optionCode', 'option_code')).trim() === optionCode;
    });
    return {
      source,
      productCode,
      optionCode,
      productName:String(bundleValue(listing, 'productName', 'product_name')).trim(),
      optionName:String(bundleValue(listing, 'optionName', 'option_name')).trim(),
      bundleType:String(bundleValue(listing, 'relationKind', 'relation_kind', 'bundleType', 'bundle_type') || 'set').trim(),
      components:nested.map(normalizeSellerBundleComponent).filter(component => component.sku)
    };
  });
}

function renderSellerBundleTarget() {
  const host = document.getElementById('seller-bundle-target-result');
  if (sellerBundleState.loading) {
    host.innerHTML = '<div class="bundle-empty">판매처 상품·옵션과 현재 구성을 확인하는 중입니다…</div>';
    return;
  }
  const target = sellerBundleState.target;
  if (!target) {
    host.innerHTML = '<div class="bundle-empty">판매처·상품코드·옵션코드를 입력해 대상을 조회해주세요.</div>';
    return;
  }
  const typeLabel = sellerBundleState.bundleType === 'one_plus_one' ? '1+1' : '세트';
  host.innerHTML = `<article class="seller-bundle-card" data-seller-bundle-source="${escapeHtml(target.source)}" data-seller-bundle-product="${escapeHtml(target.productCode)}" data-seller-bundle-option="${escapeHtml(target.optionCode)}">
    <div class="multi-link-cell-matrix-shell"><table class="multi-link-cell-matrix seller-bundle-matrix"><thead><tr><th>판매처 대상</th><th>유형</th><th>구성품 SKU</th><th>구성수량</th><th>작업</th></tr></thead><tbody>${(target.components.length ? target.components : [null]).map((component, index, components) => `<tr class="seller-bundle-component" data-seller-component-id="${component?.componentId || ''}" data-seller-component-sku="${escapeHtml(component?.sku || '')}">
      ${index === 0 ? `<td class="bundle-matrix-product" rowspan="${components.length}">${renderBundleThumb(target.imageUrl || components.find(candidate => candidate.imageUrl)?.imageUrl || '', target.productName, target.optionName)}<div><span class="multi-link-channel ${escapeHtml(target.source)}"><i></i>${escapeHtml(sellerBundleChannelLabel(target.source))}</span><b>${escapeHtml(target.productName || '상품명 없음')}</b><strong>${escapeHtml(target.optionName || '옵션명 없음')}</strong><em>${escapeHtml(target.productCode)}${target.optionCode ? ` / ${escapeHtml(target.optionCode)}` : ''}</em></div></td><td rowspan="${components.length}"><mark>${typeLabel}</mark></td>` : ''}
      <td class="bundle-matrix-product">${component ? renderBundleThumb(component.imageUrl, component.productName, component.optionName) : '<span class="relation-board-node-image empty">NO</span>'}<div><span>${component ? `셀피아 SKU ${escapeHtml(component.sku)}` : '구성품 없음'}</span><b>${escapeHtml(component?.productName || '상품명 없음')}</b><strong>${escapeHtml(component?.optionName || '옵션명 없음')}</strong></div></td>
      <td>${component ? `<label class="bundle-matrix-field"><span>구성수량</span><input data-seller-component-qty type="number" min="1" step="1" value="${component.qty}"></label>` : '-'}</td>
      <td><div class="bundle-component-actions">${component ? `<button class="btn" type="button" data-seller-component-save>저장</button><button class="btn danger" type="button" data-seller-component-remove${component.componentId ? '' : ' disabled'}>해제</button>` : ''}</div></td>
    </tr>`).join('')}</tbody></table></div>
    <form id="seller-bundle-component-form" class="seller-bundle-component-form"><label>추가할 셀피아 SKU<input name="componentSku" required autocomplete="off" placeholder="상품코드-옵션코드"></label><label>구성수량<input name="qty" type="number" min="1" step="1" value="1" required></label><button class="btn primary" type="submit">구성 추가</button></form>
    <p class="seller-bundle-boundary">이 화면은 시스템 내부 구성표만 저장합니다. 셀피아 SKU 생성 및 판매처 쓰기는 실행하지 않습니다.</p>
  </article>`;
}

function sellerBundleRowsWithChange(componentSkuCode, quantity) {
  const target = sellerBundleState.target;
  if (!target) throw new Error('판매처 구성 대상을 먼저 조회해주세요.');
  const sku = String(componentSkuCode || '').trim();
  const qty = Number(quantity);
  if (!sku) throw new Error('구성품 셀피아 SKU를 입력해주세요.');
  if (!Number.isSafeInteger(qty) || qty < 1) throw new Error('구성수량은 1 이상의 정수여야 합니다.');
  const components = target.components
    .slice()
    .sort((left, right) => (left.role === 'primary' ? -1 : 0) - (right.role === 'primary' ? -1 : 0))
    .map(component => ({sku:component.sku, qty:component.sku === sku ? qty : component.qty}));
  if (!components.some(component => component.sku === sku)) components.push({sku, qty});
  return components.map(component => ({
    source_channel:target.source,
    product_code:target.productCode,
    option_code:target.optionCode,
    component_sku_code:component.sku,
    component_qty:component.qty,
    bundle_type:sellerBundleState.bundleType
  }));
}

async function saveSellerBundleRows(rows) {
  if (!liveData?.applySellerBundleImport) throw new Error('현재 배포에는 판매처 구성 저장 기능이 없습니다. DB 기능 배포 후 다시 시도해주세요.');
  const result = await liveData.applySellerBundleImport(rows);
  if (result?.applied === false || (Array.isArray(result?.errors) && result.errors.length)) {
    throw new Error((result?.errors || []).map(error => sellerBundleErrorMessage(error)).join('\n') || '판매처 전용 구성을 저장하지 못했습니다.');
  }
  return result;
}

async function loadSellerBundleTarget() {
  const requestId = ++sellerBundleState.requestId;
  sellerBundleState.loading = true;
  sellerBundleState.target = null;
  renderSellerBundleTarget();
  try {
    let targets = [];
    if (liveData?.listSellerBundleGraph) {
      const payload = await liveData.listSellerBundleGraph({source:sellerBundleState.source, query:sellerBundleState.productCode});
      targets = normalizeSellerBundleTargets(payload, sellerBundleState);
    } else if (liveData?.loadListingConnection) {
      const payload = await liveData.loadListingConnection({source:sellerBundleState.source, productCode:sellerBundleState.productCode, optionCode:sellerBundleState.optionCode});
      targets = normalizeSellerBundleTargets(payload, sellerBundleState);
    } else throw new Error('현재 배포에는 판매처 전용 구성 조회 기능이 없습니다.');
    if (requestId !== sellerBundleState.requestId) return;
    let target = targets.find(item => item.source === sellerBundleState.source && item.productCode === sellerBundleState.productCode && item.optionCode === sellerBundleState.optionCode) || null;
    if (!target && liveData?.loadListingConnection) {
      const payload = await liveData.loadListingConnection({source:sellerBundleState.source, productCode:sellerBundleState.productCode, optionCode:sellerBundleState.optionCode});
      target = normalizeSellerBundleTargets(payload, sellerBundleState).find(item => item.source === sellerBundleState.source && item.productCode === sellerBundleState.productCode && item.optionCode === sellerBundleState.optionCode) || null;
    }
    if (!target) throw new Error(`${sellerBundleChannelLabel(sellerBundleState.source)} ${sellerBundleState.productCode}${sellerBundleState.optionCode ? ` / ${sellerBundleState.optionCode}` : ''} 상품·옵션을 찾을 수 없습니다.`);
    if (['one_plus_one','set'].includes(target.bundleType)) {
      sellerBundleState.bundleType = target.bundleType;
      document.getElementById('seller-bundle-type').value = target.bundleType;
    }
    if (liveData?.loadSellpiaRelationVisuals && target.components.length) {
      try {
        const visuals = await liveData.loadSellpiaRelationVisuals(target.components.map(component => component.sku));
        const bySku = new Map((visuals || []).map(visual => [String(visual.sellpia_sku_code || ''), visual]));
        target.components.forEach(component => {
          const visual = bySku.get(component.sku);
          if (!visual) return;
          component.productName ||= visual.sellpia_product_name || '';
          component.optionName ||= visual.sellpia_option_name || '';
          component.imageUrl ||= visual.sellpia_override_image_url || visual.image_url || '';
        });
      } catch (visualError) { console.warn('seller bundle visual enrichment failed', visualError); }
    }
    sellerBundleState.target = target;
  } catch (error) {
    if (requestId === sellerBundleState.requestId) {
      document.getElementById('seller-bundle-target-result').innerHTML = `<div class="bundle-empty">판매처 전용 구성을 불러오지 못했습니다. ${escapeHtml(error?.message || error)}</div>`;
    }
    return;
  } finally {
    if (requestId === sellerBundleState.requestId) sellerBundleState.loading = false;
  }
  renderSellerBundleTarget();
}

function sellerBundleImportPlan() {
  const parsed = sellerBundleImportState.parsed;
  if (!parsed?.valid) return {valid:false, rows:[], errors:parsed?.errors || ['엑셀 검토가 끝나지 않았습니다.']};
  const rows = parsed.rows.map(row => ({
    source_channel:row.seller,
    product_code:row.sellerProductCode,
    option_code:row.sellerOptionCode || '',
    component_sku_code:row.componentCode,
    component_qty:Number(row.quantity),
    bundle_type:row.compositionType
  }));
  const result = sellerBundleImportState.resolved;
  const errors = [...(parsed.errors || []), ...(Array.isArray(result?.errors) ? result.errors.map(error => sellerBundleErrorMessage(error)) : [])];
  const resolvedRows = Array.isArray(result?.rows) ? result.rows : [];
  resolvedRows.forEach((row, index) => {
    const status = String(bundleValue(row, 'status', 'resultStatus', 'result_status')).toLowerCase();
    if (status && !['ok','ready','matched','valid','unchanged'].includes(status)) errors.push(`${row.rowNo || row.row_no || index + 2}행: ${row.message || row.error || '판매처 대상 또는 구성품을 확인해주세요.'}`);
  });
  return {valid:Boolean(result) && errors.length === 0, rows, errors, resolvedRows};
}

function renderSellerBundleImport() {
  const result = document.getElementById('seller-bundle-import-result');
  const reset = document.getElementById('seller-bundle-import-reset');
  const save = document.getElementById('seller-bundle-import-save');
  reset.disabled = !sellerBundleImportState.parsed && !sellerBundleImportState.fileName;
  if (sellerBundleImportState.resolving) {
    result.innerHTML = '<span>판매처 실제 상품·옵션과 구성품 셀피아 SKU를 확인하는 중입니다…</span>';
    save.disabled = true;
    return;
  }
  const parsed = sellerBundleImportState.parsed;
  if (!parsed) {
    result.innerHTML = '<span>파일을 선택하면 판매처 대상·구성품·수량·중복·오류를 먼저 검토합니다.</span>';
    save.disabled = true;
    return;
  }
  const plan = sellerBundleImportPlan();
  const errors = [...new Set([...(parsed.errors || []), ...plan.errors])];
  const resolvedByRow = new Map((plan.resolvedRows || []).map(row => [Number(bundleValue(row, 'rowNo', 'row_no')), row]));
  const rows = (parsed.rows || []).map(row => {
    const resolved = resolvedByRow.get(Number(row.rowNo));
    const status = String(bundleValue(resolved, 'status', 'resultStatus', 'result_status')).toLowerCase();
    const ready = Boolean(sellerBundleImportState.resolved) && (!status || ['ok','ready','matched','valid','unchanged'].includes(status));
    return `<tr><td>${row.rowNo}</td><td><span class="multi-link-channel ${escapeHtml(row.seller)}"><i></i>${escapeHtml(sellerBundleChannelLabel(row.seller))}</span></td><td>${escapeHtml(row.sellerProductCode)}${row.sellerOptionCode ? ` / ${escapeHtml(row.sellerOptionCode)}` : ''}</td><td>${escapeHtml(row.componentCode)}</td><td>${formatNumber(row.quantity)}</td><td>${row.compositionType === 'one_plus_one' ? '1+1' : '세트'}</td><td><span class="relation-import-status ${ready ? 'ok' : 'error'}">${ready ? '저장 준비' : '확인 필요'}</span></td></tr>`;
  }).join('');
  result.innerHTML = `<div class="relation-import-stats"><span>파일<b>${escapeHtml(sellerBundleImportState.fileName || '-')}</b></span><span>유효 행<b>${formatNumber(parsed.rows?.length || 0)}</b></span><span>판매처 대상<b>${formatNumber(parsed.targets?.length || 0)}</b></span><span>구성품 코드<b>${formatNumber(parsed.codes?.length || 0)}</b></span><span>중복 합침<b>${formatNumber(parsed.duplicateCount || 0)}</b></span><span>오류<b>${formatNumber(errors.length)}</b></span></div>
    ${errors.length ? `<ul class="relation-import-errors">${errors.slice(0, 30).map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : ''}
    ${rows ? `<table class="relation-import-table bundle-import-preview"><thead><tr><th>행</th><th>판매처</th><th>상품 / 옵션</th><th>구성품 SKU</th><th>수량</th><th>유형</th><th>상태</th></tr></thead><tbody>${rows}</tbody></table>` : ''}`;
  save.textContent = sellerBundleImportState.saving ? '판매처 구성 저장 중…' : `검토한 판매처 구성 ${formatNumber(plan.rows.length)}건 저장`;
  save.disabled = sellerBundleImportState.saving || !plan.valid || !plan.rows.length;
}

function resetSellerBundleImport() {
  sellerBundleImportState.fileName = '';
  sellerBundleImportState.parsed = null;
  sellerBundleImportState.resolved = null;
  sellerBundleImportState.resolving = false;
  sellerBundleImportState.saving = false;
  document.getElementById('seller-bundle-import-file').value = '';
  renderSellerBundleImport();
}

async function loadSellerBundleImportFile(file) {
  if (!file) return;
  sellerBundleImportState.fileName = file.name;
  sellerBundleImportState.resolved = null;
  if (!sellerBundleImportParser?.parseSellerBundleRows) {
    sellerBundleImportState.parsed = {valid:false, rows:[], targets:[], codes:[], errors:['판매처 전용 구성 엑셀 검사 모듈을 불러오지 못했습니다. 페이지를 새로고침해주세요.']};
    renderSellerBundleImport();
    return;
  }
  if (!window.XLSX) {
    sellerBundleImportState.parsed = {valid:false, rows:[], targets:[], codes:[], errors:['엑셀 파일 모듈을 불러오지 못했습니다. 페이지를 새로고침해주세요.']};
    renderSellerBundleImport();
    return;
  }
  try {
    const isCsv = /\.csv$/i.test(file.name);
    const workbook = XLSX.read(isCsv ? await file.text() : await file.arrayBuffer(), {type:isCsv ? 'string' : 'array', cellDates:false});
    const preferredSheet = workbook.SheetNames.find(name => name.trim() === '판매처전용구성') || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[preferredSheet];
    const matrix = XLSX.utils.sheet_to_json(worksheet, {header:1, raw:false, defval:'', blankrows:false});
    sellerBundleImportState.parsed = sellerBundleImportParser.parseSellerBundleRows(matrix, {maxRows:1000, maxCodes:500});
    renderSellerBundleImport();
    if (!sellerBundleImportState.parsed.valid) return;
    sellerBundleImportState.resolving = true;
    renderSellerBundleImport();
    if (!liveData?.resolveSellerBundleImportRows) throw new Error('현재 배포에는 판매처 구성 확인 기능이 없습니다. DB 기능 배포 후 다시 시도해주세요.');
    sellerBundleImportState.resolved = await liveData.resolveSellerBundleImportRows(sellerBundleImportPlan().rows);
  } catch (error) {
    sellerBundleImportState.parsed = {valid:false, rows:[], targets:[], codes:[], duplicateCount:0, errors:[error?.message || String(error)]};
  } finally {
    sellerBundleImportState.resolving = false;
    renderSellerBundleImport();
  }
}

async function saveSellerBundleImport() {
  const plan = sellerBundleImportPlan();
  if (!plan.valid || !plan.rows.length) return renderSellerBundleImport();
  if (!window.confirm(`판매처 전용 1+1/세트 구성 ${plan.rows.length}건을 저장할까요?\n셀피아 SKU 생성 및 실제 판매처 쓰기는 실행하지 않습니다.`)) return;
  sellerBundleImportState.saving = true;
  renderSellerBundleImport();
  try {
    const saved = await liveData.applySellerBundleImport(plan.rows);
    if (saved?.applied === false || (Array.isArray(saved?.errors) && saved.errors.length)) throw new Error((saved.errors || []).map(error => sellerBundleErrorMessage(error)).join('\n') || '판매처 전용 구성을 저장하지 못했습니다.');
    resetSellerBundleImport();
    showToast(`판매처 전용 구성 ${formatNumber(plan.rows.length)}건을 저장했습니다. 실제 판매처에는 전송하지 않았습니다.`);
  } catch (error) { showToast(`판매처 전용 구성 저장 실패: ${error?.message || error}`); }
  finally { sellerBundleImportState.saving = false; renderSellerBundleImport(); }
}

function downloadSellerBundleTemplate() {
  if (!window.XLSX) return showToast('엑셀 템플릿 모듈을 불러오지 못했습니다.');
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['판매처', '판매처 상품코드', '판매처 옵션코드', '구성품 상품코드-옵션코드', '구성수량', '구성유형'],
    ['스마트스토어', '123456', '01', '2000-1', 2, '1+1']
  ]);
  worksheet['!cols'] = [{wch:16}, {wch:20}, {wch:20}, {wch:32}, {wch:12}, {wch:14}];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '판매처전용구성');
  XLSX.writeFile(workbook, 'system_v3_seller_bundle_components_template.xlsx');
}

function renderRelationFolderParentOptions(folder = null, preferredParentFolderId = null) {
  const select = document.getElementById('relation-folder-parent');
  const excluded = folder ? relationFolderDescendantIds(folder.folderId) : new Set();
  const rows = relationFolderRows().filter(candidate => !excluded.has(String(candidate.folderId)));
  select.innerHTML = '<option value="">최상위 폴더</option>' + rows.map(candidate => `<option value="${Number(candidate.folderId)}">${'— '.repeat(Number(candidate.__depth || 0))}${escapeHtml(candidate.name)}</option>`).join('');
  const wanted = preferredParentFolderId === null || preferredParentFolderId === undefined ? '' : String(preferredParentFolderId);
  select.value = rows.some(candidate => String(candidate.folderId) === wanted) ? wanted : '';
}

function openRelationFolderForm(folder = null, preferredParentFolderId = null) {
  const form = document.getElementById('relation-folder-form');
  document.getElementById('relation-folder-id').value = folder?.folderId || '';
  document.getElementById('relation-folder-name').value = folder?.name || '';
  document.getElementById('relation-folder-kind').value = folder?.kind || 'custom';
  document.getElementById('relation-folder-form-title').textContent = folder ? '폴더 수정·이동' : (preferredParentFolderId ? '하위 폴더 추가' : '새 최상위 폴더');
  renderRelationFolderParentOptions(folder, folder?.parentFolderId ?? preferredParentFolderId);
  form.hidden = false;
  document.getElementById('relation-folder-name').focus();
}

function closeRelationFolderForm() {
  document.getElementById('relation-folder-form').hidden = true;
}

function orderedDependencyComponents(components) {
  const byParent = new Map();
  components.forEach(component => {
    const key = component.parentComponentId ? String(component.parentComponentId) : '';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(component);
  });
  const result = [];
  const visited = new Set();
  const visit = (component, depth) => {
    const id = String(component.componentId || component.sku);
    if (visited.has(id)) return;
    visited.add(id);
    result.push({...component, __depth:depth});
    (byParent.get(String(component.componentId)) || []).forEach(child => visit(child, depth + 1));
  };
  (byParent.get('') || []).forEach(component => visit(component, 0));
  components.forEach(component => visit(component, 0));
  return result;
}

function unifiedConnectionNodeCard({imageUrl = '', identity = '-', productName = '', optionName = '', badge = '', fallback = false, showThumb = true} = {}) {
  return `<div class="unified-connection-node multi-link-product-cell${showThumb ? '' : ' no-thumb'}">
    ${showThumb ? renderBundleThumb(imageUrl, productName, optionName) : ''}
    <div><span>${escapeHtml(identity)}</span><b title="${escapeHtml(productName || '상품명 없음')}">${escapeHtml(productName || '상품명 없음')}</b><strong title="${escapeHtml(optionName || '옵션명 없음')}">${escapeHtml(optionName || '옵션명 없음')}</strong>${fallback ? '<small>셀피아 연결 정보로 보완</small>' : ''}</div>
    ${badge ? `<em>${escapeHtml(badge)}</em>` : ''}
  </div>`;
}

function unifiedConnectionPhoto(imageUrl = '', productName = '', optionName = '') {
  return `<td class="multi-link-photo-cell">${renderBundleThumb(imageUrl, productName, optionName)}</td>`;
}

function unifiedRelationNodeCard(node, {showThumb = true} = {}) {
  const identity = node?.nodeType === 'sellpia_product'
    ? `셀피아 상품 ${node.sellpiaProductCode || '-'}`
    : node?.nodeType === 'sellpia_sku'
      ? `셀피아 SKU ${node.sellpiaSkuCode || '-'}`
      : node?.nodeType === 'seller_listing'
        ? `${multiLinkChannelLabel(node.source)} ${node.sellerProductCode || '-'}${node.sellerOptionCode ? ` / ${node.sellerOptionCode}` : ''}`
        : '직접 관계 노드';
  return unifiedConnectionNodeCard({
    imageUrl:node?.imageUrl || node?.image_url || '',
    identity,
    productName:node?.productName || node?.displayName || '',
    optionName:node?.optionName || '',
    badge:RELATION_KIND_LABELS[node?.relationKind] || '직접 분류',
    showThumb
  });
}

function unifiedConnectionSearchMatch(...values) {
  const query = String(multiLinkState.search || '').trim().toLocaleLowerCase();
  if (!query) return true;
  return values.some(value => String(value || '').toLocaleLowerCase().includes(query));
}

function multiLinkCellGrid() {
  return [...document.querySelectorAll('#multi-link-body tr.unified-connection-row')]
    .map(row => [...row.querySelectorAll(':scope > td')]);
}

function multiLinkCellPosition(cell, grid = multiLinkCellGrid()) {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const columnIndex = grid[rowIndex].indexOf(cell);
    if (columnIndex >= 0) return {rowIndex, columnIndex};
  }
  return null;
}

function multiLinkCellsInRectangle(grid = multiLinkCellGrid()) {
  const anchor = multiLinkCellPosition(multiLinkCellSelection.anchor, grid);
  const focus = multiLinkCellPosition(multiLinkCellSelection.focus, grid);
  const cells = new Set();
  if (!anchor || !focus) return cells;
  for (let rowIndex = Math.min(anchor.rowIndex, focus.rowIndex); rowIndex <= Math.max(anchor.rowIndex, focus.rowIndex); rowIndex += 1) {
    for (let columnIndex = Math.min(anchor.columnIndex, focus.columnIndex); columnIndex <= Math.max(anchor.columnIndex, focus.columnIndex); columnIndex += 1) {
      const cell = grid[rowIndex]?.[columnIndex];
      if (cell) cells.add(cell);
    }
  }
  return cells;
}

function paintMultiLinkCellSelection() {
  const body = document.getElementById('multi-link-body');
  body.querySelectorAll('td.multi-link-cell-selected,td.multi-link-cell-anchor').forEach(cell => {
    cell.classList.remove('multi-link-cell-selected', 'multi-link-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
  multiLinkCellSelection.selected = new Set([...multiLinkCellSelection.selected].filter(cell => cell?.isConnected));
  multiLinkCellSelection.selected.forEach(cell => {
    cell.classList.add('multi-link-cell-selected');
    cell.setAttribute('aria-selected', 'true');
  });
  if (multiLinkCellSelection.anchor?.isConnected && multiLinkCellSelection.selected.has(multiLinkCellSelection.anchor)) {
    multiLinkCellSelection.anchor.classList.add('multi-link-cell-anchor');
  }
}

function applyMultiLinkCellSelection() {
  const rectangle = multiLinkCellsInRectangle();
  if (multiLinkCellSelection.dragMode === 'toggle') {
    const next = new Set(multiLinkCellSelection.dragBase);
    rectangle.forEach(cell => next.has(cell) ? next.delete(cell) : next.add(cell));
    multiLinkCellSelection.selected = next;
  } else {
    multiLinkCellSelection.selected = rectangle;
  }
  paintMultiLinkCellSelection();
}

function selectMultiLinkCell(cell, {extend = false, toggle = false} = {}) {
  if (!cell?.matches('td') || !cell.closest('tr.unified-connection-row')) return;
  if (toggle) {
    multiLinkCellSelection.dragBase = new Set(multiLinkCellSelection.selected);
    multiLinkCellSelection.dragMode = 'toggle';
    multiLinkCellSelection.anchor = cell;
    multiLinkCellSelection.focus = cell;
    applyMultiLinkCellSelection();
    return;
  }
  if (!extend || !multiLinkCellSelection.anchor?.isConnected) multiLinkCellSelection.anchor = cell;
  multiLinkCellSelection.focus = cell;
  multiLinkCellSelection.dragBase = new Set();
  multiLinkCellSelection.dragMode = 'replace';
  applyMultiLinkCellSelection();
}

function clearMultiLinkCellSelection() {
  multiLinkCellSelection.anchor = null;
  multiLinkCellSelection.focus = null;
  multiLinkCellSelection.dragging = false;
  multiLinkCellSelection.selected.clear();
  multiLinkCellSelection.dragBase.clear();
  multiLinkCellSelection.dragMode = 'replace';
  document.querySelectorAll('#multi-link-body td.multi-link-cell-selected,#multi-link-body td.multi-link-cell-anchor').forEach(cell => {
    cell.classList.remove('multi-link-cell-selected', 'multi-link-cell-anchor');
    cell.setAttribute('aria-selected', 'false');
  });
}

function renderMultiLinkRows() {
  const body = document.getElementById('multi-link-body');
  clearMultiLinkCellSelection();
  const relationById = new Map(relationGraphState.nodes.map(node => [String(node.nodeId), node]));
  const relationRows = relationGraphState.edges.map(edge => {
    const parent = relationById.get(String(edge.parentNodeId));
    const child = relationById.get(String(edge.childNodeId));
    if (!parent || !child || !unifiedConnectionSearchMatch(relationNodeLabel(parent), relationNodeLabel(child))) return '';
    return `<tr class="unified-connection-row relation-connection-row" data-relation-edge-id="${Number(edge.edgeId)}">
      <td><span class="unified-connection-family relation">상·하위 관계</span></td>
      ${unifiedConnectionPhoto(parent?.imageUrl || parent?.image_url || '', parent?.productName || parent?.displayName || '', parent?.optionName || '')}
      <td>${unifiedRelationNodeCard(parent, {showThumb:false})}</td>
      <td class="unified-link-cell"><span>상위 → 하위</span><i>→</i><small>${escapeHtml(edge.folderName || '관계 연결')}</small></td>
      ${unifiedConnectionPhoto(child?.imageUrl || child?.image_url || '', child?.productName || child?.displayName || '', child?.optionName || '')}
      <td>${unifiedRelationNodeCard(child, {showThumb:false})}</td>
    </tr>`;
  }).filter(Boolean);
  const bundleRows = bundleGraphState.bundles.flatMap(bundle => bundle.components.map(component => {
    if (!unifiedConnectionSearchMatch(bundle.bundleSkuCode, bundle.productName, bundle.optionName, component.componentSkuCode, component.productName, component.optionName)) return '';
    return `<tr class="unified-connection-row bundle-connection-row" data-bundle-component-id="${component.componentId || ''}">
      <td><span class="unified-connection-family bundle">세트·번들</span></td>
      ${unifiedConnectionPhoto(bundle.imageUrl, bundle.productName, bundle.optionName)}
      <td>${unifiedConnectionNodeCard({imageUrl:bundle.imageUrl, identity:`세트 SKU ${bundle.bundleSkuCode || '-'}`, productName:bundle.productName, optionName:bundle.optionName, badge:'세트', showThumb:false})}</td>
      <td class="unified-link-cell"><span>구성품 × ${formatNumber(component.qty)}</span><i>→</i><small>세트 구성</small></td>
      ${unifiedConnectionPhoto(component.imageUrl, component.productName, component.optionName)}
      <td>${unifiedConnectionNodeCard({imageUrl:component.imageUrl, identity:`${component.nestedBundleId ? '하위 세트' : '구성품'} SKU ${component.componentSkuCode || '-'}`, productName:component.productName, optionName:component.optionName, badge:component.nestedBundleId ? '하위 세트' : '구성품', showThumb:false})}</td>
    </tr>`;
  }).filter(Boolean));
  const groups = [
    ['상품 관계', relationRows],
    ['세트·번들 구성', bundleRows]
  ].filter(([, rows]) => rows.length);
  if (!groups.length) {
    body.innerHTML = '<tr class="multi-link-empty"><td colspan="6">조회 조건에 해당하는 전체 연결이 없습니다.</td></tr>';
    return;
  }
  body.innerHTML = groups.map(([label, rows]) => `<tr class="unified-connection-group"><td colspan="6"><b>${escapeHtml(label)}</b><span>${formatNumber(rows.length)}건</span></td></tr>${rows.join('')}`).join('');
}

function updateManagedConnectionSummary() {
  const relationById = new Map(relationGraphState.nodes.map(node => [String(node.nodeId), node]));
  const relationCount = relationGraphState.edges.filter(edge => unifiedConnectionSearchMatch(
    relationNodeLabel(relationById.get(String(edge.parentNodeId))),
    relationNodeLabel(relationById.get(String(edge.childNodeId)))
  )).length;
  const bundleCount = bundleGraphState.bundles.reduce((count, bundle) => count + bundle.components.filter(component => unifiedConnectionSearchMatch(
    bundle.bundleSkuCode,
    bundle.productName,
    bundle.optionName,
    component.componentSkuCode,
    component.productName,
    component.optionName
  )).length, 0);
  document.getElementById('multi-link-count').textContent = formatNumber(relationCount + bundleCount);
  document.getElementById('multi-link-range').textContent = `상품 관계 ${formatNumber(relationCount)}건 · 세트·번들 구성 ${formatNumber(bundleCount)}건`;
}

async function loadManagedConnections() {
  if (!liveData?.loadRelationNodes || !liveData?.listBundleGraph) return false;
  const body = document.getElementById('multi-link-body');
  body.innerHTML = '<tr class="multi-link-empty loading"><td colspan="6">상품 관계와 세트·번들 구성을 불러오는 중입니다.</td></tr>';
  try {
    await Promise.all([loadRelationFolders(), loadRelationGraph(), loadBundleGraph({query:''})]);
    multiLinkWorkspaceState.allLoaded = true;
    multiLinkState.loaded = true;
    multiLinkState.rows = [];
    multiLinkState.selected = null;
    renderRelationFolders();
    renderMultiLinkRows();
    updateManagedConnectionSummary();
    return true;
  } catch (error) {
    console.error('managed connection matrix load failed', error);
    body.innerHTML = `<tr class="multi-link-empty error"><td colspan="6">상품 관계·세트 구성을 불러오지 못했습니다. ${escapeHtml(error?.message || '')}</td></tr>`;
    return false;
  }
}

async function enrichMultiLinkRowVisuals(rows, requestId) {
  if (!liveData?.loadSellpiaRelationVisuals) return rows;
  const skus = [...new Set((rows || []).flatMap(row => (row.components || []).map(component => String(component.sku || '').trim())).filter(Boolean))];
  if (!skus.length) return rows;
  try {
    const visuals = await liveData.loadSellpiaRelationVisuals(skus);
    if (requestId !== multiLinkState.requestId) return rows;
    const bySku = new Map((visuals || []).map(visual => [String(visual.sellpia_sku_code || ''), visual]));
    rows.forEach(row => (row.components || []).forEach(component => {
      const visual = bySku.get(String(component.sku || ''));
      if (!visual) return;
      component.productName ||= visual.sellpia_product_name || '';
      component.optionName ||= visual.sellpia_option_name || '';
      component.imageUrl ||= visual.sellpia_override_image_url || visual.image_url || '';
    }));
  } catch (visualError) { console.warn('multi-link visual enrichment failed', visualError); }
  return rows;
}

function renderMultiLinkInventoryAction(row) {
  const panel = document.getElementById('multi-link-sku-inventory-action');
  const state = document.getElementById('multi-link-inventory-state');
  const copy = document.getElementById('multi-link-inventory-copy');
  const sellerStock = document.getElementById('multi-link-seller-stock');
  const calculatedStock = document.getElementById('multi-link-calculated-stock');
  const stageButton = document.getElementById('multi-link-sku-stage-stock');
  sellerStock.textContent = formatNullableNumber(row?.seller_stock);
  calculatedStock.textContent = formatNullableNumber(row?.calculated_stock);

  if (!row) {
    panel.classList.add('disabled');
    state.textContent = '연결을 선택해주세요';
    copy.textContent = '명시적으로 저장한 구성만 재고 수정안으로 만들 수 있습니다.';
    stageButton.disabled = true;
    stageButton.textContent = '계산재고를 내보내기 준비에 등록';
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
    copy.textContent = `현재 수정안 ${formatNullableNumber(row.inventory_draft_stock)}개가 내보내기 준비에 있습니다. 다시 등록하면 최신 구성 계산값으로 교체합니다.`;
    stageButton.textContent = sameStock ? '일치 상태 반영 · 기존 수정안 취소' : '최신 계산재고로 수정안 교체';
  } else if (sameStock) {
    state.textContent = '판매처 재고와 일치';
    copy.textContent = '현재 판매처 원본 재고와 조합 계산재고가 같아 새 수정안이 필요하지 않습니다.';
    stageButton.textContent = '재고 일치';
  } else {
    const difference = Number(row.calculated_stock) - Number(row.seller_stock);
    state.textContent = `재고 차이 ${difference > 0 ? '+' : ''}${formatNumber(difference)}`;
    copy.textContent = '등록해도 원본은 바뀌지 않습니다. 내보내기 준비에서 검증한 뒤 기존 XLSX 내보내기를 사용합니다.';
    stageButton.textContent = '계산재고를 내보내기 준비에 등록';
  }
}

function renderMultiLinkEditor(row) {
  multiLinkState.selected = row || null;
  renderMultiLinkRows();
  renderMultiLinkInventoryAction(row);
  const title = document.getElementById('multi-link-editor-title');
  const copy = document.getElementById('multi-link-editor-copy');
  const componentsBox = document.getElementById('multi-link-components');
  const sellerNodeButton = document.getElementById('relation-create-seller-node');
  const sellerNodeCopy = document.getElementById('relation-current-seller-copy');
  if (!row) {
    title.textContent = '새 판매처 구성 등록';
    copy.textContent = '판매처 코드와 셀피아 SKU를 입력하면 새 연결을 만들 수 있습니다.';
    componentsBox.innerHTML = '<div class="multi-link-editor-empty">선택된 판매처 옵션이 없습니다.</div>';
    document.getElementById('multi-link-folder').value = '';
    document.getElementById('multi-link-relation-kind').value = 'individual';
    sellerNodeCopy.textContent = '목록에서 판매처 행을 선택해주세요.';
    sellerNodeButton.disabled = true;
    return;
  }
  title.textContent = `${multiLinkChannelLabel(row.source_channel)} · ${row.product_code}${row.option_code ? ` / ${row.option_code}` : ''}`;
  copy.textContent = `${multiLinkRelationLabel(row.relation_type, row.component_count, row.max_listing_count)} · 계산재고 ${row.calculated_stock ?? '확인 불가'}개 · ${row.is_explicit ? '명시적 구성' : '기존 1:1 호환 연결'}`;
  document.getElementById('multi-link-form-source').value = row.source_channel;
  document.getElementById('multi-link-form-product').value = row.product_code || '';
  document.getElementById('multi-link-form-option').value = row.option_code || '';
  document.getElementById('multi-link-folder').value = row.folder_id || '';
  document.getElementById('multi-link-relation-kind').value = row.relation_kind || row.folder_kind || 'custom';
  sellerNodeCopy.textContent = `${multiLinkChannelLabel(row.source_channel)} ${row.product_code}${row.option_code ? ` / ${row.option_code}` : ''} · ${row.product_name || '상품명 없음'}`;
  sellerNodeButton.disabled = false;
  const components = Array.isArray(row.components) ? row.components : [];
  const parentOptions = component => '<option value="">최상위 SKU</option>' + components.filter(candidate => candidate.componentId && candidate.componentId !== component.componentId).map(candidate => `<option value="${Number(candidate.componentId)}"${String(candidate.componentId) === String(component.parentComponentId || '') ? ' selected' : ''}>${escapeHtml(candidate.sku)} · ${escapeHtml(candidate.optionName || candidate.productName || '이름 없음')}</option>`).join('');
  componentsBox.innerHTML = orderedDependencyComponents(components).map(component => {
    const explicit = Boolean(component.componentId);
    return `<article class="multi-link-component${component.parentComponentId ? ' is-dependent' : ''}" style="--dependency-depth:${Number(component.__depth || 0)}" data-component-id="${component.componentId || ''}" data-component-sku="${escapeHtml(component.sku)}">
      <div class="multi-link-component-head"><div><b>${escapeHtml(component.sku)}</b><span>${escapeHtml([component.productName, component.optionName].filter(Boolean).join(' · ') || '셀피아 상품정보 없음')}</span></div><button type="button" data-remove-component>연결 해제</button></div>
      <div class="multi-link-component-meta"><span>가용재고<b>${formatNullableNumber(component.availableStock)}</b></span><span>구성수량<b>${formatNumber(component.qty)}</b></span><span>가능세트<b>${component.availableStock === null || component.availableStock === undefined ? '-' : formatNumber(Math.floor(Number(component.availableStock) / Math.max(1, Number(component.qty))))}</b></span></div>
      <div class="multi-link-component-actions"><input data-component-qty type="number" min="1" step="1" value="${Math.max(1, Number(component.qty) || 1)}"><select data-component-role><option value="primary"${component.role === 'primary' ? ' selected' : ''}>기준 구성</option><option value="additional"${component.role === 'additional' ? ' selected' : ''}>추가 구성</option></select><button type="button" data-save-component>수량 저장</button></div>
      <div class="multi-link-component-tree"><label>상위 SKU<select data-component-parent ${explicit ? '' : 'disabled'}>${parentOptions(component)}</select></label><button type="button" data-save-component-parent ${explicit ? '' : 'disabled'}>${component.parentComponentId ? '종속 변경' : '종속 지정'}</button></div>
      ${explicit ? '' : '<p class="multi-link-component-legacy">폴더·조합 정보를 먼저 저장하면 종속관계를 지정할 수 있습니다.</p>'}
    </article>`;
  }).join('') || '<div class="multi-link-editor-empty">활성 구성품이 없습니다.</div>';
}

async function loadMultiLinks({resetPage = false, selectKey = '', forceLegacy = false} = {}) {
  if (!liveData?.loadRelationNodes) return false;
  const includeLegacy = forceLegacy || multiLinkWorkspaceState.tab === 'all';
  if (!includeLegacy) {
    try {
      await Promise.all([loadRelationFolders(), loadRelationGraph()]);
      return true;
    } catch (error) {
      console.error('relation workspace load failed', error);
      document.getElementById('relation-edge-list').innerHTML = `<div class="relation-workspace-empty error">관계 화면을 불러오지 못했습니다. ${escapeHtml(error?.message || '')}</div>`;
      return false;
    }
  }
  if (!liveData?.loadListingGraph) return false;
  if (resetPage) multiLinkState.page = 1;
  const requestId = ++multiLinkState.requestId;
  multiLinkState.loading = true;
  const body = document.getElementById('multi-link-body');
  body.innerHTML = '<tr class="multi-link-empty loading"><td colspan="4">Supabase에서 전체 연결 구조를 불러오는 중입니다.</td></tr>';
  try {
    await Promise.all([
      loadRelationFolders(),
      loadRelationGraph(),
      bundleGraphState.loaded ? Promise.resolve() : loadBundleGraph({query:''})
    ]);
    const result = await liveData.loadListingGraph({
      source:multiLinkState.source,
      relationType:multiLinkState.relationType,
      search:multiLinkState.search,
      page:multiLinkState.page,
      pageSize:multiLinkState.pageSize,
      folderId:multiLinkState.folderId,
      organizationScope:multiLinkState.organizationScope
    });
    if (requestId !== multiLinkState.requestId) return false;
    multiLinkState.rows = await enrichMultiLinkRowVisuals(result.rows, requestId);
    multiLinkState.total = result.count;
    if (multiLinkState.organizationScope === 'all' && multiLinkState.folderId === null && multiLinkState.source === 'all' && multiLinkState.relationType === 'all' && !multiLinkState.search) {
      multiLinkState.allTotal = result.count;
    }
    multiLinkState.page = result.page;
    multiLinkState.loaded = true;
    const first = result.count ? ((result.page - 1) * result.pageSize) + 1 : 0;
    const last = Math.min(result.page * result.pageSize, result.count);
    const wantedKey = selectKey || multiLinkKey(multiLinkState.selected);
    multiLinkState.selected = multiLinkState.rows.find(item => multiLinkKey(item) === wantedKey) || null;
    const relationCount = multiLinkState.source === 'all' && multiLinkState.relationType === 'all' ? relationGraphState.edges.length : 0;
    const bundleCount = multiLinkState.source === 'all' && multiLinkState.relationType === 'all' ? bundleGraphState.bundles.reduce((count, bundle) => count + bundle.components.length, 0) : 0;
    document.getElementById('multi-link-count').textContent = formatNumber(result.count + relationCount + bundleCount);
    document.getElementById('multi-link-range').textContent = `판매처 ${formatNumber(first)}–${formatNumber(last)} / ${formatNumber(result.count)} · 관계 ${formatNumber(relationCount)} · 세트 ${formatNumber(bundleCount)}`;
    document.getElementById('multi-link-page').textContent = result.page;
    document.getElementById('multi-link-prev').disabled = result.page <= 1;
    document.getElementById('multi-link-next').disabled = last >= result.count;
    renderRelationFolders();
    if (multiLinkState.organizationScope === 'all' && multiLinkState.folderId === null && multiLinkState.source === 'all' && !multiLinkState.search) {
      document.getElementById('multi-link-badge').textContent = formatNumber(result.count);
    }
    renderMultiLinkEditor(multiLinkState.selected);
    return true;
  } catch (error) {
    console.error('multi-link graph load failed', error);
    body.innerHTML = `<tr class="multi-link-empty error"><td colspan="9">연결 구조를 불러오지 못했습니다. ${escapeHtml(error?.message || '')}</td></tr>`;
    return false;
  } finally {
    if (requestId === multiLinkState.requestId) multiLinkState.loading = false;
  }
}

function openMultiLinkWorkspace(source = 'all', sku = '') {
  multiLinkState.source = 'all';
  multiLinkState.relationType = 'all';
  multiLinkState.search = sku || '';
  document.getElementById('multi-link-search').value = multiLinkState.search;
  setMultiLinkWorkspaceTab('all', {load:false});
  showPage('multi-links');
  if (multiLinkWorkspaceState.allLoaded) {
    renderMultiLinkRows();
    updateManagedConnectionSummary();
  }
}

document.getElementById('multi-link-body').addEventListener('click', event => {
  const image = event.target.closest('[data-relation-image]');
  if (image) { openRelationImageModal(image); return; }
  const rowElement = event.target.closest('.multi-link-row');
  if (!rowElement) return;
  const row = multiLinkState.rows.find(item => multiLinkKey(item) === rowElement.dataset.multiLinkKey);
  if (row) renderMultiLinkEditor(row);
});

document.getElementById('multi-link-body').addEventListener('mousedown', event => {
  if (event.button !== 0 || event.target.closest('button,input,select,textarea,a')) return;
  const cell = event.target.closest('tr.unified-connection-row > td');
  if (!cell) return;
  selectMultiLinkCell(cell, {extend:event.shiftKey, toggle:event.ctrlKey || event.metaKey});
  multiLinkCellSelection.dragging = true;
  event.preventDefault();
});

document.getElementById('multi-link-body').addEventListener('mouseover', event => {
  if (!multiLinkCellSelection.dragging) return;
  const cell = event.target.closest('tr.unified-connection-row > td');
  if (!cell || cell === multiLinkCellSelection.focus) return;
  multiLinkCellSelection.focus = cell;
  applyMultiLinkCellSelection();
});

document.getElementById('multi-link-body').addEventListener('contextmenu', event => {
  const cell = event.target.closest('td');
  const unifiedRow = cell?.closest('.unified-connection-row');
  if (unifiedRow) {
    event.preventDefault();
    if (!cell.classList.contains('multi-link-cell-selected')) selectMultiLinkCell(cell);
    if (unifiedRow.matches('.relation-connection-row')) {
      openRelationEdgeEditor(unifiedRow.dataset.relationEdgeId);
    } else {
      showToast('세트·번들 구성 수정은 ‘세트·번들’ 탭에서 진행해주세요.');
    }
    return;
  }
  const rowElement = cell?.closest('.multi-link-row');
  if (!rowElement) return;
  event.preventDefault();
  const row = multiLinkState.rows.find(item => multiLinkKey(item) === rowElement.dataset.multiLinkKey);
  if (!row) return;
  renderMultiLinkEditor(row);
  openMultiLinkWorkspaceContextMenu(event.clientX, event.clientY, row);
});
document.getElementById('multi-link-body').addEventListener('dblclick', event => {
  const rowElement = event.target.closest('.multi-link-row');
  if (!rowElement || event.target.closest('[data-relation-image]')) return;
  const row = multiLinkState.rows.find(item => multiLinkKey(item) === rowElement.dataset.multiLinkKey);
  if (row) openMultiLinkSkuActionModal(row);
});

document.getElementById('multi-link-context-open-sku').addEventListener('click', () => openMultiLinkSkuActionModal());
document.getElementById('multi-link-sku-action-close').addEventListener('click', closeMultiLinkSkuActionModal);
document.getElementById('multi-link-sku-action-modal').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeMultiLinkSkuActionModal();
});
document.addEventListener('click', event => {
  if (!event.target.closest('#multi-link-workspace-context-menu')) closeMultiLinkWorkspaceContextMenu();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeMultiLinkWorkspaceContextMenu();
  closeMultiLinkSkuActionModal();
  closeRelationEdgeEditorDrawer();
});

document.getElementById('multi-link-components').addEventListener('click', async event => {
  const card = event.target.closest('.multi-link-component');
  if (!card || !multiLinkState.selected) return;
  if (event.target.closest('[data-save-component-parent]')) {
    if (!card.dataset.componentId) return;
    const parentComponentId = card.querySelector('[data-component-parent]').value || null;
    event.target.disabled = true;
    try {
      await liveData.saveListingComponentParent({componentId:card.dataset.componentId, parentComponentId});
      const selectedKey = multiLinkKey(multiLinkState.selected);
      await Promise.all([loadMultiLinks({selectKey:selectedKey}), loadLiveMatrix()]);
      showToast(parentComponentId ? `${card.dataset.componentSku}의 상위 SKU를 저장했습니다.` : `${card.dataset.componentSku}의 종속관계를 해제했습니다.`);
    } catch (error) { showToast(`종속관계 저장 실패: ${error?.message || error}`); }
    finally { event.target.disabled = false; }
    return;
  }
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
      await liveData.removeListingComponent({componentId:card.dataset.componentId || null, source:multiLinkState.selected.source_channel, productCode:multiLinkState.selected.product_code, optionCode:multiLinkState.selected.option_code, sku:card.dataset.componentSku});
      const selectedKey = multiLinkKey(multiLinkState.selected);
      await Promise.all([loadMultiLinks({selectKey:selectedKey}), loadLiveMatrix()]);
      showToast(`${card.dataset.componentSku} 연결을 해제했습니다.`);
    } catch (error) { showToast(`연결 해제 실패: ${error?.message || error}`); }
    finally { event.target.disabled = false; }
  }
});

document.getElementById('relation-folder-new').addEventListener('click', () => openRelationFolderForm(null, null));
document.getElementById('relation-folder-cancel').addEventListener('click', closeRelationFolderForm);
document.getElementById('relation-folder-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await liveData.saveRelationFolder({
      folderId:document.getElementById('relation-folder-id').value || null,
      name:document.getElementById('relation-folder-name').value,
      kind:document.getElementById('relation-folder-kind').value,
      parentFolderId:document.getElementById('relation-folder-parent').value || null
    });
    closeRelationFolderForm();
    await loadRelationFolders({force:true});
    showToast('조합 관리 폴더를 저장했습니다.');
  } catch (error) { showToast(`폴더 저장 실패: ${error?.message || error}`); }
  finally { submit.disabled = false; }
});

document.getElementById('relation-folder-list').addEventListener('click', async event => {
  const item = event.target.closest('.relation-folder-item');
  const folder = item ? multiLinkState.folders.find(candidate => String(candidate.folderId) === String(item.dataset.folderId)) : null;
  if (event.target.closest('[data-folder-child]') && folder) {
    openRelationFolderForm(null, folder.folderId);
    return;
  }
  if (event.target.closest('[data-folder-edit]') && folder) {
    openRelationFolderForm(folder);
    return;
  }
  if (event.target.closest('[data-folder-archive]') && folder) {
    if (!window.confirm(`‘${relationFolderPath(folder.folderId)}’ 폴더를 보관할까요?\n폴더 안 상품 관계는 삭제되지 않고 미분류로 이동합니다.`)) return;
    event.target.disabled = true;
    try {
      const result = await liveData.archiveRelationFolder(folder.folderId);
      if (String(multiLinkState.folderId) === String(folder.folderId)) {
        multiLinkState.folderId = null;
        multiLinkState.organizationScope = 'unorganized';
      }
      await loadRelationFolders({force:true});
      await loadMultiLinks({resetPage:true});
      showToast(`폴더를 보관하고 상품 노드 ${formatNumber(result?.unassignedNodes || 0)}개를 미분류로 옮겼습니다.`);
    } catch (error) { showToast(`폴더 보관 실패: ${error?.message || error}`); }
    finally { event.target.disabled = false; }
    return;
  }
  const button = event.target.closest('[data-relation-folder]');
  if (!button) return;
  const key = button.dataset.relationFolder;
  if (key === 'all') {
    multiLinkState.folderId = null;
    multiLinkState.organizationScope = 'all';
  } else if (key === 'unorganized') {
    multiLinkState.folderId = null;
    multiLinkState.organizationScope = 'unorganized';
  } else {
    multiLinkState.folderId = Number(key);
    multiLinkState.organizationScope = 'organized';
  }
  await loadMultiLinks({resetPage:true});
});

document.getElementById('multi-link-folder').addEventListener('change', event => {
  const folder = multiLinkState.folders.find(item => String(item.folderId) === event.target.value);
  if (folder) document.getElementById('multi-link-relation-kind').value = folder.kind || 'custom';
});

document.getElementById('relation-sellpia-search').addEventListener('input', event => {
  const search = event.target.value.trim();
  clearTimeout(relationGraphState.searchTimer);
  renderSellpiaRelationPreview(null);
  if (!search) {
    document.getElementById('relation-sellpia-results').hidden = true;
    return;
  }
  relationGraphState.searchTimer = setTimeout(async () => {
    try {
      const result = await liveData.searchSellpiaRelationProducts(search, 20);
      renderSellpiaRelationResults(result.groups);
    } catch (error) {
      document.getElementById('relation-sellpia-results').hidden = false;
      document.getElementById('relation-sellpia-results').innerHTML = `<span class="error">상품 검색 실패: ${escapeHtml(error?.message || error)}</span>`;
    }
  }, 260);
});

document.getElementById('relation-sellpia-results').addEventListener('click', async event => {
  const button = event.target.closest('[data-relation-product-code]');
  if (!button) return;
  try {
    const product = await liveData.loadSellpiaRelationProduct(button.dataset.relationProductCode);
    renderSellpiaRelationPreview(product);
    document.getElementById('relation-sellpia-results').hidden = true;
    document.getElementById('relation-sellpia-search').value = `${product.productCode} · ${product.productName}`;
  } catch (error) { showToast(`셀피아 상품 조회 실패: ${error?.message || error}`); }
});

document.getElementById('relation-create-sellpia-node').addEventListener('click', async event => {
  const product = relationGraphState.selectedProduct;
  if (!product) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const node = await liveData.ensureSellpiaRelationNode({
      productCode:product.productCode,
      folderId:document.getElementById('multi-link-folder').value || null,
      relationKind:document.getElementById('multi-link-relation-kind').value || 'individual'
    });
    await loadRelationGraph({parentNodeId:node.nodeId});
    showToast(`${node.displayName} 노드를 준비했습니다. 상위·하위 위치를 선택해주세요.`);
  } catch (error) { showToast(`셀피아 관계 노드 준비 실패: ${error?.message || error}`); }
  finally { button.disabled = false; }
});

document.getElementById('relation-create-seller-node').addEventListener('click', async event => {
  const row = multiLinkState.selected;
  if (!row) return;
  const button = event.currentTarget;
  button.disabled = true;
  const original = button.textContent;
  button.textContent = '노드 준비 중…';
  try {
    const node = await liveData.ensureSellerRelationNode({
      source:row.source_channel,
      productCode:row.product_code,
      optionCode:row.option_code,
      folderId:document.getElementById('multi-link-folder').value || null,
      relationKind:document.getElementById('multi-link-relation-kind').value || 'custom'
    });
    await loadRelationGraph({childNodeId:node.nodeId});
    showToast(`${node.displayName} 노드를 준비했습니다. 상위·하위 위치를 선택해주세요.`);
  } catch (error) { showToast(`판매처 관계 노드 준비 실패: ${error?.message || error}`); }
  finally { button.disabled = false; button.textContent = original; }
});

['relation-parent-node','relation-child-node'].forEach(id => document.getElementById(id).addEventListener('change', () => {
  const parent = document.getElementById('relation-parent-node').value;
  const child = document.getElementById('relation-child-node').value;
  document.getElementById('relation-edge-save').disabled = !parent || !child || parent === child;
}));

document.getElementById('relation-edge-save').addEventListener('click', async event => {
  const parentNodeId = document.getElementById('relation-parent-node').value;
  const childNodeId = document.getElementById('relation-child-node').value;
  if (!parentNodeId || !childNodeId || parentNodeId === childNodeId) return;
  const button = event.currentTarget;
  const editingEdgeId = relationCellSelection.editingEdgeId;
  button.disabled = true;
  try {
    if (editingEdgeId) {
      await liveData.updateRelationEdge({edgeId:editingEdgeId, parentNodeId, childNodeId});
    } else {
      await liveData.saveRelationEdge({parentNodeId, childNodeId});
    }
    relationGraphState.focusNodeId = null;
    relationGraphState.search = '';
    document.getElementById('relation-workspace-search').value = '';
    await loadRelationGraph();
    setRelationViewMode('list');
    resetRelationEdgeEditor();
    document.getElementById('multi-link-organization-form').hidden = true;
    document.getElementById('relation-add-toggle').textContent = '＋ 관계 편집';
    showToast(editingEdgeId
      ? '선택한 상위·하위 관계를 수정했습니다.'
      : '상위 → 하위 관계를 저장했습니다. 가격·재고 계산에는 반영하지 않았습니다.');
  } catch (error) { showToast(`관계 저장 실패: ${error?.message || error}`); }
  finally { button.disabled = false; }
});

['relation-edge-editor-parent','relation-edge-editor-child'].forEach(id => document.getElementById(id).addEventListener('change', updateRelationEdgeEditorSaveState));
['relation-edge-editor-close','relation-edge-editor-cancel'].forEach(id => document.getElementById(id).addEventListener('click', () => closeRelationEdgeEditorDrawer()));
document.getElementById('relation-edge-editor-save').addEventListener('click', async event => {
  const edgeId = relationCellSelection.editingEdgeId;
  const parentNodeId = document.getElementById('relation-edge-editor-parent').value;
  const childNodeId = document.getElementById('relation-edge-editor-child').value;
  if (!edgeId || !parentNodeId || !childNodeId || parentNodeId === childNodeId) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await liveData.updateRelationEdge({edgeId, parentNodeId, childNodeId});
    relationGraphState.focusNodeId = null;
    relationGraphState.search = '';
    document.getElementById('relation-workspace-search').value = '';
    await loadRelationGraph();
    if (multiLinkWorkspaceState.allLoaded) {
      renderMultiLinkRows();
      updateManagedConnectionSummary();
    }
    closeRelationEdgeEditorDrawer();
    showToast('선택한 상위·하위 관계 한 건을 수정했습니다.');
  } catch (error) {
    showToast(`관계 수정 실패: ${error?.message || error}`);
    updateRelationEdgeEditorSaveState();
  } finally {
    if (!document.getElementById('relation-edge-editor-drawer').hidden) button.disabled = false;
  }
});

async function handleRelationWorkspaceClick(event) {
  const image = event.target.closest('[data-relation-image]');
  if (image) { openRelationImageModal(image); return; }
  const explore = event.target.closest('[data-explore-relation-node], [data-focus-relation-node]');
  if (explore) {
    relationGraphState.focusNodeId = explore.dataset.exploreRelationNode || explore.dataset.focusRelationNode;
    relationGraphState.search = '';
    document.getElementById('relation-workspace-search').value = '';
    setRelationViewMode('graph');
    return;
  }
  const archiveNodeButton = event.target.closest('[data-archive-relation-node]');
  if (archiveNodeButton) {
    const node = relationGraphState.nodes.find(candidate => String(candidate.nodeId) === String(archiveNodeButton.dataset.archiveRelationNode));
    if (!node || !window.confirm(`‘${relationNodeLabel(node)}’ 노드를 삭제할까요?\n화면의 관계 노드만 보관 처리되며 셀피아·판매처 원본은 바뀌지 않습니다.`)) return;
    archiveNodeButton.disabled = true;
    try {
      await liveData.archiveRelationNode(node.nodeId);
      await Promise.all([loadRelationFolders({force:true}), loadRelationGraph()]);
      showToast('잘못 만든 관계 노드를 삭제했습니다. 원본 상품 데이터는 유지됩니다.');
    } catch (error) { showToast(`노드 삭제 실패: ${error?.message || error}`); }
    finally { archiveNodeButton.disabled = false; }
    return;
  }
  const button = event.target.closest('[data-remove-relation-edge]');
  if (!button || !window.confirm('이 상위·하위 관계 한 건만 해제할까요? 상품 노드와 실제 SKU 연결은 유지됩니다.')) return;
  button.disabled = true;
  try {
    await liveData.removeRelationEdge(button.dataset.removeRelationEdge);
    await loadRelationGraph();
    showToast('상위·하위 관계 한 건을 해제했습니다.');
  } catch (error) { showToast(`관계 해제 실패: ${error?.message || error}`); }
}

document.getElementById('relation-edge-list').addEventListener('click', handleRelationWorkspaceClick);
document.getElementById('relation-edge-list').addEventListener('mousedown', event => {
  if (event.button !== 0 || event.target.closest('button,input,select,textarea,a')) return;
  const cell = event.target.closest('.relation-matrix td');
  if (!cell) return;
  selectRelationCell(cell, {extend:event.shiftKey, toggle:event.ctrlKey || event.metaKey});
  relationCellSelection.dragging = true;
  event.preventDefault();
});
document.getElementById('relation-edge-list').addEventListener('mouseover', event => {
  if (!relationCellSelection.dragging) return;
  const cell = event.target.closest('.relation-matrix td');
  if (!cell || cell === relationCellSelection.focus) return;
  relationCellSelection.focus = cell;
  applyRelationCellSelection();
});
document.getElementById('relation-edge-list').addEventListener('contextmenu', event => {
  const cell = event.target.closest('.relation-matrix td');
  const row = cell?.closest('tr[data-relation-edge-id]');
  if (!cell || !row) return;
  event.preventDefault();
  if (!cell.classList.contains('relation-cell-selected')) selectRelationCell(cell);
  openRelationEdgeEditor(row.dataset.relationEdgeId);
});
document.getElementById('relation-tree').addEventListener('click', handleRelationWorkspaceClick);
document.getElementById('multi-link-workspace-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-multi-link-tab]');
  if (button) setMultiLinkWorkspaceTab(button.dataset.multiLinkTab);
});

document.getElementById('relation-view-list').addEventListener('click', () => {
  relationGraphState.focusNodeId = null;
  relationGraphState.search = '';
  document.getElementById('relation-workspace-search').value = '';
  setRelationViewMode('list');
});

document.getElementById('relation-view-graph').addEventListener('click', () => {
  relationGraphState.focusNodeId = null;
  setRelationViewMode('graph');
});

document.getElementById('relation-workspace-search').addEventListener('input', event => {
  relationGraphState.search = event.target.value.trim();
  relationGraphState.focusNodeId = null;
  setRelationViewMode(relationGraphState.search ? 'graph' : 'list');
});

document.getElementById('relation-add-toggle').addEventListener('click', event => {
  closeRelationEdgeEditorDrawer();
  const form = document.getElementById('multi-link-organization-form');
  form.hidden = !form.hidden;
  event.currentTarget.textContent = form.hidden ? '＋ 관계 편집' : '관계 편집 닫기';
  if (form.hidden) resetRelationEdgeEditor({clearSelectors:false});
  else if (relationCellSelection.editingEdgeId) resetRelationEdgeEditor();
  if (!form.hidden) {
    renderRelationBoard();
    form.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
});

document.getElementById('relation-product-loader').addEventListener('submit', async event => {
  event.preventDefault();
  const source = document.getElementById('relation-board-source').value;
  const productCode = document.getElementById('relation-board-product-code').value.trim();
  if (!productCode) return;
  const button = document.getElementById('relation-board-load');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = '옵션 불러오는 중…';
  try {
    const count = await loadRelationBoardProduct(source, productCode);
    document.getElementById('relation-board-product-code').value = '';
    showToast(`${source === 'sellpia' ? '셀피아' : multiLinkChannelLabel(source)} ${productCode}의 옵션 ${formatNumber(count)}개를 불러왔습니다.`);
  } catch (error) {
    showToast(`상품 옵션 불러오기 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
});

const relationImportFile = document.getElementById('relation-import-file');
const relationImportDropzone = document.getElementById('relation-import-dropzone');
relationImportDropzone.addEventListener('click', () => relationImportFile.click());
relationImportFile.addEventListener('change', () => loadRelationImportFile(relationImportFile.files?.[0]));
['dragenter', 'dragover'].forEach(type => relationImportDropzone.addEventListener(type, event => {
  event.preventDefault();
  relationImportDropzone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(type => relationImportDropzone.addEventListener(type, event => {
  event.preventDefault();
  relationImportDropzone.classList.remove('dragover');
}));
relationImportDropzone.addEventListener('drop', event => loadRelationImportFile(event.dataTransfer?.files?.[0]));
document.getElementById('relation-import-result').addEventListener('change', event => {
  const select = event.target.closest('[data-relation-import-choice]');
  if (!select) return;
  if (select.value) relationImportState.choices.set(select.dataset.relationImportChoice, select.value);
  else relationImportState.choices.delete(select.dataset.relationImportChoice);
  renderRelationImport();
});
document.getElementById('relation-import-reset').addEventListener('click', resetRelationImport);
document.getElementById('relation-import-save').addEventListener('click', saveRelationImport);

const bundleManagementPanel = document.getElementById('bundle-management-panel');
const bundleImportFile = document.getElementById('bundle-import-file');
const bundleImportDropzone = document.getElementById('bundle-import-dropzone');
bundleManagementPanel.addEventListener('toggle', () => {
  if (bundleManagementPanel.open && !bundleGraphState.loaded && !bundleGraphState.loading) loadBundleGraph();
});
document.getElementById('bundle-search-form').addEventListener('submit', event => {
  event.preventDefault();
  loadBundleGraph({query:document.getElementById('bundle-search').value});
});
document.getElementById('bundle-refresh').addEventListener('click', () => loadBundleGraph({query:document.getElementById('bundle-search').value}));
document.getElementById('bundle-import-template').addEventListener('click', downloadBundleTemplate);
bundleImportDropzone.addEventListener('click', () => bundleImportFile.click());
bundleImportFile.addEventListener('change', () => loadBundleImportFile(bundleImportFile.files?.[0]));
['dragenter', 'dragover'].forEach(type => bundleImportDropzone.addEventListener(type, event => {
  event.preventDefault();
  bundleImportDropzone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(type => bundleImportDropzone.addEventListener(type, event => {
  event.preventDefault();
  bundleImportDropzone.classList.remove('dragover');
}));
bundleImportDropzone.addEventListener('drop', event => loadBundleImportFile(event.dataTransfer?.files?.[0]));
document.getElementById('bundle-import-result').addEventListener('change', event => {
  const select = event.target.closest('[data-bundle-import-choice]');
  if (!select) return;
  if (select.value) bundleImportState.choices.set(select.dataset.bundleImportChoice, select.value);
  else bundleImportState.choices.delete(select.dataset.bundleImportChoice);
  renderBundleImport();
});
document.getElementById('bundle-import-reset').addEventListener('click', resetBundleImport);
document.getElementById('bundle-import-save').addEventListener('click', saveBundleImport);

document.getElementById('bundle-component-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.getElementById('bundle-form-save');
  const payload = {
    bundleSkuCode:document.getElementById('bundle-form-bundle-sku').value,
    componentSkuCode:document.getElementById('bundle-form-component-sku').value,
    qty:document.getElementById('bundle-form-qty').value,
    role:'component'
  };
  button.disabled = true;
  button.textContent = '저장 중…';
  try {
    if (!liveData?.saveBundleComponent) throw new Error('현재 배포에는 세트 구성 저장 기능이 없습니다. DB 기능 배포 후 다시 시도해주세요.');
    await liveData.saveBundleComponent(payload);
    bundleGraphState.query = String(payload.bundleSkuCode || '').trim();
    document.getElementById('bundle-search').value = bundleGraphState.query;
    await loadBundleGraph({query:bundleGraphState.query});
    document.getElementById('bundle-form-component-sku').value = '';
    document.getElementById('bundle-form-qty').value = '1';
    showToast('세트 구성 한 건을 저장했습니다. 가격·재고는 변경하지 않았습니다.');
  } catch (error) {
    showToast(`세트 구성 저장 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = '구성 저장';
  }
});

document.getElementById('bundle-graph-list').addEventListener('click', async event => {
  const image = event.target.closest('[data-relation-image]');
  if (image) { openRelationImageModal(image); return; }
  const row = event.target.closest('[data-bundle-component-id]');
  if (!row) return;
  const save = event.target.closest('[data-bundle-component-save]');
  const remove = event.target.closest('[data-bundle-component-remove]');
  if (!save && !remove) return;
  const button = save || remove;
  button.disabled = true;
  try {
    if (save) {
      if (!liveData?.saveBundleComponent) throw new Error('현재 배포에는 세트 구성 수정 기능이 없습니다.');
      await liveData.saveBundleComponent({
        bundleSkuCode:row.dataset.bundleSku,
        componentSkuCode:row.dataset.componentSku,
        qty:row.querySelector('[data-bundle-component-qty]').value,
        role:'component',
        sortOrder:row.dataset.sortOrder
      });
      showToast('구성수량을 저장했습니다.');
    } else {
      if (!row.dataset.bundleComponentId) throw new Error('연결 ID를 확인할 수 없어 해제할 수 없습니다.');
      if (!window.confirm(`${row.dataset.componentSku} 구성 연결을 해제할까요?\n원본 SKU와 과거 기록은 삭제하지 않습니다.`)) return;
      if (!liveData?.deactivateBundleComponent) throw new Error('현재 배포에는 세트 구성 해제 기능이 없습니다.');
      await liveData.deactivateBundleComponent(row.dataset.bundleComponentId);
      showToast('세트 구성 연결을 해제했습니다.');
    }
    await loadBundleGraph({query:bundleGraphState.query});
  } catch (error) {
    showToast(`세트 구성 작업 실패: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
});

function setBundleTargetMode(mode) {
  const seller = mode === 'seller';
  document.getElementById('bundle-target-canonical').classList.toggle('active', !seller);
  document.getElementById('bundle-target-canonical').setAttribute('aria-selected', String(!seller));
  document.getElementById('bundle-target-seller').classList.toggle('active', seller);
  document.getElementById('bundle-target-seller').setAttribute('aria-selected', String(seller));
  document.getElementById('bundle-canonical-workspace').hidden = seller;
  document.getElementById('seller-bundle-workspace').hidden = !seller;
}

document.getElementById('bundle-target-canonical').addEventListener('click', () => setBundleTargetMode('canonical'));
document.getElementById('bundle-target-seller').addEventListener('click', () => setBundleTargetMode('seller'));

document.getElementById('seller-bundle-target-form').addEventListener('submit', event => {
  event.preventDefault();
  sellerBundleState.source = document.getElementById('seller-bundle-source').value;
  sellerBundleState.productCode = document.getElementById('seller-bundle-product-code').value.trim();
  sellerBundleState.optionCode = document.getElementById('seller-bundle-option-code').value.trim();
  sellerBundleState.bundleType = document.getElementById('seller-bundle-type').value;
  if (!sellerBundleState.productCode || !sellerBundleState.optionCode) return showToast('판매처 원본의 상품코드와 옵션코드를 모두 입력해주세요.');
  loadSellerBundleTarget();
});

document.getElementById('seller-bundle-type').addEventListener('change', event => {
  sellerBundleState.bundleType = event.target.value;
  renderSellerBundleTarget();
});

document.getElementById('seller-bundle-target-result').addEventListener('submit', async event => {
  const form = event.target.closest('#seller-bundle-component-form');
  if (!form || !sellerBundleState.target) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await saveSellerBundleRows(sellerBundleRowsWithChange(form.elements.componentSku.value, form.elements.qty.value));
    await loadSellerBundleTarget();
    showToast('판매처 전용 구성을 저장했습니다. 실제 판매처에는 전송하지 않았습니다.');
  } catch (error) { showToast(`판매처 전용 구성 저장 실패: ${error?.message || error}`); }
  finally { button.disabled = false; }
});

document.getElementById('seller-bundle-target-result').addEventListener('click', async event => {
  const image = event.target.closest('[data-relation-image]');
  if (image) { openRelationImageModal(image); return; }
  const row = event.target.closest('[data-seller-component-id]');
  if (!row || !sellerBundleState.target) return;
  const save = event.target.closest('[data-seller-component-save]');
  const remove = event.target.closest('[data-seller-component-remove]');
  if (!save && !remove) return;
  const button = save || remove;
  button.disabled = true;
  try {
    if (save) {
      await saveSellerBundleRows(sellerBundleRowsWithChange(row.dataset.sellerComponentSku, row.querySelector('[data-seller-component-qty]').value));
      showToast('판매처 전용 구성수량을 저장했습니다.');
    } else {
      if (!row.dataset.sellerComponentId) throw new Error('해제할 구성 연결 ID를 확인할 수 없습니다.');
      if (!window.confirm(`${row.dataset.sellerComponentSku} 구성 연결을 해제할까요?\n실제 판매처에는 아무 작업도 하지 않습니다.`)) return;
      await liveData.deactivateSellerBundleComponent(row.dataset.sellerComponentId);
      showToast('판매처 전용 구성 연결을 해제했습니다.');
    }
    await loadSellerBundleTarget();
  } catch (error) { showToast(`판매처 전용 구성 작업 실패: ${error?.message || error}`); }
  finally { button.disabled = false; }
});

const sellerBundleImportFile = document.getElementById('seller-bundle-import-file');
const sellerBundleImportDropzone = document.getElementById('seller-bundle-import-dropzone');
document.getElementById('seller-bundle-import-template').addEventListener('click', downloadSellerBundleTemplate);
sellerBundleImportDropzone.addEventListener('click', () => sellerBundleImportFile.click());
sellerBundleImportFile.addEventListener('change', () => loadSellerBundleImportFile(sellerBundleImportFile.files?.[0]));
['dragenter','dragover'].forEach(type => sellerBundleImportDropzone.addEventListener(type, event => {
  event.preventDefault();
  sellerBundleImportDropzone.classList.add('dragover');
}));
['dragleave','drop'].forEach(type => sellerBundleImportDropzone.addEventListener(type, event => {
  event.preventDefault();
  sellerBundleImportDropzone.classList.remove('dragover');
}));
sellerBundleImportDropzone.addEventListener('drop', event => loadSellerBundleImportFile(event.dataTransfer?.files?.[0]));
document.getElementById('seller-bundle-import-reset').addEventListener('click', resetSellerBundleImport);
document.getElementById('seller-bundle-import-save').addEventListener('click', saveSellerBundleImport);

document.getElementById('relation-board-add-level').addEventListener('click', () => {
  if (relationBoardState.levelCount >= 6) {
    showToast('관계 작업판은 현재 6단계까지 표시할 수 있습니다.');
    return;
  }
  relationBoardState.levelCount += 1;
  renderRelationBoard();
});

document.getElementById('relation-board-reset').addEventListener('click', () => resetRelationBoard({confirmChanges:true}));
document.getElementById('relation-board-save').addEventListener('click', saveRelationBoard);

document.getElementById('relation-drag-board').addEventListener('click', event => {
  const image = event.target.closest('[data-relation-image]');
  if (image) { openRelationImageModal(image); return; }
  const root = event.target.closest('[data-board-root]');
  if (root) { moveRelationBoardNode(root.dataset.boardRoot, 0); return; }
  const unassign = event.target.closest('[data-board-unassign]');
  if (unassign) moveRelationBoardNode(unassign.dataset.boardUnassign, null);
});
document.getElementById('relation-image-close').addEventListener('click', closeRelationImageModal);
document.getElementById('relation-image-modal').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeRelationImageModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.getElementById('relation-image-modal').hidden) closeRelationImageModal();
});

function applyRelationBoardDropTarget(key, target) {
  if (!target || !key) return false;
  target.classList.remove('relation-board-drop-active');
  if (target.dataset.boardDrop === 'unassigned') {
    moveRelationBoardNode(key, null);
    return true;
  }
  const level = Number(target.dataset.boardDropLevel);
  if (Number.isFinite(level)) moveRelationBoardNode(key, level);
  return true;
}

function connectRelationBoardNodes(parentKey, childKey) {
  const parent = relationBoardState.nodes.get(parentKey);
  const child = relationBoardState.nodes.get(childKey);
  if (!parent || !child || parent.level === null) return false;
  if (parentKey === childKey || relationBoardDescendantKeys(childKey).has(parentKey)) {
    showToast('자기 자신이나 현재 상위 상품으로 순환 연결할 수 없습니다.');
    return false;
  }
  if (child.parentKeys.includes(parentKey)) {
    showToast('이미 연결된 관계입니다.');
    return false;
  }
  child.parentKeys = [...child.parentKeys, parentKey];
  const parentLevels = child.parentKeys.map(key => relationBoardState.nodes.get(key)?.level).filter(level => level !== null && level !== undefined);
  child.level = Math.max(...parentLevels) + 1;
  child.touched = true;
  normalizeRelationBoardBranch(child.key);
  relationBoardState.levelCount = Math.max(relationBoardState.levelCount, child.level + 1);
  renderRelationBoard();
  return true;
}

function relationBoardTargetAt(x, y, selector) {
  return document.elementFromPoint(x, y)?.closest(selector) || null;
}

function createRelationBoardDragGhost(card, event) {
  const ghost = card.cloneNode(true);
  ghost.className = 'relation-board-node relation-board-drag-ghost';
  ghost.removeAttribute('data-board-node-key');
  ghost.querySelectorAll('.relation-board-port,.relation-board-node-actions').forEach(item => item.remove());
  ghost.querySelector('.relation-board-node-image')?.removeAttribute('data-relation-image');
  ghost.style.width = `${card.getBoundingClientRect().width}px`;
  document.body.appendChild(ghost);
  relationBoardState.dragGhost = ghost;
  positionRelationBoardDragGhost(event.clientX, event.clientY);
}

function positionRelationBoardDragGhost(x, y) {
  const ghost = relationBoardState.dragGhost;
  if (ghost) ghost.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`;
}

function clearRelationBoardDropFeedback() {
  document.querySelectorAll('.relation-board-drop-active,.relation-board-port.link-target').forEach(item => item.classList.remove('relation-board-drop-active', 'link-target'));
}

function clearRelationBoardDrag() {
  document.querySelectorAll('.relation-board-node.dragging').forEach(item => item.classList.remove('dragging'));
  clearRelationBoardDropFeedback();
  relationBoardState.dragGhost?.remove();
  relationBoardState.dragGhost = null;
  relationBoardState.draggingKey = null;
  relationBoardState.pointerDrag = null;
}

document.getElementById('relation-drag-board').addEventListener('pointerdown', event => {
  const output = event.target.closest('[data-board-link-out]');
  if (output && event.button === 0) {
    event.preventDefault();
    const canvas = output.closest('.relation-board-canvas');
    const bounds = canvas?.getBoundingClientRect();
    const port = output.getBoundingClientRect();
    if (!canvas || !bounds) return;
    relationBoardState.connectorDrag = {
      parentKey:output.dataset.boardLinkOut,
      pointerId:event.pointerId,
      startX:port.left - bounds.left + port.width / 2,
      startY:port.top - bounds.top + port.height / 2
    };
    output.classList.add('linking');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    return;
  }
  if (event.pointerType === 'touch' || event.target.closest('button')) return;
  const card = event.target.closest('[data-board-node-key]');
  if (!card || event.button !== 0) return;
  relationBoardState.draggingKey = card.dataset.boardNodeKey;
  relationBoardState.pointerDrag = {key:card.dataset.boardNodeKey, pointerId:event.pointerId, x:event.clientX, y:event.clientY, moved:false, card};
  card.classList.add('dragging');
  event.currentTarget.setPointerCapture?.(event.pointerId);
});

document.getElementById('relation-drag-board').addEventListener('pointermove', event => {
  const connector = relationBoardState.connectorDrag;
  if (connector) {
    const canvas = document.querySelector('#relation-drag-board .relation-board-canvas');
    const preview = canvas?.querySelector('[data-board-link-preview]');
    const bounds = canvas?.getBoundingClientRect();
    if (!canvas || !preview || !bounds) return;
    const endX = event.clientX - bounds.left;
    const endY = event.clientY - bounds.top;
    preview.removeAttribute('hidden');
    preview.setAttribute('d', relationBoardPathData(connector.startX, connector.startY, endX, endY));
    clearRelationBoardDropFeedback();
    const target = relationBoardTargetAt(event.clientX, event.clientY, '[data-board-link-in]');
    if (target && target.dataset.boardLinkIn !== connector.parentKey) target.classList.add('link-target');
    return;
  }
  const drag = relationBoardState.pointerDrag;
  if (!drag) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
  if (!drag.moved) {
    drag.moved = true;
    createRelationBoardDragGhost(drag.card, event);
  }
  positionRelationBoardDragGhost(event.clientX, event.clientY);
  clearRelationBoardDropFeedback();
  relationBoardTargetAt(event.clientX, event.clientY, '[data-board-drop-level],[data-board-drop]')?.classList.add('relation-board-drop-active');
});

document.getElementById('relation-drag-board').addEventListener('pointerup', event => {
  const connector = relationBoardState.connectorDrag;
  if (connector) {
    const target = relationBoardTargetAt(event.clientX, event.clientY, '[data-board-link-in]');
    document.querySelectorAll('.relation-board-port.linking').forEach(item => item.classList.remove('linking'));
    relationBoardState.connectorDrag = null;
    clearRelationBoardDropFeedback();
    if (target) connectRelationBoardNodes(connector.parentKey, target.dataset.boardLinkIn);
    else scheduleRelationBoardConnections();
    return;
  }
  const drag = relationBoardState.pointerDrag;
  if (!drag) return;
  const target = relationBoardTargetAt(event.clientX, event.clientY, '[data-board-drop-level],[data-board-drop]');
  if (drag.moved && target) applyRelationBoardDropTarget(drag.key, target);
  clearRelationBoardDrag();
});

document.getElementById('relation-drag-board').addEventListener('pointercancel', () => {
  document.querySelectorAll('.relation-board-port.linking').forEach(item => item.classList.remove('linking'));
  relationBoardState.connectorDrag = null;
  clearRelationBoardDrag();
  scheduleRelationBoardConnections();
});

window.addEventListener('resize', scheduleRelationBoardConnections);

document.getElementById('relation-tree-refresh').addEventListener('click', () => loadRelationGraph());

document.getElementById('multi-link-sku-stage-stock').addEventListener('click', async event => {
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
      showToast(`조합 계산재고 ${formatNullableNumber(result.current_stock)} → ${formatNullableNumber(result.calculated_stock)}개를 내보내기 준비 #${result.change_id}로 저장했습니다.`);
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
  multiLinkSearchTimer = setTimeout(() => {
    renderMultiLinkRows();
    updateManagedConnectionSummary();
  }, 120);
});
document.getElementById('multi-link-refresh').addEventListener('click', async event => {
  event.target.disabled = true;
  event.target.textContent = '연결 갱신 중…';
  try {
    await loadManagedConnections();
    showToast('상품 관계와 세트·번들 구성을 새로 불러왔습니다.');
  } catch (error) { showToast(`연결 갱신 실패: ${error?.message || error}`); }
  finally { event.target.disabled = false; event.target.textContent = '새로고침'; }
});

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
  document.getElementById('inventory-last-refresh').textContent = `마지막 참고 조회 ${formatLiveTime(inventoryState.activityRefreshedAt)}`;
  const liveBadge = document.getElementById('inventory-live-status');
  liveBadge.textContent = inventoryState.activityRefreshedAt ? '검토용 참고 데이터 조회됨' : '검토용 참고 데이터 대기';
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

function inboundCostFormulaLabel(tag) {
  const multiply = Number(tag?.multiply_value || 1);
  const divide = Number(tag?.divide_value || 1);
  const add = Number(tag?.add_value || 0);
  const parts = ['매입가'];
  if (multiply !== 1) parts.push(`× ${multiply.toLocaleString('ko-KR')}`);
  if (divide !== 1) parts.push(`÷ ${divide.toLocaleString('ko-KR')}`);
  if (add) parts.push(`${add > 0 ? '+' : '-'} ${Math.abs(add).toLocaleString('ko-KR')}원`);
  if (Number(tag?.rounding_unit || 1) !== 1) {
    const rounding = {nearest:'반올림', up:'올림', down:'내림'}[tag.rounding_mode] || '반올림';
    parts.push(`· ${Number(tag.rounding_unit).toLocaleString('ko-KR')}원 ${rounding}`);
  }
  return parts.join(' ');
}

function calculateInboundCostPreview(purchasePrice, tag) {
  const base = Number(purchasePrice);
  if (!Number.isFinite(base) || !tag) return null;
  const raw = (base * Number(tag.multiply_value || 1) / Number(tag.divide_value || 1)) + Number(tag.add_value || 0);
  const unit = Math.max(1, Number(tag.rounding_unit || 1));
  if (tag.rounding_mode === 'up') return Math.ceil(raw / unit) * unit;
  if (tag.rounding_mode === 'down') return Math.floor(raw / unit) * unit;
  return Math.round(raw / unit) * unit;
}

function resetInboundCostTagForm() {
  inboundCostState.editingTagId = null;
  document.getElementById('inbound-cost-tag-id').value = '';
  document.getElementById('inbound-cost-tag-name').value = '';
  document.getElementById('inbound-cost-tag-color').value = '#7c3aed';
  document.getElementById('inbound-cost-tag-multiply').value = '1';
  document.getElementById('inbound-cost-tag-divide').value = '1';
  document.getElementById('inbound-cost-tag-add').value = '0';
  document.getElementById('inbound-cost-tag-round-unit').value = '1';
  document.getElementById('inbound-cost-tag-round-mode').value = 'nearest';
  document.getElementById('inbound-cost-tag-description').value = '';
  document.getElementById('inbound-cost-tag-delete').hidden = true;
  updateInboundCostTagPreview();
  renderInboundCostTagList();
}

function inboundCostTagFormValue() {
  return {
    tagId:document.getElementById('inbound-cost-tag-id').value || null,
    tagName:document.getElementById('inbound-cost-tag-name').value.trim(),
    tagColor:document.getElementById('inbound-cost-tag-color').value,
    multiplyValue:Number(document.getElementById('inbound-cost-tag-multiply').value || 1),
    divideValue:Number(document.getElementById('inbound-cost-tag-divide').value || 1),
    addValue:Number(document.getElementById('inbound-cost-tag-add').value || 0),
    roundingUnit:Number(document.getElementById('inbound-cost-tag-round-unit').value || 1),
    roundingMode:document.getElementById('inbound-cost-tag-round-mode').value,
    description:document.getElementById('inbound-cost-tag-description').value.trim()
  };
}

function updateInboundCostTagPreview() {
  const value = inboundCostTagFormValue();
  document.getElementById('inbound-cost-tag-preview').textContent = inboundCostFormulaLabel({
    multiply_value:value.multiplyValue,
    divide_value:value.divideValue,
    add_value:value.addValue,
    rounding_unit:value.roundingUnit,
    rounding_mode:value.roundingMode
  });
}

function renderInboundCostTagList() {
  const list = document.getElementById('inbound-cost-tag-list');
  if (!list) return;
  list.innerHTML = inboundCostState.tags.length ? inboundCostState.tags.map(tag => `
    <button type="button" class="price-rule-tag-card${Number(tag.tag_id) === Number(inboundCostState.editingTagId) ? ' active' : ''}" data-inbound-cost-tag-id="${Number(tag.tag_id)}">
      <i style="background:${escapeHtml(tag.tag_color || '#7c3aed')}"></i><span><b>${escapeHtml(tag.tag_name)}</b><em>${escapeHtml(inboundCostFormulaLabel(tag))}</em></span>
    </button>`).join('') : '<p class="price-rule-empty">아직 실입고가 수식태그가 없습니다. 오른쪽에서 첫 태그를 만들어주세요.</p>';
  const select = document.getElementById('inbound-cost-formula');
  if (select) {
    const selected = select.value;
    select.innerHTML = '<option value="">수식태그 선택…</option>' + inboundCostState.tags.map(tag => `<option value="${Number(tag.tag_id)}">${escapeHtml(tag.tag_name)} · ${escapeHtml(inboundCostFormulaLabel(tag))}</option>`).join('');
    if (inboundCostState.tags.some(tag => String(tag.tag_id) === selected)) select.value = selected;
  }
}

function editInboundCostTag(tagId) {
  const tag = inboundCostState.tags.find(item => Number(item.tag_id) === Number(tagId));
  if (!tag) return;
  inboundCostState.editingTagId = Number(tag.tag_id);
  document.getElementById('inbound-cost-tag-id').value = tag.tag_id;
  document.getElementById('inbound-cost-tag-name').value = tag.tag_name || '';
  document.getElementById('inbound-cost-tag-color').value = tag.tag_color || '#7c3aed';
  document.getElementById('inbound-cost-tag-multiply').value = tag.multiply_value ?? 1;
  document.getElementById('inbound-cost-tag-divide').value = tag.divide_value ?? 1;
  document.getElementById('inbound-cost-tag-add').value = tag.add_value ?? 0;
  document.getElementById('inbound-cost-tag-round-unit').value = tag.rounding_unit ?? 1;
  document.getElementById('inbound-cost-tag-round-mode').value = tag.rounding_mode || 'nearest';
  document.getElementById('inbound-cost-tag-description').value = tag.description || '';
  document.getElementById('inbound-cost-tag-delete').hidden = false;
  updateInboundCostTagPreview();
  renderInboundCostTagList();
}

async function loadInboundCostTags({silent = false} = {}) {
  if (!liveData?.loadInboundCostFormulaTags) return;
  try {
    inboundCostState.tags = await liveData.loadInboundCostFormulaTags();
    inboundCostState.loaded = true;
    renderInboundCostTagList();
  } catch (error) {
    console.error('inbound cost tags load failed', error);
    if (!silent) showToast(`실입고가 수식태그 조회 실패: ${error?.message || error}`);
  }
}

const inboundCostModal = document.getElementById('inbound-cost-modal');

function updateInboundCostModalPreview() {
  const mode = document.querySelector('input[name="inbound-cost-mode"]:checked')?.value || 'empty';
  const product = inboundCostState.product || {};
  const manualField = document.getElementById('inbound-cost-manual-field');
  const formulaField = document.getElementById('inbound-cost-formula-field');
  manualField.hidden = mode !== 'manual';
  formulaField.hidden = mode !== 'formula';
  let value = null;
  let equation = '미설정 상태로 저장합니다.';
  if (mode === 'manual') {
    const input = document.getElementById('inbound-cost-manual').value;
    value = input === '' ? null : Number(input);
    equation = value === null ? '직접 입력 금액을 적어주세요.' : '직접 확인한 실입고가';
  } else if (mode === 'formula') {
    const tag = inboundCostState.tags.find(item => String(item.tag_id) === document.getElementById('inbound-cost-formula').value);
    value = calculateInboundCostPreview(product.sellpia_purchase_price, tag);
    equation = tag ? `${inboundCostFormulaLabel(tag)} = ${formatNullableNumber(value)}원` : '수식태그를 선택해주세요.';
  }
  document.getElementById('inbound-cost-preview').textContent = value === null || !Number.isFinite(value) ? '-' : `${formatNullableNumber(value)}원`;
  document.getElementById('inbound-cost-preview-equation').textContent = equation;
}

async function openInboundCostModal(product) {
  if (!product) return;
  inboundCostState.product = product;
  if (!inboundCostState.loaded) await loadInboundCostTags();
  document.getElementById('inbound-cost-modal-sku').textContent = `셀피아 SKU ${product.sellpia_sku_code}`;
  document.getElementById('inbound-cost-source-price').textContent = `${formatNullableNumber(product.sellpia_purchase_price)}원`;
  document.getElementById('inbound-cost-source-order-unit').textContent = formatNullableNumber(product.sellpia_order_unit);
  document.getElementById('inbound-cost-source-min-unit').textContent = formatNullableNumber(product.sellpia_minimum_order_unit);
  document.getElementById('inbound-cost-manual').value = product.actual_inbound_manual_cost ?? '';
  renderInboundCostTagList();
  document.getElementById('inbound-cost-formula').value = product.inbound_cost_formula_tag_id || '';
  const mode = product.actual_inbound_cost_mode || 'empty';
  const radio = document.querySelector(`input[name="inbound-cost-mode"][value="${mode}"]`);
  if (radio) radio.checked = true;
  updateInboundCostModalPreview();
  inboundCostModal.hidden = false;
}

function closeInboundCostModal() {
  inboundCostModal.hidden = true;
  inboundCostState.product = null;
}

document.getElementById('inbound-cost-tag-list').addEventListener('click', event => {
  const button = event.target.closest('[data-inbound-cost-tag-id]');
  if (button) editInboundCostTag(button.dataset.inboundCostTagId);
});
document.getElementById('inbound-cost-tag-reset').addEventListener('click', resetInboundCostTagForm);
document.getElementById('inbound-cost-tag-form').addEventListener('input', updateInboundCostTagPreview);
document.getElementById('inbound-cost-tag-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
  const value = inboundCostTagFormValue();
  if (!value.tagName || value.multiplyValue <= 0 || value.divideValue <= 0 || value.roundingUnit <= 0) {
    showToast('태그 이름과 0보다 큰 곱하기·나누기·끝자리 단위를 확인해주세요.');
    return;
  }
  button.disabled = true;
  try {
    const saved = await liveData.saveInboundCostFormulaTag(value);
    await loadInboundCostTags({silent:true});
    editInboundCostTag(saved.tag_id);
    showToast(`실입고가 수식태그 ‘${saved.tag_name}’을 저장했습니다.`);
  } catch (error) { showToast(`수식태그 저장 실패: ${error?.message || error}`); }
  finally { button.disabled = false; }
});
document.getElementById('inbound-cost-tag-delete').addEventListener('click', async event => {
  if (!inboundCostState.editingTagId || !window.confirm('이 실입고가 수식태그를 삭제할까요?')) return;
  event.currentTarget.disabled = true;
  try {
    await liveData.deleteInboundCostFormulaTag(inboundCostState.editingTagId);
    await loadInboundCostTags({silent:true});
    resetInboundCostTagForm();
    showToast('실입고가 수식태그를 삭제했습니다.');
  } catch (error) { showToast(`수식태그 삭제 실패: ${error?.message || error}`); }
  finally { event.currentTarget.disabled = false; }
});
document.querySelectorAll('input[name="inbound-cost-mode"]').forEach(radio => radio.addEventListener('change', updateInboundCostModalPreview));
document.getElementById('inbound-cost-manual').addEventListener('input', updateInboundCostModalPreview);
document.getElementById('inbound-cost-formula').addEventListener('change', updateInboundCostModalPreview);
document.getElementById('inbound-cost-modal-close').addEventListener('click', closeInboundCostModal);
document.getElementById('inbound-cost-modal-cancel').addEventListener('click', closeInboundCostModal);
inboundCostModal.addEventListener('click', event => { if (event.target === inboundCostModal) closeInboundCostModal(); });
document.getElementById('inbound-cost-modal-save').addEventListener('click', async event => {
  const product = inboundCostState.product;
  if (!product) return;
  const mode = document.querySelector('input[name="inbound-cost-mode"]:checked')?.value || 'empty';
  const manualCost = mode === 'manual' ? document.getElementById('inbound-cost-manual').value : null;
  const formulaTagId = mode === 'formula' ? document.getElementById('inbound-cost-formula').value : null;
  if (mode === 'manual' && (manualCost === '' || Number(manualCost) < 0)) { showToast('직접 입력할 실입고가를 확인해주세요.'); return; }
  if (mode === 'formula' && !formulaTagId) { showToast('적용할 수식태그를 선택해주세요.'); return; }
  event.currentTarget.disabled = true;
  try {
    await liveData.saveInboundCost({sku:product.sellpia_sku_code, manualCost, formulaTagId});
    closeInboundCostModal();
    await loadLiveMatrix();
    showToast(`${product.sellpia_sku_code} 실입고가를 DB에 바로 저장했습니다.`);
  } catch (error) { showToast(`실입고가 저장 실패: ${error?.message || error}`); }
  finally { event.currentTarget.disabled = false; }
});

const SIDEBAR_COLLAPSED_KEY = 'system-v3-primary-sidebar-collapsed';
const UI_DENSITY_KEY = 'system-v3-ui-density';
const appShell = document.querySelector('.app-shell');
const sidebarToggle = document.getElementById('sidebar-toggle');
const uiDensitySelect = document.getElementById('ui-density-select');

function setUiDensity(value, {persist = true} = {}) {
  const density = value === 'compact' ? 'compact' : 'comfortable';
  appShell.classList.toggle('ui-density-compact', density === 'compact');
  appShell.dataset.uiDensity = density;
  if (uiDensitySelect) uiDensitySelect.value = density;
  if (persist) localStorage.setItem(UI_DENSITY_KEY, density);
}

uiDensitySelect?.addEventListener('change', event => setUiDensity(event.currentTarget.value));
setUiDensity(localStorage.getItem(UI_DENSITY_KEY), {persist:false});

function setSidebarCollapsed(collapsed, {persist = true} = {}) {
  const nextCollapsed = Boolean(collapsed);
  appShell.classList.toggle('sidebar-collapsed', nextCollapsed);
  sidebarToggle.setAttribute('aria-expanded', String(!nextCollapsed));
  sidebarToggle.title = nextCollapsed ? '좌측 메뉴 펼치기' : '좌측 메뉴 접기';
  sidebarToggle.querySelector('span').textContent = nextCollapsed ? '›' : '‹';
  sidebarToggle.querySelector('em').textContent = nextCollapsed ? '메뉴 펼치기' : '메뉴 접기';
  if (persist) localStorage.setItem(SIDEBAR_COLLAPSED_KEY, nextCollapsed ? 'true' : 'false');
}

sidebarToggle.addEventListener('click', () => {
  setSidebarCollapsed(!appShell.classList.contains('sidebar-collapsed'));
});
setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true', {persist:false});

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === pageId));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active-page');
  if (pageId === 'jobs') loadChangeQueue();
  if (pageId === 'channels') window.SystemV3ChannelsPage?.show();
  if (pageId === 'attributes') window.SystemV3AttributesPage?.show();
  if (pageId === 'multi-links' && multiLinkWorkspaceState.tab === 'all' && !multiLinkWorkspaceState.allLoaded) loadManagedConnections();
  if (pageId === 'inventory') loadInventorySurvey({silent:inventoryState.loaded});
  if (pageId === 'price-rules') {
    window.SystemV3PriceRuleLab?.refresh();
    loadInboundCostTags({silent:inboundCostState.loaded});
  }
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
const sellpiaPreflightPanel = document.getElementById('sellpia-preflight-panel');
const sellpiaPreflightState = {
  requestId:0,
  status:'idle',
  signature:'',
  mode:'',
  result:null,
  error:'',
  detail:''
};

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

function sellpiaPreflightSignature(files = selectedFiles, mode = currentUploadMode()) {
  return `${mode}|${Array.from(files || []).map(file => [file.name, file.size, file.lastModified, file.type].join(':')).join('|')}`;
}

function hasCurrentSellpiaPreflight() {
  if (sourceSelect.value !== 'sellpia' || sellpiaPreflightState.status !== 'success') return false;
  if (selectedFiles.length < requiredUploadFileCount()) return false;
  return sellpiaPreflightState.mode === currentUploadMode()
    && sellpiaPreflightState.signature === sellpiaPreflightSignature();
}

function sellpiaPreflightFileDetail(file, index) {
  const resultFile = sellpiaPreflightState.result?.files?.find(candidate => candidate.name === file.name) || sellpiaPreflightState.result?.files?.[index];
  if (sourceSelect.value !== 'sellpia') return '';
  if (sellpiaPreflightState.status === 'checking') return '사전검사 중…';
  if (sellpiaPreflightState.status === 'error') return '사전검사 실패';
  if (sellpiaPreflightState.status !== 'success' || !resultFile) return '사전검사 대기';
  const range = Number.isFinite(Number(resultFile.minRowNo)) && Number.isFinite(Number(resultFile.maxRowNo))
    ? `${formatNumber(resultFile.minRowNo)}~${formatNumber(resultFile.maxRowNo)}`
    : '행번호 확인';
  return `${resultFile.encoding || '인코딩 확인'} · ${formatNumber(resultFile.rowCount || 0)}행 · ${range} · ${resultFile.schemaStatus === 'ok' ? '템플릿 정상' : '템플릿 확인'}`;
}

function renderSellpiaPreflight() {
  if (!sellpiaPreflightPanel) return;
  const active = sourceSelect.value === 'sellpia';
  sellpiaPreflightPanel.hidden = !active;
  if (!active) {
    sellpiaPreflightPanel.innerHTML = '';
    return;
  }
  const state = sellpiaPreflightState;
  sellpiaPreflightPanel.dataset.status = state.status;
  if (!selectedFiles.length) {
    sellpiaPreflightPanel.innerHTML = '<div><b>셀피아 파일 사전검사</b><span>파일을 선택하면 인코딩, 행번호, 템플릿, SKU 중복을 먼저 확인합니다.</span></div><em>대기</em>';
    return;
  }
  if (state.status === 'checking') {
    sellpiaPreflightPanel.innerHTML = `<div><b>셀피아 파일 사전검사 중</b><span>${escapeHtml(state.detail || '인코딩, 행번호, 템플릿을 확인하고 있습니다.')}</span></div><em>검사 중</em>`;
    return;
  }
  if (state.status === 'error') {
    sellpiaPreflightPanel.innerHTML = `<div><b>셀피아 파일 사전검사 실패</b><span>${escapeHtml(state.error || '파일 형식과 행번호를 다시 확인해주세요.')}</span></div><em>업로드 차단</em>`;
    return;
  }
  if (state.status === 'success') {
    const result = state.result || {};
    const range = Number.isFinite(Number(result.firstRowNo)) && Number.isFinite(Number(result.lastRowNo))
      ? `${formatNumber(result.firstRowNo)}~${formatNumber(result.lastRowNo)}`
      : '행번호 확인';
    const duplicate = Number(result.duplicateSkuCount || 0);
    sellpiaPreflightPanel.innerHTML = `<div><b>셀피아 파일 사전검사 완료</b><span>합계 ${formatNumber(result.rowCount || 0)}행 · ${range} · 행번호 연속 · ${duplicate === 0 ? 'SKU 중복 없음' : `SKU 중복 ${formatNumber(duplicate)}건`}</span></div><em>업로드 가능</em>`;
    return;
  }
  sellpiaPreflightPanel.innerHTML = '<div><b>셀피아 파일 사전검사 대기</b><span>파일 구성이 바뀌면 다시 검사합니다.</span></div><em>대기</em>';
}

function invalidateSellpiaPreflight() {
  sellpiaPreflightState.requestId += 1;
  sellpiaPreflightState.status = 'idle';
  sellpiaPreflightState.signature = '';
  sellpiaPreflightState.mode = '';
  sellpiaPreflightState.result = null;
  sellpiaPreflightState.error = '';
  sellpiaPreflightState.detail = '';
}

async function runSellpiaPreflight() {
  if (sourceSelect.value !== 'sellpia') return;
  const files = [...selectedFiles];
  const mode = currentUploadMode();
  const signature = sellpiaPreflightSignature(files, mode);
  const requestId = ++sellpiaPreflightState.requestId;
  sellpiaPreflightState.status = files.length ? 'checking' : 'idle';
  sellpiaPreflightState.signature = signature;
  sellpiaPreflightState.mode = mode;
  sellpiaPreflightState.result = null;
  sellpiaPreflightState.error = '';
  sellpiaPreflightState.detail = files.length ? '파일을 읽는 중입니다.' : '';
  renderSellpiaPreflight();
  renderFiles(selectedFiles, {skipPreflight:true});
  setUploadCapability();
  if (!files.length) return;
  if (typeof liveData?.preflightSellpiaFiles !== 'function') {
    if (requestId !== sellpiaPreflightState.requestId) return;
    sellpiaPreflightState.status = 'error';
    sellpiaPreflightState.error = '셀피아 사전검사 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.';
    renderSellpiaPreflight();
    renderFiles(selectedFiles, {skipPreflight:true});
    setUploadCapability();
    return;
  }
  try {
    const result = await liveData.preflightSellpiaFiles(files, {mode}, progress => {
      if (requestId !== sellpiaPreflightState.requestId || signature !== sellpiaPreflightSignature()) return;
      sellpiaPreflightState.detail = typeof progress === 'string' ? progress : progress?.detail || progress?.message || '파일을 검사하고 있습니다.';
      renderSellpiaPreflight();
    });
    if (requestId !== sellpiaPreflightState.requestId || sourceSelect.value !== 'sellpia' || signature !== sellpiaPreflightSignature()) return;
    if (!result?.valid) {
      sellpiaPreflightState.status = 'error';
      sellpiaPreflightState.result = result || null;
      sellpiaPreflightState.error = result?.errors?.[0] || '셀피아 파일 사전검사에 실패했습니다.';
    } else {
      sellpiaPreflightState.status = 'success';
      sellpiaPreflightState.result = result;
      sellpiaPreflightState.error = '';
    }
  } catch (error) {
    if (requestId !== sellpiaPreflightState.requestId || sourceSelect.value !== 'sellpia' || signature !== sellpiaPreflightSignature()) return;
    sellpiaPreflightState.status = 'error';
    sellpiaPreflightState.error = error?.message || '셀피아 파일 사전검사에 실패했습니다.';
    sellpiaPreflightState.result = null;
  }
  renderSellpiaPreflight();
  renderFiles(selectedFiles, {skipPreflight:true});
  setUploadCapability();
}

function setUploadCapability() {
  const supported = ['sellpia','smartstore','makeshop','ably'].includes(sourceSelect.value) || sourceSelect.value === 'survey';
  const label = sourceConfig[sourceSelect.value]?.name || '원본';
  const sellpiaBlocked = sourceSelect.value === 'sellpia' && !hasCurrentSellpiaPreflight();
  uploadButton.disabled = !supported || sellpiaBlocked;
  uploadButton.textContent = !supported ? '업로드 연결 예정' : sellpiaBlocked ? (sellpiaPreflightState.status === 'checking' ? '사전검사 중…' : '사전검사 필요') : 'DB 업로드 시작';
  uploadCapabilityBadge.textContent = supported ? `${label} 실데이터 업로드 연결` : '업로드 연결 예정';
}

function updateSource() {
  const config = sourceConfig[sourceSelect.value];
  invalidateSellpiaPreflight();
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
function renderFiles(files, {skipPreflight = false} = {}) {
  const config = sourceConfig[sourceSelect.value];
  selectedFiles = Array.from(files || []).slice(0, config.files);
  const required = requiredUploadFileCount();
  fileSlots.innerHTML = Array.from({length:config.files},(_,i)=>{
    const file = selectedFiles[i];
    const optional = i >= required;
    const detail = file
      ? sourceSelect.value === 'sellpia'
        ? `${(file.size/1024/1024).toFixed(1)}MB · ${sellpiaPreflightFileDetail(file, i)}`
        : `${(file.size/1024/1024).toFixed(1)}MB · 업로드 준비됨`
      : optional ? '부분 갱신에서는 생략 가능' : '선택된 파일 없음';
    return `<div class="${sourceSelect.value === 'sellpia' ? `sellpia-preflight-slot ${sellpiaPreflightState.status}` : ''}"><i>${file?'✓':i+1}</i><span><b>${file?file.name:`파일 ${i+1}${optional ? ' · 선택' : ' · 필수'}`}</b><em>${detail}</em></span><button type="button" class="slot-button">${file?'교체':'파일 선택'}</button></div>`;
  }).join('');
  renderSellpiaPreflight();
  if (sourceSelect.value === 'sellpia' && !skipPreflight) void runSellpiaPreflight();
  else setUploadCapability();
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
  if (sourceSelect.value === 'sellpia' && !hasCurrentSellpiaPreflight()) {
    showToast(sellpiaPreflightState.status === 'checking' ? '셀피아 파일 사전검사가 끝난 뒤 업로드할 수 있습니다.' : '현재 파일 구성의 셀피아 사전검사가 필요합니다.');
    if (sellpiaPreflightState.status !== 'checking') void runSellpiaPreflight();
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
    discount: document.getElementById('upload-field-discount').checked,
    basic: document.getElementById('upload-field-basic').checked,
    status: document.getElementById('upload-field-status').checked,
    mode: isPatchableUploadSource() ? currentUploadMode() : 'full'
  };
  if (sourceSelect.value !== 'survey' && ![fields.inventory, fields.price, fields.discount, fields.basic, fields.status].some(Boolean)) {
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
  if (event.key === 'Escape' && !inboundCostModal.hidden) closeInboundCostModal();
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
initializeMatrixColumnResizing();
applyViewPreset(startupPreset, {id:startupPreset.id, reload:false, announce:false});
updateCodeListFilterUi();

if (liveData) {
  initializeOperationsHubAuth();
} else {
  showOperationsAuthGate('', {message:'DB 및 운영 로그인 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'});
  setMatrixConnection('error', 'DB 모듈 없음');
  for (const component of Object.keys(systemHealthState.components)) setSystemHealthComponent(component, false);
  systemHealthState.lastCompletedAt = new Date().toISOString();
  renderSystemHealth();
  document.getElementById('live-today-picked').textContent = '-';
  document.getElementById('live-shortage-drawer').textContent = '주문 DB 연결 대기';
}
