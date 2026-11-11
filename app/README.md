# Android Companion MVP

Native Kotlin + Jetpack Compose app for explicit enrollment and manual status reporting.

- The owner enters the API URL and enrollment code.
- The issued device token is stored using AndroidX EncryptedSharedPreferences backed by Android Keystore.
- Manual heartbeat contains device model, Android version, app version, battery percentage and network transport.
- The owner can revoke access from the app.
- No background service, location, camera, microphone, SMS, contacts, call logs, files or clipboard access.

Build with: `gradle :app:assembleDebug`

APK: `app/build/outputs/apk/debug/app-debug.apk`