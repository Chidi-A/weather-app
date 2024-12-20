// Config
const OPENWEATHER_CONFIG = {
    API_KEY: 'e8e3bcc50013da319ed44dcbfba39f42',
    GEO_URL: 'https://api.openweathermap.org/geo/1.0/direct',
    WEATHER_URL: 'https://api.openweathermap.org/data/2.5/weather',
    ICON_URL: 'https://openweathermap.org/img/wn',
    FORECAST_URL: 'https://api.openweathermap.org/data/2.5/forecast',
    ONECALL_URL: 'https://api.openweathermap.org/data/3.0/onecall'
};

async function getWeatherData(latitude, longitude) {
    try {
        const url = `${OPENWEATHER_CONFIG.WEATHER_URL}?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_CONFIG.API_KEY}`;
        console.log('Fetching weather from:', url); // Debug log
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Weather API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Weather data:', data); // Debug log
        return data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

function parseCurrentWeather(weatherData) {
    return {
        temperature: Math.round(weatherData.main.temp),
        weatherCode: weatherData.weather[0].id,
        weatherIcon: weatherData.weather[0].icon,
        humidity: weatherData.main.humidity,
        windSpeed: weatherData.wind.speed,
        feelsLike: Math.round(weatherData.main.feels_like),
        description: weatherData.weather[0].description,
        cityName: weatherData.name
    };
}

function getWeatherIcon(iconCode) {
    return `${OPENWEATHER_CONFIG.ICON_URL}/${iconCode}@2x.png`;
}

function getWeatherCondition(weatherCode) {
    const weatherConditions = {
        // Thunderstorm
        200: "Thunderstorm with Light Rain",
        201: "Thunderstorm with Rain",
        202: "Thunderstorm with Heavy Rain",
        210: "Light Thunderstorm",
        211: "Thunderstorm",
        212: "Heavy Thunderstorm",
        221: "Ragged Thunderstorm",
        230: "Thunderstorm with Light Drizzle",
        231: "Thunderstorm with Drizzle",
        232: "Thunderstorm with Heavy Drizzle",
        
        // Drizzle
        300: "Light Drizzle",
        301: "Drizzle",
        302: "Heavy Drizzle",
        310: "Light Rain",
        311: "Drizzle Rain",
        312: "Heavy Drizzle Rain",
        313: "Shower Rain and Drizzle",
        314: "Heavy Shower Rain and Drizzle",
        321: "Shower Drizzle",
        
        // Rain
        500: "Light Rain",
        501: "Moderate Rain",
        502: "Heavy Rain",
        503: "Very Heavy Rain",
        504: "Extreme Rain",
        511: "Freezing Rain",
        520: "Light Shower Rain",
        521: "Shower Rain",
        522: "Heavy Shower Rain",
        531: "Ragged Shower Rain",
        
        // Snow
        600: "Light Snow",
        601: "Snow",
        602: "Heavy Snow",
        611: "Sleet",
        612: "Light Shower Sleet",
        613: "Shower Sleet",
        615: "Light Rain and Snow",
        616: "Rain and Snow",
        620: "Light Shower Snow",
        621: "Shower Snow",
        622: "Heavy Shower Snow",
        
        // Atmosphere
        701: "Mist",
        711: "Smoke",
        721: "Haze",
        731: "Sand/Dust Whirls",
        741: "Fog",
        751: "Sand",
        761: "Dust",
        762: "Volcanic Ash",
        771: "Squalls",
        781: "Tornado",
        
        // Clear and Clouds
        800: "Clear Sky",
        801: "Few Clouds",
        802: "Scattered Clouds",
        803: "Broken Clouds",
        804: "Overcast Clouds"
    };
    return weatherConditions[weatherCode] || "Unknown";
}

function getApproximateUVIndex(weatherData) {
    const hour = new Date(weatherData.dt * 1000).getHours();
    const clouds = weatherData.clouds.all; // Cloud coverage percentage
    
    // Base UV index on time of day (peak at noon)
    let baseUV = 0;
    if (hour >= 6 && hour <= 18) { // Daylight hours
        // Peak UV at noon (hour 12)
        baseUV = 10 - Math.abs(12 - hour);
        
        // Reduce UV based on cloud coverage
        baseUV = baseUV * (1 - (clouds / 100));
    }
    
    return Math.max(0, Math.min(11, Math.round(baseUV)));
}

async function updateCurrentWeather(weatherData, latitude, longitude) {
    try {
        console.log('Updating current weather with data:', weatherData); // Debug log
        const parsedData = parseCurrentWeather(weatherData);
        
        // Get the current weather section
        const weatherSection = document.querySelector('.current-weather');
        if (!weatherSection) {
            console.error('Weather section not found');
            return;
        }

        // Update the weather section HTML
        weatherSection.innerHTML = `
            <div class="weather-info">
                <div class="location-conditions">
                    <h2>${parsedData.cityName}</h2>
                    <p class="weather-condition">${getWeatherCondition(parsedData.weatherCode)}</p>
                </div>
                <div class="temperature">
                    <span>${parsedData.temperature}°</span>
                </div>
            </div>
            <img src="${getWeatherIcon(parsedData.weatherIcon)}" alt="${parsedData.description}" class="weather-icon">
        `;

        // Calculate approximate UV index
        const uvIndex = getApproximateUVIndex(weatherData);

        // Update air conditions
        updateAirConditions({
            feelsLike: parsedData.feelsLike,
            humidity: parsedData.humidity,
            windSpeed: parsedData.windSpeed,
            uvIndex: uvIndex
        });

        // Get and update forecasts
        const forecastData = await getWeatherForecast(latitude, longitude);
        updateHourlyForecast(forecastData.hourly);
        updateDailyForecast(forecastData.daily);

    } catch (error) {
        console.error('Error updating current weather:', error);
        handleError(error);
    }
}

function updateAirConditions(data) {
    // Update Real Feel
    const realFeelElement = document.querySelector('.condition-card:has(img[alt="Real Feel"]) .value');
    if (realFeelElement) {
        realFeelElement.textContent = `${data.feelsLike}°`;
    }

    // Update Wind
    const windElement = document.querySelector('.condition-card:has(img[alt="Wind"]) .value');
    if (windElement) {
        // Convert m/s to km/h (multiply by 3.6)
        const windSpeedKmh = Math.round(data.windSpeed * 3.6);
        windElement.textContent = `${windSpeedKmh} km/h`;
    }

    // Update UV Index
    const uvElement = document.querySelector('.condition-card:has(img[alt="UV Index"]) .value');
    if (uvElement) {
        const uvLevel = getUVIndexLevel(data.uvIndex);
        uvElement.textContent = `${Math.round(data.uvIndex)} (${uvLevel})`;
    }

    // Update Humidity
    const humidityElement = document.querySelector('.condition-card:has(img[alt="Humidity"]) .value');
    if (humidityElement) {
        humidityElement.textContent = `${data.humidity}%`;
    }
}

// Helper function to get UV Index level description
function getUVIndexLevel(uvi) {
    if (uvi <= 2) return 'Low';
    if (uvi <= 5) return 'Moderate';
    if (uvi <= 7) return 'High';
    if (uvi <= 10) return 'Very High';
    return 'Extreme';
}

function handleError(error, type = 'general') {
    const errorMessages = {
        'api': 'Weather data unavailable. Please try again later.',
        'network': 'Please check your internet connection.',
        'location': 'Unable to get your location. Please allow location access or search for a city.',
        'general': 'Something went wrong. Please try again.'
    };

    console.error('Error:', error);
    
    const weatherSection = document.querySelector('.current-weather');
    if (weatherSection) {
        weatherSection.classList.add('error-state');
        
        let errorElement = weatherSection.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('p');
            errorElement.className = 'error-message';
            weatherSection.appendChild(errorElement);
        }
        errorElement.textContent = errorMessages[type] || errorMessages.general;
    }
}

// Function to get hourly forecast
async function getHourlyForecast(latitude, longitude) {
    try {
        const url = `${OPENWEATHER_CONFIG.FORECAST_URL}?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_CONFIG.API_KEY}`;
        console.log('Fetching hourly forecast from:', url); // Debug log
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Weather API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Hourly forecast data:', data); // Debug log
        return data;
    } catch (error) {
        console.error('Error fetching hourly forecast:', error);
        throw error;
    }
}


// Get both hourly and daily forecast
async function getWeatherForecast(latitude, longitude) {
    try {
        // Get hourly forecast (3-hour intervals)
        const hourlyUrl = `${OPENWEATHER_CONFIG.FORECAST_URL}?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_CONFIG.API_KEY}`;
        const hourlyResponse = await fetch(hourlyUrl);
        const hourlyData = await hourlyResponse.json();
        console.log('Hourly forecast data:', hourlyData); // Debug log

        // Get daily forecast using 5 day forecast data
        const dailyData = processDailyForecast(hourlyData);

        return {
            hourly: hourlyData,
            daily: dailyData
        };
    } catch (error) {
        console.error('Error fetching forecast data:', error);
        throw error;
    }
}

// Function to process daily forecast from 5 day/3 hour forecast
function processDailyForecast(forecastData) {
    const dailyForecasts = {};
    
    // Process each 3-hour forecast
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        
        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = {
                dt: item.dt,
                temp: {
                    min: item.main.temp,
                    max: item.main.temp
                },
                weather: item.weather[0]
            };
        } else {
            // Update min/max temperatures
            dailyForecasts[dateKey].temp.min = Math.min(dailyForecasts[dateKey].temp.min, item.main.temp);
            dailyForecasts[dateKey].temp.max = Math.max(dailyForecasts[dateKey].temp.max, item.main.temp);
        }
    });

    // Convert to array and sort by date
    return Object.values(dailyForecasts);
}

// Update the daily forecast function
function updateDailyForecast(dailyData) {
    const forecastContainer = document.querySelector('.weekly-forecast');
    if (!forecastContainer) return;

    // Clear existing rows
    forecastContainer.innerHTML = '';

    // Create forecast rows for available days (up to 5 days)
    dailyData.forEach((day, index) => {
        const date = new Date(day.dt * 1000);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });

        const row = document.createElement('div');
        row.className = 'forecast-row';
        row.innerHTML = `
            <span class="day">${dayName}</span>
            <div class="weather">
                <img src="${getWeatherIcon(day.weather.icon)}" alt="${day.weather.description}" />
                <span>${day.weather.main}</span>
            </div>
            <span class="temp">${Math.round(day.temp.max)}°/${Math.round(day.temp.min)}°</span>
        `;
        
        forecastContainer.appendChild(row);
    });
}

// Function to update hourly forecast cards
function updateHourlyForecast(hourlyData) {
    const forecastContainer = document.querySelector('.hourly-forecast');
    if (!forecastContainer) return;

    // Clear existing cards
    forecastContainer.innerHTML = '';

    // Get next 6 hours of forecast
    const next6Hours = hourlyData.list.slice(0, 6); // Changed from hourly to list

    // Create forecast cards
    next6Hours.forEach(hour => {
        const time = new Date(hour.dt * 1000);
        const hourString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = 'hour-card';
        card.innerHTML = `
            <span class="time">${hourString}</span>
            <img 
                src="${getWeatherIcon(hour.weather[0].icon)}" 
                alt="${hour.weather[0].description}"
                class="weather-icon"
            />
            <span class="temp">${Math.round(hour.main.temp)}°</span>
        `;
        
        forecastContainer.appendChild(card);
    });
}

// Function to get user's location and fetch weather
async function initializeWeather() {
    console.log('Initializing weather...'); // Debug log

    // Show loading state
    const weatherSection = document.querySelector('.current-weather');
    if (weatherSection) {
        weatherSection.innerHTML = '<div class="loading">Loading weather data...</div>';
    }

    // Check if geolocation is supported
    if ("geolocation" in navigator) {
        try {
            // Convert getCurrentPosition to Promise
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });

            const { latitude, longitude } = position.coords;
            console.log('User location:', { latitude, longitude }); // Debug log

            // Get weather data for location
            const url = `${OPENWEATHER_CONFIG.WEATHER_URL}?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_CONFIG.API_KEY}`;
            console.log('Fetching weather from:', url); // Debug log

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Weather API Error: ${response.status}`);
            }

            const weatherData = await response.json();
            console.log('Weather data:', weatherData); // Debug log

            // Update weather display
            await updateCurrentWeather(weatherData, latitude, longitude);

        } catch (error) {
            console.error('Error in initializeWeather:', error);
            if (error.code === 1) {
                // Permission denied
                handleError(error, 'location');
            } else {
                handleError(error);
            }
        }
    } else {
        handleError(new Error('Geolocation not supported'), 'location');
    }
}

// Call initializeWeather when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing weather...'); // Debug log
    initializeWeather();
});