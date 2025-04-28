const playRandomBtn = document.getElementById('playRandom');
const audioPlayer = document.getElementById('audioPlayer');
const stationInfo = document.getElementById('station-info');
const scoreElement = document.getElementById('score');

let map;
let currentMarker;
let currentStation;
let score = 0;

// Initialize the map
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click event to map
    map.on('click', handleMapClick);
}

// Calculate distance between two points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calculate score based on distance
function calculateScore(distance) {
    if (distance < 10) return 5000;
    if (distance < 50) return 4000;
    if (distance < 100) return 3000;
    if (distance < 500) return 2000;
    if (distance < 1000) return 1000;
    return Math.max(0, Math.floor(5000 * Math.exp(-distance/2000)));
}

// Handle map click
function handleMapClick(e) {
    if (!currentStation) return;

    const guessLat = e.latlng.lat;
    const guessLng = e.latlng.lng;
    
    // Remove previous marker if exists
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

    // Add marker at clicked location
    currentMarker = L.marker([guessLat, guessLng]).addTo(map);

    // Calculate distance and score
    const distance = calculateDistance(
        guessLat, 
        guessLng, 
        currentStation.stationInfo.coordinates[1],
        currentStation.stationInfo.coordinates[0] 
    );

    const roundScore = calculateScore(distance);
    score += roundScore;
    scoreElement.textContent = score;

    // Show result
    stationInfo.style.display = 'block';
    stationInfo.innerHTML = `
        <p>Now playing: ${currentStation.stationInfo.title}</p>
        <p>Actual Location: ${currentStation.stationInfo.city}, ${currentStation.stationInfo.country}</p>
        <p>Distance: ${Math.round(distance)} km</p>
        <p>Round Score: ${roundScore}</p>
    `;

    // Add marker for actual location with swapped coordinates
    L.marker([
        currentStation.stationInfo.coordinates[1], 
        currentStation.stationInfo.coordinates[0] 
    ], {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        })
    }).addTo(map);

    // Draw line between guess and actual location with swapped coordinates
    L.polyline([
        [guessLat, guessLng],
        [currentStation.stationInfo.coordinates[1], currentStation.stationInfo.coordinates[0]] // Swapped coordinates
    ], {
        color: 'red',
        dashArray: '5, 10'
    }).addTo(map);

    // Disable further guessing until next station
    map.off('click', handleMapClick);
}

async function fetchRandomStation() {
    try {
        const API_URL = 'https://radioguessr.theomidrouillet.workers.dev';
        
        // Fetch locations
        const placesResponse = await fetch(`${API_URL}/api/places`);
        if (!placesResponse.ok) {
            throw new Error('Error fetching locations');
        }
        const placesData = await placesResponse.json();
        
        if (!placesData.data || !placesData.data.list || !placesData.data.list.length) {
            throw new Error('Invalid location data');
        }
        
        // Select random location
        const randomPlace = placesData.data.list[Math.floor(Math.random() * placesData.data.list.length)];
        
        // Fetch stations for selected location
        const cityResponse = await fetch(`${API_URL}/api/page/${randomPlace.id}`);
        if (!cityResponse.ok) {
            throw new Error('Error fetching city information');
        }
        const cityData = await cityResponse.json();
        
        // Search for stations
        const channelSection = cityData.data.content.find(item => item.itemsType === 'channel');

        if (!channelSection) {
            throw new Error('No station section found in this city');
        }

        // Stations are directly in items
        const availableStations = channelSection.items || [];

        if (availableStations.length === 0) {
            throw new Error('No stations available in this city');
        }
        
        // Select random station
        const randomStation = availableStations[Math.floor(Math.random() * availableStations.length)];
        
        // Extract station ID from URL
        const stationUrl = randomStation.page?.url;
        if (!stationUrl) {
            throw new Error('Invalid station URL');
        }

        // Extract station ID (last segment of URL)
        const stationId = stationUrl.split('/').pop();
        if (!stationId) {
            throw new Error('Invalid station ID');
        }

        return {
            stationUrl: `${API_URL}/api/listen/${stationId}/channel.mp3`,
            stationInfo: {
                title: randomStation.page.title || 'Unknown Station',
                city: randomPlace.title || 'Unknown City',
                country: randomPlace.country || 'Unknown Country',
                coordinates: randomPlace.geo || [0, 0]
            }
        };
    } catch (error) {
        throw error;
    }
}

async function loadRandomStation() {
    try {
        playRandomBtn.disabled = true;
        playRandomBtn.textContent = 'Loading...';
        stationInfo.style.display = 'none';
        
        // Clear previous markers and lines
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
        
        // Reset map view
        map.setView([0, 0], 2);
        
        // Enable clicking on map
        map.on('click', handleMapClick);
        
        currentStation = await fetchRandomStation();
        
        // Update audio player
        audioPlayer.src = currentStation.stationUrl;
        await audioPlayer.play();
        
        // Show current playing station name
        stationInfo.style.display = 'block';
        stationInfo.innerHTML = `<p>Now playing: ${currentStation.stationInfo.title}</p>`;
        
    } catch (error) {
        console.error('Error loading station:', error);
        await loadRandomStation();
    } finally {
        playRandomBtn.disabled = false;
        playRandomBtn.textContent = 'Play Random Station';
    }
}

// Add error event listener to audio player
audioPlayer.addEventListener('error', async () => {
    console.error('Audio playback error, trying another station...');
    await loadRandomStation();
});

// Update click event listener to use the new function
playRandomBtn.addEventListener('click', loadRandomStation);

// Initialize map when page loads
initMap();