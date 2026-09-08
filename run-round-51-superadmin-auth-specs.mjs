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
              /^@\/(integrations\/supabase\/(client|impersonation-state|tenant-selection-state)|lib\/(api\/super.functions|tenant-cache))$/,
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
    url: "https://fixture.invalid/auth",
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
