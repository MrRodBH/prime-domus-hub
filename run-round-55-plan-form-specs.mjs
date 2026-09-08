import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/lib/onboarding/plan-presentation.ts'],bundle:true,write:false,format:'esm'});
const {maskPlanPrice,parsePlanPrice,formatPlanPrice,newPlanCode}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
for(const [input,shown,cents] of [['49900','499,00',49900],['R$ 1.234,56','1.234,56',123456],['0','0,00',0],['99999999','999.999,99',99999999],['100000000','1.000.000,00',100000000]]) {
 assert.equal(maskPlanPrice(input),shown);assert.equal(parsePlanPrice(shown),cents);assert.equal(formatPlanPrice(cents),shown);
}
for(const bad of ['', '-1,00','abc','1.23,45','1,2','999999999999999999,00'])assert.throws(()=>parsePlanPrice(bad));
assert.equal(maskPlanPrice('-1,00'),'-1,00');assert.equal(maskPlanPrice(''), '');
const id='00000000-0000-4000-8000-000000000001';assert.match(newPlanCode(id),/^[a-z][a-z0-9_]{1,63}$/);assert.equal(newPlanCode(id),newPlanCode(id));assert.notEqual(newPlanCode(id),newPlanCode('00000000-0000-4000-8000-000000000002'));
console.log('PASS Round55: BRL mask/cent precision, invalid values, stable generated plan reference. Round52 DOM verifies no manual code/portal fields and preservation on edit.');
