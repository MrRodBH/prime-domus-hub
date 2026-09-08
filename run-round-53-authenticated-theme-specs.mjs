import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {build} from "esbuild";
const read = p => readFileSync(p, "utf8");
const built = await build({entryPoints:["src/lib/p0-homologation-entry.ts"],bundle:true,write:false,format:"esm"});
const {resolveP0HomologationEntry: entry} = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
for (const host of ["realone.com.br", "www.realone.com.br"]) {
 assert.equal(entry(`https://${host}/?old=demo`), `https://${host}/auth`);
 assert.equal(entry("http://internal/", host), `https://${host}/auth`);
 for (const path of ["/auth", "/super", "/demonstracao", "/demonstracao/"]) assert.equal(entry(`https://${host}${path}`), null);
}
assert.equal(entry("https://rmprimeimoveis.com.br/"), null);
assert.equal(entry("https://realone.com.br/", "tenant.example.invalid"), null);
assert.equal(entry("https://prime-domus-hub.lovable.app/"), "https://prime-domus-hub.lovable.app/demonstracao");
assert.equal(entry("invalid"), null);
const styles=read("src/styles.css"), rail=read("src/components/workspace/NavigationRail.tsx");
for(const token of ["#f6f4ef", "#113b42", "#fbfaf7", "1560px"]) assert.ok(styles.includes(token), token);
assert.ok(rail.includes("w-[272px]"));assert.ok(rail.includes("bg-white/15"));
assert.ok(read("src/components/workspace/WorkspaceShell.tsx").includes("<TenantSelectionGate"));
assert.ok(read("src/routes/_authenticated.super.tsx").includes("await meuAcessoSuperAdmin()"));
const component=read("src/components/onboarding/PersistentOnboarding.tsx");
assert.ok(component.includes("loadSuperOnboarding()"));
assert.ok(!/localStorage|sessionStorage|EmptyDemoWorkspace/.test(component));
console.log("PASS Round53: SaaS auth entry, tenant roots and explicit demo preserved; approved shell tokens and canonical data/authorization boundaries retained. No pixel/browser or remote persistence proof.");
