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

  async function loadProducts({ page = 1, search = '' } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const keyword = normalizedSearch(search);
    let query = db
      .from('operations_hub_matrix')
      .select('sellpia_sku_code,own_code,image_url,display_name,smartstore_name,smartstore_product_code,smartstore_option_code,smartstore_match_tier,smartstore_match_score,smartstore_listing_count,makeshop_name,makeshop_product_code,makeshop_option_code,makeshop_match_tier,makeshop_match_score,makeshop_listing_count,ably_name,ably_product_code,ably_option_code,ably_match_tier,ably_match_score,ably_listing_count,updated_at', { count: 'exact' })
      .order('sellpia_sku_code', { ascending: true })
      .range(from, to);

    if (keyword) {
      query = query.or(`sellpia_sku_code.ilike.*${keyword}*,own_code.ilike.*${keyword}*,display_name.ilike.*${keyword}*`);
    }

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

  global.SystemV3Data = Object.freeze({
    pageSize: PAGE_SIZE,
    loadProducts,
    loadSourceStatus,
    loadTags
  });
})(window);
