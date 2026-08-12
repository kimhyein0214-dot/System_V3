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
const liveData = window.SystemV3Data;
const matrixState = {page:1, search:'', total:0, loading:false, requestId:0};
const matrixRowsBySku = new Map();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  })[character]);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function formatLiveTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false
  }).format(date);
}

function matrixImage(product) {
  if (!product.image_url) return '<span class="product-thumb gray">NO</span>';
  const url = escapeHtml(product.image_url);
  return `<span class="product-thumb live-thumb"><img src="${url}" alt="${escapeHtml(product.sellpia_sku_code)} 상품 이미지" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('image-failed');this.remove()"></span>`;
}

function matchState(tier) {
  if (!tier) return {key:'unmatched', label:'미매칭'};
  if (tier === 'FAST_REVIEW') return {key:'review', label:'검토 필요'};
  return {key:'connected', label:'연결 완료'};
}

function channelCells(product, prefix, hasSeparateOption = true) {
  const tier = product[`${prefix}_match_tier`];
  const state = matchState(tier);
  const productCode = escapeHtml(product[`${prefix}_product_code`] || '-');
  const optionCode = escapeHtml(product[`${prefix}_option_code`] || '-');
  const listingCount = Number(product[`${prefix}_listing_count`] || 0);
  const title = listingCount > 1 ? ` title="이 SKU에 ${listingCount}개의 판매처 행이 연결되어 있습니다."` : '';
  const codeCells = hasSeparateOption
    ? `<td${title}>${productCode}</td><td>${optionCode}</td>`
    : `<td${title}>${productCode}${optionCode !== '-' ? `<em class="sub-code">${optionCode}</em>` : ''}</td>`;
  return `<td><span class="matrix-status ${state.key}">${state.label}</span></td>${codeCells}<td class="data-gap">-</td><td class="data-gap">-</td>`;
}

function renderLiveMatrixRows(products) {
  matrixRowsBySku.clear();
  if (!products.length) {
    matrixBody.innerHTML = '<tr class="matrix-empty-row"><td colspan="25"><b>검색 결과가 없습니다.</b><span>SKU 또는 자사코드를 다시 확인해주세요.</span></td></tr>';
    return;
  }
  matrixBody.innerHTML = products.map(product => {
    matrixRowsBySku.set(product.sellpia_sku_code, product);
    const sku = escapeHtml(product.sellpia_sku_code);
    const ownCode = escapeHtml(product.own_code || '-');
    const imageUrl = escapeHtml(product.image_url || '');
    const tiers = [product.smartstore_match_tier, product.makeshop_match_tier, product.ably_match_tier];
    const connectedCount = tiers.filter(Boolean).length;
    const overallState = connectedCount === 0 ? 'unmatched' : tiers.includes('FAST_REVIEW') ? 'review' : 'connected';
    const displayName = escapeHtml(product.display_name || '상품명 원본 적재 대기');
    const mappingTag = overallState === 'review' ? '<span class="tag review-tag">검토 필요</span>' : `<span class="tag">${connectedCount}처 연결</span>`;
    return `<tr data-sku="${sku}" data-own-code="${ownCode}" data-image="${imageUrl}" data-status="${overallState}">
      <td class="sticky-col select-col"><input class="row-check" type="checkbox" aria-label="${sku} 선택"></td>
      <td class="sticky-col image-col">${matrixImage(product)}</td>
      <td class="sticky-col sku-col code-cell">${sku}</td>
      <td>${ownCode}</td>
      <td class="product-cell"><b title="${displayName}">${displayName}</b><em>매칭 DB 기준 대표 상품명</em></td>
      <td class="number-cell data-gap">-</td><td class="number-cell data-gap">-</td>
      ${channelCells(product, 'smartstore')}
      ${channelCells(product, 'makeshop')}
      ${channelCells(product, 'ably', false)}
      <td class="data-gap">-</td><td class="data-gap">-</td><td>${mappingTag}</td><td>${formatLiveTime(product.updated_at)}</td>
    </tr>`;
  }).join('');
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
  matrixBody.innerHTML = '<tr class="matrix-empty-row loading"><td colspan="25"><b>Supabase에서 실제 SKU를 불러오는 중입니다.</b><span>이미지와 자사코드를 함께 연결합니다.</span></td></tr>';
  try {
    const result = await liveData.loadProducts({page:matrixState.page, search:matrixState.search});
    if (requestId !== matrixState.requestId) return;
    matrixState.total = result.count;
    renderLiveMatrixRows(result.rows);
    const first = result.count ? ((result.page - 1) * result.pageSize) + 1 : 0;
    const last = Math.min(result.page * result.pageSize, result.count);
    document.getElementById('matrix-total-count').textContent = formatNumber(result.count);
    document.getElementById('live-total-sku').textContent = formatNumber(result.count);
    document.getElementById('live-catalog-state').textContent = 'Supabase 실데이터';
    document.getElementById('matrix-range').textContent = `${formatNumber(first)}–${formatNumber(last)} / ${formatNumber(result.count)}`;
    document.getElementById('matrix-page').textContent = result.page;
    document.getElementById('matrix-prev').disabled = result.page <= 1;
    document.getElementById('matrix-next').disabled = last >= result.count;
    document.getElementById('select-all-matrix').checked = false;
    updateSelectedCount();
    setMatrixConnection('connected', `LIVE · ${formatNumber(result.count)} SKU`);
  } catch (error) {
    console.error('operations hub matrix load failed', error);
    matrixBody.innerHTML = '<tr class="matrix-empty-row error"><td colspan="25"><b>실데이터를 불러오지 못했습니다.</b><span>DB 새로고침을 눌러 다시 시도해주세요.</span></td></tr>';
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

async function loadLiveSourceStatus() {
  if (!liveData) return;
  try {
    const {latest} = await liveData.loadSourceStatus();
    for (const source of ['smartstore','makeshop','ably']) {
      const event = latest[source];
      const card = channelCard(source);
      if (!event || !card) continue;
      const difference = Number(event.payload?.differences || 0);
      const missing = Number(event.payload?.missing || 0);
      const description = card.querySelector('p em');
      const time = card.querySelector('time');
      const status = card.querySelector('.status');
      description.textContent = `매칭 ${formatNumber(event.output_rows)}건 · 차이 ${formatNumber(difference)} · 미매칭 ${formatNumber(missing)}`;
      time.textContent = formatLiveTime(event.event_at);
      status.textContent = event.status === 'SUCCESS' ? '완료' : event.status === 'ERROR' ? '오류' : '대기';
      status.className = `status ${event.status === 'SUCCESS' ? 'done' : 'wait'}`;
    }
    const newest = Object.values(latest).sort((a,b) => new Date(b.event_at) - new Date(a.event_at))[0];
    if (newest) document.querySelector('.time-value').textContent = formatLiveTime(newest.event_at).split(' ').pop();
  } catch (error) {
    console.error('operations hub source status load failed', error);
  }
}

async function refreshLiveData(options) {
  await Promise.all([loadLiveMatrix(options), loadLiveSourceStatus()]);
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

function fillDrawerChannel(sectionKey, dataKey, product) {
  const section = document.getElementById(`drawer-${sectionKey}`);
  const state = matchState(product?.[`${dataKey}_match_tier`]);
  const status = section.querySelector('.matrix-status');
  status.className = `matrix-status ${state.key}`;
  status.textContent = state.label;
  document.getElementById(`drawer-${sectionKey}-product`).value = product?.[`${dataKey}_product_code`] || '';
  document.getElementById(`drawer-${sectionKey}-option`).value = product?.[`${dataKey}_option_code`] || '';
}

function openProductDrawer(row) {
  const product = matrixRowName(row);
  const liveProduct = matrixRowsBySku.get(product.sku) || {};
  document.getElementById('drawer-sku').textContent = product.sku;
  document.getElementById('drawer-name').textContent = liveProduct.display_name || product.name;
  document.getElementById('drawer-option').textContent = `자사코드 ${product.ownCode}`;
  const drawerThumb = document.querySelector('.drawer-product .product-thumb');
  drawerThumb.className = 'product-thumb live-thumb';
  drawerThumb.innerHTML = product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.sku)} 상품 이미지">` : 'NO';
  document.querySelectorAll('[data-drawer-field]').forEach(input => {
    input.value = '';
    input.placeholder = '판매처 DB 적재 후 표시';
    input.disabled = true;
  });
  fillDrawerChannel('smart', 'smartstore', liveProduct);
  fillDrawerChannel('make', 'makeshop', liveProduct);
  fillDrawerChannel('ably', 'ably', liveProduct);
  const connectedCount = ['smartstore','makeshop','ably'].filter(channel => liveProduct[`${channel}_match_tier`]).length;
  document.getElementById('drawer-stock').textContent = '-';
  document.getElementById('drawer-price').textContent = '-';
  document.getElementById('drawer-channel-count').textContent = `${connectedCount}곳`;
  const attributeSection = document.querySelector('.compact-section');
  attributeSection.querySelectorAll('select,input').forEach(input => { input.disabled = true; });
  attributeSection.querySelector('.wide-label input').value = '속성 DB 적재 전';
  const drawerSave = document.getElementById('drawer-save');
  drawerSave.disabled = true;
  drawerSave.textContent = '판매처 DB 연결 대기';
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

function addPendingChange(change) {
  const duplicate = pendingChanges.find(item => item.sku === change.sku && item.field === change.field);
  if (duplicate) {
    duplicate.after = change.after;
  } else {
    pendingChanges.push(change);
  }
  pendingCount.textContent = pendingChanges.length;
  changeBar.hidden = pendingChanges.length === 0;
}

function clearPendingChanges() {
  pendingChanges.length = 0;
  pendingCount.textContent = '0';
  changeBar.hidden = true;
  document.querySelectorAll('.editable-cell.pending').forEach(cell => cell.classList.remove('pending'));
}

function updateSelectedCount() {
  const count = document.querySelectorAll('.row-check:checked').length;
  document.getElementById('selected-count').textContent = count;
}

matrixBody.addEventListener('click', event => {
  if (event.target.closest('input,button')) return;
  const row = event.target.closest('tr[data-sku]');
  if (row) openProductDrawer(row);
});

matrixBody.addEventListener('dblclick', event => {
  const cell = event.target.closest('.editable-cell');
  if (!cell || cell.querySelector('input')) return;
  const row = cell.closest('tr');
  const before = cell.textContent.trim();
  const input = document.createElement('input');
  input.className = 'inline-editor';
  input.value = before;
  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  input.select();
  let completed = false;
  const finish = save => {
    if (completed) return;
    completed = true;
    const after = save ? input.value.trim() || before : before;
    cell.textContent = after;
    if (save && after !== before) {
      cell.classList.add('pending');
      addPendingChange({sku:row.dataset.sku, field:cell.dataset.field, before, after});
    }
  };
  input.addEventListener('keydown', keyEvent => {
    if (keyEvent.key === 'Enter') finish(true);
    if (keyEvent.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
});

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

document.getElementById('matrix-status-filter').addEventListener('change', event => {
  matrixBody.querySelectorAll('tr').forEach(row => {
    row.hidden = event.target.value !== 'all' && row.dataset.status !== event.target.value;
  });
});

document.querySelectorAll('.matrix-view-tabs button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.matrix-view-tabs button').forEach(item => item.classList.toggle('active', item === button));
  showToast(`${button.textContent} 보기로 전환했습니다.`);
}));

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
document.getElementById('drawer-save').addEventListener('click', () => {
  if (document.getElementById('drawer-save').disabled) return;
  const sku = productDrawer.dataset.sku || '1014-1';
  document.querySelectorAll('[data-drawer-field]').forEach(input => {
    addPendingChange({sku, field:input.dataset.drawerField, before:'기존값', after:input.value});
  });
  closeProductDrawer();
  showToast(`${sku} 수정내용을 변경 대기에 추가했습니다.`);
});

document.querySelectorAll('.drawer-tabs button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.drawer-tabs button').forEach(item => item.classList.toggle('active', item === button));
  if (button.textContent !== '판매처 연결') showToast(`${button.textContent} 화면은 다음 목업 단계에서 확장됩니다.`);
}));

document.getElementById('discard-changes').addEventListener('click', () => {
  clearPendingChanges();
  showToast('목업 변경사항을 모두 취소했습니다.');
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
document.getElementById('apply-mock-changes').addEventListener('click', () => {
  changeModal.hidden = true;
  clearPendingChanges();
  showToast('목업 완료: 실제 DB나 판매처에는 반영되지 않았습니다.');
});

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === pageId));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active-page');
  document.querySelector('.content-area').scrollTop = 0;
}

document.addEventListener('click', event => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) showPage(pageButton.dataset.page);
  const toastButton = event.target.closest('[data-toast]');
  if (toastButton) showToast(toastButton.dataset.toast);
});

const sourceSelect = document.getElementById('source-select');
const sourceInfo = document.getElementById('source-info');
const fileGuide = document.getElementById('file-guide');
const fileSlots = document.getElementById('file-slots');
function updateSource() {
  const config = sourceConfig[sourceSelect.value];
  sourceInfo.innerHTML = `<span class="channel-logo ${config.cls}">${config.initial}</span><div><b>${config.name}</b><p>${config.detail}</p></div><em>필수</em>`;
  fileGuide.textContent = config.guide;
  fileSlots.innerHTML = Array.from({length:config.files},(_,i)=>`<div><i>${i+1}</i><span><b>파일 ${i+1}</b><em>선택된 파일 없음</em></span><button type="button" class="slot-button">파일 선택</button></div>`).join('');
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
  fileSlots.innerHTML = Array.from({length:config.files},(_,i)=>{
    const file = files[i];
    return `<div><i>${file?'✓':i+1}</i><span><b>${file?file.name:`파일 ${i+1}`}</b><em>${file?`${(file.size/1024/1024).toFixed(1)}MB · 업로드 준비됨`:'선택된 파일 없음'}</em></span><button type="button" class="slot-button">${file?'교체':'파일 선택'}</button></div>`;
  }).join('');
}

document.getElementById('mock-upload-btn').addEventListener('click', () => showToast('목업이므로 실제 파일은 업로드되지 않습니다.'));
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

if (liveData) {
  refreshLiveData({resetPage:true});
  window.setInterval(loadLiveSourceStatus, 60000);
} else {
  setMatrixConnection('error', 'DB 모듈 없음');
}
