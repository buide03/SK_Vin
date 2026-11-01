// Disposable integration test: no API key, no school data, no existing volumes.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const name = `sk-vin-check-${randomBytes(5).toString("hex")}`;
const volume = `${name}-data`;
const password = randomBytes(32).toString("hex");
const image = process.env.TEST_IMAGE || "sk-vin:render-demo";
const resourceArgs = [];
if (process.env.TEST_MEMORY) resourceArgs.push("--memory", process.env.TEST_MEMORY);
if (process.env.TEST_CPUS) resourceArgs.push("--cpus", process.env.TEST_CPUS);
if (process.env.TEST_NODE_OPTIONS) resourceArgs.push("-e", `NODE_OPTIONS=${process.env.TEST_NODE_OPTIONS}`);
const nativeFetch = globalThis.fetch;
const fetch = (url, options = {}) => nativeFetch(url, {
  ...options, signal: options.signal ?? AbortSignal.timeout(10000),
  headers: { ...options.headers, connection: "close" },
});
const authorization = `Basic ${Buffer.from(`demo:${password}`).toString("base64")}`;
const docker = (...args) => execFileSync("docker", args, {
  encoding: "utf8", env: { ...process.env, DEMO_ACCESS_PASSWORD: password }, stdio: ["ignore", "pipe", "pipe"],
}).trim();
let base;
async function ready() {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1500) })).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Error("Container health did not become ready");
}
try {
  docker("volume", "create", volume);
  docker("run", ...resourceArgs, "-d", "--name", name, "-p", "127.0.0.1::10000", "-v", `${volume}:/var/data`,
    "-e", "DEMO_ACCESS_PASSWORD", "-e", "RENDER=true", "-e", "RENDER_EXTERNAL_URL=https://demo.example",
    "-e", "MODEL_MODE=mock", "-e", "MODEL_PROVIDER=openai", "-e", "ALLOW_EXTERNAL_MODEL=false", image);
  base = `http://${docker("port", name, "10000/tcp").split(/\r?\n/)[0]}`;
  await ready();
  console.log("Container healthy; checking auth and mock workflow");
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await fetch(`${base}/api/app`)).status, 401);
  assert.equal((await fetch(base, { headers: { authorization } })).status, 200);
  const login = await fetch(`${base}/api/demo`, { method: "POST", headers: { authorization, origin: "https://demo.example", "content-type": "application/json" }, body: JSON.stringify({ id: "demo-class40-01" }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /Secure/i);
  const headers = { authorization, cookie: cookie.split(";")[0], origin: "https://demo.example", "content-type": "application/json" };
  const denied = await fetch(`${base}/api/app`, { method: "POST", headers: { ...headers, origin: "https://evil.example" }, body: "{}" });
  assert.equal(denied.status, 403);
  let version = 0;
  async function command(op, payload = {}) {
    const r = await fetch(`${base}/api/app`, { method: "POST", headers, body: JSON.stringify({ op, payload, version, key: randomUUID() }) });
    const data = await r.json();
    assert.equal(r.status, 200, data.error);
    version = data.version;
    return data;
  }
  const profile = async () => {
    const r = await fetch(`${base}/api/app`, { headers });
    assert.equal(r.status, 200);
    return r.json();
  };
  await command("consent", { accepted: true });
  const session = await command("session");
  await command("message", { session_id: session.id, sequence: 0, text: "Dữ liệu giả: em dùng AI và muốn chọn khoảng nghỉ", group: "G01" });
  const proposal = (await profile()).rows.find((r) => r.kind === "proposal");
  assert.ok(proposal);
  await command("confirm", { proposal_id: proposal.id, observation: { group_id: proposal.data.group_id, summary: "Thông tin giả đã được xác nhận để kiểm tra disk", status: "reported_present", frequency: null, reported_impact: null } });
  const before = (await profile()).rows.find((r) => r.kind === "observation");
  assert.ok(before);
  console.log("Confirmed observation saved; restarting container");
  docker("restart", "--time", "30", name);
  base = `http://${docker("port", name, "10000/tcp").split(/\r?\n/)[0]}`;
  await ready();
  const after = await profile();
  assert.ok(after.rows.some((r) => r.id === before.id && r.data.summary === before.data.summary));
  assert.equal(after.model.mode, "mock");
  await command("delete");
  async function roleHeaders(id) {
    const r = await fetch(`${base}/api/demo`, { method: "POST", headers: { authorization, origin: "https://demo.example", "content-type": "application/json" }, body: JSON.stringify({ id }) });
    assert.equal(r.status, 200);
    return { authorization, origin: "https://demo.example", cookie: r.headers.get("set-cookie").split(";")[0] };
  }
  const adminHeaders = await roleHeaders("demo-admin");
  const seeded = await fetch(`${base}/api/classroom`, { method: "POST", headers: adminHeaders });
  assert.equal(seeded.status, 200);
  const teacherHeaders = await roleHeaders("demo-teacher");
  const classroom = await fetch(`${base}/api/classroom`, { headers: teacherHeaders });
  assert.equal(classroom.status, 200);
  const summary = await classroom.json();
  assert.equal(summary.counts.consented, 40);
  const report = await fetch(`${base}/api/app?report=1&start=${summary.period.period_start}&end=${summary.period.period_end}`, { headers: teacherHeaders });
  assert.equal(report.status, 200);
  assert.equal((await report.json()).suppressed, false);
  const memory = docker("stats", "--no-stream", "--format", "{{.MemUsage}}", name);
  console.log(`40-student sample and teacher report passed; container memory: ${memory}`);
  const probe = docker("exec", name, "node", "-e", "const fs=require('fs');const leaks=fs.readdirSync('/app').filter(x=>x.startsWith('.env'));if(leaks.length)process.exit(1);const processes=fs.readdirSync('/proc').filter(x=>/^[0-9]+$/.test(x)).map(x=>{try{return fs.readFileSync('/proc/'+x+'/status','utf8')}catch{return ''}});if(!processes.some(x=>x.includes('next-server')&&/^Uid:\\s+1000\\s/m.test(x)))process.exit(2);console.log('No environment files in image; Next server runs as UID 1000')");
  console.log(probe);
  console.log("PASS: Linux image, health, password gate, exact HTTPS Origin, secure cookie, mock chat, confirmed observation survives restart. No provider calls.");
} finally {
  try { docker("rm", "-f", name); } catch {}
  try { docker("volume", "rm", volume); } catch {}
}
