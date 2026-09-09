import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const path='src/lib/api/tenant-lifecycle.functions.ts';
let expected=execFileSync('git',['show','fc68e7694d49f49b32d94f1792d8ae72a23e11c6:'+path],{encoding:'utf8'});
expected=expected.replaceAll('Somente o owner ativo pode gerenciar memberships.','Somente o owner ou administrador ativo do tenant pode gerenciar membros.')
.replace('  if (context.tenant.isSuperAdmin) return tenantId;\n','')
.replace('data.membership_status !== "active" || data.tenant_role !== "owner" || data.is_owner !== true','data.membership_status !== "active" || !((data.tenant_role === "owner" && data.is_owner === true) || (data.tenant_role === "admin" && data.is_owner === false))')
.replace('  isOwner: boolean;','  isOwner: boolean;\n  canTransferOwnership: boolean;')
.replace('        isOwner: row.is_owner,','        isOwner: row.is_owner,\n        canTransferOwnership: (rows ?? []).some(member => member.user_id === context.userId && member.tenant_role === "owner" && member.is_owner && member.membership_status === "active"),');
assert.equal(readFileSync(path,'utf8'),expected,'Only P0 membership authority and ownership capability may evolve');
