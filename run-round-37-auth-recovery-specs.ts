import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recoveryHandler, TARGET, type Ports} from './supabase/functions/round37-synthetic-auth-recovery/core.ts';
const password='TEST-ONLY-not-a-live-password';
const req=(body: unknown={password},token='test-jwt',method='POST')=>new Request('https://test.invalid/recover',{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
let writes=0;
const base:Ports={operator:'operator-test',expiresAt:2000,expectedUpdatedAt:'baseline',now:()=>1000,authenticate:async()=> 'operator-test',isAdmin:async()=>true,eligible:async()=>true,target:async()=>({id:TARGET,updated_at:'baseline',app_metadata:{synthetic:true}}),updatePassword:async p=>{assert.equal(p,password);writes++;}};
let cases=0;
async function denied(p:Partial<Ports>,body:unknown={password},expected=403){writes=0;const r=await recoveryHandler({...base,...p})(req(body));assert.equal(r.status,expected);assert.equal(writes,0);assert.ok(!(await r.text()).includes(password));cases++;}
await denied({authenticate:async()=>null});await denied({isAdmin:async()=>false});await denied({operator:''},{password},503);await denied({expiresAt:999},{password},503);await denied({expiresAt:1e9},{password},503);await denied({eligible:async()=>false});await denied({target:async()=>({id:TARGET,updated_at:'baseline',app_metadata:{synthetic:false}})},{password},409);await denied({target:async()=>({id:TARGET,updated_at:'changed',app_metadata:{synthetic:true}})},{password},409);await denied({}, {password,userId:TARGET},400);await denied({}, {password,email:'not-allowed'},400);await denied({}, {password:'short'},400);await denied({}, {password:'x'.repeat(3000)},413);
let run=recoveryHandler(base);assert.equal((await run(req({},'', 'GET'))).status,405);assert.equal((await run(new Request('https://test.invalid/recover',{method:'POST'}))).status,401);cases+=2;
writes=0;assert.equal((await run(req())).status,200);assert.equal((await run(req())).status,409);assert.equal(writes,1);cases++;
run=recoveryHandler({...base,updatePassword:async()=>{writes++;throw Error(password);}});const failed=await run(req());assert.equal(failed.status,503);assert.equal(await failed.text(),'{"code":"outcome_unconfirmed_do_not_retry"}');assert.equal((await run(req())).status,409);cases++;
let release!:()=>void;run=recoveryHandler({...base,updatePassword:()=>new Promise<void>(r=>{release=r;})});const pending=run(req());while(!release)await new Promise(r=>setTimeout(r,0));assert.equal((await run(req())).status,409);release();assert.equal((await pending).status,200);cases++;
const entry=readFileSync('supabase/functions/round37-synthetic-auth-recovery/index.ts','utf8');assert.ok(entry.includes('getUser(jwt)'));assert.ok(entry.includes('updateUserById(TARGET, { password })'));assert.ok(!/console\.|\.insert\(|\.update\(|\.delete\(/.test(entry));cases++;
console.log(`Round 37 recovery: ${cases} controlled cases passed; no backend calls. Single-isolate guard only; no distributed exactly-once claim.`);
