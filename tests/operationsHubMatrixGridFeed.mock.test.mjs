import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const service=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const app=fs.readFileSync('mockups/operations-hub/app.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260920143340_hub_matrix_grid_feed_v2.sql','utf8');
const jsonChunkFix=fs.readFileSync('supabase/migrations/20260920144902_fix_hub_matrix_grid_feed_v2_json_chunks.sql','utf8');
const compactV3=fs.readFileSync('supabase/migrations/20260920151322_hub_matrix_grid_feed_v3.sql','utf8');

function functionArgumentCounts(sql,functionName){
  const counts=[];
  const needle=`${functionName}(`;
  for(let start=sql.indexOf(needle);start>=0;start=sql.indexOf(needle,start+1)){
    let cursor=start+needle.length;
    let depth=1;
    let quoted=false;
    let count=1;
    for(;cursor<sql.length&&depth;cursor+=1){
      const char=sql[cursor];
      if(quoted){
        if(char==="'"){
          if(sql[cursor+1]==="'")cursor+=1;
          else quoted=false;
        }
        continue;
      }
      if(char==="'"){quoted=true;continue;}
      if(char==='(')depth+=1;
      else if(char===')')depth-=1;
      else if(char===','&&depth===1)count+=1;
    }
    counts.push(count);
  }
  return counts;
}

function gridLoaderContext(responses){
  const calls=[];
  const context={
    console,
    setTimeout:(callback)=>{queueMicrotask(callback);return 1;},
    clearTimeout:()=>{},
    performance:{now:(()=>{let n=0;return()=>++n;})()},
    fullMatrixReadContext:null,
    matrixReadMetrics:{requests:0,bytes:0,networkMs:0},
    cleanText:value=>String(value??'').trim(),
    throwIfAborted:signal=>{if(signal?.aborted)throw Error('aborted');},
    withAbortSignal:query=>query,
    requireOperationsHubSessionToken:()=> 'operator-session',
    readableDatabaseError:error=>Error(error.message||String(error)),
    db:{rpc:async(name,args)=>{calls.push({name,args});const next=responses.shift();return next instanceof Error?{error:{message:next.message}}:{data:next,error:null};}}
  };
  vm.createContext(context);
  const start=service.indexOf('  function normalizeMatrixGridRow');
  const end=service.indexOf('  async function loadFullMatrixDataset',start);
  vm.runInContext(service.slice(start,end)+'\nthis.loadMatrixGridDataset=loadMatrixGridDataset;this.normalizeMatrixGridRow=normalizeMatrixGridRow;',context);
  return {context,calls};
}

test('grid feed v2 separates manifest, enforces one cache version, and remains read-only',()=>{
  assert.match(migration,/hub_matrix_grid_manifest_v2/);
  assert.match(migration,/hub_matrix_grid_feed_v2/);
  assert.match(migration,/require_operations_hub_operator_session\(p_session_token\)/);
  assert.match(migration,/sellpia_sku_code > p_after_sku/);
  assert.match(migration,/order by cache\.sellpia_sku_code[\s\S]*?limit p_limit \+ 1/);
  assert.match(migration,/p_limit not between 250 and 5000/);
  assert.match(migration,/v_current_version is distinct from p_dataset_version/);
  assert.doesNotMatch(migration,/cache\.profile_json|cache\.seller_drafts_json/);
  assert.doesNotMatch(migration,/\b(insert|update|delete|merge|truncate)\b/i);
});

test('grid feed row projection stays below PostgreSQL function argument limit',()=>{
  const argumentCounts=functionArgumentCounts(jsonChunkFix,'jsonb_build_object');
  assert.ok(argumentCounts.length>10);
  assert.ok(Math.max(...argumentCounts)<=100,`jsonb_build_object max arguments: ${Math.max(...argumentCounts)}`);
  assert.match(jsonChunkFix,/\)\s*\|\| jsonb_build_object\([\s\S]*?\)\s*\|\| jsonb_build_object\(/);
  assert.doesNotMatch(jsonChunkFix,/\b(insert|update|delete|merge|truncate)\b/i);
});

test('grid feed v3 is additive, read-only, sparse, and keeps the session boundary',()=>{
  assert.match(compactV3,/hub_matrix_grid_manifest_v3/);
  assert.match(compactV3,/hub_matrix_grid_feed_v3/);
  assert.match(compactV3,/require_operations_hub_operator_session\(p_session_token\)/);
  assert.match(compactV3,/sellpia_sku_code > p_after_sku/);
  assert.match(compactV3,/jsonb_strip_nulls/);
  assert.match(compactV3,/tag_catalog/);
  assert.doesNotMatch(compactV3,/__sellerDrafts|__linkSuppressions|activeOutputRules|generationId|calculatedAt/);
  assert.doesNotMatch(compactV3,/\b(insert|update|delete|merge|truncate)\b/i);
});

test('grid loader completes manifest plus keyset pages and rechecks the manifest',async()=>{
  const {context,calls}=gridLoaderContext([
    {contract_version:3,total:3,dataset_version:'2026-09-20T00:00:00Z',recommended_chunk_size:2000,max_chunk_size:4000,tag_catalog:{}},
    {contract_version:3,rows:[{sellpia_sku_code:'1-1'},{sellpia_sku_code:'1-2'}],loaded:2,next_sku:'1-2',has_more:true,dataset_version:'2026-09-20T00:00:00Z',server_ms:3,payload_bytes:100},
    {contract_version:3,rows:[{sellpia_sku_code:'2-1'}],loaded:1,next_sku:null,has_more:false,dataset_version:'2026-09-20T00:00:00Z',server_ms:2,payload_bytes:50},
    {contract_version:3,total:3,dataset_version:'2026-09-20T00:00:00Z'}
  ]);
  const result=await context.loadMatrixGridDataset({chunkSize:3000});
  assert.equal(result.count,3);
  assert.equal(JSON.stringify(result.rows.map(row=>row.sellpia_sku_code)),JSON.stringify(['1-1','1-2','2-1']));
  assert.equal(JSON.stringify(calls.map(call=>call.name)),JSON.stringify(['hub_matrix_grid_manifest_v3','hub_matrix_grid_feed_v3','hub_matrix_grid_feed_v3','hub_matrix_grid_manifest_v3']));
  assert.equal(calls[1].args.p_after_sku,null);
  assert.equal(calls[2].args.p_after_sku,'1-2');
  assert.equal(calls[1].args.p_dataset_version,'2026-09-20T00:00:00Z');
  assert.equal(result.metrics.mode,'grid-feed-v3');
  assert.equal(result.metrics.pageDiagnostics.length,2);
  assert.equal(typeof result.metrics.pageDiagnostics[0].normalizeMs,'number');
});

test('grid loader rejects duplicates, manifest drift, and stalled cursors',async()=>{
  const manifest={contract_version:3,total:2,dataset_version:'2026-09-20T00:00:00Z',recommended_chunk_size:2000,max_chunk_size:4000,tag_catalog:{}};
  let fixture=gridLoaderContext([manifest,{contract_version:3,rows:[{sellpia_sku_code:'1'}],loaded:1,next_sku:'1',has_more:true,dataset_version:manifest.dataset_version},{contract_version:3,rows:[{sellpia_sku_code:'1'}],loaded:1,has_more:false,dataset_version:manifest.dataset_version}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/중복/);
  fixture=gridLoaderContext([manifest,{contract_version:3,rows:[{sellpia_sku_code:'1'}],loaded:1,next_sku:'1',has_more:true,dataset_version:manifest.dataset_version},{contract_version:3,rows:[{sellpia_sku_code:'2'}],loaded:1,has_more:false,dataset_version:'2026-09-20T00:01:00Z'}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/cache가 변경/);
  fixture=gridLoaderContext([{...manifest,total:1},{contract_version:3,rows:[],loaded:0,next_sku:'1',has_more:true,dataset_version:manifest.dataset_version}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/cursor가 진행/);
});

test('grid loader retries only the failed page and never restarts the dataset',async()=>{
  const version='2026-09-20T00:00:00Z';
  const fixture=gridLoaderContext([
    {contract_version:3,total:1,dataset_version:version,recommended_chunk_size:2000,max_chunk_size:4000,tag_catalog:{}},
    new Error('canceling statement due to statement timeout'),
    {contract_version:3,rows:[{sellpia_sku_code:'1'}],loaded:1,has_more:false,dataset_version:version,server_ms:2},
    {contract_version:3,total:1,dataset_version:version}
  ]);
  const result=await fixture.context.loadMatrixGridDataset();
  assert.equal(result.count,1);
  assert.equal(fixture.calls.filter(call=>call.name==='hub_matrix_grid_feed_v3').length,2);
  assert.equal(fixture.calls.filter(call=>call.name==='hub_matrix_grid_manifest_v3').length,2);
  assert.equal(result.metrics.pageDiagnostics[0].retries,1);
});

test('grid v3 compact row restores the existing renderer contract',()=>{
  const fixture=gridLoaderContext([]);
  const row=fixture.context.normalizeMatrixGridRow({
    sellpia_sku_code:'5566-1',sellpia_own_code:'OWN',smartstore_product_code:'P',smartstore_listing_count:2,
    __grid_meta:{
      profile:{product_code:'5566',product_tag_ids:['T1'],sku_tag_ids:['T2']},
      drafts:{'smartstore:sellpia_sale_price':{id:'D',status:'pending',b:4000,d:2000,o:0,f:2000}},
      seller_prices:{smartstore:{b:2800,d:2800,o:0,f:2800}},
      rule_prices:{smartstore:{b:4000,d:2000,o:0,f:2000,n:['가격 Rule']}},
      internal_prices:{calculated_base_price:{v:59000,n:['2.2배'],t:['T2']}},
      link_badges:{smartstore:{max:2,relation:'bundle'}}
    }
  },{T1:{name:'상품 태그',color:'#111',group:'일반'},T2:{name:'2.2배',color:'#222',group:'수식'}});
  assert.equal(row.__profile.product_tags[0].tag_name,'상품 태그');
  assert.equal(row.__profile.sku_tags[0].tag_name,'2.2배');
  assert.equal(row.__sellerDrafts['smartstore:sellpia_sale_price'].price_base_after,4000);
  assert.equal(row.__sellerPriceComponents.smartstore.source_final_price,2800);
  assert.equal(row.__hubRulePrices.smartstore.platformFinal,2000);
  assert.equal(row.__hubActivePriceRules.smartstore,true);
  assert.equal(row.__hubInternalPrices.calculated_base_price.activeOutputRules[0].tag_id,'T2');
  assert.equal(row.__linkBadges.smartstore.relation_type,'bundle');
  assert.equal(row.__grid_meta,undefined);
});

test('programming and contract errors do not retry',async()=>{
  const fixture=gridLoaderContext([new Error('cannot pass more than 100 arguments to a function')]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/100 arguments/);
  assert.equal(fixture.calls.length,1);
});

test('frontend uses Grid feed without automatic legacy load amplification and lazily hydrates drawer detail',()=>{
  assert.match(app,/hasOwnProperty\.call\(liveData,'loadMatrixGridDataset'\)[\s\S]*?liveData\.loadMatrixGridDataset\(\{onProgress:progress\}\)/);
  assert.doesNotMatch(app,/Grid feed 실패 · 기존 전체 조회로 안전 전환/);
  assert.match(app,/legacy fallback is disabled/);
  assert.match(app,/forceLegacy[\s\S]*?loadFullMatrixDataset/);
  assert.match(app,/if\(liveData\.loadFullMatrixDataset\)[\s\S]*?mode:'legacy-capability'/);
  assert.match(app,/liveProduct\.__grid_compact[\s\S]*?loadProductsBySkus\(\[selectedSku\]\)[\s\S]*?matrixDataset\.patch\(\[details\[0\]\]\)/);
  assert.match(app,/if\(matrixFullLoad\)\{await matrixFullLoad;fullReload=false;\}/);
});
