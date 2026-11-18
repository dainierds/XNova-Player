package com.xnovaplayer.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.*
import com.xnovaplayer.app.data.database.entities.CategoryEntity
import com.xnovaplayer.app.ui.theme.XNovaCyan
import com.xnovaplayer.app.ui.theme.XNovaDarkSurface
import com.xnovaplayer.app.ui.theme.XNovaTextPrimary
import com.xnovaplayer.app.ui.theme.XNovaTextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun CategorySidebar(
    categories: List<CategoryEntity>,
    selectedCategory: CategoryEntity?,
    onCategoryClick: (CategoryEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(260.dp)
            .fillMaxHeight()
            .background(XNovaDarkSurface)
            .padding(vertical = 16.dp, horizontal = 12.dp)
    ) {
        // Título del Sidebar
        Text(
            text = "CATEGORÍAS",
            color = XNovaCyan,
            fontSize = 12.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.5.sp,
            modifier = Modifier.padding(start = 8.dp, bottom = 12.dp)
        )

        TvLazyColumn(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(categories, key = { it.categoryId }) { category ->
                val isSelected = category.categoryId == selectedCategory?.categoryId

                Surface(
                    onClick = { onCategoryClick(category) },
                    shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = if (isSelected) Color(0xFF1E293B) else Color.Transparent,
                        focusedContainerColor = XNovaCyan,
                        pressedContainerColor = XNovaCyan
                    ),
                    border = ClickableSurfaceDefaults.border(
                        border = BorderStroke(
                            width = if (isSelected) 1.5.dp else 0.dp,
                            color = if (isSelected) XNovaCyan else Color.Transparent
                        ),
                        focusedBorder = BorderStroke(2.dp, Color.White)
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = category.categoryName,
                            color = if (isSelected) Color.White else XNovaTextSecondary,
                            fontSize = 14.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }
}
