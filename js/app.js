const STORAGE_KEY = 'CRANCKY_flix';
const FAVORITES_KEY = 'CRANCKY_favorites';
const YOUTUBE_API_KEY = 'AIzaSyCfv_srvbbCE-OaN9bEIgwZNGt6kPJu-r4';

async function fetchYouTubeTrailer(movieTitle, year) {
    try {
        const searchQuery = `${movieTitle} ${year} official trailer`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}`; 
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const videoId = data.items[0].id.videoId;
            return {
             videoId: videoId,
             embedUrl: `https://www.youtube.com/embed/${videoId}`,
             watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
             title: data.items[0].snippet.title,
             thumbnail: data.items[0].snippet.thumbnails.medium.url
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching trailer:', error);
        return null;
    }
}

function displayTrailer(videoId) {
    let modal = document.getElementById('trailer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'trailer-modal';
      modal.className = 'trailer-modal'; 
      modal.innerHTML = `
            <div class="trailer-modal-content">
             <span class="trailer-close-btn">&times;</span>
                <div class="trailer-embed-container">
                    <iframe id="trailer-iframe" src="" allowfullscreen></iframe>
                </div>
            </div>
        `;
        document.body.appendChild(modal);       
        modal.querySelector('.trailer-close-btn').addEventListener('click', function() {
         modal.style.display = 'none';
         document.getElementById('trailer-iframe').src = '';
        });
        
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
             modal.style.display = 'none';
             document.getElementById('trailer-iframe').src = '';
            }
        });
    }
    
    const iframe = document.getElementById('trailer-iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.style.display = 'flex';
}

async function watchTrailer(movieTitle, year) {
    const trailer = await fetchYouTubeTrailer(movieTitle, year);
    if (trailer) {
        displayTrailer(trailer.videoId);
    } else {
        alert('🎬 No trailer found for this movie.');
    }
}

// Expose watchTrailer to global scope
window.watchTrailer = watchTrailer;

// DATA FUNCTIONS (localStorage)
function getMovies() {
 const movies = localStorage.getItem(STORAGE_KEY);
 return movies ? JSON.parse(movies) : [];
}

function saveMovies(movies) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

function addMovie(movie) {
 const movies = getMovies();
 movie.id = Date.now();
 movies.push(movie);
 saveMovies(movies);
 return movie;
}

function deleteMovie(movieId) {
 const movies = getMovies();
 const filtered = movies.filter(m => m.id !== movieId);
 saveMovies(filtered);
 return filtered;
}

// FAVORITES FUNCTIONS
function getFavorites() {
 const favs = localStorage.getItem(FAVORITES_KEY);
 return favs ? JSON.parse(favs) : [];
}

function saveFavorites(favs) {
 localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function toggleFavorite(movieId) {
    let favs = getFavorites();
    const index = favs.indexOf(movieId);
    if (index > -1) {
        favs.splice(index, 1);
    } else {
        favs.push(movieId);
    }
    saveFavorites(favs);
    return favs;
}

function isFavorite(movieId) {
 return getFavorites().includes(movieId);
}

// UI FUNCTIONS
function formatRating(rating) {
 const fullStars = '★'.repeat(Math.floor(rating));
 const halfStar = rating % 1 !== 0 ? '½' : '';
 return fullStars + halfStar;
}

function createMovieCard(movie) {
    const isFav = isFavorite(movie.id);
    const safeTitle = movie.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
        <div class="movie-card ${isFav ? 'favorite' : ''}" data-id="${movie.id}">
            <h3>${movie.title} ${isFav ? '⭐' : ''}</h3>
            <div class="movie-meta">${movie.genre} (${movie.year})</div>
            <div class="movie-rating">${formatRating(movie.rating)}</div>
            <div class="movie-review">${movie.review || 'No review provided'}</div>
            <div class="card-actions">
                <button class="trailer-btn" onclick="watchTrailer('${safeTitle}', ${movie.year})">▶️ Trailer</button>
                <button class="favorite-btn" onclick="handleToggleFavorite(${movie.id})">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <button class="delete-btn" onclick="handleDelete(${movie.id})">Delete</button>
            </div>
        </div>
    `;
}

// VIEW: HOME
function loadHome() {
    const container = document.getElementById('recent-movies-container');
    if (!container) return;

    const movies = getMovies();
    if (movies.length === 0) {
        container.innerHTML = `
            <p class="empty-message">No movies in collection yet. 
            <a href="#add" class="nav-link" data-view="add">Add your first movie!</a></p>
        `;
    } else {
        const recent = [...movies]
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, 3);
        container.innerHTML = recent.map(createMovieCard).join('');
    }
}

// VIEW: COLLECTION
function loadCollection() {
 const movies = getMovies();
 displayMovies(movies);
}

function displayMovies(movies) {
    const grid = document.getElementById('movies-grid');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const genreFilter = document.getElementById('genre-filter');

    if (!grid) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedGenre = genreFilter ? genreFilter.value : 'all';

    let filtered = [...movies];

    if (searchTerm) {
        filtered = filtered.filter(m => m.title.toLowerCase().includes(searchTerm));
    }

    if (selectedGenre !== 'all') {
        filtered = filtered.filter(m => m.genre === selectedGenre);
    }

    if (filtered.length === 0) {
        grid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            if (searchTerm || selectedGenre !== 'all') {
                emptyState.innerHTML = `
                    <p>No movies match your filters.</p>
                    <button class="btn btn-primary" onclick="clearFilters()">Clear Filters</button>
                `;
            } else {
                emptyState.innerHTML = `
                    <p>No movies in your collection yet.</p>
                    <a href="#add" class="btn btn-primary nav-link" data-view="add">Add Your First Movie</a>
                `;
            }
        }
    } else {
        grid.style.display = 'grid';
        grid.innerHTML = filtered.map(createMovieCard).join('');
        if (emptyState) emptyState.style.display = 'none';
    }
}

function clearFilters() {
 const searchInput = document.getElementById('search-input');
 const genreFilter = document.getElementById('genre-filter');
 if (searchInput) searchInput.value = '';
 if (genreFilter) genreFilter.value = 'all';
 loadCollection();
}
window.clearFilters = clearFilters;

// VIEW: FAVORITES
function loadFavorites() {
    const grid = document.getElementById('favorites-grid');
    const emptyState = document.getElementById('favorites-empty');
    const countDisplay = document.getElementById('favorites-count');

    if (!grid) return;
    const allMovies = getMovies();
    const favIds = getFavorites();
    const favorites = allMovies.filter(m => favIds.includes(m.id));

    if (countDisplay) {
      countDisplay.textContent = `${favorites.length} favorite${favorites.length !== 1 ? 's' : ''} saved`;
    }

    if (favorites.length === 0) {
     grid.style.display = 'none';
     if (emptyState) emptyState.style.display = 'block';
    } else {
     grid.style.display = 'grid';
     grid.innerHTML = favorites.map(createMovieCard).join('');
     if (emptyState) emptyState.style.display = 'none';
    }
}

// HANDLE: Toggle Favorite
function handleToggleFavorite(movieId) {
    toggleFavorite(movieId);
    const activeView = document.querySelector('.view.active');
    if (activeView) {
     const id = activeView.id;
     if (id === 'view-home') loadHome();
     else if (id === 'view-collection') loadCollection();
     else if (id === 'view-favorites') loadFavorites();
    }
}
window.handleToggleFavorite = handleToggleFavorite;

// HANDLE: Delete Movie
function handleDelete(movieId) {
    if (confirm('Are you sure you want to delete this movie?')) {
     deleteMovie(movieId);
     const favs = getFavorites();
     const updated = favs.filter(id => id !== movieId);
     saveFavorites(updated);
     const activeView = document.querySelector('.view.active');
        if (activeView) {
         const id = activeView.id;
         if (id === 'view-home') loadHome();
         else if (id === 'view-collection') loadCollection();
         else if (id === 'view-favorites') loadFavorites();
        }
    }
}
window.handleDelete = handleDelete;

// ROUTER (SPA Navigation)
document.addEventListener('DOMContentLoaded', function() {
    const views = {
     home: document.getElementById('view-home'),
     collection: document.getElementById('view-collection'),
     favorites: document.getElementById('view-favorites'),
     add: document.getElementById('view-add')
    };

    const navLinks = document.querySelectorAll('.nav-link');
    let currentView = 'home';

    function switchView(viewName) {
        Object.keys(views).forEach(key => {
            views[key].classList.remove('active');
        });

        if (views[viewName]) {
            views[viewName].classList.add('active');
            currentView = viewName;
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            }
        });

        window.location.hash = viewName;
        if (viewName === 'home') loadHome();
        else if (viewName === 'collection') loadCollection();
        else if (viewName === 'favorites') loadFavorites();
    }
    window.switchView = switchView;
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
         e.preventDefault();
         const view = this.dataset.view;
         if (view) switchView(view);
        });
    });

    window.addEventListener('hashchange', function() {
     const hash = window.location.hash.replace('#', '') || 'home';
     if (views[hash]) switchView(hash);
    });

    // SEARCH & FILTER
    const searchInput = document.getElementById('search-input');
    const genreFilter = document.getElementById('genre-filter');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (currentView === 'collection') loadCollection();
        });
    }

    if (genreFilter) {
        genreFilter.addEventListener('change', function() {
            if (currentView === 'collection') loadCollection();
        });
    }

    // FORM HANDLING
    const form = document.getElementById('movie-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = {
             title: document.getElementById('title').value.trim(),
             genre: document.getElementById('genre').value,
             year: document.getElementById('year').value,
             rating: document.getElementById('rating').value,
             review: document.getElementById('review').value.trim(),
             dateAdded: new Date().toISOString()
            };

            if (validateForm(formData)) {
                try {
                    addMovie(formData);
                    const msg = document.getElementById('form-message');
                    msg.textContent = '✅ Movie added successfully!';
                    msg.className = 'form-message success';
                    form.reset();
                    setTimeout(() => {
                     msg.textContent = '';
                     msg.className = 'form-message';
                     switchView('collection');
                     loadCollection();
                    }, 1500);
                } catch (error) {
                 const msg = document.getElementById('form-message');
                 msg.textContent = '❌ Error adding movie. Please try again.';
                 msg.className = 'form-message error';
                }
            }
        });

        form.addEventListener('reset', function() {
         clearErrors();
         const msg = document.getElementById('form-message');
         msg.textContent = '';
         msg.className = 'form-message';
        });
    }

    // INITIALIZE
    const initialView = window.location.hash.replace('#', '') || 'home';
    switchView(initialView);
});

// FORM VALIDATION
function validateForm(formData) {
    let isValid = true;
    clearErrors();

    if (!formData.title || formData.title.trim().length < 2) {
     const el = document.getElementById('title-error');
     if (el) el.textContent = 'Title must be at least 2 characters';
     const input = document.getElementById('title');
     if (input) input.classList.add('error');
     isValid = false;
    }

    if (!formData.genre || formData.genre === '') {
     const el = document.getElementById('genre-error');
     if (el) el.textContent = 'Please select a genre';
     const input = document.getElementById('genre');
     if (input) input.classList.add('error');
     isValid = false;
    }

    const year = parseInt(formData.year);
    const currentYear = new Date().getFullYear();
    if (!formData.year || year < 1900 || year > currentYear + 5) {
     const el = document.getElementById('year-error');
     if (el) el.textContent = `Year must be between 1900 and ${currentYear + 5}`;
     const input = document.getElementById('year');
     if (input) input.classList.add('error');
     isValid = false;
    }

    const rating = parseFloat(formData.rating);
    if (!formData.rating || rating < 1 || rating > 5) {
     const el = document.getElementById('rating-error');
     if (el) el.textContent = 'Rating must be between 1 and 5';
     const input = document.getElementById('rating');
     if (input) input.classList.add('error');
     isValid = false;
    }

    return isValid;
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(el => {
        el.classList.remove('error');
    });
}