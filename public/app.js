const $ = (id) => document.getElementById(id);
let adminToken = sessionStorage.getItem("dogerat_admin_token") || "";
const headers = () => ({ "content-type": "application/json", authorization: "Bearer " + adminToken });
function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed (" + response.status + ")");
  return data;
}
function ago(value) {
  if (!value) return "Never";
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return seconds + "s ago";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return new Date(value).toLocaleString();
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
async function refresh() {
  if (!adminToken) return;
  try {
    const [deviceData, auditData] = await Promise.all([api("/api/devices"), api("/api/audit")]);
    const devices = deviceData.devices || [];
    const online = devices.filter((d) => d.status === "online").length;
    $("total-count").textContent = devices.length;
    $("online-count").textContent = online;
    $("offline-count").textContent = devices.length - online;
    $("device-total").textContent = devices.length + " devices";
    $("api-state").textContent = "Connected";
    $("api-state").style.color = "var(--green)";
    $("device-rows").innerHTML = devices.length ? devices.map((d) => {
      const battery = Number.isFinite(d.batteryPercent) ? d.batteryPercent + "%" : "—";
      return "<tr><td><span class='device-name'>" + escapeHtml(d.name) + "</span><span class='device-sub'>" + escapeHtml(d.id.slice(0, 8)) + " · " + escapeHtml(d.appVersion || "unknown") + "</span></td><td>" + escapeHtml(d.platform) + "</td><td>" + battery + "</td><td>" + escapeHtml(d.networkType || "—") + "</td><td>" + ago(d.lastSeen) + "</td><td><span class='status " + d.status + "'>" + d.status + "</span></td><td><div class='action-group'><button class='mini' data-command='request_status' data-id='" + escapeHtml(d.id) + "'>Status</button><button class='mini' data-command='network_diagnostics' data-id='" + escapeHtml(d.id) + "'>Network</button><button class='mini danger' data-revoke='" + escapeHtml(d.id) + "'>Revoke</button></div></td></tr>";
    }).join("") : "<tr><td colspan='7' class='empty'>No devices enrolled yet. Pair a device using the enrollment API.</td></tr>";
    $("activity-list").innerHTML = (auditData.events || []).slice(0, 12).map((event) =>
      "<div class='activity-item'><span>" + escapeHtml(event.action) + "</span><time>" + ago(event.at) + "</time></div>"
    ).join("") || "<p class='empty'>No activity yet.</p>";
  } catch (error) {
    $("api-state").textContent = "Authentication failed";
    $("api-state").style.color = "var(--red)";
    toast(error.message);
  }
}
$("connect").addEventListener("click", async () => {
  adminToken = $("admin-token").value.trim();
  if (!adminToken) return toast("Enter your admin token.");
  sessionStorage.setItem("dogerat_admin_token", adminToken);
  await refresh();
});
$("refresh").addEventListener("click", refresh);
$("device-rows").addEventListener("click", async (event) => {
  const command = event.target.closest("[data-command]");
  const revoke = event.target.closest("[data-revoke]");
  try {
    if (command) {
      await api("/api/devices/" + encodeURIComponent(command.dataset.id) + "/commands", {
        method: "POST", body: JSON.stringify({ type: command.dataset.command })
      });
      toast("Safe command queued.");
    } else if (revoke) {
      if (!confirm("Revoke this device's dashboard access?")) return;
      await api("/api/devices/" + encodeURIComponent(revoke.dataset.revoke) + "/revoke", { method: "POST" });
      toast("Device access revoked.");
    }
    await refresh();
  } catch (error) { toast(error.message); }
});
if (adminToken) { $("admin-token").value = adminToken; void refresh(); }
