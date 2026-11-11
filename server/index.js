import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const OFFLINE_AFTER = Math.max(30, Number(process.env.DEVICE_OFFLINE_AFTER_SECONDS || 120));
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const ENROLLMENT_CODE = process.env.ENROLLMENT_CODE || "";

if (ADMIN_TOKEN.length < 32 || ENROLLMENT_CODE.length < 20) {
  console.error("Set ADMIN_TOKEN (32+ chars) and ENROLLMENT_CODE (20+ chars) in .env");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-origin" } }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || false }));
app.use(express.json({ limit: "32kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

const emptyStore = () => ({ devices: [], commands: [], audit: [], telegramOffset: 0 });
let store = emptyStore();
let writeQueue = Promise.resolve();

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

async function persist() {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = DATA_FILE + ".tmp";
    await fs.writeFile(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
    await fs.rename(temp, DATA_FILE);
  });
  return writeQueue;
}

async function load() {
  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    store = {
      devices: Array.isArray(parsed.devices) ? parsed.devices : [],
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      telegramOffset: Number(parsed.telegramOffset || 0)
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await persist();
  }
}

function audit(action, actor, details = {}) {
  store.audit.unshift({ id: id(), at: now(), action, actor, details });
  store.audit = store.audit.slice(0, 300);
  void persist();
}

function bearer(req) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}
function requireAdmin(req, res, next) {
  if (!safeEqual(bearer(req), ADMIN_TOKEN)) return res.status(401).json({ error: "Admin authentication required" });
  next();
}
function requireDevice(req, res, next) {
  const tokenHash = hash(bearer(req));
  const device = store.devices.find((item) => item.tokenHash === tokenHash && item.revoked !== true);
  if (!device) return res.status(401).json({ error: "Invalid device credential" });
  req.device = device;
  next();
}
function publicDevice(device) {
  const last = device.lastSeen ? Date.parse(device.lastSeen) : 0;
  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    appVersion: device.appVersion,
    batteryPercent: device.batteryPercent,
    networkType: device.networkType,
    enrolledAt: device.enrolledAt,
    lastSeen: device.lastSeen,
    status: last && Date.now() - last <= OFFLINE_AFTER * 1000 ? "online" : "offline",
    revoked: device.revoked === true
  };
}
function cleanText(value, fallback, max = 80) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "DogeRat Device Dashboard", time: now() }));

app.post("/api/devices/enroll", (req, res) => {
  if (!safeEqual(req.headers["x-enrollment-code"], ENROLLMENT_CODE)) {
    return res.status(401).json({ error: "Invalid enrollment code" });
  }
  const name = cleanText(req.body?.name, "New device");
  const platform = cleanText(req.body?.platform, "Unknown", 40);
  const deviceToken = crypto.randomBytes(32).toString("base64url");
  const device = {
    id: id(), name, platform,
    appVersion: cleanText(req.body?.appVersion, "unknown", 30),
    batteryPercent: null, networkType: "unknown",
    tokenHash: hash(deviceToken), enrolledAt: now(), lastSeen: null, revoked: false
  };
  store.devices.push(device);
  audit("device.enrolled", "device", { deviceId: device.id, name });
  void persist();
  res.status(201).json({ deviceId: device.id, deviceToken, message: "Store this token securely; it is shown only once." });
});

app.post("/api/device/heartbeat", requireDevice, (req, res) => {
  const d = req.device;
  d.name = cleanText(req.body?.name, d.name);
  d.platform = cleanText(req.body?.platform, d.platform, 40);
  d.appVersion = cleanText(req.body?.appVersion, d.appVersion, 30);
  const battery = Number(req.body?.batteryPercent);
  d.batteryPercent = Number.isFinite(battery) ? Math.max(0, Math.min(100, Math.round(battery))) : d.batteryPercent;
  d.networkType = cleanText(req.body?.networkType, d.networkType, 30);
  d.lastSeen = now();
  void persist();
  res.json({ ok: true, serverTime: now() });
});

app.get("/api/device/commands", requireDevice, (req, res) => {
  const pending = store.commands.filter((c) => c.deviceId === req.device.id && c.status === "queued");
  pending.forEach((c) => { c.status = "delivered"; c.deliveredAt = now(); });
  void persist();
  res.json({ commands: pending.map(({ id: commandId, type, createdAt }) => ({ id: commandId, type, createdAt })) });
});

app.post("/api/device/commands/:commandId/ack", requireDevice, (req, res) => {
  const command = store.commands.find((c) => c.id === req.params.commandId && c.deviceId === req.device.id);
  if (!command) return res.status(404).json({ error: "Command not found" });
  command.status = "completed";
  command.completedAt = now();
  command.result = cleanText(req.body?.result, "Completed", 240);
  audit("command.completed", req.device.id, { commandId: command.id, type: command.type });
  void persist();
  res.json({ ok: true });
});

app.get("/api/devices", requireAdmin, (_req, res) => {
  res.json({ devices: store.devices.map(publicDevice).filter((d) => !d.revoked) });
});
app.get("/api/audit", requireAdmin, (_req, res) => res.json({ events: store.audit.slice(0, 100) }));
app.get("/api/commands", requireAdmin, (_req, res) => res.json({ commands: store.commands.slice(0, 100) }));

const ALLOWED_COMMANDS = new Set(["request_status", "network_diagnostics", "ping"]);
app.post("/api/devices/:deviceId/commands", requireAdmin, (req, res) => {
  const device = store.devices.find((d) => d.id === req.params.deviceId && !d.revoked);
  if (!device) return res.status(404).json({ error: "Device not found" });
  const type = req.body?.type;
  if (!ALLOWED_COMMANDS.has(type)) return res.status(400).json({ error: "Unsupported command" });
  const command = { id: id(), deviceId: device.id, type, status: "queued", createdAt: now() };
  store.commands.unshift(command);
  audit("command.queued", "admin", { deviceId: device.id, type });
  void persist();
  res.status(202).json({ command: { id: command.id, type, status: command.status } });
});

app.post("/api/devices/:deviceId/revoke", requireAdmin, (req, res) => {
  const device = store.devices.find((d) => d.id === req.params.deviceId);
  if (!device) return res.status(404).json({ error: "Device not found" });
  device.revoked = true;
  audit("device.revoked", "admin", { deviceId: device.id });
  void persist();
  res.json({ ok: true });
});

app.use(express.static(path.join(ROOT, "public")));
app.get("*", (_req, res) => res.sendFile(path.join(ROOT, "public", "index.html")));

async function telegramCall(method, body = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Telegram API returned " + response.status);
  return response.json();
}
async function telegramLoop() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    const result = await telegramCall("getUpdates", { offset: store.telegramOffset, timeout: 20, allowed_updates: ["message"] });
    for (const update of result?.result || []) {
      store.telegramOffset = update.update_id + 1;
      const message = update.message;
      const chatId = String(message?.chat?.id || "");
      if (chatId !== String(process.env.TELEGRAM_ADMIN_CHAT_ID)) continue;
      const command = String(message?.text || "").trim().split(/\s+/)[0].toLowerCase();
      let reply = "Commands: /help, /devices, /status";
      if (command === "/devices" || command === "/status") {
        const visible = store.devices.filter((d) => !d.revoked).map(publicDevice);
        const online = visible.filter((d) => d.status === "online").length;
        reply = "Devices: " + visible.length + "\nOnline: " + online + "\nOffline: " + (visible.length - online);
        if (command === "/devices") reply += "\n" + visible.slice(0, 20).map((d) => "• " + d.name + " — " + d.status).join("\n");
      } else if (command === "/help") {
        reply = "DogeRat Dashboard\n/devices — list enrolled devices\n/status — online summary\n/help — this help";
      }
      await telegramCall("sendMessage", { chat_id: chatId, text: reply });
    }
    await persist();
  } catch (error) {
    console.error("Telegram polling:", error.message);
  } finally {
    setTimeout(telegramLoop, 1500);
  }
}

await load();
app.listen(PORT, HOST, () => {
  console.log("DogeRat Device Dashboard listening on http://" + HOST + ":" + PORT);
  void telegramLoop();
});