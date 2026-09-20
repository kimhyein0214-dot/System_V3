import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const service=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const app=fs.readFileSync('mockups/operations-hub/app.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260920051920_hub_matrix_grid_feed_v1.sql','utf8');

function gridLoaderContext(responses){
  const calls=[];
  const context={
    console,
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

test('grid feed migration is session-gated, keyset-bounded, read-only, and indexed for freshness',()=>{
  assert.match(migration,/require_operations_hub_operator_session\(p_session_token\)/);
  assert.match(migration,/sellpia_sku_code > p_after_sku/);
  assert.match(migration,/order by cache\.sellpia_sku_code[\s\S]*?limit p_limit \+ 1/);
  assert.match(migration,/p_limit not between 250 and 4000/);
  assert.match(migration,/operations_hub_matrix_export_cache_refreshed_desc_idx[\s\S]*?cache_refreshed_at desc/);
  assert.doesNotMatch(migration,/\b(insert|update|delete|merge|truncate)\b/i);
});

test('grid loader completes a keyset feed without duplicate or missing SKU',async()=>{
  const {context,calls}=gridLoaderContext([
    {rows:[{sellpia_sku_code:'1-1',__profile:{sku_tags:[{tag_id:'T'}]}},{sellpia_sku_code:'1-2'}],total:3,loaded:2,next_sku:'1-2',has_more:true,dataset_version:'v1',server_ms:3},
    {rows:[{sellpia_sku_code:'2-1'}],total:3,loaded:1,next_sku:null,has_more:false,dataset_version:'v1',server_ms:2}
  ]);
  const result=await context.loadMatrixGridDataset({chunkSize:3000});
  assert.equal(result.count,3);
  assert.equal(JSON.stringify(result.rows.map(row=>row.sellpia_sku_code)),JSON.stringify(['1-1','1-2','2-1']));
  assert.equal(JSON.stringify(calls.map(call=>call.name)),JSON.stringify(['hub_matrix_grid_feed_v1','hub_matrix_grid_feed_v1']));
  assert.equal(calls[0].args.p_after_sku,null);
  assert.equal(calls[1].args.p_after_sku,'1-2');
  assert.equal(result.metrics.mode,'grid-feed');
});

test('grid loader rejects duplicates, membership drift, and stalled cursors',async()=>{
  let fixture=gridLoaderContext([{rows:[{sellpia_sku_code:'1'}],total:2,loaded:1,next_sku:'1',has_more:true,dataset_version:'v1'},{rows:[{sellpia_sku_code:'1'}],total:2,loaded:1,has_more:false,dataset_version:'v1'}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/중복/);
  fixture=gridLoaderContext([{rows:[{sellpia_sku_code:'1'}],total:2,loaded:1,next_sku:'1',has_more:true,dataset_version:'v1'},{rows:[{sellpia_sku_code:'2'}],total:2,loaded:1,has_more:false,dataset_version:'v2'}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/cache가 변경/);
  fixture=gridLoaderContext([{rows:[],total:1,loaded:0,next_sku:'1',has_more:true,dataset_version:'v1'}]);
  await assert.rejects(fixture.context.loadMatrixGridDataset(),/cursor가 진행/);
});

test('frontend uses Grid feed first, keeps a visible complete legacy fallback, and lazily hydrates drawer detail',()=>{
  assert.match(app,/liveData\.loadMatrixGridDataset\(\{onProgress:progress\}\)/);
  assert.match(app,/Grid feed 실패 · 기존 전체 조회로 안전 전환/);
  assert.match(app,/await liveData\.loadFullMatrixDataset\(\{onProgress:progress\}\)/);
  assert.match(app,/liveProduct\.__grid_compact[\s\S]*?loadProductsBySkus\(\[selectedSku\]\)[\s\S]*?matrixDataset\.patch\(\[details\[0\]\]\)/);
});
