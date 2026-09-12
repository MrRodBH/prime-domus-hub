import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
const { JSDOM, VirtualConsole } = await import(
  pathToFileURL(process.env.ROUND51_JSDOM_MODULE).href
);
const backend = resolve("tests/round51/backend.ts");
const output = await build({
  entryPoints: ["tests/round51/entry.tsx"],
  bundle: true,
  write: false,
  jsx: "automatic",
  loader: { ".png": "dataurl" },
  plugins: [
    {
      name: "controlled-auth",
      setup(build) {
        build.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
          path: resolve("tests/round51/router.tsx"),
        }));
        build.onResolve(
          {
            filter:
              /^@\/(integrations\/supabase\/(client|impersonation-state|tenant-selection-state)|lib\/(api\/(super|initial-admin-setup|tenant|tenant-selection).functions|tenant-cache))$/,
          },
          () => ({ path: backend }),
        );
      },
    },
  ],
});
const tick = () => new Promise((r) => setTimeout(r, 15));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
async function scenario(overrides, run) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM('<div id="root"></div>', {
    url: overrides.url ?? "https://fixture.invalid/auth",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window,
    d = w.document;
  const calls = [];
  const fixture = {
    mode: "login",
    getUser: async () => ({ data: { user: null } }),
    signIn: async (data) => {
      calls.push(data);
      return { data: { user: { id: "fictional-user" }, session: {} } };
    },
    access: async () => true,
    signOut: async () => ({ error: null }),
    navigation: [],
    cleared: [],
    ...overrides,
  };
  w.__authFixture = fixture;
  w.fetch = () => {
    throw Error("REMOTE_FORBIDDEN");
  };
  const text = () => d.body.textContent;
  const until = async (fn) => {
    for (let i = 0; i < 150; i++) {
      if (fn()) return;
      await tick();
    }
    throw Error(text());
  };
  const fill = async (id, value) => {
    const field = d.getElementById(id);
    assert.ok(field, id);
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value").set.call(field, value);
    field.dispatchEvent(new w.Event("input", { bubbles: true }));
    await tick();
  };
  const submit = async () => {
    d.querySelector("form").dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await tick();
  };
  try {
    w.eval(output.outputFiles[0].text);
    await tick();
    await run({ w, d, fixture, calls, text, until, fill, submit });
    assert.deepEqual(errors, []);
  } finally {
    fixture.unmount?.();
    dom.window.close();
  }
}
await scenario({}, async ({ fixture, until, fill, submit, calls }) => {
  await until(() => !fixture.navigation.length);
  await tick();
  await fill("email", "owner@example.invalid");
  await fill("password", "fictional-password");
  await submit();
  await until(() => fixture.navigation.length === 1);
  assert.equal(fixture.navigation[0].to, "/super");
  assert.equal(calls.length, 1);
});
await scenario({ access: async () => false }, async ({ fixture, fill, submit, until }) => {
  await tick();
  await fill("email", "member@example.invalid");
  await fill("password", "fictional-password");
  await submit();
  await until(() => fixture.navigation.length === 1);
  assert.equal(fixture.navigation[0].to, "/admin");
});
await scenario(
  { signIn: async () => ({ error: Error("private detail"), data: {} }) },
  async ({ fixture, fill, submit, text }) => {
    await tick();
    await fill("email", "owner@example.invalid");
    await fill("password", "incorrect");
    await submit();
    assert.ok(text().includes("Não foi possível"));
    assert.ok(!text().includes("private detail"));
    assert.equal(fixture.navigation.length, 0);
  },
);
const sign = deferred();
let signCalls = 0;
await scenario(
  {
    signIn: () => {
      signCalls++;
      return sign.promise;
    },
  },
  async ({ fixture, fill, submit, until }) => {
    await tick();
    await fill("email", "owner@example.invalid");
    await fill("password", "fictional-password");
    await submit();
    await submit();
    assert.equal(signCalls, 1);
    sign.resolve({ data: { user: { id: "fictional" }, session: {} } });
    await until(() => fixture.navigation.length === 1);
  },
);
await scenario(
  { getUser: async () => ({ data: { user: { id: "existing" } } }) },
  async ({ fixture, until, calls }) => {
    await until(() => fixture.navigation.length === 1);
    assert.equal(fixture.navigation[0].to, "/super");
    assert.equal(calls.length, 0);
  },
);
await scenario(
  {
    getUser: async () => ({ data: { user: { id: "existing" } } }),
    access: async () => {
      throw Error("private authority");
    },
  },
  async ({ fixture, text, until, d }) => {
    await until(() => text().includes("Não foi possível verificar"));
    assert.equal(fixture.navigation.length, 0);
    assert.ok(!text().includes("private authority"));
    assert.ok([...d.querySelectorAll("button")].some((b) => b.textContent === "Sair da conta"));
    [...d.querySelectorAll("button")].find((b) => b.textContent === "Sair da conta").click();
    await until(() => d.getElementById("password"));
    assert.equal(d.getElementById("password").value, "");
    assert.ok(!text().includes("Não foi possível verificar"));
    assert.equal(fixture.navigation[0].to, "/auth");
  },
);
const late = deferred();
await scenario(
  { access: () => late.promise, getUser: async () => ({ data: { user: { id: "existing" } } }) },
  async ({ fixture }) => {
    await tick();
    fixture.unmount();
    late.resolve(true);
    await tick();
    assert.equal(fixture.navigation.length, 0);
  },
);
await scenario({ mode: "logout" }, async ({ fixture, d, until }) => {
  d.querySelector("button").click();
  await until(() => fixture.navigation.length === 1);
  assert.equal(fixture.navigation[0].to, "/auth");
  assert.equal(fixture.navigation[0].replace, true);
  assert.equal(fixture.client.getQueryData(["private-record"]), undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.cleared)), [
    "impersonation",
    "selection",
    ["tenant", null],
  ]);
});
const logout = deferred();
let logoutCalls = 0;
await scenario(
  {
    mode: "logout",
    signOut: () => {
      logoutCalls++;
      return logout.promise;
    },
  },
  async ({ fixture, d, until }) => {
    d.querySelector("button").click();
    d.querySelector("button").click();
    assert.equal(logoutCalls, 1);
    logout.resolve({ error: Error("private error") });
    await until(() => d.querySelector('[role="alert"]'));
    assert.equal(fixture.navigation.length, 0);
    assert.equal(fixture.cleared.length, 0);
    assert.ok(fixture.client.getQueryData(["private-record"]));
    fixture.signOut = async () => ({ error: null });
    d.querySelector("button").click();
    await until(() => fixture.navigation.length === 1);
  },
);
await scenario({access:async()=>false,initialAdminInvitations:[{id:"controlled"}]},async({fixture,until,fill,submit})=>{
  await until(()=>!fixture.navigation.length);await tick();
  await fill("email","admin@fixture.invalid");await fill("password","controlled-password");await submit();
  await until(()=>fixture.navigation.length===1);assert.equal(fixture.navigation[0].to,"/invitations");
});
const demo = readFileSync("src/components/demo/interactive/EmptyDemoWorkspace.tsx", "utf8");
assert.ok(demo.includes('href="/auth"'));
assert.ok(!demo.includes("signInWithPassword"));
const guard = readFileSync("src/routes/_authenticated.super.tsx", "utf8");
assert.ok(guard.includes("await meuAcessoSuperAdmin()"));
const header = readFileSync("src/components/workspace/AppHeader.tsx", "utf8");
assert.ok(header.includes('aria-label="Sair da conta"'));
console.log(
  "PASS Round51 controlled DOM: super/ordinary login, denied credentials, server failure, existing session, duplicates, unmount, logout/cache/context cleanup and retry. No real authentication executed.",
);

// Tenant login is the same authentication implementation with a scoped return path.
const tenantEntry = {
  url:'https://fixture.invalid/rmprime/auth?next=%2Frmprime%2Fadmin%2Fsite%3Fitem%3Ddraft',
  tenantSlug:'rmprime', next:'/rmprime/admin/site?item=draft', access:async()=>false,
  tenants:[{tenantId:'other',slug:'another'},{tenantId:'target',slug:'rmprime'}],
  workspace:{id:'target',slug:'rmprime'},
};
await scenario(tenantEntry,async({fixture,text,until,fill,submit})=>{
 await until(()=>text().includes('Acesso da empresa'));await tick();
 assert.ok(!text().includes('Super Admin'));assert.ok(!text().includes('Explorar demonstração'));
 await fill('email','admin@fixture.invalid');await fill('password','controlled-password');await submit();
 await until(()=>fixture.navigation.length===1);
 assert.equal(fixture.navigation[0].to,'/rmprime/admin/site?item=draft');
 assert.equal(fixture.selected,'target');
});
await scenario({...tenantEntry,tenants:[]},async({fixture,until,fill,submit,text})=>{
 await tick();await fill('email','other@fixture.invalid');await fill('password','controlled-password');await submit();
 await until(()=>text().includes('não tem acesso ativo'));assert.equal(fixture.navigation.length,0);assert.equal(fixture.selected,undefined);
});
await scenario({...tenantEntry,workspaceError:true},async({fixture,until,fill,submit,text})=>{
 await tick();await fill('email','admin@fixture.invalid');await fill('password','controlled-password');await submit();
 await until(()=>text().includes('não foi possível abrir'));assert.equal(fixture.navigation.length,0);assert.ok(fixture.cleared.includes('selection'));
});
await scenario({...tenantEntry,access:async()=>true,getUser:async()=>({data:{user:{id:'platform'}}})},async({fixture,text,until,d})=>{
 await until(()=>text().includes('Esta sessão é de gestão da plataforma'));assert.equal(fixture.navigation.length,0);assert.equal(fixture.selected,undefined);
 [...d.querySelectorAll('button')].find(b=>b.textContent==='Sair e entrar com outra conta').click();
 await until(()=>fixture.navigation.length===1);
 assert.equal(fixture.navigation[0].to,'/$tenantSlug/auth');assert.equal(fixture.navigation[0].params.tenantSlug,'rmprime');assert.equal(fixture.navigation[0].search.next,'/rmprime/admin/site?item=draft');
});
await scenario({...tenantEntry,mode:'logout',url:'https://fixture.invalid/rmprime/admin/site?item=draft'},async({fixture,d,until})=>{
 d.querySelector('button').click();await until(()=>fixture.navigation.length===1);
 assert.equal(fixture.navigation[0].to,'/$tenantSlug/auth');assert.equal(fixture.navigation[0].params.tenantSlug,'rmprime');assert.equal(fixture.navigation[0].search.next,'/rmprime/admin/site?item=draft');
});
const pure=await build({entryPoints:['src/lib/auth/tenant-login-navigation.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {loginNavigation,tenantReturnPath}=await import('data:text/javascript;base64,'+Buffer.from(pure.outputFiles[0].text).toString('base64'));
for(const path of ['/rmprime/admin','/rmprime/admin/site'])assert.equal(loginNavigation(path).params.tenantSlug,'rmprime');
for(const path of ['/super','/admin','/auth'])assert.equal(loginNavigation(path).to,'/auth');
for(const unsafe of ['https://evil.invalid','//evil.invalid','/other/admin','/super','/rmprime/auth','/rmprime/admin/../../super','/rmprime/admin/%2f%2fevil.invalid','/rmprime/admin\\evil','/rmprime/admin\n'])
 assert.equal(tenantReturnPath('rmprime',unsafe),'/rmprime/admin',unsafe);
assert.equal(tenantReturnPath('rmprime','/rmprime/admin/site?item=a#preview'),'/rmprime/admin/site?item=a#preview');
const guards=await build({entryPoints:['src/lib/public-tenant-read-guards.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {loadRequiredPublicRootDataForPath}=await import('data:text/javascript;base64,'+Buffer.from(guards.outputFiles[0].text).toString('base64'));
assert.equal(await loadRequiredPublicRootDataForPath('/rmprime/auth',()=>{throw Error('PUBLIC_CMS_FORBIDDEN')},()=>{throw Error('PUBLIC_TRACKING_FORBIDDEN')}),null);
console.log('PASS tenant login DOM: contextual copy, same Auth implementation, canonical active membership selection, original deep link restored, platform/wrong/revoked account denied, logout preserves tenant, unsafe return destinations rejected, public CMS bypassed.');
