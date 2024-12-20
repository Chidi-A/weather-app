// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateLocationName(locationName) {
    const locationElement = document.querySelector('.location-conditions h2');
    if (locationElement) {
        locationElement.textContent = locationName;
    }
}

// API Functions
async function searchLocations(searchTerm) {
    // Don't search if less than 2 characters
    if (!searchTerm.trim() || searchTerm.length < 2) {
        return [];
    }

    try {
        const url = `${OPENWEATHER_CONFIG.GEO_URL}?q=${encodeURIComponent(searchTerm)}&limit=5&appid=${OPENWEATHER_CONFIG.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 400) {
                console.log('Search term too short or invalid');
                return [];
            }
            throw new Error(`Weather API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Search data:', data); // Debug log
        
        // Extract location data from the response
        return [{
            name: searchTerm, // City name from search
            lat: data.location.lat,
            lon: data.location.lon,
            // You can add more location details if needed
        }];

    } catch (error) {
        console.error('Search failed:', error);
        handleError(error, 'api');
        return [];
    }
}

async function searchLocationAndWeather(searchTerm) {
    if (!searchTerm.trim()) return;

    try {
        const locations = await searchLocations(searchTerm);
        
        if (locations && locations.length > 0) {
            const location = locations[0];
            const weatherData = await getWeatherData(location.lat, location.lon);
            
            return { location, weather: weatherData };
        } else {
            throw new Error('Location not found');
        }

    } catch (error) {
        console.error('Search failed:', error);
        handleError(error, 'api');
    }
}

// UI Functions
async function searchCity(searchTerm) {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');
    
    if (!searchTerm.trim() || searchTerm.length < 2) {
        searchResults.innerHTML = '';
        return;
    }

    try {
        searchResults.innerHTML = '<div class="loading">Searching...</div>';
        
        // Get weather data directly from Tomorrow.io
        const url = `${OPENWEATHER_CONFIG.WEATHER_URL}?lat=${encodeURIComponent(searchTerm.lat)}&lon=${encodeURIComponent(searchTerm.lon)}&units=metric&appid=${OPENWEATHER_CONFIG.API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.location) {
            // Create a single result since Tomorrow.io returns exact match
            const resultHTML = `
                <div class="search-result" 
                     data-lat="${data.location.lat}"
                     data-lon="${data.location.lon}"
                     data-name="${searchTerm}">
                    <span class="city">${searchTerm}</span>
                </div>
            `;
            
            searchResults.innerHTML = resultHTML;
            
            // Add click handler
            const resultElement = searchResults.querySelector('.search-result');
            if (resultElement) {
                resultElement.addEventListener('click', async () => {
                    const { lat, lon, name } = resultElement.dataset;
                    
                    searchResults.innerHTML = '<div class="loading">Loading weather...</div>';
                    
                    try {
                        // Update weather display
                        const weatherData = await getWeatherData(lat, lon);
                        await updateCurrentWeather(weatherData, lat, lon);
                        
                        // Clear search
                        searchResults.innerHTML = '';
                        searchInput.value = '';
                    } catch (error) {
                        searchResults.innerHTML = '<div class="error">Failed to load weather data</div>';
                        console.error('Error loading weather:', error);
                    }
                });
            }
        } else {
            searchResults.innerHTML = '<div class="no-results">Location not found</div>';
        }

    } catch (error) {
        console.error('Search failed:', error);
        searchResults.innerHTML = '<div class="error">Error searching for location</div>';
    }
}

// Styles
const searchStyles = `
    .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        margin-top: 8px;
        max-height: 300px;
        overflow-y: auto;
    }

    .search-result {
        padding: 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .search-result:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .loading, .no-results, .error {
        padding: 12px;
        text-align: center;
        color: #fff;
    }

    .error {
        color: #ff6b6b;
    }
`;

// Initialization
function initializeSearch() {
    console.log('Initializing search...'); // Debug log

    // Setup search elements
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const searchResults = document.querySelector('.search-results');
    
    if (!searchInput || !searchButton) {
        console.error('Search elements not found');
        return;
    }

    // Debounced function for suggestions
    const debouncedSuggestions = debounce(async (searchTerm) => {
        if (!searchTerm || searchTerm.length < 2) {
            searchResults.innerHTML = '';
            return;
        }

        try {
            searchResults.innerHTML = '<div class="loading">Loading suggestions...</div>';
            
            // Get city suggestions from OpenWeatherMap
            const url = `${OPENWEATHER_CONFIG.GEO_URL}?q=${encodeURIComponent(searchTerm)}&limit=5&appid=${OPENWEATHER_CONFIG.API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.length > 0) {
                // Create suggestions HTML
                const suggestionsHTML = data.map(city => `
                    <div class="search-result" 
                         data-lat="${city.lat}"
                         data-lon="${city.lon}"
                         data-name="${city.name}, ${city.country}">
                        <span class="city">
                            ${highlightMatch(city.name, searchTerm)}
                            <span class="country">${city.state ? `${city.state}, ` : ''}${city.country}</span>
                        </span>
                    </div>
                `).join('');
                
                searchResults.innerHTML = suggestionsHTML;
                
                // Add click handlers to suggestions
                document.querySelectorAll('.search-result').forEach(result => {
                    result.addEventListener('click', async () => {
                        const { lat, lon, name } = result.dataset;
                        searchInput.value = name;
                        searchResults.innerHTML = '';
                        
                        // Get weather for selected city
                        try {
                            const weatherData = await getWeatherData(lat, lon);
                            await updateCurrentWeather(weatherData, lat, lon);
                        } catch (error) {
                            console.error('Error getting weather:', error);
                            searchResults.innerHTML = '<div class="error">Error loading weather data</div>';
                        }
                    });
                });
            } else {
                searchResults.innerHTML = '<div class="no-results">No matching cities found</div>';
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            searchResults.innerHTML = '<div class="error">Error loading suggestions</div>';
        }
    }, 300);

    // Function to handle search button click or Enter key
    const handleSearch = async () => {
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm || searchTerm.length < 2) {
            searchResults.innerHTML = '<div class="info">Please enter at least 2 characters</div>';
            return;
        }

        try {
            searchResults.innerHTML = '<div class="loading">Searching...</div>';
            
            // Get city coordinates
            const geoUrl = `${OPENWEATHER_CONFIG.GEO_URL}?q=${encodeURIComponent(searchTerm)}&limit=1&appid=${OPENWEATHER_CONFIG.API_KEY}`;
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();

            if (geoData && geoData.length > 0) {
                const { lat, lon } = geoData[0];
                const weatherData = await getWeatherData(lat, lon);
                await updateCurrentWeather(weatherData, lat, lon);
                searchResults.innerHTML = '';
                searchInput.value = '';
            } else {
                searchResults.innerHTML = '<div class="error">City not found</div>';
            }
        } catch (error) {
            console.error('Error during search:', error);
            searchResults.innerHTML = '<div class="error">Error performing search</div>';
        }
    };

    // Helper function to highlight matching text
    function highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    // Add input event listener for suggestions
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        debouncedSuggestions(searchTerm);
    });

    // Add click event listener to search button
    searchButton.addEventListener('click', handleSearch);

    // Add Enter key event listener to input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.innerHTML = '';
        }
    });
}

// Initialize search when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
    initializeSearch();
}