package com.dogerat.companion

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CompanionScreen() }
    }
}

@Composable
private fun CompanionScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var apiBase by remember { mutableStateOf(SecureStore.apiBase(context)) }
    var code by remember { mutableStateOf("") }
    var deviceId by remember { mutableStateOf(SecureStore.deviceId(context)) }
    var enrolled by remember { mutableStateOf(SecureStore.token(context).isNotBlank()) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("Heartbeat is sent only when you tap the button.") }

    MaterialTheme(colorScheme = darkColorScheme(primary = Color(0xFF9B8CFF), background = Color(0xFF0B1020),
        surface = Color(0xFF141F34), onSurface = Color(0xFFEAF0FF))) {
        Surface(Modifier.fillMaxSize(), color = Color(0xFF0B1020)) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("DOGERAT", color = Color(0xFF9B8CFF), fontWeight = FontWeight.Bold)
                Text("Device Companion", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Transparent, owner-controlled registration and status reporting.", color = Color(0xFF9AA8C0))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF141F34))) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(if (enrolled) "Device enrolled" else "Enroll this device", fontWeight = FontWeight.Bold)
                        Text(if (enrolled) "Device ID: " + deviceId.take(8) + "…" else "Enter your API URL and enrollment code.")
                        OutlinedTextField(value = apiBase, onValueChange = { apiBase = it },
                            modifier = Modifier.fillMaxWidth(), label = { Text("Dashboard API URL") },
                            placeholder = { Text("https://your-api.example.com") }, singleLine = true, enabled = !enrolled && !busy)
                        if (!enrolled) {
                            OutlinedTextField(value = code, onValueChange = { code = it },
                                modifier = Modifier.fillMaxWidth(), label = { Text("Enrollment code") },
                                singleLine = true, enabled = !busy)
                            Button(onClick = {
                                busy = true; message = "Registering device…"
                                scope.launch {
                                    try {
                                        val result = withContext(Dispatchers.IO) { DashboardApi.enroll(apiBase, code) }
                                        SecureStore.saveEnrollment(context, apiBase.trim().trimEnd('/'), result.deviceId, result.token)
                                        deviceId = result.deviceId; enrolled = true; code = ""
                                        message = "Enrolled. Device credential is encrypted on this phone."
                                    } catch (e: Exception) { message = e.message ?: "Enrollment failed." }
                                    finally { busy = false }
                                }
                            }, enabled = !busy && apiBase.isNotBlank() && code.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                                Text(if (busy) "Please wait…" else "Enroll device")
                            }
                        } else {
                            Button(onClick = {
                                busy = true; message = "Sending heartbeat…"
                                scope.launch {
                                    try {
                                        withContext(Dispatchers.IO) {
                                            DashboardApi.heartbeat(context, apiBase, SecureStore.token(context))
                                        }
                                        val time = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                                        message = "Heartbeat sent successfully at " + time + "."
                                    } catch (e: Exception) { message = e.message ?: "Heartbeat failed." }
                                    finally { busy = false }
                                }
                            }, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                                Text(if (busy) "Sending…" else "Send heartbeat")
                            }
                            OutlinedButton(onClick = {
                                busy = true
                                scope.launch {
                                    try {
                                        withContext(Dispatchers.IO) { DashboardApi.revoke(apiBase, SecureStore.token(context)) }
                                        SecureStore.clearEnrollment(context); deviceId = ""; enrolled = false
                                        message = "Server access revoked and local credentials cleared."
                                    } catch (e: Exception) { message = e.message ?: "Could not revoke access." }
                                    finally { busy = false }
                                }
                            }, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                                Text("Disconnect and revoke access")
                            }
                        }
                    }
                }
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF111A2D))) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Activity", fontWeight = FontWeight.Bold)
                        Text(message, color = Color(0xFFB7C4DA))
                        Text("Status shared: device model, Android version, app version, battery percentage and network type. No location, messages, contacts, camera, microphone or files are accessed.",
                            color = Color(0xFF8795AD), style = MaterialTheme.typography.bodySmall)
                    }
                }
                Text("Manual heartbeat only. No hidden background service.", color = Color(0xFF8795AD),
                    style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}