import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../mockups/operations-hub/index.html',import.meta.url),'utf8');
const destination='https://w-works-official.github.io/Operation_Hub/mockups/operations-hub/';
test('personal Hub entry is a standalone notice with the exact company destination',()=>{
  assert.match(html,/상품운영허브 이용 주소가/);
  assert.match(html,/공용 운영 계정으로 로그인/);
  assert.match(html,/20261007-v1/);
  assert.equal([...html.matchAll(/href="([^"]+)"/g)].length,2);
  for(const [,href] of html.matchAll(/href="([^"]+)"/g)) assert.equal(href,destination);
  assert.doesNotMatch(html,/supabase|operations-auth-form|app\.js|serviceWorker|localStorage|http-equiv="refresh"/i);
  assert.doesNotMatch(html,/<script[^>]+src=/i);
  assert.match(html,/@media \(max-width: 40rem\)/);
});
test('inline copy script is syntactically valid and only copies the company address',async()=>{
  const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const nodes={
    'destination-url':{href:destination},
    'copy-address':{addEventListener(type,fn){assert.equal(type,'click'); this.click=fn;}},
    'copy-status':{textContent:''},
  };
  let copied;
  const context={document:{getElementById:id=>nodes[id]},navigator:{clipboard:{writeText:async text=>{copied=text;}}}};
  vm.runInNewContext(source,context);
  await nodes['copy-address'].click();
  assert.equal(copied,destination);
  assert.match(nodes['copy-status'].textContent,/복사했습니다/);
});
