# DogeRat Device Dashboard

A consent-based device management dashboard with a Telegram status bot. This clean starter replaces the previous repository contents while preserving Git history.

## Included

- Browser dashboard for enrolled device inventory, online/offline status, battery/network summary, and audit events.
- Admin-token protected API.
- One-time enrollment-code exchange that issues a unique device credential.
- Device heartbeat endpoint and device-specific command queue.
- Strict safe-command allowlist: \`request_status\`, \`network_diagnostics\`, and \`ping\`.
- Telegram bot commands: \`/help\`, \`/devices\`, and \`/status\`, restricted to one configured admin chat.
- Device credential revocation and local JSON persistence.

## Explicit scope limits

This project does not implement covert monitoring or private-data extraction. It has no camera/microphone capture, SMS or OTP access, contacts harvesting, keylogging, hidden installation, permission bypass, persistence against user choice, or remote uninstall prevention. Devices must be enrolled knowingly and can be revoked by the administrator or removed by their owner.

## Requirements

- Node.js 20+
- A server you administer
- Optional Telegram bot created through BotFather

## Run locally

\`\`\`bash
npm install
cp .env.example .env
\`\`\`

Generate two separate secrets (at least 32 random bytes each), then set \`ADMIN_TOKEN\` and \`ENROLLMENT_CODE\` in \`.env\`. Add the Telegram bot token and the single admin chat ID if Telegram notifications are wanted.

\`\`\`bash
npm start
\`\`\`

Open \`http://127.0.0.1:3000\`. Enter the admin token in the dashboard.

## Device enrollment contract

A companion app that the device owner explicitly installs and opens can enroll with:

\`\`\`http
POST /api/devices/enroll
X-Enrollment-Code: YOUR_ENROLLMENT_CODE
Content-Type: application/json

{"name":"My Android","platform":"Android","appVersion":"1.0.0"}
\`\`\`

The response contains \`deviceId\` and \`deviceToken\`. Store the token securely on that device; it is returned only once.

Heartbeat:

\`\`\`http
POST /api/device/heartbeat
Authorization: Bearer DEVICE_TOKEN
Content-Type: application/json

{"name":"My Android","platform":"Android","appVersion":"1.0.0","batteryPercent":82,"networkType":"Wi-Fi"}
\`\`\`

A device may poll \`GET /api/device/commands\` and acknowledge an allowed command at \`POST /api/device/commands/:commandId/ack\`. Implement only the three documented safe command types in the companion app.

## Deployment security

- Do not expose this service directly to the public internet without HTTPS.
- Put it behind a TLS reverse proxy (for example, Caddy or Nginx).
- Bind to localhost by default; set \`HOST=0.0.0.0\` only behind a properly configured firewall and TLS proxy.
- Keep \`.env\` and \`data/store.json\` private and backed up.
- Use a unique admin token and enrollment code; rotate them if exposed.
- Restrict \`ALLOWED_ORIGIN\` to the dashboard origin.
- The built-in Telegram polling loop uses only the configured admin chat ID.

## Android companion app

A native Kotlin + Jetpack Compose MVP is included under `app/`.

- Enrolls only after the device owner enters the enrollment code.
- Stores the issued device credential using Android Keystore-backed encrypted preferences.
- Sends a heartbeat only when the user taps the button.
- Reports only device model, Android version, app version, battery percentage and network type.
- Includes an in-app disconnect/revoke action.
- Does not run a background service or access location, camera, microphone, SMS, contacts, calls, files or clipboard.

The **Android Companion APK** GitHub Actions workflow builds a debug APK and uploads it as the artifact `dogerat-companion-debug-apk`. Download it from the successful workflow run's Artifacts section. The APK is not ready until that workflow completes successfully.

Real device rows appear only after the companion app is explicitly enrolled and sends a heartbeat.
