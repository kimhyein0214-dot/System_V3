(function initSystemV3Data(global) {
  'use strict';

  const SUPABASE_URL = 'https://bpgvqmtsjgegnrdzmpep.supabase.co';
  const SUPABASE_KEY = 'sb_publishable__NVp6Ra227_e1TQqQE40oA_O2PVwv5C';
  const PICKING_SUPABASE_URL = 'https://vgxocngpykhlkosiaeew.supabase.co';
  const PICKING_SUPABASE_KEY = 'sb_publishable_XVnKGJo66GZiYTq5Ivu8dA_SjBVvX0g';
  const PAGE_SIZE = 50;
  const MATRIX_PAGE_SIZES = new Set([50, 100, 200]);
  const MATRIX_SELECT = 'sellpia_sku_code,own_code,image_url,display_name,smartstore_name,smartstore_option_name,smartstore_product_code,smartstore_option_code,smartstore_match_tier,smartstore_match_score,smartstore_listing_count,smartstore_name_is_draft,smartstore_sale_status,makeshop_name,makeshop_option_name,makeshop_product_code,makeshop_option_code,makeshop_match_tier,makeshop_match_score,makeshop_listing_count,makeshop_name_is_draft,makeshop_sale_status,ably_name,ably_option_name,ably_product_code,ably_option_code,ably_match_tier,ably_match_score,ably_listing_count,ably_name_is_draft,ably_sale_status,updated_at,sellpia_product_name,sellpia_option_name,sellpia_own_code,sellpia_current_stock,sellpia_available_stock,sellpia_safety_stock,sellpia_sale_price,sellpia_inventory_at,smartstore_stock,smartstore_price,smartstore_policy_price,smartstore_policy_active,smartstore_policy_name,smartstore_inventory_at,makeshop_stock,makeshop_price,makeshop_policy_price,makeshop_policy_active,makeshop_policy_name,makeshop_inventory_at,ably_stock,ably_price,ably_policy_price,ably_policy_active,ably_policy_name,ably_inventory_at,overall_status,sellpia_override_image_url,sellpia_override_updated_at,sellpia_source_sale_price,sellpia_source_stock,sellpia_source_updated_at,system_base_price,system_stock,system_price_version,system_stock_version,system_price_updated_at,system_stock_updated_at,system_updated_at';

  function normalizeConnectionStatus(status) {
    const value = cleanText(status).toLowerCase();
    if (value === 'review') return 'connected';
    if (value === 'attention') return 'unmatched';
    return ['all','connected','unmatched'].includes(value) ? value : 'all';
  }

  function normalizeConnectionConditions(filter) {
    const normalized = filter && typeof filter === 'object' ? filter : {};
    return {
      logic:String(normalized.logic || 'and').toLowerCase() === 'or' ? 'or' : 'and',
      conditions:(Array.isArray(normalized.conditions) ? normalized.conditions : []).slice(0, 12).map(condition => {
        if (condition?.field !== 'overall_status') return {...condition};
        if (normalizeConnectionStatus(condition.value) !== 'connected') return {...condition, value:'unmatched'};
        return {
          ...condition,
          operator:condition.operator === 'neq' ? 'eq' : 'neq',
          value:'unmatched'
        };
      })
    };
  }

  function requireClient() {
    if (!global.supabase?.createClient) {
      throw new Error('Supabase 클라이언트를 불러오지 못했습니다.');
    }
    return global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  const db = requireClient();
  const pickingDb = global.supabase.createClient(PICKING_SUPABASE_URL, PICKING_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const sellerParsers = global.SystemV3SellerParsers;

  function normalizedSearch(value) {
    return String(value || '').trim().replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_\-\[\]\/\s]/g, '');
  }

  function splitIntersectionSearch(value) {
    const text = normalizedSearch(value);
    const slashIndex = text.indexOf('/');
    if (slashIndex < 0) return null;
    const productTerm = text.slice(0, slashIndex).trim();
    const optionTerm = text.slice(slashIndex + 1).trim();
    return productTerm && optionTerm ? {productTerm, optionTerm} : null;
  }

  async function attachSellerDrafts(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const {data, error} = await db
      .from('operations_hub_active_seller_drafts')
      .select('change_id,sellpia_sku_code,source_channel,field_key,before_value,after_value,status,updated_at,price_base_before,price_base_after,price_discounted_base_before,price_discounted_base_after,price_option_before,price_option_after,price_final_before,price_final_after,price_discount_terms_before,price_discount_terms_after,option_price_source,price_rule_set_id')
      .in('sellpia_sku_code', skus)
      .order('updated_at', {ascending:false})
      .order('change_id', {ascending:false});
    if (error) throw error;
    const draftByKey = new Map();
    for (const draft of data || []) {
      const key = `${draft.sellpia_sku_code}|${draft.source_channel}|${draft.field_key}`;
      if (!draftByKey.has(key)) draftByKey.set(key, draft);
    }
    return products.map(product => {
      const sku = cleanText(product?.sellpia_sku_code);
      if (!sku) return product;
      const drafts = {};
      for (const source of ['smartstore','makeshop','ably']) {
        for (const fieldKey of ['sellpia_current_stock','sellpia_sale_price']) {
          const draft = draftByKey.get(`${sku}|${source}|${fieldKey}`);
          if (draft) drafts[`${source}:${fieldKey}`] = draft;
        }
      }
      return {...product, __sellerDrafts:drafts};
    });
  }

  async function attachProductProfiles(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const {data, error} = await db
      .from('operations_hub_product_profiles')
      .select('sellpia_sku_code,sellpia_product_code,material,product_group,shape,material_source,product_group_source,shape_source,classifier_version,classified_at,updated_by,updated_at,product_tags,sku_tags,tag_summary')
      .in('sellpia_sku_code', skus);
    if (error) throw error;
    const profiles = new Map((data || []).map(profile => [cleanText(profile.sellpia_sku_code), profile]));
    return products.map(product => {
      const profile = profiles.get(cleanText(product?.sellpia_sku_code));
      return profile ? {...product, __profile:profile} : product;
    });
  }

  async function attachLinkBadges(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const {data, error} = await db.rpc('get_operations_hub_sku_link_badges', {p_skus:skus});
    if (error) throw error;
    const badgesBySku = new Map();
    for (const badge of data || []) {
      const sku = cleanText(badge.sellpia_sku_code);
      if (!badgesBySku.has(sku)) badgesBySku.set(sku, {});
      badgesBySku.get(sku)[cleanText(badge.source_channel)] = badge;
    }
    return products.map(product => ({
      ...product,
      __linkBadges:badgesBySku.get(cleanText(product?.sellpia_sku_code)) || {}
    }));
  }

  async function attachLinkSuppressions(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const suppressionRows = [];
    for (let offset = 0; offset < skus.length; offset += 500) {
      const {data, error} = await db
        .from('operations_hub_link_suppressions')
        .select('source_channel,sellpia_sku_code,product_code,option_code,reason,suppressed_at')
        .in('sellpia_sku_code', skus.slice(offset, offset + 500));
      if (error) throw error;
      suppressionRows.push(...(data || []));
    }
    const bySkuSource = new Map();
    for (const suppression of suppressionRows) {
      const key = `${cleanText(suppression.sellpia_sku_code)}|${cleanText(suppression.source_channel)}`;
      if (!bySkuSource.has(key)) bySkuSource.set(key, []);
      bySkuSource.get(key).push(suppression);
    }
    const nullableSuffixes = [
      'name','option_name','product_code','option_code','match_tier','match_score',
      'sale_status','stock','price','policy_price','policy_active','policy_name','inventory_at'
    ];
    return products.map(product => {
      const projected = {...product, __linkSuppressions:{}};
      const sku = cleanText(product?.sellpia_sku_code);
      for (const source of ['smartstore','makeshop','ably']) {
        const candidates = bySkuSource.get(`${sku}|${source}`) || [];
        const productCode = cleanText(product?.[`${source}_product_code`]);
        const optionCode = cleanText(product?.[`${source}_option_code`]);
        const viewSuppressed = product?.[`${source}_link_suppressed`] === true;
        const suppression = candidates.find(item => (
          cleanText(item.product_code) === productCode
          && cleanText(item.option_code) === optionCode
        )) || (viewSuppressed ? candidates[0] : null);
        if (!suppression) continue;
        projected.__linkSuppressions[source] = suppression;
        projected[`${source}_link_suppressed`] = true;
        for (const suffix of nullableSuffixes) projected[`${source}_${suffix}`] = null;
        projected[`${source}_listing_count`] = 0;
        projected[`${source}_name_is_draft`] = false;
        if (projected.__sellerPriceComponents?.[source]) {
          projected.__sellerPriceComponents = {...projected.__sellerPriceComponents};
          delete projected.__sellerPriceComponents[source];
        }
      }
      projected.overall_status = ['smartstore','makeshop','ably'].some(source => cleanText(projected[`${source}_product_code`]))
        ? 'connected'
        : 'unmatched';
      return projected;
    });
  }

  async function attachSellerPriceComponents(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const {data, error} = await db.rpc('load_operations_hub_seller_price_components', {p_skus:skus});
    if (error) throw error;
    const bySku = new Map();
    for (const component of data || []) {
      const sku = cleanText(component.sellpia_sku_code);
      const source = cleanText(component.source_channel);
      if (!sku || !source) continue;
      if (!bySku.has(sku)) bySku.set(sku, {});
      bySku.get(sku)[source] = component;
    }
    return products.map(product => {
      const components = bySku.get(cleanText(product?.sellpia_sku_code)) || {};
      const projected = {...product, __sellerPriceComponents:components};
      for (const source of ['smartstore','makeshop','ably']) {
        const component = components[source];
        if (!component) continue;
        projected[`${source}_base_price`] = component.source_base_price;
        projected[`${source}_discounted_base_price`] = component.source_discounted_base_price;
        projected[`${source}_option_price`] = component.source_option_price;
        projected[`${source}_final_price`] = component.source_final_price;
        projected[`${source}_discount_terms`] = component.source_discount_terms || [];
        if (component.source_final_price !== null && component.source_final_price !== undefined) {
          projected[`${source}_price`] = component.source_final_price;
        }
      }
      return projected;
    });
  }

  async function attachPriceRuleAssignments(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const {data:assignments, error} = await db
      .from('operations_hub_price_rule_assignments')
      .select('source_channel,sellpia_sku_code,price_rule_set_id,updated_at')
      .eq('target_type', 'sellpia_sku')
      .eq('is_active', true)
      .in('sellpia_sku_code', skus);
    if (error) throw error;
    const ruleSetIds = [...new Set((assignments || []).map(row => Number(row.price_rule_set_id)).filter(Number.isFinite))];
    let ruleSets = [];
    if (ruleSetIds.length) {
      const result = await db
        .from('operations_hub_price_rule_sets')
        .select('price_rule_set_id,set_name,color,is_active')
        .eq('is_active', true)
        .in('price_rule_set_id', ruleSetIds);
      if (result.error) throw result.error;
      ruleSets = result.data || [];
    }
    const ruleSetById = new Map(ruleSets.map(ruleSet => [Number(ruleSet.price_rule_set_id), ruleSet]));
    const bySku = new Map();
    for (const assignment of assignments || []) {
      const sku = cleanText(assignment.sellpia_sku_code);
      const source = cleanText(assignment.source_channel);
      if (!sku || !source) continue;
      if (!bySku.has(sku)) bySku.set(sku, {});
      const ruleSet = ruleSetById.get(Number(assignment.price_rule_set_id));
      bySku.get(sku)[source] = {
        ...assignment,
        set_name:ruleSet?.set_name || `가격규칙 #${assignment.price_rule_set_id}`,
        color:ruleSet?.color || '#1558c0'
      };
    }
    return products.map(product => ({
      ...product,
      __priceRuleAssignments:bySku.get(cleanText(product?.sellpia_sku_code)) || {}
    }));
  }

  async function attachInboundCostDetails(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const details = [];
    for (let offset = 0; offset < skus.length; offset += 500) {
      const {data, error} = await db
        .from('operations_hub_inbound_cost_live')
        .select('sellpia_sku_code,sellpia_purchase_price,sellpia_order_unit,sellpia_minimum_order_unit,actual_inbound_manual_cost,inbound_cost_formula_tag_id,inbound_cost_formula_tag_name,inbound_cost_formula_tag_color,actual_inbound_cost,actual_inbound_cost_mode,actual_inbound_cost_updated_at')
        .in('sellpia_sku_code', skus.slice(offset, offset + 500));
      if (error) throw error;
      details.push(...(data || []));
    }
    const bySku = new Map(details.map(detail => [cleanText(detail.sellpia_sku_code), detail]));
    return products.map(product => ({...product, ...(bySku.get(cleanText(product?.sellpia_sku_code)) || {})}));
  }

  async function attachSystemOperationalDetails(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const details = [];
    for (let offset = 0; offset < skus.length; offset += 500) {
      const {data, error} = await db
        .from('operations_hub_sku_operational_live')
        .select('sellpia_sku_code,system_base_price,system_stock,system_price_version,system_stock_version,system_price_updated_at,system_stock_updated_at,system_updated_at')
        .in('sellpia_sku_code', skus.slice(offset, offset + 500));
      if (error) throw error;
      details.push(...(data || []));
    }
    const bySku = new Map(details.map(detail => [cleanText(detail.sellpia_sku_code), detail]));
    return products.map(product => ({
      ...product,
      sellpia_source_sale_price:product.sellpia_source_sale_price ?? product.sellpia_sale_price ?? null,
      sellpia_source_stock:product.sellpia_source_stock ?? product.sellpia_current_stock ?? null,
      sellpia_source_updated_at:product.sellpia_source_updated_at ?? product.sellpia_inventory_at ?? null,
      system_base_price:null,
      system_stock:null,
      system_price_version:0,
      system_stock_version:0,
      system_price_updated_at:null,
      system_stock_updated_at:null,
      system_updated_at:null,
      ...(bySku.get(cleanText(product?.sellpia_sku_code)) || {})
    }));
  }

  async function attachProductLinkDrafts(rows) {
    const products = Array.isArray(rows) ? rows : [];
    const skus = [...new Set(products.map(row => cleanText(row?.sellpia_sku_code)).filter(Boolean))];
    if (!skus.length) return products;
    const drafts = [];
    for (let offset = 0; offset < skus.length; offset += 500) {
      const {data, error} = await db
        .from('operations_hub_product_link_drafts')
        .select('source_channel,sellpia_sku_code,product_code,product_name,updated_at')
        .in('sellpia_sku_code', skus.slice(offset, offset + 500));
      if (error) throw error;
      drafts.push(...(data || []));
    }
    const bySku = new Map();
    for (const draft of drafts) {
      const sku = cleanText(draft.sellpia_sku_code);
      const source = cleanText(draft.source_channel);
      if (!sku || !['smartstore', 'makeshop', 'ably'].includes(source)) continue;
      if (!bySku.has(sku)) bySku.set(sku, {});
      bySku.get(sku)[source] = draft;
    }
    return products.map(product => {
      const productDrafts = bySku.get(cleanText(product?.sellpia_sku_code)) || {};
      const projected = {...product, __sellerProductLinkDrafts:productDrafts};
      for (const source of ['smartstore', 'makeshop', 'ably']) {
        const draft = productDrafts[source];
        if (!draft || cleanText(projected[`${source}_match_tier`])) continue;
        projected[`${source}_product_code`] = draft.product_code;
        projected[`${source}_name`] = draft.product_name;
        projected[`${source}_option_code`] = null;
        projected[`${source}_option_name`] = null;
      }
      return projected;
    });
  }

  async function attachProductMetadata(rows) {
    return attachLinkSuppressions(await attachPriceRuleAssignments(await attachSellerDrafts(await attachSellerPriceComponents(await attachLinkBadges(await attachProductProfiles(await attachProductLinkDrafts(await attachSystemOperationalDetails(await attachInboundCostDetails(rows)))))))));
  }

  async function loadListingGraph({source = 'all', relationType = 'complex', search = '', page = 1, pageSize = 50} = {}) {
    const {data, error} = await db.rpc('list_operations_hub_listing_graph', {
      p_source:cleanText(source) || 'all',
      p_relation_type:cleanText(relationType) || 'complex',
      p_search:cleanText(search),
      p_page:Math.max(1, Number(page) || 1),
      p_page_size:Math.max(1, Math.min(Number(pageSize) || 50, 100))
    });
    if (error) throw error;
    return {
      rows:Array.isArray(data?.rows) ? data.rows : [],
      count:Number(data?.count || 0),
      page:Number(data?.page || page || 1),
      pageSize:Number(data?.pageSize || pageSize || 50)
    };
  }

  async function saveListingComponent({source, productCode, optionCode = '', sku, qty = 1, role = 'additional'} = {}) {
    const {data, error} = await db.rpc('save_operations_hub_listing_component', {
      p_source:cleanText(source),
      p_product_code:cleanText(productCode),
      p_option_code:cleanText(optionCode),
      p_sellpia_sku_code:cleanText(sku),
      p_component_qty:Math.max(1, Math.trunc(Number(qty) || 1)),
      p_component_role:cleanText(role) || 'additional'
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function deactivateListingComponent(componentId) {
    const {data, error} = await db.rpc('deactivate_operations_hub_listing_component', {
      p_component_id:Number(componentId)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function stageListingInventoryDraft({source, productCode, optionCode = '', batchId = null} = {}) {
    const {data, error} = await db.rpc('stage_operations_hub_listing_inventory_draft', {
      p_source:cleanText(source),
      p_product_code:cleanText(productCode),
      p_option_code:cleanText(optionCode),
      p_batch_id:batchId
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function loadProducts({ page = 1, pageSize = PAGE_SIZE, search = '', searchSources = ['sellpia','smartstore','makeshop','ably'], status = 'all', sort = 'sku_asc', skus = [], codeListRows = [], advancedFilter = null } = {}) {
    status = normalizeConnectionStatus(status);
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = MATRIX_PAGE_SIZES.has(Number(pageSize)) ? Number(pageSize) : PAGE_SIZE;
    const loadPagedRpc = async (rpcName, args) => {
      const serverPageSize = Math.min(safePageSize, 100);
      const requestsPerPage = safePageSize / serverPageSize;
      const firstServerPage = ((safePage - 1) * requestsPerPage) + 1;
      const rows = [];
      let count = 0;
      for (let offset = 0; offset < requestsPerPage; offset += 1) {
        const {data, error} = await db.rpc(rpcName, {...args, p_page:firstServerPage + offset, p_page_size:serverPageSize});
        if (error) throw error;
        const pageRows = Array.isArray(data?.rows) ? data.rows : [];
        rows.push(...pageRows);
        count = Number(data?.count || count || 0);
        if (pageRows.length < serverPageSize) break;
      }
      return {rows:rows.slice(0, safePageSize), count, page:safePage, pageSize:safePageSize};
    };
    const orderedCodeRows = Array.isArray(codeListRows) ? codeListRows : [];
    if (orderedCodeRows.length) {
      const from = (safePage - 1) * safePageSize;
      const pageRows = orderedCodeRows.slice(from, from + safePageSize);
      const pageSkus = [...new Set(pageRows.map(item => cleanText(item.sellpia_sku_code)).filter(Boolean))];
      let products = [];
      if (pageSkus.length) {
        const {data, error} = await db
          .from('operations_hub_matrix_system_live')
          .select(MATRIX_SELECT)
          .in('sellpia_sku_code', pageSkus);
        if (error) throw error;
        products = data || [];
      }
      const productsBySku = new Map(products.map(product => [cleanText(product.sellpia_sku_code), product]));
      const orderedRows = pageRows.map(codeRow => {
          const product = productsBySku.get(cleanText(codeRow.sellpia_sku_code));
          return product
            ? {...product, __codeList:codeRow}
            : {sellpia_sku_code:'', __codeList:codeRow, __codeListPlaceholder:true};
        });
      return {
        rows:await attachProductMetadata(orderedRows),
        count:orderedCodeRows.length,
        page:safePage,
        pageSize:safePageSize
      };
    }
    const codeListSkus = [...new Set((skus || []).map(cleanText).filter(Boolean))];
    if (codeListSkus.length) {
      const result = await loadPagedRpc('load_operations_hub_code_list', {p_skus:codeListSkus, p_status:status, p_sort:'input_order'});
      return {
        ...result,
        rows:await attachProductMetadata(result.rows)
      };
    }
    const filterPayload = normalizeConnectionConditions(advancedFilter);
    if (filterPayload.conditions.length) {
      const result = await loadPagedRpc('load_operations_hub_matrix_filtered', {
        p_search:normalizedSearch(search),
        p_search_sources:searchSources,
        p_status:status,
        p_sort:sort,
        p_filter:filterPayload,
        p_skus:[]
      });
      return {
        ...result,
        rows:await attachProductMetadata(result.rows)
      };
    }
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    const keyword = normalizedSearch(search);
    const intersection = splitIntersectionSearch(search);
    const allowedSearchSources = ['sellpia','smartstore','makeshop','ably'];
    const activeSearchSources = [...new Set((searchSources || []).map(source => cleanText(source).toLowerCase()).filter(source => allowedSearchSources.includes(source)))];
    let query = db
      .from('operations_hub_matrix_system_live')
      .select(MATRIX_SELECT, { count: 'exact' });

    if (intersection) {
      const nameFields = {
        sellpia:['sellpia_product_name','sellpia_option_name'],
        smartstore:['smartstore_name','smartstore_option_name'],
        makeshop:['makeshop_name','makeshop_option_name'],
        ably:['ably_name','ably_option_name']
      };
      const filters = activeSearchSources.map(source => nameFields[source]).filter(Boolean).map(([productField, optionField]) =>
        `and(${productField}.ilike.*${intersection.productTerm}*,${optionField}.ilike.*${intersection.optionTerm}*)`
      );
      if (filters.length) query = query.or(filters.join(','));
      else query = query.eq('sellpia_sku_code', '__NO_SEARCH_SOURCE_SELECTED__');
    } else if (keyword) {
      const selectedSellers = activeSearchSources.filter(source => source !== 'sellpia');
      let listingMatches = [];
      if (selectedSellers.length) {
        const result = await db.rpc('find_operations_hub_listing_skus_by_sources', {
          p_query:keyword,
          p_sources:selectedSellers,
          p_limit:500
        });
        if (result.error) throw result.error;
        listingMatches = result.data || [];
      }
      const listingSkus = [...new Set((listingMatches || []).map(item => cleanText(item.sellpia_sku_code)).filter(Boolean))];
      const directSellpiaSku = activeSearchSources.includes('sellpia') && /^\d+-\d+$/.test(keyword) ? keyword : '';
      const exactMatchSkus = [...new Set([...listingSkus, directSellpiaSku].filter(Boolean))];
      if (exactMatchSkus.length) query = query.in('sellpia_sku_code', exactMatchSkus);
      else {
        const searchFields = {
          sellpia:['sellpia_sku_code','own_code','display_name','sellpia_own_code','sellpia_product_name','sellpia_option_name'],
          smartstore:['smartstore_product_code','smartstore_option_code','smartstore_name','smartstore_option_name'],
          makeshop:['makeshop_product_code','makeshop_option_code','makeshop_name','makeshop_option_name'],
          ably:['ably_product_code','ably_option_code','ably_name','ably_option_name']
        };
        const filters = activeSearchSources.flatMap(source => searchFields[source] || []).map(field => `${field}.ilike.*${keyword}*`);
        if (filters.length) query = query.or(filters.join(','));
        else query = query.eq('sellpia_sku_code', '__NO_SEARCH_SOURCE_SELECTED__');
      }
    }
    if (status === 'connected') query = query.in('overall_status', ['connected', 'review']);
    else if (status === 'unmatched') query = query.eq('overall_status', 'unmatched');

    const sortOptions = {
      sku_asc: ['sellpia_sku_code', true],
      stock_desc: ['system_stock', false],
      price_desc: ['system_base_price', false],
      updated_desc: ['updated_at', false]
    };
    const [sortColumn, ascending] = sortOptions[sort] || sortOptions.sku_asc;
    query = query.order(sortColumn, {ascending, nullsFirst:false});
    if (sortColumn !== 'sellpia_sku_code') query = query.order('sellpia_sku_code', {ascending:true});
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: await attachProductMetadata(data || []), count: count || 0, page: safePage, pageSize: safePageSize };
  }

  async function loadProductsBySkus(skus = []) {
    const normalizedSkus = [...new Set((Array.isArray(skus) ? skus : []).map(cleanText).filter(Boolean))];
    if (!normalizedSkus.length) return [];
    const rows = [];
    for (let offset = 0; offset < normalizedSkus.length; offset += 500) {
      const {data, error} = await db
        .from('operations_hub_matrix_system_live')
        .select(MATRIX_SELECT)
        .in('sellpia_sku_code', normalizedSkus.slice(offset, offset + 500));
      if (error) throw error;
      rows.push(...(data || []));
    }
    return attachProductMetadata(rows);
  }

  async function loadMatrixExportChunk({
    offset = 0,
    limit = 1000,
    search = '',
    searchSources = ['sellpia','smartstore','makeshop','ably'],
    status = 'all',
    sort = 'sku_asc',
    advancedFilter = null,
    skus = []
  } = {}) {
    const filterPayload = normalizeConnectionConditions(advancedFilter);
    const {data, error} = await db.rpc('export_operations_hub_matrix_chunk', {
      p_offset:Math.max(0, Math.trunc(Number(offset) || 0)),
      p_limit:Math.max(1, Math.min(Math.trunc(Number(limit) || 1000), 1000)),
      p_search:normalizedSearch(search),
      p_search_sources:Array.isArray(searchSources) ? searchSources : [],
      p_status:normalizeConnectionStatus(status),
      p_sort:cleanText(sort) || 'sku_asc',
      p_filter:filterPayload,
      p_skus:[...new Set((skus || []).map(cleanText).filter(Boolean))].slice(0, 1000)
    });
    if (error) throw error;
    return {
      rows:await attachLinkSuppressions(await attachSystemOperationalDetails(await attachInboundCostDetails(Array.isArray(data?.rows) ? data.rows : []))),
      offset:Number(data?.offset || offset || 0),
      limit:Number(data?.limit || limit || 1000)
    };
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
      if (!latest[event.source] && ['SOURCE_UPLOAD', 'INVENTORY_MATCH'].includes(event.event_type)) latest[event.source] = event;
    }
    return { events: data || [], latest };
  }

  async function loadDashboardMetrics() {
    const {data, error} = await db
      .from('operations_hub_dashboard_metrics')
      .select('total_sku,connected_sku,unmatched_sku,inventory_mismatch_sku,projected_inventory_mismatch_sku,inventory_draft_cells,inventory_failed_cells,latest_sync_at,today_picked,shortage_drawer_qty')
      .single();
    if (error) throw error;
    return data;
  }

  async function loadMappingSyncStatus() {
    const {data, error} = await db
      .from('operations_hub_mapping_sync_status')
      .select('official_mapping_count,manual_mapping_count,automatic_mapping_count,import_mapping_count,latest_official_mapping_at,latest_legacy_mapping_at,core_refreshed_at,core_refreshed_by,core_row_count,core_refresh_needed,latest_batch_id,latest_batch_request_id,latest_batch_origin,latest_batch_actor,latest_batch_status,latest_batch_requested_count,latest_batch_saved_count,latest_batch_failed_count,latest_batch_created_at,latest_batch_completed_at,mapping_version,legacy_auto_refresh_enabled,legacy_auto_refresh_schedule')
      .single();
    if (error) throw error;
    return data;
  }

  async function saveSellpiaChanges(changes, batchId = null, options = {}) {
    const systemChangeSource = cleanText(options?.systemChangeSource) || 'manual';
    const systemMetadata = options?.systemMetadata && typeof options.systemMetadata === 'object' && !Array.isArray(options.systemMetadata)
      ? options.systemMetadata
      : {ui:'integrated-matrix'};
    const grouped = new Map();
    for (const change of changes || []) {
      if (!change?.sku || !change?.fieldKey) continue;
      if (!grouped.has(change.sku)) grouped.set(change.sku, []);
      grouped.get(change.sku).push({
        field_key:change.fieldKey,
        before:String(change.before ?? ''),
        after:String(change.after ?? '')
      });
    }
    let savedCount = 0;
    let queuedCount = 0;
    const priceChanged = [...grouped.values()].some(items => items.some(item => item.field_key === 'sellpia_sale_price'));
    const systemRows = [];
    for (const [sku, items] of grouped) {
      const systemItems = items.filter(item => ['system_base_price','system_stock'].includes(item.field_key));
      const sourceItems = items.filter(item => !['system_base_price','system_stock'].includes(item.field_key));
      for (const item of systemItems) {
        const rawValue = cleanText(item.after);
        const {data, error} = await db.rpc('save_operations_hub_sku_operational_value', {
          p_sellpia_sku_code:sku,
          p_field_key:item.field_key,
          p_value:rawValue === '' ? null : Number(rawValue),
          p_change_source:systemChangeSource,
          p_actor:'operations-hub',
          p_metadata:systemMetadata
        });
        if (error) throw error;
        const savedRow = Array.isArray(data) ? data[0] : data;
        if (savedRow) systemRows.push(savedRow);
        savedCount += 1;
      }
      if (sourceItems.length) {
        const {data, error} = await db.rpc('apply_operations_hub_sellpia_changes', {
          p_sku:sku,
          p_changes:sourceItems,
          p_batch_id:batchId
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        savedCount += Number(result?.saved_count || sourceItems.length);
        queuedCount += Number(result?.queued_count || 0);
      }
    }
    let repricedRows = [];
    let repriceRefreshError = '';
    if (priceChanged && batchId) {
      try {
        const {data:repriced, error} = await db
          .from('operations_hub_change_queue')
          .select('sellpia_sku_code')
          .eq('change_batch_id', batchId)
          .eq('field_key', 'sellpia_sale_price')
          .in('source_channel', ['smartstore','makeshop'])
          .in('status', ['pending','validated','failed']);
        if (error) throw error;
        const repricedSkus = [...new Set((repriced || []).map(row => cleanText(row.sellpia_sku_code)).filter(Boolean))];
        if (repricedSkus.length) {
          const seeds = repricedSkus.map(sellpia_sku_code => ({sellpia_sku_code}));
          repricedRows = await attachPriceRuleAssignments(await attachSellerDrafts(await attachSellerPriceComponents(seeds)));
        }
      } catch (error) {
        // The RPC above has already committed. A metadata refresh failure must not
        // make the UI re-submit the same Sellpia edit as though the save failed.
        console.error('sellpia repriced rows refresh failed', error);
        repriceRefreshError = error?.message || String(error);
      }
    }
    return {savedCount, queuedCount, productCount:grouped.size, batchId, repricedRows, systemRows, repriceRefreshError};
  }

  async function loadListingConnection({source, productCode, optionCode = ''} = {}) {
    const {data, error} = await db.rpc('get_operations_hub_listing_graph', {
      p_source:cleanText(source),
      p_product_code:cleanText(productCode),
      p_option_code:cleanText(optionCode)
    });
    if (error) throw error;
    return data || null;
  }

  async function searchSellerItems(source, query, page = 1, pageSize = 24) {
    const safeSource = cleanText(source);
    if (!['smartstore', 'makeshop', 'ably'].includes(safeSource)) throw new Error('판매처를 확인해주세요.');
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.max(1, Math.min(Number(pageSize) || 24, 100));
    const {data, error} = await db.rpc('search_operations_hub_seller_items_v2', {
      p_source:safeSource,
      p_query:cleanText(query),
      p_page:safePage,
      p_page_size:safePageSize
    });
    if (error) throw error;
    const rows = data || [];
    return {rows, count:Number(rows[0]?.total_count || 0), page:safePage, pageSize:safePageSize};
  }

  async function loadSellerProductOptions(source, productCode) {
    const exactProductCode = cleanText(productCode);
    if (!exactProductCode) throw new Error('복사할 판매처 상품코드를 확인해주세요.');
    const options = [];
    const seen = new Set();
    const pageSize = 100;
    for (let page = 1; page <= 20; page += 1) {
      const result = await searchSellerItems(source, exactProductCode, page, pageSize);
      const rows = Array.isArray(result.rows) ? result.rows : [];
      for (const row of rows) {
        if (cleanText(row.product_code) !== exactProductCode) continue;
        const optionCode = cleanText(row.option_code);
        if (seen.has(optionCode)) continue;
        seen.add(optionCode);
        options.push(row);
      }
      if (rows.length < pageSize || rows.some(row => cleanText(row.product_code) !== exactProductCode)) break;
    }
    return options.sort((left, right) => cleanText(left.option_code).localeCompare(cleanText(right.option_code), 'ko', {numeric:true}));
  }

  async function resolveCodeEntries(entries) {
    const normalized = (entries || []).map(entry => ({
      row_no:Math.max(1, Number(entry.row_no) || 1),
      source:cleanText(entry.source),
      code:cleanText(entry.code)
    })).filter(entry => entry.code);
    if (!normalized.length) return [];
    const chunkSize = 500;
    const resolved = [];
    for (let offset = 0; offset < normalized.length; offset += chunkSize) {
      const {data, error} = await db.rpc('resolve_operations_hub_code_entries', {
        p_entries:normalized.slice(offset, offset + chunkSize)
      });
      if (error) throw error;
      resolved.push(...(data || []));
    }
    return resolved;
  }

  async function refreshListingGraphCache(skus = null) {
    const normalizedSkus = Array.isArray(skus) ? [...new Set(skus.map(cleanText).filter(Boolean))] : null;
    const {data, error} = await db.rpc('refresh_operations_hub_listing_legacy_cache', {
      p_skus:normalizedSkus?.length ? normalizedSkus : null
    });
    if (error) throw error;
    return Number(data || 0);
  }

  async function linkSellerItem({sku, source, productCode, optionCode = ''}) {
    const {data, error} = await db.rpc('link_operations_hub_seller_item_v2', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_product_code:cleanText(productCode),
      p_option_code:cleanText(optionCode)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function saveSellerListing({sku, source, productCode, optionCode = '', productName = '', optionName = '', queue = false, batchId = null}) {
    const {data, error} = await db.rpc('save_operations_hub_seller_listing', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_product_code:cleanText(productCode),
      p_option_code:cleanText(optionCode),
      p_product_name:cleanText(productName),
      p_option_name:cleanText(optionName),
      p_queue:Boolean(queue),
      p_batch_id:batchId
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function attachChangeExportAudit(rows = []) {
    const changeIds = [...new Set(rows.map(row => Number(row.change_id)).filter(Number.isFinite))];
    if (!changeIds.length) return rows;
    const {data, error} = await db
      .from('operations_hub_export_items')
      .select('change_id,status,updated_at')
      .in('change_id', changeIds)
      .in('status', ['exported','applied','cancelled']);
    if (error) throw error;
    const auditByChange = new Map();
    for (const item of data || []) {
      const changeId = Number(item.change_id);
      const audit = auditByChange.get(changeId) || {
        exported_file_count:0,
        applied_file_count:0,
        stale_file_count:0,
        latest_exported_at:null
      };
      if (item.status === 'exported') audit.exported_file_count += 1;
      else if (item.status === 'applied') audit.applied_file_count += 1;
      else if (item.status === 'cancelled') audit.stale_file_count += 1;
      if (!audit.latest_exported_at || new Date(item.updated_at) > new Date(audit.latest_exported_at)) {
        audit.latest_exported_at = item.updated_at;
      }
      auditByChange.set(changeId, audit);
    }
    return rows.map(row => {
      const audit = auditByChange.get(Number(row.change_id)) || {
        exported_file_count:0,
        applied_file_count:0,
        stale_file_count:0,
        latest_exported_at:null
      };
      return {...row, ...audit, has_exported_file:audit.exported_file_count > 0};
    });
  }

  async function loadChangeQueue({status = 'active', source = 'all', limit = 250} = {}) {
    let query = db
      .from('operations_hub_change_queue')
      .select('change_id,change_batch_id,sellpia_sku_code,field_key,before_value,after_value,target_channels,status,requested_by,requested_at,processed_at,error_message,source_channel,seller_product_code,seller_option_code,validation_errors,validated_at,retry_count,max_retry_count,last_attempt_at,next_retry_at,cancelled_at,cancelled_by,status_message,updated_at', {count:'exact'})
      .order('updated_at', {ascending:false})
      .order('change_id', {ascending:false})
      .limit(Math.max(1, Math.min(Number(limit) || 250, 500)));
    if (status === 'active') query = query.in('status', ['pending','validated','failed']);
    else if (status !== 'all') query = query.eq('status', cleanText(status));
    if (source !== 'all') query = query.contains('target_channels', [cleanText(source)]);
    const {data, error, count} = await query;
    if (error) throw error;
    return {rows:await attachChangeExportAudit(data || []), count:Number(count || 0)};
  }

  async function loadChangeQueueStats() {
    const statuses = ['pending','validated','failed','applied','saved','cancelled'];
    const counts = await Promise.all(statuses.map(async status => {
      const {error, count} = await db
        .from('operations_hub_change_queue')
        .select('change_id', {count:'exact', head:true})
        .eq('status', status);
      if (error) throw error;
      return [status, Number(count || 0)];
    }));
    const result = Object.fromEntries(counts);
    result.active = result.pending + result.validated + result.failed;
    return result;
  }

  async function loadChangeEvents(changeId) {
    const {data, error} = await db
      .from('operations_hub_change_events')
      .select('event_id,change_id,change_batch_id,event_type,from_status,to_status,message,payload,actor,created_at')
      .eq('change_id', Number(changeId))
      .order('created_at', {ascending:false})
      .order('event_id', {ascending:false})
      .limit(100);
    if (error) throw error;
    return data || [];
  }

  async function loadProductHistory(sku, {limit = 60} = {}) {
    const normalizedSku = cleanText(sku);
    if (!normalizedSku) return {changes:[], events:[], links:[]};
    const safeLimit = Math.max(10, Math.min(Number(limit) || 60, 100));
    const [changeResult, linkResult] = await Promise.all([
      db
        .from('operations_hub_change_queue')
        .select('change_id,change_batch_id,sellpia_sku_code,field_key,before_value,after_value,target_channels,status,requested_by,requested_at,processed_at,error_message,source_channel,seller_product_code,seller_option_code,validation_errors,validated_at,retry_count,status_message,updated_at')
        .eq('sellpia_sku_code', normalizedSku)
        .order('updated_at', {ascending:false})
        .order('change_id', {ascending:false})
        .limit(safeLimit),
      db
        .from('operations_hub_link_history')
        .select('link_event_id,sellpia_sku_code,source_channel,before_link,after_link,changed_by,changed_at')
        .eq('sellpia_sku_code', normalizedSku)
        .order('changed_at', {ascending:false})
        .order('link_event_id', {ascending:false})
        .limit(safeLimit)
    ]);
    if (changeResult.error) throw changeResult.error;
    if (linkResult.error) throw linkResult.error;
    const changes = changeResult.data || [];
    const changeIds = changes.map(item => Number(item.change_id)).filter(Number.isFinite);
    let events = [];
    if (changeIds.length) {
      const {data, error} = await db
        .from('operations_hub_change_events')
        .select('event_id,change_id,change_batch_id,event_type,from_status,to_status,message,payload,actor,created_at')
        .in('change_id', changeIds)
        .order('created_at', {ascending:false})
        .order('event_id', {ascending:false})
        .limit(Math.min(300, safeLimit * 5));
      if (error) throw error;
      events = data || [];
    }
    return {changes, events, links:linkResult.data || []};
  }

  async function validateChangeQueue(changeIds) {
    const {data, error} = await db.rpc('validate_operations_hub_changes', {p_change_ids:(changeIds || []).map(Number)});
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function cancelChangeQueue(changeIds, reason = '사용자 취소') {
    const {data, error} = await db.rpc('cancel_operations_hub_changes', {
      p_change_ids:(changeIds || []).map(Number),
      p_reason:cleanText(reason) || '사용자 취소'
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function retryChangeQueue(changeIds) {
    const {data, error} = await db.rpc('retry_operations_hub_changes', {p_change_ids:(changeIds || []).map(Number)});
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function saveSellerValueDraft({sku, source, fieldKey, after, batchId = null}) {
    const {data, error} = await db.rpc('save_operations_hub_seller_value_draft', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_field_key:cleanText(fieldKey),
      p_after:Number(after),
      p_batch_id:batchId
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function loadPricePolicies() {
    const {data, error} = await db
      .from('operations_hub_price_policies')
      .select('source_channel,policy_name,is_active,base_field,replace_price,modify_type,modify_value,min_price,max_price,rounding_unit,rounding_mode,source_note,updated_by,updated_at')
      .order('source_channel', {ascending:true});
    if (error) throw error;
    return Object.fromEntries((data || []).map(policy => [policy.source_channel, policy]));
  }

  async function previewPricePolicy({sku, source}) {
    const {data, error} = await db.rpc('preview_operations_hub_price_policy', {
      p_sku:cleanText(sku),
      p_source:cleanText(source)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function savePricePolicy({source, policyName, active, replacePrice, modifyType, modifyValue, minPrice, maxPrice, roundingUnit, roundingMode}) {
    const optionalNumber = value => value === '' || value === null || value === undefined ? null : Number(value);
    const {data, error} = await db.rpc('save_operations_hub_price_policy', {
      p_source:cleanText(source),
      p_policy_name:cleanText(policyName),
      p_is_active:Boolean(active),
      p_replace_price:optionalNumber(replacePrice),
      p_modify_type:cleanText(modifyType) || 'none',
      p_modify_value:Number(modifyValue || 0),
      p_min_price:optionalNumber(minPrice),
      p_max_price:optionalNumber(maxPrice),
      p_rounding_unit:Number(roundingUnit || 1),
      p_rounding_mode:cleanText(roundingMode) || 'nearest',
      p_updated_by:'operations-hub'
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function saveSellerPriceDraft({sku, source, targetBasePrice, inputMode = 'option', targetFinalPrice = null, optionPrice = null, optionPriceSource = 'original', basePriceSource = 'tag', priceRuleSetId = null, batchId = null}) {
    const {data, error} = await db.rpc('save_operations_hub_seller_price_draft_v2', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_target_base_price:Number(targetBasePrice),
      p_input_mode:cleanText(inputMode) || 'option',
      p_option_price:optionPrice === null || optionPrice === undefined || optionPrice === '' ? null : Number(optionPrice),
      p_target_final_price:targetFinalPrice === null || targetFinalPrice === undefined || targetFinalPrice === '' ? null : Number(targetFinalPrice),
      p_option_price_source:cleanText(optionPriceSource) || 'original',
      p_base_price_source:cleanText(basePriceSource) || 'tag',
      p_price_rule_set_id:priceRuleSetId ? Number(priceRuleSetId) : null,
      p_batch_id:batchId
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function saveProductLinkDraft({sku, source, productCode}) {
    const {data, error} = await db.rpc('save_operations_hub_product_link_draft', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_product_code:cleanText(productCode)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function clearProductLinkDraft({sku, source}) {
    const {data, error} = await db.rpc('clear_operations_hub_product_link_draft', {
      p_sku:cleanText(sku),
      p_source:cleanText(source)
    });
    if (error) throw error;
    return Boolean(data);
  }

  async function linkProductDraftOption({sku, source, optionCode = ''}) {
    const {data, error} = await db.rpc('link_operations_hub_product_link_draft_option', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_option_code:cleanText(optionCode)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function removeListingComponent({componentId = null, source, productCode, optionCode = '', sku} = {}) {
    const {data, error} = await db.rpc('disconnect_operations_hub_listing_component', {
      p_component_id:componentId ? Number(componentId) : null,
      p_source:cleanText(source),
      p_product_code:cleanText(productCode),
      p_option_code:cleanText(optionCode),
      p_sellpia_sku_code:cleanText(sku)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function saveSellerDiscountDraft({sku, source, discountTerms = [], inputMode = 'option', targetFinalPrice = null, optionPrice = null, batchId = null}) {
    const {data, error} = await db.rpc('save_operations_hub_seller_discount_draft', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_discount_terms:Array.isArray(discountTerms) ? discountTerms : [],
      p_input_mode:cleanText(inputMode) || 'option',
      p_option_price:optionPrice === null || optionPrice === undefined || optionPrice === '' ? null : Number(optionPrice),
      p_target_final_price:targetFinalPrice === null || targetFinalPrice === undefined || targetFinalPrice === '' ? null : Number(targetFinalPrice),
      p_batch_id:batchId
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function saveSellerProductDiscountDrafts({source, productCode, anchorSku = null, discountTerms = [], ruleCode = null}) {
    const normalizedSource = cleanText(source);
    const normalizedProductCode = cleanText(productCode);
    const sourceField = {smartstore:'smartstore_product_code',makeshop:'makeshop_product_code',ably:'ably_product_code'}[normalizedSource];
    if (!sourceField || !normalizedProductCode) throw new Error('판매처와 상품코드를 확인해주세요.');
    if (normalizedSource !== 'ably') {
      const batchId = global.crypto?.randomUUID?.() || null;
      const {data, error} = await db.rpc('save_operations_hub_seller_product_discount_draft_v2', {
        p_source:normalizedSource,
        p_product_code:normalizedProductCode,
        p_anchor_sku:cleanText(anchorSku) || null,
        p_discount_terms:Array.isArray(discountTerms) ? discountTerms : [],
        p_rule_code:ruleCode === null || ruleCode === undefined ? null : cleanText(ruleCode),
        p_batch_id:batchId
      });
      if (error) throw readableDatabaseError(error);
      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      return {
        items:rows.map(result => ({sku:cleanText(result.sellpia_sku_code), result})),
        count:rows.length,
        batchId:rows[0]?.change_batch_id || batchId,
        atomic:true
      };
    }
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const {data, error} = await db.from('operations_hub_matrix_cached').select(`sellpia_sku_code,${sourceField}`).eq(sourceField, normalizedProductCode).range(from, from + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if ((data || []).length < 1000) break;
    }
    const products = await attachSellerPriceComponents(rows);
    const batchId = global.crypto?.randomUUID?.() || `seller-discount-${Date.now()}`;
    const items = [];
    for (let offset = 0; offset < products.length; offset += 6) {
      const saved = await Promise.all(products.slice(offset, offset + 6).map(product => {
        const component = product.__sellerPriceComponents?.[normalizedSource] || {};
        return saveSellerDiscountDraft({
          sku:product.sellpia_sku_code,
          source:normalizedSource,
          discountTerms,
          inputMode:'option',
          optionPrice:component.draft_option_price ?? component.source_option_price ?? 0,
          batchId
        }).then(result => ({sku:product.sellpia_sku_code,result}));
      }));
      items.push(...saved);
    }
    return {items, count:items.length, batchId, atomic:false};
  }

  async function saveSellerProductBaseDrafts({source, productCode, targetBasePrice, basePriceSource = 'manual'}) {
    const normalizedSource = cleanText(source);
    const normalizedProductCode = cleanText(productCode);
    const sourceFields = {
      smartstore:'smartstore_product_code',
      makeshop:'makeshop_product_code',
      ably:'ably_product_code'
    };
    const sourceField = sourceFields[normalizedSource];
    if (!sourceField || !normalizedProductCode) throw new Error('판매처와 상품코드를 확인해주세요.');
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const {data, error} = await db
        .from('operations_hub_matrix_cached')
        .select(`sellpia_sku_code,${sourceField}`)
        .eq(sourceField, normalizedProductCode)
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if ((data || []).length < 1000) break;
    }
    const products = await attachSellerPriceComponents(rows);
    if (!products.length) throw new Error('같은 판매처 상품코드에 연결된 SKU를 찾지 못했습니다.');
    const batchId = global.crypto?.randomUUID?.() || `seller-base-${Date.now()}`;
    const items = [];
    const concurrency = 6;
    for (let offset = 0; offset < products.length; offset += concurrency) {
      const chunk = products.slice(offset, offset + concurrency);
      const saved = await Promise.all(chunk.map(async product => {
        const component = product.__sellerPriceComponents?.[normalizedSource] || {};
        const optionPrice = component.draft_option_price ?? component.source_option_price ?? 0;
        const result = await saveSellerPriceDraft({
          sku:product.sellpia_sku_code,
          source:normalizedSource,
          targetBasePrice:Number(targetBasePrice),
          inputMode:'option',
          optionPrice,
          optionPriceSource:component.option_price_source || 'original',
          basePriceSource:cleanText(basePriceSource) || 'manual',
          priceRuleSetId:component.price_rule_set_id || null,
          batchId
        });
        return {sku:product.sellpia_sku_code, result};
      }));
      items.push(...saved);
    }
    return {source:normalizedSource, productCode:normalizedProductCode, savedCount:items.length, items};
  }

  async function loadPriceRuleTags() {
    const {data, error} = await db
      .from('operations_hub_price_rule_tags')
      .select('price_rule_tag_id,tag_code,tag_name,color,tag_role,discount_source_channel,discount_rule_code,replace_price,modify_type,modify_value,min_price,max_price,rounding_unit,rounding_mode,is_active,note,updated_at')
      .eq('is_active', true)
      .order('price_rule_tag_id', {ascending:true});
    if (error) throw error;
    return data || [];
  }

  async function loadPriceRuleSets() {
    const {data, error} = await db
      .from('operations_hub_price_rule_set_live')
      .select('price_rule_set_id,set_code,set_name,color,note,updated_at,tags')
      .order('price_rule_set_id', {ascending:true});
    if (error) throw error;
    return data || [];
  }

  async function loadInboundCostFormulaTags() {
    const {data, error} = await db
      .from('operations_hub_inbound_cost_formula_tags')
      .select('tag_id,tag_name,tag_color,multiply_value,divide_value,add_value,rounding_unit,rounding_mode,is_active,description,updated_at')
      .eq('is_active', true)
      .order('tag_id', {ascending:true});
    if (error) throw error;
    return data || [];
  }

  async function saveInboundCostFormulaTag({tagId = null, tagName, tagColor, multiplyValue = 1, divideValue = 1, addValue = 0, roundingUnit = 1, roundingMode = 'nearest', description = ''}) {
    const payload = {
      tag_name:cleanText(tagName),
      tag_color:cleanText(tagColor) || '#7c3aed',
      multiply_value:Number(multiplyValue || 1),
      divide_value:Number(divideValue || 1),
      add_value:Number(addValue || 0),
      rounding_unit:Number(roundingUnit || 1),
      rounding_mode:cleanText(roundingMode) || 'nearest',
      description:cleanText(description) || null,
      updated_at:new Date().toISOString()
    };
    const query = tagId
      ? db.from('operations_hub_inbound_cost_formula_tags').update(payload).eq('tag_id', Number(tagId))
      : db.from('operations_hub_inbound_cost_formula_tags').insert({...payload, created_by:'operations-hub'});
    const {data, error} = await query.select('tag_id,tag_name,tag_color,multiply_value,divide_value,add_value,rounding_unit,rounding_mode,is_active,description,updated_at').single();
    if (error) throw error;
    return data;
  }

  async function deleteInboundCostFormulaTag(tagId) {
    const {count, error:assignedError} = await db
      .from('operations_hub_inbound_cost_settings')
      .select('sellpia_sku_code', {count:'exact', head:true})
      .eq('formula_tag_id', Number(tagId));
    if (assignedError) throw assignedError;
    if (Number(count || 0) > 0) throw new Error(`이 수식태그를 사용 중인 SKU가 ${Number(count).toLocaleString('ko-KR')}개 있습니다. 먼저 상품에서 태그를 해제해주세요.`);
    const {error} = await db
      .from('operations_hub_inbound_cost_formula_tags')
      .update({is_active:false, updated_at:new Date().toISOString()})
      .eq('tag_id', Number(tagId));
    if (error) throw error;
    return {tagId:Number(tagId), assignedCount:0};
  }

  async function saveInboundCost({sku, manualCost = null, formulaTagId = null}) {
    const optionalNumber = value => value === '' || value === null || value === undefined ? null : Number(value);
    const {data, error} = await db.rpc('save_operations_hub_inbound_cost', {
      p_sellpia_sku_code:cleanText(sku),
      p_manual_cost:optionalNumber(manualCost),
      p_formula_tag_id:formulaTagId ? Number(formulaTagId) : null,
      p_actor:'operations-hub'
    });
    if (error) throw error;
    return data || {};
  }

  async function savePriceRuleTag({tagId = null, tagName, color, tagRole = 'price', discountSource = null, discountRuleCode = null, replacePrice, modifyType, modifyValue, minPrice, maxPrice, roundingUnit, roundingMode, note = ''}) {
    const optionalNumber = value => value === '' || value === null || value === undefined ? null : Number(value);
    const {data, error} = await db.rpc('save_operations_hub_price_rule_tag', {
      p_tag_id:tagId ? Number(tagId) : null,
      p_tag_name:cleanText(tagName),
      p_color:cleanText(color) || '#2f6fd1',
      p_replace_price:optionalNumber(replacePrice),
      p_modify_type:cleanText(modifyType) || 'none',
      p_modify_value:Number(modifyValue || 0),
      p_min_price:optionalNumber(minPrice),
      p_max_price:optionalNumber(maxPrice),
      p_rounding_unit:Number(roundingUnit || 1),
      p_rounding_mode:cleanText(roundingMode) || 'nearest',
      p_note:cleanText(note) || null,
      p_tag_role:cleanText(tagRole) || 'price',
      p_discount_source_channel:cleanText(discountSource) || null,
      p_discount_rule_code:cleanText(discountRuleCode) || null
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function savePriceRuleSet({ruleSetId = null, setName, color, tagIds = [], note = ''}) {
    const {data, error} = await db.rpc('save_operations_hub_price_rule_set', {
      p_rule_set_id:ruleSetId ? Number(ruleSetId) : null,
      p_set_name:cleanText(setName),
      p_color:cleanText(color) || '#1558c0',
      p_tag_ids:(tagIds || []).map(Number),
      p_note:cleanText(note) || null
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function deletePriceRuleTag(tagId) {
    const {data, error} = await db.rpc('delete_operations_hub_price_rule_tag', {
      p_tag_id:Number(tagId),
      p_updated_by:'operations-hub'
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function deletePriceRuleSet(ruleSetId) {
    const {data, error} = await db.rpc('delete_operations_hub_price_rule_set', {
      p_rule_set_id:Number(ruleSetId),
      p_updated_by:'operations-hub'
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function loadPriceRuleAssignment({sku, source}) {
    const {data, error} = await db
      .from('operations_hub_price_rule_assignments')
      .select('price_rule_assignment_id,source_channel,target_type,sellpia_sku_code,price_rule_set_id,is_active,updated_at')
      .eq('target_type', 'sellpia_sku')
      .eq('sellpia_sku_code', cleanText(sku))
      .eq('source_channel', cleanText(source))
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function previewPriceRuleSet({basePrice, ruleSetId, source = null, sourceDiscountTerms = []}) {
    if (!ruleSetId) return {final_price:null, steps:[]};
    if (basePrice === null || basePrice === undefined || basePrice === '' || !Number.isFinite(Number(basePrice))) {
      throw new Error('시스템 기준가격을 먼저 저장해주세요.');
    }
    const {data, error} = source
      ? await db.rpc('calculate_operations_hub_price_rule_plan', {
        p_base_price:Number(basePrice),
        p_rule_set_id:Number(ruleSetId),
        p_source:cleanText(source),
        p_source_discount_terms:Array.isArray(sourceDiscountTerms) ? sourceDiscountTerms : []
      })
      : await db.rpc('calculate_operations_hub_price_rule_set', {
        p_base_price:Number(basePrice),
        p_rule_set_id:Number(ruleSetId)
      });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!source || !result) return result;
    return {
      ...result,
      final_price:result.gross_price,
      steps:[...(result.price_steps || []), ...(result.discount_steps || [])]
    };
  }

  async function savePriceRuleAssignment({sku, source, ruleSetId = null}) {
    const {data, error} = await db.rpc('save_operations_hub_price_rule_assignment', {
      p_sku:cleanText(sku),
      p_source:cleanText(source),
      p_rule_set_id:ruleSetId ? Number(ruleSetId) : null,
      p_updated_by:'operations-hub'
    });
    if (error) throw error;
    return Array.isArray(data) ? (data[0] || null) : data;
  }

  async function savePriceRuleAssignmentsBulk({skus = [], sources = [], ruleSetId = null}) {
    const {data, error} = await db.rpc('save_operations_hub_price_rule_assignments_bulk', {
      p_skus:[...new Set((skus || []).map(cleanText).filter(Boolean))].slice(0, 500),
      p_sources:[...new Set((sources || []).map(cleanText).filter(Boolean))],
      p_rule_set_id:ruleSetId ? Number(ruleSetId) : null,
      p_updated_by:'operations-hub'
    });
    if (error) throw error;
    return data || {};
  }

  async function stageAssignedPriceDraftsBulk({skus = [], sources = [], batchId = null}) {
    const {data, error} = await db.rpc('stage_operations_hub_assigned_price_drafts_bulk', {
      p_skus:[...new Set((skus || []).map(cleanText).filter(Boolean))].slice(0, 100),
      p_sources:[...new Set((sources || []).map(cleanText).filter(Boolean))],
      p_batch_id:batchId
    });
    if (error) throw error;
    return data || {};
  }

  async function stageSellerInventoryDrafts({sources = [], skus = [], batchId = null} = {}) {
    const {data, error} = await db.rpc('stage_operations_hub_seller_inventory_match', {
      p_sources:(sources || []).map(cleanText),
      p_skus:(skus || []).map(cleanText),
      p_batch_id:batchId
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function stageSellerInventoryDraftBatch({sources = [], skus = [], batchId = null, afterSku = null, batchSize = 500} = {}) {
    const {data, error} = await db.rpc('stage_operations_hub_seller_inventory_match_batch', {
      p_sources:(sources || []).map(cleanText),
      p_skus:(skus || []).map(cleanText),
      p_batch_id:batchId,
      p_after_sku:cleanText(afterSku) || null,
      p_batch_size:Math.max(25, Math.min(Number(batchSize) || 500, 500))
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function loadSellerDraftRows({sources = [], statuses = ['pending','validated','failed'], skus = null} = {}) {
    const selectedSources = (sources || []).map(cleanText).filter(Boolean);
    if (!selectedSources.length) return [];
    const selectedSkus = Array.isArray(skus) ? new Set(skus.map(cleanText).filter(Boolean)) : null;
    if (selectedSkus && !selectedSkus.size) return [];
    const rows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const {data, error} = await db
        .from('operations_hub_change_queue')
        .select('change_id,source_channel,sellpia_sku_code,status,field_key')
        .in('source_channel', selectedSources)
        .in('status', statuses)
        .order('change_id', {ascending:true})
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []).filter(row => !selectedSkus || selectedSkus.has(cleanText(row.sellpia_sku_code))));
      if (!data || data.length < pageSize) break;
    }
    return rows;
  }

  async function countSellerDraftsForExport(sources = [], skus = null) {
    return (await loadSellerDraftRows({sources, skus, statuses:['pending','validated','failed']})).length;
  }

  async function validateSellerDraftsForExport(sources = [], skus = null) {
    const reviewRows = await loadSellerDraftRows({sources, skus, statuses:['pending','failed']});
    for (let offset = 0; offset < reviewRows.length; offset += 300) {
      await validateChangeQueue(reviewRows.slice(offset, offset + 300).map(row => row.change_id));
    }
    const validatedRows = await loadSellerDraftRows({sources, skus, statuses:['validated']});
    return validatedRows.map(row => Number(row.change_id));
  }

  async function loadLatestSellerOriginalStatus(sources = ['smartstore','makeshop','ably']) {
    const selectedSources = (sources || []).map(cleanText).filter(Boolean);
    const {data, error} = await db
      .from('seller_inventory_snapshots')
      .select('snapshot_id,source_channel,source_file_names,source_storage_files,source_file_size,completed_at,created_at')
      .eq('upload_status', 'ready')
      .in('source_channel', selectedSources)
      .order('completed_at', {ascending:false, nullsFirst:false})
      .order('created_at', {ascending:false})
      .limit(50);
    if (error) throw error;
    const latest = new Map();
    for (const row of data || []) if (!latest.has(row.source_channel)) latest.set(row.source_channel, row);
    return selectedSources.map(source => {
      const snapshot = latest.get(source);
      const files = Array.isArray(snapshot?.source_storage_files) ? snapshot.source_storage_files : [];
      return {
        source,
        snapshotId:snapshot?.snapshot_id || null,
        completedAt:snapshot?.completed_at || snapshot?.created_at || null,
        files,
        fileNames:Array.isArray(snapshot?.source_file_names) ? snapshot.source_file_names : [],
        available:Boolean(snapshot && files.length)
      };
    });
  }

  async function downloadLatestSellerOriginals(sources = [], onProgress) {
    const statuses = await loadLatestSellerOriginalStatus(sources);
    const missing = statuses.filter(status => !status.available);
    if (missing.length) throw new Error(`${missing.map(status => status.source).join(', ')} 최신 원본 파일이 시스템에 보관되어 있지 않습니다.`);
    const filesBySource = new Map();
    const allFiles = statuses.flatMap(status => status.files.map(file => ({...file, source:status.source})));
    let completed = 0;
    for (const status of statuses) {
      const files = [];
      for (const storedFile of status.files) {
        onProgress?.({completed, total:allFiles.length, source:status.source, name:storedFile.name});
        const {data:blob, error} = await db.storage.from('seller-originals').download(storedFile.path);
        if (error) throw error;
        files.push(new File([blob], storedFile.name, {type:storedFile.type || blob.type || 'application/octet-stream'}));
        completed += 1;
      }
      filesBySource.set(status.source, files);
    }
    onProgress?.({completed, total:allFiles.length});
    return filesBySource;
  }

  async function prepareSellerExport({batchId, mode, changeIds = [], sources = []}) {
    if (cleanText(mode) !== 'change_queue') throw new Error('검토한 수정본 내보내기만 지원합니다.');
    const {data:summaryRows, error} = await db.rpc('prepare_operations_hub_change_export', {
      p_export_batch_id:batchId,
      p_change_ids:(changeIds || []).map(Number),
      p_sources:(sources || []).map(cleanText)
    });
    if (error) throw error;
    const items = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const {data, error:loadError} = await db
        .from('operations_hub_export_items')
        .select('export_item_id,export_batch_id,change_id,sellpia_sku_code,source_channel,field_key,before_value,after_value,seller_product_code,seller_option_code,source_file_name,source_row_no,expected_source_value,base_price,option_price,target_base_price,target_discounted_base_price,target_option_price,target_final_price,source_discount_terms,target_discount_terms,option_price_source,price_rule_set_id,blocking_reason,status')
        .eq('export_batch_id', batchId)
        .order('export_item_id', {ascending:true})
        .range(from, from + pageSize - 1);
      if (loadError) throw loadError;
      items.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    return {items, summary:Array.isArray(summaryRows) ? summaryRows[0] : summaryRows};
  }

  async function completeSellerExport({batchId, success, manifest = [], errorMessage = '', skippedItems = []}) {
    const {data, error} = await db.rpc('complete_operations_hub_export', {
      p_export_batch_id:batchId,
      p_success:Boolean(success),
      p_file_manifest:manifest,
      p_error_message:cleanText(errorMessage),
      p_skipped_items:(skippedItems || []).map(item => ({
        export_item_id:Number(item.export_item_id),
        reason:cleanText(item.reason)
      })).filter(item => Number.isFinite(item.export_item_id))
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function confirmChangesApplied(changeIds) {
    const {data, error} = await db.rpc('confirm_operations_hub_changes_applied', {
      p_change_ids:(changeIds || []).map(Number)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  function decodeImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({image, url});
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 파일을 읽지 못했습니다.')); };
      image.src = url;
    });
  }

  async function normalizeSellpiaImage(file) {
    if (!file?.type?.startsWith('image/')) throw new Error('이미지 파일만 올릴 수 있습니다.');
    if (file.size > 20 * 1024 * 1024) throw new Error('원본 이미지는 20MB 이하여야 합니다.');
    const {image, url} = await decodeImage(file);
    try {
      const maxDimension = 2400;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d', {alpha:false}).drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('이미지를 JPG로 변환하지 못했습니다.');
      if (blob.size > 5 * 1024 * 1024) throw new Error('변환된 이미지가 5MB를 초과합니다.');
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function uploadSellpiaImage(sku, file) {
    const safeSku = cleanText(sku);
    if (!/^[0-9A-Za-z._-]+$/.test(safeSku)) throw new Error('이미지 파일명으로 사용할 수 없는 SKU입니다.');
    const imageBlob = await normalizeSellpiaImage(file);
    const path = `sellpia/${safeSku}.jpg`;
    const {error:uploadError} = await db.storage
      .from('product-images')
      .upload(path, imageBlob, {contentType:'image/jpeg', cacheControl:'3600', upsert:true});
    if (uploadError) throw uploadError;
    const {data:saveResult, error:saveError} = await db.rpc('apply_operations_hub_sellpia_changes', {
      p_sku:safeSku,
      p_changes:[{field_key:'sellpia_image', before:'', after:path}]
    });
    if (saveError) throw saveError;
    const {data:publicData} = db.storage.from('product-images').getPublicUrl(path);
    return {
      path,
      url:`${publicData.publicUrl}?v=${Date.now()}`,
      saved:Array.isArray(saveResult) ? saveResult[0] : saveResult
    };
  }

  async function loadTags() {
    const { data, error } = await db
      .from('product_tags')
      .select('tag_id,tag_name,tag_color,tag_group,display_order,description')
      .eq('is_active', true)
      .order('tag_group')
      .order('display_order')
      .order('tag_name');
    if (error) throw error;
    return data || [];
  }

  async function ensureProductProfile(sku) {
    const {data, error} = await db.rpc('ensure_operations_hub_product_profile', {p_sku:cleanText(sku)});
    if (error) throw error;
    return data || null;
  }

  async function saveProductProfile({sku, material, productGroup, shape, productTagIds = [], skuTagIds = []}) {
    const {data, error} = await db.rpc('save_operations_hub_product_profile', {
      p_sku:cleanText(sku),
      p_material:cleanText(material),
      p_product_group:cleanText(productGroup),
      p_shape:cleanText(shape),
      p_product_tag_ids:productTagIds,
      p_sku_tag_ids:skuTagIds,
      p_updated_by:'operations-hub'
    });
    if (error) throw error;
    return data || null;
  }

  async function createProductTag({name, color = '#dbeafe', group = '운영'}) {
    const tagName = cleanText(name);
    if (!tagName) throw new Error('태그 이름을 입력해주세요.');
    const {data, error} = await db
      .from('product_tags')
      .insert({
        tag_name:tagName,
        tag_color:cleanText(color) || '#dbeafe',
        tag_group:cleanText(group) || '운영',
        created_by:'operations-hub'
      })
      .select('tag_id,tag_name,tag_color,tag_group,display_order,description')
      .single();
    if (error) throw error;
    return data;
  }

  function cleanText(value) {
    return String(value ?? '').trim();
  }

  function readableDatabaseError(error) {
    const parts = [error?.message, error?.hint, error?.details].map(cleanText).filter(Boolean);
    const readable = new Error([...new Set(parts)].join(' · ') || '데이터베이스 요청에 실패했습니다.');
    readable.code = error?.code;
    readable.cause = error;
    return readable;
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
    const readOptions = {type:'array', cellDates:false};
    if (/\.(csv|tsv|txt)$/i.test(cleanText(file.name))) readOptions.raw = true;
    const workbook = global.XLSX.read(await file.arrayBuffer(), readOptions);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet?.['!ref']) throw new Error(`${file.name}: 첫 시트에 데이터가 없습니다.`);
    const range = global.XLSX.utils.decode_range(worksheet['!ref']);
    range.s.r = 0;
    range.s.c = 0;
    range.e.c = Math.min(range.e.c, 61);
    const rows = global.XLSX.utils.sheet_to_json(worksheet, {
      header:1,
      raw:true,
      defval:null,
      blankrows:false,
      range
    });
    const header = rows[0] || [];
    const expectedHeaders = new Map([
      [0, '#'],
      [2, '상품코드'],
      [5, '상품명'],
      [26, '매입처코드'],
      [27, '매입처'],
      [28, '매입처그룹'],
      [29, '매입처주소'],
      [30, '상가명'],
      [31, '매입처전화'],
      [32, '매입상품명'],
      [33, '매입옵션명'],
      [35, '매입가'],
      [60, '발주단위'],
      [61, ['최소발주수량', '최소발주단위']]
    ]);
    const invalidHeader = [...expectedHeaders].find(([index, label]) => {
      const allowed = Array.isArray(label) ? label : [label];
      return !allowed.includes(cleanText(header[index]));
    });
    if (invalidHeader) {
      const [index, label] = invalidHeader;
      const expected = Array.isArray(label) ? label.join(' 또는 ') : label;
      throw new Error(`${file.name}: 셀피아 원본 ${global.XLSX.utils.encode_col(index)}1 헤더가 '${expected}'이 아닙니다.`);
    }
    return rows.slice(1).flatMap(row => {
      const sourceRowNo = cleanNumber(row[0]);
      const sku = cleanText(row[2]);
      if (!sourceRowNo && !sku) return [];
      if (sourceRowNo && sku && !/^\d+-\d+$/.test(sku)) {
        throw new Error(`${file.name}: ${sourceRowNo}행 SKU '${sku}' 형식이 올바르지 않습니다. CSV 날짜 자동변환 여부를 확인해 주세요.`);
      }
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
        supplier_code: cleanText(row[26]) || null,
        supplier_name: cleanText(row[27]) || null,
        supplier_group: cleanText(row[28]) || null,
        supplier_address: cleanText(row[29]) || null,
        supplier_market_name: cleanText(row[30]) || null,
        supplier_phone: cleanText(row[31]) || null,
        purchase_product_name: cleanText(row[32]) || null,
        purchase_option_name: cleanText(row[33]) || null,
        purchase_price: cleanNumber(row[35]),
        order_unit: cleanNumber(row[60]),
        minimum_order_unit: cleanNumber(row[61]),
        raw_payload: {
          base_price: salePrice,
          sell_price: salePrice,
          purchase_price: cleanNumber(row[35]),
          order_unit: cleanNumber(row[60]),
          minimum_order_unit: cleanNumber(row[61]),
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
    const uploadMode = fields.mode === 'patch' ? 'patch' : 'full';
    if (uploadMode === 'full' && selectedFiles.length !== 3) throw new Error('셀피아 전체 교체는 분할 원본 3개가 모두 필요합니다.');
    if (uploadMode === 'patch' && (selectedFiles.length < 1 || selectedFiles.length > 3)) throw new Error('셀피아 부분 갱신 파일을 1개 이상 선택해주세요.');
    const normalizedRows = [];
    for (let index = 0; index < selectedFiles.length; index += 1) {
      normalizedRows.push(...await parseSellpiaFile(selectedFiles[index], index, selectedFiles.length, onProgress));
    }
    normalizedRows.sort((a, b) => a.source_row_no - b.source_row_no);
    const seenSku = new Set();
    for (let index = 0; index < normalizedRows.length; index += 1) {
      const row = normalizedRows[index];
      const expectedRowNo = index + 1;
      if (uploadMode === 'full' && row.source_row_no !== expectedRowNo) {
        throw new Error(`셀피아 행번호가 ${expectedRowNo}에서 이어지지 않습니다. 실제 값: ${row.source_row_no}`);
      }
      if (seenSku.has(row.sellpia_sku_code)) throw new Error(`중복 셀피아 SKU가 있습니다: ${row.sellpia_sku_code}`);
      seenSku.add(row.sellpia_sku_code);
    }
    if (!normalizedRows.length) throw new Error('저장할 셀피아 상품 행이 없습니다.');

    onProgress?.({
      percent:22,
      title:'DB 작업 생성 중',
      detail:uploadMode === 'patch'
        ? `${normalizedRows.length.toLocaleString('ko-KR')}개 SKU를 기존 셀피아 원본에 부분 병합할 준비를 합니다.`
        : `${normalizedRows.length.toLocaleString('ko-KR')}개 SKU를 새 전체 스냅샷으로 준비합니다.`
    });
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
            parser_version: 'operations-hub-sellpia-2026.08.25-v4',
            source_files: selectedFiles.map(file => ({name:file.name, size:file.size})),
            selected_fields: fields,
            upload_mode: uploadMode,
            uploaded_row_count: normalizedRows.length,
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

      let finalRowCount = normalizedRows.length;
      if (uploadMode === 'patch') {
        onProgress?.({percent:95, title:'셀피아 부분 원본 병합 중', detail:'선택하지 않은 필드와 파일에 없는 SKU를 직전 전체 원본에서 유지합니다.'});
        const {data: mergeResult, error: mergeError} = await db.rpc('finalize_operations_hub_sellpia_patch', {
          p_patch_snapshot_id:snapshotId,
          p_selected_fields:{
            inventory:Boolean(fields.inventory),
            price:Boolean(fields.price),
            basic:Boolean(fields.basic),
            status:Boolean(fields.status)
          }
        });
        if (mergeError) throw mergeError;
        finalRowCount = Number(mergeResult?.row_count || normalizedRows.length);
      } else {
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
      }
      onProgress?.({percent:97, title:'매트릭스 연결 중', detail:'최신 셀피아 스냅샷을 통합 매트릭스에 반영합니다.'});
      return {
        snapshotId,
        uploadMode,
        uploadedRowCount:normalizedRows.length,
        rowCount:finalRowCount
      };
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

  async function uploadSellerSnapshot(source, files, fields = {}, onProgress) {
    if (!sellerParsers?.parseSellerFiles) throw new Error('판매처 원본 파서를 불러오지 못했습니다.');
    const selectedFiles = Array.from(files || []);
    const selectedFields = {
      inventory:Boolean(fields.inventory),
      price:Boolean(fields.price),
      discount:fields.discount === undefined ? Boolean(fields.price) : Boolean(fields.discount),
      basic:Boolean(fields.basic),
      status:Boolean(fields.status)
    };
    const uploadMode = fields.mode === 'full' ? 'full' : 'patch';
    const {normalizedRows, sourceRowCount, duplicateRowCount, parserVersion} = await sellerParsers.parseSellerFiles(
      source,
      selectedFiles,
      selectedFields,
      onProgress
    );
    const sourceFileSize = selectedFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
    let snapshotId = null;
    try {
      onProgress?.({
        percent:22,
        title:'판매처 DB 작업 생성 중',
        detail:`${normalizedRows.length.toLocaleString('ko-KR')}개 상품·옵션 키를 새 스냅샷으로 준비합니다.`
      });
      const {data:snapshot, error:snapshotError} = await db
        .from('seller_inventory_snapshots')
        .insert({
          source_channel:source,
          source_file_names:selectedFiles.map(file => file.name),
          source_file_size:sourceFileSize,
          source_row_count:sourceRowCount,
          valid_row_count:0,
          invalid_row_count:0,
          upload_status:'uploading',
          upload_mode:uploadMode,
          selected_fields:selectedFields,
          uploaded_by:'operations_hub_frontend',
          metadata:{
            parser_version:parserVersion,
            upload_mode:uploadMode,
            duplicate_row_count:duplicateRowCount,
            source_files:selectedFiles.map(file => ({name:file.name, size:file.size}))
          }
        })
        .select('snapshot_id')
        .single();
      if (snapshotError) throw snapshotError;
      snapshotId = snapshot.snapshot_id;

      const storageFiles = [];
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        const extension = file.name.includes('.') ? `.${file.name.split('.').pop().toLowerCase().replace(/[^0-9a-z]/g, '')}` : '';
        const path = `${source}/${snapshotId}/${String(index + 1).padStart(2, '0')}${extension}`;
        onProgress?.({
          percent:23 + Math.round(((index + 1) / selectedFiles.length) * 3),
          title:'원본 백업 중',
          detail:`${file.name} 파일을 최신 원본 보관소에 저장합니다.`
        });
        const {error:storageError} = await db.storage
          .from('seller-originals')
          .upload(path, file, {contentType:file.type || 'application/octet-stream', cacheControl:'3600', upsert:false});
        if (storageError) throw storageError;
        storageFiles.push({name:file.name, path, size:Number(file.size || 0), type:file.type || 'application/octet-stream'});
      }
      const {error:storageRecordError} = await db
        .from('seller_inventory_snapshots')
        .update({source_storage_files:storageFiles})
        .eq('snapshot_id', snapshotId);
      if (storageRecordError) throw storageRecordError;

      const chunkSize = 400;
      for (let offset = 0; offset < normalizedRows.length; offset += chunkSize) {
        const chunk = normalizedRows.slice(offset, offset + chunkSize).map(row => ({snapshot_id:snapshotId, ...row}));
        const {error} = await db.from('seller_inventory_snapshot_rows').insert(chunk);
        if (error) throw error;
        const loaded = Math.min(offset + chunk.length, normalizedRows.length);
        onProgress?.({
          percent:22 + Math.round((loaded / normalizedRows.length) * 70),
          title:'판매처 DB 저장 중',
          detail:`${loaded.toLocaleString('ko-KR')} / ${normalizedRows.length.toLocaleString('ko-KR')} 상품·옵션 저장 완료`
        });
      }

      onProgress?.({
        percent:94,
        title:uploadMode === 'patch' ? '부분 원본 병합 중' : '선택 필드 병합 중',
        detail:uploadMode === 'patch'
          ? '파일에 없는 판매처 상품·옵션은 이전 최신 원본에서 그대로 보존합니다.'
          : '파일에 없는 판매처 상품·옵션은 최신 원본에서 제외하고, 선택하지 않은 필드만 보존합니다.'
      });
      const {data:finalizedRows, error:finalizeError} = await db.rpc('finalize_seller_inventory_snapshot', {p_snapshot_id:snapshotId});
      if (finalizeError) throw finalizeError;
      const finalized = Array.isArray(finalizedRows) ? finalizedRows[0] : finalizedRows;
      onProgress?.({percent:97, title:'매트릭스 연결 중', detail:'최신 판매처 재고·가격을 통합 매트릭스에 반영합니다.'});
      return {
        snapshotId,
        source,
        uploadMode,
        uploadedRowCount:normalizedRows.length,
        rowCount:Number(finalized?.row_count || normalizedRows.length)
      };
    } catch (error) {
      if (snapshotId) {
        await db.from('seller_inventory_snapshots').update({
          upload_status:'failed',
          upload_note:String(error?.message || error).slice(0, 1000),
          completed_at:new Date().toISOString()
        }).eq('snapshot_id', snapshotId);
      }
      throw error;
    }
  }

  function normalizeSurveyHeader(value) {
    return cleanText(value).toLowerCase().replace(/[\s_\-./()[\]{}]+/g, '');
  }

  function findSurveyColumn(header, aliases) {
    const normalized = header.map(normalizeSurveyHeader);
    return normalized.findIndex(value => aliases.includes(value));
  }

  async function parseInventorySurveyFile(file, onProgress) {
    if (!global.XLSX) throw new Error('XLSX 파일 해석 모듈을 불러오지 못했습니다.');
    onProgress?.({percent:5, title:'재고조사 파일 읽는 중', detail:`${file.name}의 헤더와 수량을 확인합니다.`});
    const workbook = global.XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:false});
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet?.['!ref']) throw new Error('첫 번째 시트에 데이터가 없습니다.');
    const rows = global.XLSX.utils.sheet_to_json(worksheet, {header:1, raw:false, defval:'', blankrows:false});
    const skuAliases = ['셀피아sku','셀피아상품코드','상품코드','품목코드','sku'];
    const ownCodeAliases = ['자사코드','자체상품코드','자사상품코드','관리코드'];
    const quantityAliases = ['조사수량','실사수량','실재고수량','실재고','재고수량','수량'];
    let headerRowIndex = -1;
    let skuIndex = -1;
    let ownCodeIndex = -1;
    let quantityIndex = -1;
    for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
      const header = rows[index] || [];
      const nextSkuIndex = findSurveyColumn(header, skuAliases);
      const nextQuantityIndex = findSurveyColumn(header, quantityAliases);
      if (nextSkuIndex >= 0 && nextQuantityIndex >= 0) {
        headerRowIndex = index;
        skuIndex = nextSkuIndex;
        quantityIndex = nextQuantityIndex;
        ownCodeIndex = findSurveyColumn(header, ownCodeAliases);
        break;
      }
    }
    if (headerRowIndex < 0) {
      throw new Error('셀피아 SKU와 조사수량 헤더를 찾지 못했습니다. 헤더명을 확인해주세요.');
    }
    const normalizedRows = [];
    const seen = new Set();
    for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
      const row = rows[index] || [];
      const sku = cleanText(row[skuIndex]);
      const rawQuantity = cleanText(row[quantityIndex]);
      if (!sku && !rawQuantity) continue;
      if (!sku) throw new Error(`${index + 1}행의 셀피아 SKU가 비어 있습니다.`);
      const countedQty = cleanNumber(rawQuantity);
      if (!Number.isInteger(countedQty) || countedQty < 0) {
        throw new Error(`${index + 1}행 ${sku}의 조사수량이 0 이상의 정수가 아닙니다.`);
      }
      if (seen.has(sku)) throw new Error(`중복 셀피아 SKU가 있습니다: ${sku}`);
      seen.add(sku);
      normalizedRows.push({
        sellpia_sku_code:sku,
        own_code:ownCodeIndex >= 0 ? cleanText(row[ownCodeIndex]) || null : null,
        counted_qty:countedQty,
        source_row_no:index + 1,
        raw_payload:{source_file_name:file.name}
      });
    }
    if (!normalizedRows.length) throw new Error('저장할 재고조사 행이 없습니다.');
    return {rows:normalizedRows, headerRowNo:headerRowIndex + 1};
  }

  async function uploadInventorySurvey(file, onProgress) {
    if (!file) throw new Error('재고조사 파일 1개를 선택해주세요.');
    const parsed = await parseInventorySurveyFile(file, onProgress);
    let snapshotId = null;
    try {
      const {data:snapshot, error:snapshotError} = await db
        .from('operations_hub_inventory_survey_snapshots')
        .insert({
          source_file_name:file.name,
          source_file_size:Number(file.size || 0),
          source_row_count:parsed.rows.length,
          valid_row_count:0,
          upload_status:'uploading',
          uploaded_by:'operations_hub_frontend',
          metadata:{parser_version:'inventory-survey-2026.08.20-v1', header_row_no:parsed.headerRowNo}
        })
        .select('snapshot_id')
        .single();
      if (snapshotError) throw snapshotError;
      snapshotId = snapshot.snapshot_id;
      const chunkSize = 500;
      for (let offset = 0; offset < parsed.rows.length; offset += chunkSize) {
        const chunk = parsed.rows.slice(offset, offset + chunkSize).map(row => ({snapshot_id:snapshotId, ...row}));
        const {error} = await db.from('operations_hub_inventory_survey_rows').insert(chunk);
        if (error) throw error;
        const loaded = Math.min(offset + chunk.length, parsed.rows.length);
        onProgress?.({
          percent:15 + Math.round((loaded / parsed.rows.length) * 80),
          title:'재고조사 DB 저장 중',
          detail:`${loaded.toLocaleString('ko-KR')} / ${parsed.rows.length.toLocaleString('ko-KR')} SKU 저장 완료`
        });
      }
      const completedAt = new Date().toISOString();
      const {error:completeError} = await db
        .from('operations_hub_inventory_survey_snapshots')
        .update({valid_row_count:parsed.rows.length, upload_status:'ready', completed_at:completedAt})
        .eq('snapshot_id', snapshotId);
      if (completeError) throw completeError;
      onProgress?.({percent:100, title:'재고조사 업로드 완료', detail:'피킹·미송서랍 수량과 결합할 준비가 끝났습니다.'});
      return {snapshotId, rowCount:parsed.rows.length};
    } catch (error) {
      if (snapshotId) {
        await db.from('operations_hub_inventory_survey_snapshots').update({
          upload_status:'failed',
          upload_note:String(error?.message || error).slice(0, 1000),
          completed_at:new Date().toISOString()
        }).eq('snapshot_id', snapshotId);
      }
      throw error;
    }
  }

  async function loadSellpiaMatrixSyncStatus() {
    const {data, error} = await db
      .from('operations_hub_sellpia_matrix_sync_status')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function waitForSellpiaMatrixRebuild(snapshotId, onProgress, options = {}) {
    const expectedSnapshotId = cleanText(snapshotId);
    if (!expectedSnapshotId) throw new Error('재구성할 셀피아 스냅샷 ID가 없습니다.');
    const timeoutMs = Math.max(30000, Number(options.timeoutMs) || 150000);
    const pollMs = Math.max(1000, Number(options.pollMs) || 2000);
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const status = await loadSellpiaMatrixSyncStatus();
      if (cleanText(status?.matrix_snapshot_id) === expectedSnapshotId && !status?.rebuild_pending) {
        onProgress?.({
          percent:99,
          title:'매트릭스 전체 재구성 완료',
          detail:`최신 셀피아 ${Number(status?.matrix_row_count || 0).toLocaleString('ko-KR')}개 SKU 기준으로 재구성했습니다.`
        });
        return status;
      }
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      onProgress?.({
        percent:98,
        title:'매트릭스 전체 재구성 중',
        detail:`최신 셀피아 SKU로 행을 교체하고 저장된 매칭코드를 다시 연결하는 중입니다. ${elapsedSeconds}초 경과`
      });
      await new Promise(resolve => global.setTimeout(resolve, pollMs));
    }
    throw new Error('셀피아 업로드는 완료됐지만 매트릭스 재구성이 아직 대기 중입니다. 잠시 후 DB 새로고침을 눌러주세요.');
  }

  async function loadLatestInventorySurveyRows() {
    const {data:snapshot, error:snapshotError} = await db
      .from('operations_hub_inventory_survey_snapshots')
      .select('snapshot_id,survey_date,source_file_name,valid_row_count,completed_at')
      .eq('upload_status', 'ready')
      .order('completed_at', {ascending:false})
      .order('created_at', {ascending:false})
      .limit(1)
      .maybeSingle();
    if (snapshotError) throw snapshotError;
    if (!snapshot) return {snapshot:null, rows:[]};
    const rows = [];
    const chunkSize = 1000;
    for (let offset = 0; ; offset += chunkSize) {
      const {data, error} = await db
        .from('operations_hub_inventory_survey_rows')
        .select('sellpia_sku_code,own_code,counted_qty,source_row_no')
        .eq('snapshot_id', snapshot.snapshot_id)
        .order('source_row_no', {ascending:true})
        .range(offset, offset + chunkSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < chunkSize) break;
    }
    return {snapshot, rows};
  }

  async function loadPickingInventoryActivity() {
    const {data, error} = await pickingDb.rpc('get_system_v3_inventory_activity');
    if (error) throw error;
    return data || [];
  }

  async function loadInventorySurveyData() {
    const [{snapshot, rows}, activityRows] = await Promise.all([
      loadLatestInventorySurveyRows(),
      loadPickingInventoryActivity()
    ]);
    const activityBySku = new Map(activityRows.map(row => [cleanText(row.sellpia_sku_code), row]));
    const joinedRows = rows.map(row => {
      const activity = activityBySku.get(cleanText(row.sellpia_sku_code));
      const pickedQty = Number(activity?.picked_qty || 0);
      const drawerQty = Number(activity?.shortage_drawer_qty || 0);
      const countedQty = Number(row.counted_qty || 0);
      return {
        ...row,
        picked_qty:pickedQty,
        shortage_drawer_qty:drawerQty,
        actual_stock:countedQty + pickedQty + drawerQty,
        last_event_at:activity?.last_event_at || null,
        activity_date:activity?.activity_date || null
      };
    });
    const activityRefreshedAt = activityRows.reduce((latest, row) => {
      const value = row.refreshed_at || '';
      return value > latest ? value : latest;
    }, '');
    return {snapshot, rows:joinedRows, activityRefreshedAt};
  }

  global.SystemV3Data = Object.freeze({
    pageSize: PAGE_SIZE,
    loadProducts,
    loadProductsBySkus,
    loadMatrixExportChunk,
    loadListingGraph,
    loadListingConnection,
    saveListingComponent,
    deactivateListingComponent,
    removeListingComponent,
    stageListingInventoryDraft,
    loadDashboardMetrics,
    loadMappingSyncStatus,
    loadSourceStatus,
    loadTags,
    ensureProductProfile,
    saveProductProfile,
    createProductTag,
    saveSellpiaChanges,
    searchSellerItems,
    loadSellerProductOptions,
    resolveCodeEntries,
    refreshListingGraphCache,
    linkSellerItem,
    saveProductLinkDraft,
    clearProductLinkDraft,
    linkProductDraftOption,
    saveSellerListing,
    loadChangeQueue,
    loadChangeQueueStats,
    loadChangeEvents,
    loadProductHistory,
    validateChangeQueue,
    cancelChangeQueue,
    retryChangeQueue,
    saveSellerValueDraft,
    saveSellerPriceDraft,
    saveSellerDiscountDraft,
    saveSellerProductDiscountDrafts,
    saveSellerProductBaseDrafts,
    loadPricePolicies,
    previewPricePolicy,
    savePricePolicy,
    loadPriceRuleTags,
    loadPriceRuleSets,
    loadInboundCostFormulaTags,
    saveInboundCostFormulaTag,
    deleteInboundCostFormulaTag,
    saveInboundCost,
    savePriceRuleTag,
    savePriceRuleSet,
    deletePriceRuleTag,
    deletePriceRuleSet,
    loadPriceRuleAssignment,
    previewPriceRuleSet,
    savePriceRuleAssignment,
    savePriceRuleAssignmentsBulk,
    stageAssignedPriceDraftsBulk,
    stageSellerInventoryDrafts,
    stageSellerInventoryDraftBatch,
    countSellerDraftsForExport,
    validateSellerDraftsForExport,
    loadLatestSellerOriginalStatus,
    downloadLatestSellerOriginals,
    prepareSellerExport,
    completeSellerExport,
    confirmChangesApplied,
    uploadSellpiaImage,
    uploadSellpiaSnapshot,
    loadSellpiaMatrixSyncStatus,
    waitForSellpiaMatrixRebuild,
    uploadSellerSnapshot,
    uploadInventorySurvey,
    loadInventorySurveyData
  });
})(window);
