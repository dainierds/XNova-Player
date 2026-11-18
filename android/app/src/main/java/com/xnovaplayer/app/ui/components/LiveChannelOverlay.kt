package com.xnovaplayer.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.xnovaplayer.app.data.database.entities.CategoryEntity
import com.xnovaplayer.app.data.database.entities.ChannelEntity
import com.xnovaplayer.app.ui.theme.XNovaCyan
import com.xnovaplayer.app.ui.theme.XNovaTextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveChannelOverlay(
    isVisible: Boolean,
    categories: List<CategoryEntity>,
    selectedCategory: CategoryEntity?,
    channels: List<ChannelEntity>,
    currentChannel: ChannelEntity?,
    onCategoryClick: (CategoryEntity) -> Unit,
    onChannelClick: (ChannelEntity) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isVisible,
        enter = slideInHorizontally(initialOffsetX = { -it }) + fadeIn(),
        exit = slideOutHorizontally(targetOffsetX = { -it }) + fadeOut(),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxHeight()
                .width(620.dp)
                .background(Color(0xF0070B14))
                .border(
                    BorderStroke(1.dp, Color(0x3338BDF8))
                )
        ) {
            // Columna 1: Categorías de Canales (240dp)
            Column(
                modifier = Modifier
                    .width(240.dp)
                    .fillMaxHeight()
                    .background(Color(0xFF0F172A).copy(alpha = 0.85f))
                    .padding(12.dp)
            ) {
                Text(
                    text = "CANALES EN VIVO",
                    color = XNovaCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.2.sp,
                    modifier = Modifier.padding(start = 6.dp, bottom = 12.dp, top = 4.dp)
                )

                TvLazyColumn(
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(categories, key = { it.categoryId }) { cat ->
                        val isSelected = cat.categoryId == selectedCategory?.categoryId

                        Surface(
                            onClick = { onCategoryClick(cat) },
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = if (isSelected) Color(0xFF1E293B) else Color.Transparent,
                                focusedContainerColor = XNovaCyan
                            ),
                            border = ClickableSurfaceDefaults.border(
                                border = if (isSelected) Border(BorderStroke(1.dp, XNovaCyan)) else Border.None,
                                focusedBorder = Border(BorderStroke(2.dp, Color.White))
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(40.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 10.dp),
                                contentAlignment = Alignment.CenterStart
                            ) {
                                Text(
                                    text = cat.categoryName,
                                    color = if (isSelected) Color.White else XNovaTextSecondary,
                                    fontSize = 13.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }

            // Columna 2: Lista de Canales de la categoría seleccionada (380dp)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(12.dp)
            ) {
                Text(
                    text = selectedCategory?.categoryName?.uppercase() ?: "CANALES",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 6.dp, bottom = 12.dp, top = 4.dp)
                )

                TvLazyColumn(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(channels, key = { it.streamId }) { ch ->
                        val isPlaying = ch.streamId == currentChannel?.streamId

                        Surface(
                            onClick = {
                                onChannelClick(ch)
                                onDismiss()
                            },
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = if (isPlaying) Color(0x3300F0FF) else Color(0xFF111827),
                                focusedContainerColor = Color(0xFF1E293B)
                            ),
                            border = ClickableSurfaceDefaults.border(
                                border = if (isPlaying) Border(BorderStroke(1.dp, XNovaCyan)) else Border.None,
                                focusedBorder = Border(BorderStroke(2.dp, XNovaCyan))
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // Logo del canal
                                if (!ch.streamIcon.isNullOrBlank()) {
                                    AsyncImage(
                                        model = ch.streamIcon,
                                        contentDescription = ch.name,
                                        contentScale = ContentScale.Fit,
                                        modifier = Modifier
                                            .size(34.dp)
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(Color(0x22FFFFFF))
                                            .padding(2.dp)
                                    )
                                }

                                // Nombre del canal
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = ch.name,
                                        color = if (isPlaying) XNovaCyan else Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = if (isPlaying) FontWeight.Bold else FontWeight.Medium,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }

                                if (isPlaying) {
                                    Text(
                                        text = "EN VIVO",
                                        color = XNovaCyan,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
