package com.xnovaplayer.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.xnovaplayer.app.data.security.ParentalControlManager
import com.xnovaplayer.app.ui.theme.XNovaCyan
import com.xnovaplayer.app.ui.theme.XNovaDarkSurface
import com.xnovaplayer.app.ui.theme.XNovaTextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PinEntryDialog(
    isOpen: Boolean,
    title: String = "Control Parental (+18)",
    onSuccess: () -> Unit,
    onDismiss: () -> Unit
) {
    if (!isOpen) return

    val context = LocalContext.current
    val manager = remember { ParentalControlManager(context) }
    var enteredPin by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }

    fun onDigit(d: String) {
        if (enteredPin.length < 4) {
            val newPin = enteredPin + d
            enteredPin = newPin
            isError = false
            if (newPin.length == 4) {
                if (manager.verifyPin(newPin)) {
                    enteredPin = ""
                    onSuccess()
                } else {
                    isError = true
                    enteredPin = ""
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xD9000000)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(360.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(XNovaDarkSurface)
                .border(BorderStroke(1.5.dp, if (isError) Color(0xFFEF4444) else XNovaCyan), RoundedCornerShape(16.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = if (isError) "PIN Incorrecto (Por defecto: 0000)" else "Ingresa tu PIN de 4 dígitos",
                color = if (isError) Color(0xFFEF4444) else XNovaTextSecondary,
                fontSize = 12.sp,
                fontWeight = if (isError) FontWeight.Bold else FontWeight.Normal
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Indicador de 4 dígitos (puntos)
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 0 until 4) {
                    val filled = i < enteredPin.length
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(if (filled) XNovaCyan else Color(0xFF334155))
                            .border(1.dp, if (filled) Color.White else Color(0x33FFFFFF), CircleShape)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Teclado numérico D-Pad optimizado (1-9, 0, Borrar)
            val buttons = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("Borrar", "0", "Salir")
            )

            buttons.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    row.forEach { key ->
                        Surface(
                            onClick = {
                                when (key) {
                                    "Borrar" -> if (enteredPin.isNotEmpty()) enteredPin = enteredPin.dropLast(1)
                                    "Salir" -> onDismiss()
                                    else -> onDigit(key)
                                }
                            },
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = Color(0xFF1E293B),
                                focusedContainerColor = XNovaCyan
                            ),
                            border = ClickableSurfaceDefaults.border(
                                focusedBorder = Border(BorderStroke(2.dp, Color.White))
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(42.dp)
                        ) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = key,
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}
