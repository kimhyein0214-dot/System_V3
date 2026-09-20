import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const service=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const app=fs.readFileSync('mockups/operations-hub/app.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260920143340_hub_matrix_grid_feed_v2.sql','utf8');

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
  vm.runInContext(service.slice(start,end)+'\nthis.loadMatrixGridDataset=loadMatrixGridDataset;',context);
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

test('grid loader completes manifest plus keyset pages and rechecks the manifest',async()=>{
  const {context,calls}=gridLoaderContext([
    {total:3,dataset_version:'2026-09-20T00:00:00Z',recommended_chunk_size:3000,max_chunk_size:5000},
    {rows:[{sellpia_sku_code:'1-1',__profile:{sku_tags:[{tag_id:'T'}]}},{sellpia_sku_code:'1-2'}],loaded:2,next_sku:'1-2',has_more:true,dataset_version:'2026-09-20T00:00:00Z',server_ms:3,payload_bytes:100},
    {rows:[{sellpia_sku_code:'2-1'}],loaded:1,next_sku:null,has_more:false,dataset_version:'2026-09-20T00:00:00Z',server_ms:2,payload_bytes:50},
    {total:3,dataset_version:'2026-09-20T00:00:00Z'}
  ]);
  const result=await context.loadMatrixGridDataset({chunkSize:3000});
  assert.equal(result.count,3);
  assert.equal(JSON.stringify(result.rows.map(row=>row.sellpia_sku_code)),JSON.stringify(['1-1','1-2','2-1']));
  assert.equal(JSON.stringify(calls.map(call=>call.name)),JSON.stringify(['hub_matrix_grid_manifest_v2','hub_matrix_grid_feed_v2','hub_matrix_grid_feed_v2','hub_matrix_grid_manifest_v2']));
  assert.equal(calls[1].args.p_after_sku,null);
  assert.equal(calls[2].args.p_after_sku,'1-2');
  assert.equal(calls[1].args.p_dataset_version,'2026-09-20T00:00:00Z');
  assert.equal(result.metrics.mode,'grid-feed-v2');
  assert.equal(result.metrics.pageDiagnostics.length,2);
  assert.equal(typeof result.metrics.pageDiagnostics[0].normalizeMs,'number');
});

test('grid loader rejects duplicates, manifest drift, and stalled cursors',async()=>{
  const manifest={total:2,dataset_version:'2026-09-20T00:00:00Z',recommended_chunk_size:3000,max_chunk_size:5000};
  let fixture=gridLoaderContext([manifest,{rows:[{sellpia_sku_code:'1'}],loaded:1,next_sku:'1',has_more:true,dataset_version:manifest.dataset_version},{rows:[{sellpia_sku_code:'1'}],loaded:1,has_more:false,dataset_version:manifest.dataset_version}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/중복/);
  fixture=gridLoaderContext([manifest,{rows:[{sellpia_sku_code:'1'}],loaded:1,next_sku:'1',has_more:true,dataset_version:manifest.dataset_version},{rows:[{sellpia_sku_code:'2'}],loaded:1,has_more:false,dataset_version:'2026-09-20T00:01:00Z'}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/cache가 변경/);
  fixture=gridLoaderContext([{...manifest,total:1},{rows:[],loaded:0,next_sku:'1',has_more:true,dataset_version:manifest.dataset_version}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/cursor가 진행/);
});

test('grid loader retries only the failed page and never restarts the dataset',async()=>{
  const version='2026-09-20T00:00:00Z';
  const fixture=gridLoaderContext([
    {total:1,dataset_version:version,recommended_chunk_size:3000,max_chunk_size:5000},
    new Error('canceling statement due to statement timeout'),
    {rows:[{sellpia_sku_code:'1'}],loaded:1,has_more:false,dataset_version:version,server_ms:2},
    {total:1,dataset_version:version}
  ]);
  const result=await fixture.context.loadMatrixGridDataset();
  assert.equal(result.count,1);
  assert.equal(fixture.calls.filter(call=>call.name==='hub_matrix_grid_feed_v2').length,2);
  assert.equal(fixture.calls.filter(call=>call.name==='hub_matrix_grid_manifest_v2').length,2);
  assert.equal(result.metrics.pageDiagnostics[0].retries,1);
});

test('frontend uses Grid feed without automatic legacy load amplification and lazily hydrates drawer detail',()=>{
  assert.match(app,/hasOwnProperty\.call\(liveData,'loadMatrixGridDataset'\)[\s\S]*?liveData\.loadMatrixGridDataset\(\{onProgress:progress\}\)/);
  assert.doesNotMatch(app,/Grid feed 실패 · 기존 전체 조회로 안전 전환/);
  assert.match(app,/legacy fallback is disabled/);
  assert.match(app,/forceLegacy[\s\S]*?loadFullMatrixDataset/);
  assert.match(app,/if\(liveData\.loadFullMatrixDataset\)[\s\S]*?mode:'legacy-capability'/);
  assert.match(app,/liveProduct\.__grid_compact[\s\S]*?loadProductsBySkus\(\[selectedSku\]\)[\s\S]*?matrixDataset\.patch\(\[details\[0\]\]\)/);
});
