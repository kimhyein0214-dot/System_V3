(function initSystemV3Data(global) {
  'use strict';

  const SUPABASE_URL = 'https://bpgvqmtsjgegnrdzmpep.supabase.co';
  const SUPABASE_KEY = 'sb_publishable__NVp6Ra227_e1TQqQE40oA_O2PVwv5C';
  const PAGE_SIZE = 50;

  function requireClient() {
    if (!global.supabase?.createClient) {
      throw new Error('Supabase 클라이언트를 불러오지 못했습니다.');
    }
    return global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  const db = requireClient();

  function normalizedSearch(value) {
    return String(value || '').trim().replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_\-\[\]\s]/g, '');
  }

  async function loadProducts({ page = 1, search = '', status = 'all', sort = 'sku_asc' } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const keyword = normalizedSearch(search);
    let query = db
      .from('operations_hub_matrix_live')
      .select('sellpia_sku_code,own_code,image_url,display_name,smartstore_name,smartstore_product_code,smartstore_option_code,smartstore_match_tier,smartstore_match_score,smartstore_listing_count,makeshop_name,makeshop_product_code,makeshop_option_code,makeshop_match_tier,makeshop_match_score,makeshop_listing_count,ably_name,ably_product_code,ably_option_code,ably_match_tier,ably_match_score,ably_listing_count,updated_at,sellpia_product_name,sellpia_option_name,sellpia_own_code,sellpia_current_stock,sellpia_available_stock,sellpia_safety_stock,sellpia_sale_price,sellpia_inventory_at,smartstore_stock,smartstore_price,smartstore_inventory_at,makeshop_stock,makeshop_price,makeshop_inventory_at,ably_stock,ably_price,ably_inventory_at,overall_status', { count: 'exact' });

    if (keyword) {
      query = query.or(`sellpia_sku_code.ilike.*${keyword}*,own_code.ilike.*${keyword}*,display_name.ilike.*${keyword}*,sellpia_own_code.ilike.*${keyword}*,sellpia_product_name.ilike.*${keyword}*`);
    }
    if (status === 'attention') query = query.in('overall_status', ['review', 'unmatched']);
    else if (['connected', 'review', 'unmatched'].includes(status)) query = query.eq('overall_status', status);

    const sortOptions = {
      sku_asc: ['sellpia_sku_code', true],
      stock_desc: ['sellpia_current_stock', false],
      price_desc: ['sellpia_sale_price', false],
      updated_desc: ['updated_at', false]
    };
    const [sortColumn, ascending] = sortOptions[sort] || sortOptions.sku_asc;
    query = query.order(sortColumn, {ascending, nullsFirst:false});
    if (sortColumn !== 'sellpia_sku_code') query = query.order('sellpia_sku_code', {ascending:true});
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], count: count || 0, page: safePage, pageSize: PAGE_SIZE };
  }

  async function loadSourceStatus() {
    const { data, error } = await db
      .from('operations_hub_source_status')
      .select('source,event_type,status,event_at,duration_ms,processed_rows,total_rows,output_rows,payload')
      .order('event_at', { ascending: false })
      .limit(80);
    if (error) throw error;

    const latest = {};
    for (const event of data || []) {
      if (!latest[event.source] || latest[event.source].event_type !== 'INVENTORY_MATCH') {
        if (event.event_type === 'INVENTORY_MATCH') latest[event.source] = event;
      }
    }
    return { events: data || [], latest };
  }

  async function loadTags() {
    const { data, error } = await db
      .from('product_tags')
      .select('tag_id,tag_name,tag_color')
      .eq('is_active', true)
      .order('tag_name');
    if (error) throw error;
    return data || [];
  }

  function cleanText(value) {
    return String(value ?? '').trim();
  }

  function cleanNumber(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) ? number : fallback;
  }

  async function parseSellpiaFile(file, fileIndex, fileCount, onProgress) {
    if (!global.XLSX) throw new Error('XLSX 파일 해석 모듈을 불러오지 못했습니다.');
    onProgress?.({
      percent: Math.max(2, Math.round((fileIndex / fileCount) * 20)),
      title: `${file.name} 읽는 중`,
      detail: `${fileIndex + 1}/${fileCount} 파일의 셀피아 헤더와 SKU를 확인합니다.`
    });
    const workbook = global.XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:false});
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet?.['!ref']) throw new Error(`${file.name}: 첫 시트에 데이터가 없습니다.`);
    const range = global.XLSX.utils.decode_range(worksheet['!ref']);
    range.s.r = 0;
    range.s.c = 0;
    range.e.c = Math.min(range.e.c, 38);
    const rows = global.XLSX.utils.sheet_to_json(worksheet, {
      header:1,
      raw:true,
      defval:null,
      blankrows:false,
      range
    });
    const header = rows[0] || [];
    if (cleanText(header[0]) !== '#' || cleanText(header[2]) !== '상품코드' || cleanText(header[5]) !== '상품명') {
      throw new Error(`${file.name}: 셀피아 원본 헤더가 아닙니다. A1=#, C1=상품코드, F1=상품명을 확인해주세요.`);
    }
    return rows.slice(1).flatMap(row => {
      const sourceRowNo = cleanNumber(row[0]);
      const sku = cleanText(row[2]);
      if (!sourceRowNo && !sku) return [];
      if (!sourceRowNo || !sku) throw new Error(`${file.name}: 행번호 또는 상품코드가 비어 있는 행이 있습니다.`);
      const productCode = sku.replace(/-\d+$/, '');
      const soldOut = cleanText(row[21]);
      const discontinued = cleanText(row[23]);
      const saleStatus = discontinued ? '단종' : soldOut ? '품절' : '정상';
      const available = cleanNumber(row[20], cleanNumber(row[19], 0));
      const salePrice = cleanNumber(row[34], 0);
      return [{
        sellpia_sku_code: sku,
        sellpia_product_code: productCode,
        sellpia_product_name: cleanText(row[5]) || null,
        sellpia_option_name: cleanText(row[6]) || null,
        own_sku: cleanText(row[3]) || null,
        stock: cleanNumber(row[13], 0),
        available_stock: available,
        integrated_available_stock: available,
        safety_stock: cleanNumber(row[38], 0),
        source_row_no: sourceRowNo,
        raw_payload: {
          base_price: salePrice,
          sell_price: salePrice,
          purchase_price: cleanNumber(row[35], 0),
          commission: cleanText(row[36]),
          purchase_vat: cleanText(row[37]),
          sale_status: saleStatus,
          source_file_name: file.name
        }
      }];
    });
  }

  async function uploadSellpiaSnapshot(files, fields = {}, onProgress) {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length !== 3) throw new Error('셀피아 분할 원본 3개가 모두 필요합니다.');
    const normalizedRows = [];
    for (let index = 0; index < selectedFiles.length; index += 1) {
      normalizedRows.push(...await parseSellpiaFile(selectedFiles[index], index, selectedFiles.length, onProgress));
    }
    normalizedRows.sort((a, b) => a.source_row_no - b.source_row_no);
    const seenSku = new Set();
    for (let index = 0; index < normalizedRows.length; index += 1) {
      const row = normalizedRows[index];
      const expectedRowNo = index + 1;
      if (row.source_row_no !== expectedRowNo) {
        throw new Error(`셀피아 행번호가 ${expectedRowNo}에서 이어지지 않습니다. 실제 값: ${row.source_row_no}`);
      }
      if (seenSku.has(row.sellpia_sku_code)) throw new Error(`중복 셀피아 SKU가 있습니다: ${row.sellpia_sku_code}`);
      seenSku.add(row.sellpia_sku_code);
    }
    if (!normalizedRows.length) throw new Error('저장할 셀피아 상품 행이 없습니다.');

    onProgress?.({percent:22, title:'DB 작업 생성 중', detail:`${normalizedRows.length.toLocaleString('ko-KR')}개 SKU를 새 스냅샷으로 준비합니다.`});
    const sourceFileName = selectedFiles.map(file => file.name).join(' | ');
    const sourceFileSize = selectedFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
    let snapshotId = null;
    try {
      const {data: snapshot, error: snapshotError} = await db
        .from('sellpia_stock_snapshots')
        .insert({
          source_file_name: sourceFileName,
          source_file_size: sourceFileSize,
          source_row_count: normalizedRows.length,
          valid_row_count: 0,
          invalid_row_count: 0,
          upload_status: 'uploading',
          uploaded_by: 'system_v1_frontend',
          metadata: {
            parser_version: 'operations-hub-sellpia-2026.08.12-v1',
            source_files: selectedFiles.map(file => ({name:file.name, size:file.size})),
            selected_fields: fields,
            row_number_min: normalizedRows[0].source_row_no,
            row_number_max: normalizedRows[normalizedRows.length - 1].source_row_no
          }
        })
        .select('snapshot_id')
        .single();
      if (snapshotError) throw snapshotError;
      snapshotId = snapshot.snapshot_id;

      const chunkSize = 500;
      for (let offset = 0; offset < normalizedRows.length; offset += chunkSize) {
        const chunk = normalizedRows.slice(offset, offset + chunkSize).map(row => ({snapshot_id:snapshotId, ...row}));
        const {error} = await db.from('sellpia_stock_snapshot_rows').insert(chunk);
        if (error) throw error;
        const loaded = Math.min(offset + chunk.length, normalizedRows.length);
        onProgress?.({
          percent: 22 + Math.round((loaded / normalizedRows.length) * 72),
          title:'셀피아 DB 저장 중',
          detail:`${loaded.toLocaleString('ko-KR')} / ${normalizedRows.length.toLocaleString('ko-KR')} SKU 저장 완료`
        });
      }

      const {error: completeError} = await db
        .from('sellpia_stock_snapshots')
        .update({
          valid_row_count: normalizedRows.length,
          invalid_row_count: 0,
          upload_status: 'ready',
          completed_at: new Date().toISOString()
        })
        .eq('snapshot_id', snapshotId);
      if (completeError) throw completeError;
      onProgress?.({percent:97, title:'매트릭스 연결 중', detail:'최신 셀피아 스냅샷을 통합 매트릭스에 반영합니다.'});
      return {snapshotId, rowCount:normalizedRows.length};
    } catch (error) {
      if (snapshotId) {
        await db.from('sellpia_stock_snapshots').update({
          upload_status:'failed',
          upload_note:String(error?.message || error).slice(0, 1000),
          completed_at:new Date().toISOString()
        }).eq('snapshot_id', snapshotId);
      }
      throw error;
    }
  }

  global.SystemV3Data = Object.freeze({
    pageSize: PAGE_SIZE,
    loadProducts,
    loadSourceStatus,
    loadTags,
    uploadSellpiaSnapshot
  });
})(window);
