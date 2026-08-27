import assert from "node:assert/strict";
import { createConnection, createServer } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const configPath = fileURLToPath(
  new URL("./arch-12f-03/workerd-single-dispatch.capnp", import.meta.url),
);
const workerdPath = fileURLToPath(new URL("../node_modules/workerd/bin/workerd", import.meta.url));

async function reservePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

function parseHttpResponse(raw) {
  const [head, body = ""] = raw.split("\r\n\r\n");
  const status = Number(head.split("\r\n", 1)[0].split(" ")[1]);
  return { status, body: JSON.parse(body) };
}

async function sendOneShot(port, requestId) {
  const socket = createConnection({ host: "127.0.0.1", port });
  socket.setEncoding("utf8");
  let raw = "";
  socket.on("data", (chunk) => {
    raw += chunk;
  });
  await once(socket, "connect");
  socket.end(
    [
      "POST /probe HTTP/1.1",
      `Host: 127.0.0.1:${port}`,
      "Connection: close",
      "Content-Length: 0",
      `X-RM-Prime-Request-Id: ${requestId}`,
      "",
      "",
    ].join("\r\n"),
  );
  await once(socket, "close");
  return parseHttpResponse(raw);
}

async function waitUntilReady(port, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`workerd exited before readiness: ${child.exitCode}`);
    }
    const socket = createConnection({ host: "127.0.0.1", port });
    const outcome = await new Promise((resolve) => {
      socket.once("connect", () => resolve(true));
      socket.once("error", () => resolve(false));
    });
    socket.destroy();
    if (outcome) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("workerd readiness timeout");
}

async function runPhase(name, requests) {
  const port = await reservePort();
  const child = spawn(
    workerdPath,
    ["serve", configPath, "config", "--socket-addr", `http=127.0.0.1:${port}`],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    await waitUntilReady(port, child);
    const responses = [];
    for (const requestId of requests) {
      responses.push(await sendOneShot(port, requestId));
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { responses, logs: `${stdout}\n${stderr}` };
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
}

const positiveId = "arch-12f-03-positive";
const positive = await runPhase("positive", [positiveId]);
assert.deepEqual(positive.responses, [
  { status: 200, body: { requestId: positiveId, replay: false } },
]);
assert.equal(
  positive.logs.split(`"requestId":"${positiveId}"`).length - 1,
  1,
  "the one-shot client must produce exactly one Worker invocation",
);

const replayId = "arch-12f-03-negative-replay";
const negative = await runPhase("negative-replay", [replayId, replayId]);
assert.deepEqual(negative.responses, [
  { status: 200, body: { requestId: replayId, replay: false } },
  { status: 409, body: { requestId: replayId, replay: true } },
]);
assert.equal(
  negative.logs.split(`"requestId":"${replayId}"`).length - 1,
  2,
  "the explicit negative replay must be observed and rejected exactly once",
);

console.log("ARCH-12F-03 official workerd single-dispatch harness: PASS");
