import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const functionSource=source.slice(source.indexOf('  async function loadLatestSellpiaOriginalStatus()'),source.indexOf('  async function prepareSellerExport('));

async function statusFor(rows){
 const chain={select(){return this;},eq(){return this;},order(){return this;},limit(){return Promise.resolve({data:rows,error:null});}};
 const context={cleanText:value=>String(value??'').trim(),db:{from:()=>chain}};
 vm.createContext(context);vm.runInContext(functionSource,context);return context.loadLatestSellpiaOriginalStatus();
}

test('Sellpia carrier status accepts only the current ready full snapshot with stored files',async()=>{
 const stored=[{name:'source.csv',path:'sellpia/S/01.csv'}];
 const current=await statusFor([{snapshot_id:'FULL',source_file_name:'source.csv',metadata:{upload_mode:'full',source_storage_files:stored},completed_at:'2026-09-20'}]);
 assert.equal(current.available,true);assert.equal(current.snapshotId,'FULL');
 const legacy=await statusFor([{snapshot_id:'FULL',source_file_name:'source.csv',metadata:{upload_mode:'full'},completed_at:'2026-09-20'}]);
 assert.equal(legacy.available,false);assert.match(legacy.reason,/DB 행만 저장/);
 const patched=await statusFor([{snapshot_id:'PATCH',metadata:{upload_mode:'patch'},completed_at:'2026-09-20'},{snapshot_id:'FULL',metadata:{upload_mode:'full',source_storage_files:stored},completed_at:'2026-09-19'}]);
 assert.equal(patched.available,false);assert.match(patched.reason,/부분 원본 병합/);
});

test('future Sellpia uploads store immutable source carrier references before row ingestion',()=>{
 assert.match(source,/seller-originals'[\s\S]*?\.upload\(path,file,[\s\S]*?upsert:false/);
 assert.match(source,/metadata:\{\.\.\.baseMetadata,source_storage_files:storageFiles\}/);
 assert.match(source,/const chunkSize = 500/);
 const migration=fs.readFileSync('supabase/migrations/20260920090000_allow_sellpia_original_carrier_uploads.sql','utf8');
 assert.match(migration,/for insert[\s\S]*?to anon, authenticated[\s\S]*?bucket_id = 'seller-originals'[\s\S]*?foldername\(name\)\)\[1\] = 'sellpia'/);
 assert.doesNotMatch(migration,/^\s*(drop policy|delete from|update storage\.objects)/im,'forward migration stays additive');
});
