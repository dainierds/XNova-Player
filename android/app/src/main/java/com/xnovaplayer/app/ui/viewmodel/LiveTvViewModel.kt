package com.xnovaplayer.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.xnovaplayer.app.data.database.AppDatabase
import com.xnovaplayer.app.data.database.entities.CategoryEntity
import com.xnovaplayer.app.data.database.entities.ChannelEntity
import com.xnovaplayer.app.data.repository.XtreamRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class LiveTvViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getInstance(application)
    private val repository = XtreamRepository(database)

    private val _categories = MutableStateFlow<List<CategoryEntity>>(emptyList())
    val categories: StateFlow<List<CategoryEntity>> = _categories.asStateFlow()

    private val _selectedCategory = MutableStateFlow<CategoryEntity?>(null)
    val selectedCategory: StateFlow<CategoryEntity?> = _selectedCategory.asStateFlow()

    private val _channels = MutableStateFlow<List<ChannelEntity>>(emptyList())
    val channels: StateFlow<List<ChannelEntity>> = _channels.asStateFlow()

    private val _currentChannel = MutableStateFlow<ChannelEntity?>(null)
    val currentChannel: StateFlow<ChannelEntity?> = _currentChannel.asStateFlow()

    private val _isOverlayVisible = MutableStateFlow(false)
    val isOverlayVisible: StateFlow<Boolean> = _isOverlayVisible.asStateFlow()

    private val _isZappingBannerVisible = MutableStateFlow(false)
    val isZappingBannerVisible: StateFlow<Boolean> = _isZappingBannerVisible.asStateFlow()

    private var zappingTimerJob: Job? = null

    init {
        observeCategories()
    }

    private fun observeCategories() {
        viewModelScope.launch {
            repository.observeCategories("live").collectLatest { list ->
                _categories.value = list
                if (_selectedCategory.value == null && list.isNotEmpty()) {
                    selectCategory(list.first())
                }
            }
        }
    }

    fun selectCategory(category: CategoryEntity) {
        _selectedCategory.value = category
        viewModelScope.launch(Dispatchers.IO) {
            val list = database.channelDao().getChannelsByCategoryList(category.categoryId)
            _channels.value = list
            if (_currentChannel.value == null && list.isNotEmpty()) {
                selectChannel(list.first())
            }
        }
    }

    fun selectChannel(channel: ChannelEntity) {
        _currentChannel.value = channel
        showZappingBanner()
    }

    fun nextChannel() {
        val list = _channels.value
        if (list.isEmpty()) return
        val currentIndex = list.indexOfFirst { it.streamId == _currentChannel.value?.streamId }
        val nextIndex = if (currentIndex >= 0 && currentIndex < list.size - 1) currentIndex + 1 else 0
        selectChannel(list[nextIndex])
    }

    fun prevChannel() {
        val list = _channels.value
        if (list.isEmpty()) return
        val currentIndex = list.indexOfFirst { it.streamId == _currentChannel.value?.streamId }
        val prevIndex = if (currentIndex > 0) currentIndex - 1 else list.size - 1
        selectChannel(list[prevIndex])
    }

    fun toggleOverlay() {
        _isOverlayVisible.value = !_isOverlayVisible.value
    }

    fun hideOverlay() {
        _isOverlayVisible.value = false
    }

    private fun showZappingBanner() {
        _isZappingBannerVisible.value = true
        zappingTimerJob?.cancel()
        zappingTimerJob = viewModelScope.launch {
            delay(3500)
            _isZappingBannerVisible.value = false
        }
    }

    fun syncChannels(baseUrl: String, user: String, pass: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.updateCredentials(baseUrl, user, pass)
            repository.syncCategories("live")
            repository.syncChannels()
        }
    }
}
