import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const destination='https://w-works-official.github.io/Picking_System/';
test('personal Picking entry is a standalone company notice, not an anonymous app',()=>{
  assert.match(html,/피킹시스템 이용 주소가/);
  assert.match(html,/아이디와 비밀번호는 셀피아 로그인 정보와 동일/);
  assert.match(html,/20261007-picking-v1/);
  assert.match(html,/북마클릿을 인증 포함 새 버전으로 한 번 교체/);
  const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(hrefs,[destination,destination,destination+'tools/sellpia_scraper.html',destination+'tools/sellpia_memo_updater_0707_stockmatch.html']);
  assert.doesNotMatch(html,/supabase|pickingApp|serviceWorker|localStorage|sessionStorage|http-equiv="refresh"/i);
  assert.doesNotMatch(html,/<script[^>]+src=|rel="manifest"/i);
  assert.match(html,/@media \(max-width: 40rem\)/);
});
test('notice copies only the company URL and gracefully handles unavailable clipboard',async()=>{
  const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const nodes={
    'destination-url':{href:destination},
    'copy-address':{addEventListener(type,fn){assert.equal(type,'click');this.click=fn;}},
    'copy-status':{textContent:''},
  };
  let copied,selected=false;
  const context={
    document:{getElementById:id=>nodes[id],createRange:()=>({selectNodeContents(node){assert.equal(node,nodes['destination-url']);}})},
    navigator:{clipboard:{writeText:async text=>{copied=text;}}},
    window:{getSelection:()=>({removeAllRanges(){},addRange(){selected=true;}})},
    clearTimeout(){},setTimeout(){return 1;},
  };
  vm.runInNewContext(source,context);
  await nodes['copy-address'].click();
  assert.equal(copied,destination);
  assert.match(nodes['copy-status'].textContent,/복사했습니다/);
  context.navigator.clipboard.writeText=async()=>{throw Error('unavailable');};
  await nodes['copy-address'].click();
  assert.equal(selected,true);
  assert.match(nodes['copy-status'].textContent,/Ctrl\+C/);
});
