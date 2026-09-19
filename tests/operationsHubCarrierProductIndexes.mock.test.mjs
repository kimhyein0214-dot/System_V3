import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260917024240_carrier_seller_product_lookup_indexes.sql','utf8');
const source=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
test('each carrier product equality lookup has a matching covering index',()=>{
 assert.equal((sql.match(/create index /g)||[]).length,3);
 for(const channel of ['smartstore','makeshop','ably']){
  assert.ok(sql.includes(`(${channel}_product_code,sellpia_sku_code) include (${channel}_option_code)`));
  assert.ok(sql.includes(`where ${channel}_product_code is not null`));
 }
 assert.match(source,/\.in\(productField,chunk\)/,'carrier identity lookup remains bounded to the current 100-product chunk');
 assert.match(source,/\.order\('sellpia_sku_code',\{ascending:true\}\)\.range\(from,from\+999\)/);
 assert.match(source,/operations_hub_link_suppressions/,'carrier mapping must honor operator disconnect suppressions');
 assert.match(source,/carrier link suppressions/,'suppression lookup is reported separately from identity lookup');
 assert.match(source,/suppressed\.has\(mappingKey\(row\.sku,row\.product_code,row\.option_code\)\)/,'suppressed exact seller identity must be removed before ambiguity classification');
});
test('index-only migration leaves data, existing indexes, access and timeouts unchanged',()=>{
 assert.doesNotMatch(sql,/\b(?:drop|alter|grant|revoke|update|delete|insert|truncate|set)\b/i);
 assert.doesNotMatch(sql,/statement_timeout|recalculate|materializ/i);
});
