// Evolve historical frozen-source gates only for the owner-authorized DTO reduction.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const path='src/lib/api/tenant-crm.functions.ts';
let expected=execFileSync('git',['show',`82e30dfecd245d462f396b58fdb2c4e9975acffe:${path}`],{encoding:'utf8'});
const fields=['ativo','team_id','cargo','telefone','whatsapp','foto_url','status','creci','cpf','slug','bio'];
const a=expected.indexOf('export type CrmAssigneeDto');const b=expected.indexOf('\n};',a)+3;
let dto=expected.slice(a,b);for(const f of fields)dto=dto.replace(new RegExp(`  ${f}: [^\\n]+\\n`),'');expected=expected.slice(0,a)+dto+expected.slice(b);
const c=expected.indexOf('export const listTenantLeadAssignees');const d=expected.indexOf('export const listTenantLeadProperties',c);
let handler=expected.slice(c,d).replace('id, user_id, nome, sobrenome, ativo, team_id, cargo, email, telefone, whatsapp, foto_url, status, creci, cpf, slug, bio','id, user_id, nome, sobrenome, email');
for(const f of fields)handler=handler.replace(new RegExp(`        ${f}: [^\\n]+\\n`),'');expected=expected.slice(0,c)+handler+expected.slice(d);
assert.equal(readFileSync(path,'utf8'),expected,'only the approved assignee query/DTO minimization may evolve this frozen contract');
