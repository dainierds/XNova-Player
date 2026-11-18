package com.xnovaplayer.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.xnovaplayer.app.data.database.AppDatabase
import com.xnovaplayer.app.data.database.entities.CategoryEntity
import com.xnovaplayer.app.data.database.entities.MovieEntity
import com.xnovaplayer.app.data.repository.XtreamRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

sealed class CatalogUiState {
    object Idle : CatalogUiState()
    object Loading : CatalogUiState()
    data class Success(val count: Int) : CatalogUiState()
    data class Error(val message: String) : CatalogUiState()
}

class CatalogViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getInstance(application)
    private val repository = XtreamRepository(database)

    private val _categories = MutableStateFlow<List<CategoryEntity>>(emptyList())
    val categories: StateFlow<List<CategoryEntity>> = _categories.asStateFlow()

    private val _selectedCategory = MutableStateFlow<CategoryEntity?>(null)
    val selectedCategory: StateFlow<CategoryEntity?> = _selectedCategory.asStateFlow()

    private val _movies = MutableStateFlow<List<MovieEntity>>(emptyList())
    val movies: StateFlow<List<MovieEntity>> = _movies.asStateFlow()

    private val _focusedMovie = MutableStateFlow<MovieEntity?>(null)
    val focusedMovie: StateFlow<MovieEntity?> = _focusedMovie.asStateFlow()

    private val _syncState = MutableStateFlow<CatalogUiState>(CatalogUiState.Idle)
    val syncState: StateFlow<CatalogUiState> = _syncState.asStateFlow()

    init {
        observeCategories()
    }

    private fun observeCategories() {
        viewModelScope.launch {
            repository.getCategories("movie").collectLatest { list ->
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
            val list = if (category.categoryId == "all") {
                database.movieDao().getAllMovies()
            } else {
                database.movieDao().getMoviesByCategory(category.categoryId)
            }
            _movies.value = list
            if (list.isNotEmpty()) {
                _focusedMovie.value = list.first()
            }
        }
    }

    fun focusMovie(movie: MovieEntity) {
        _focusedMovie.value = movie
    }

    fun searchMovies(query: String) {
        viewModelScope.launch(Dispatchers.IO) {
            if (query.isBlank()) {
                _selectedCategory.value?.let { selectCategory(it) }
            } else {
                val results = database.movieDao().searchMovies("%$query%")
                _movies.value = results
                if (results.isNotEmpty()) {
                    _focusedMovie.value = results.first()
                }
            }
        }
    }

    fun syncCatalog(baseUrl: String, user: String, pass: String) {
        viewModelScope.launch(Dispatchers.IO) {
            _syncState.value = CatalogUiState.Loading
            val authSuccess = repository.login(baseUrl, user, pass)
            if (!authSuccess) {
                _syncState.value = CatalogUiState.Error("Credenciales o servidor inválido")
                return@launch
            }

            val catSuccess = repository.syncCategories()
            val movSuccess = repository.syncMovies()
            val serSuccess = repository.syncSeries()
            val chSuccess = repository.syncChannels()

            if (catSuccess && movSuccess) {
                val totalMovies = database.movieDao().getMovieCount()
                _syncState.value = CatalogUiState.Success(totalMovies)
            } else {
                _syncState.value = CatalogUiState.Error("Error al sincronizar catálogo")
            }
        }
    }
}
