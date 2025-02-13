// Initialize the map
var map = L.map('map').setView([51.505, -0.09], 13);

// Define light and dark tile layers
var lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

var darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
});

// Set default theme to dark
darkLayer.addTo(map);

// Ensure toggle is checked by default
const toggle = document.querySelector('.input');
toggle.checked = true; // Set toggle to dark mode

// Toggle theme on checkbox change
toggle.addEventListener('change', function () {
    if (this.checked) {
        map.removeLayer(lightLayer);
        map.addLayer(darkLayer);
    } else {
        map.removeLayer(darkLayer);
        map.addLayer(lightLayer);
    }
});


// Ensure the map is properly resized
window.addEventListener('resize', () => {
  map.invalidateSize();
});

function searchToggle(obj, evt) {
  var container = $(obj).closest('.search-wrapper');
  var otherContainer = container.hasClass('second-search') 
    ? $('.search-wrapper').not('.second-search') 
    : $('.second-search');

  evt.preventDefault();

  if (!container.hasClass('active')) {
    // Close the other wrapper if it's open
    if (otherContainer.hasClass('active')) {
      otherContainer.removeClass('active shift-left shift-right');
      otherContainer.find('.search-input').val('');
    }

    // Open the clicked wrapper
    container.addClass('active');

    // Move the other wrapper
    if (container.hasClass('second-search')) {
      otherContainer.addClass('shift-left');  // Move first wrapper left
    } else {
      otherContainer.addClass('shift-right'); // Move second wrapper right
    }
  } else {
    // Close the clicked wrapper
    container.removeClass('active shift-left shift-right');
    container.find('.search-input').val('');

    // Ensure the other wrapper returns to its original position
    if (!otherContainer.hasClass('active')) {
      otherContainer.removeClass('shift-left shift-right');
    }
  }
}


// Constants for DOM elements
const searchInput = document.getElementById("search");
const startInput = document.getElementById("start-point");
const endInput = document.getElementById("end-point");
const suggestionBox = document.getElementById("suggestions");
const startSuggestions = document.getElementById("start-suggestions");
const endSuggestions = document.getElementById("end-suggestions");
const searchIcon = document.querySelector(".search-icon");
const searchWrapper = document.querySelector(".search-wrapper");

let currentMarker = null;

// Set current date and time
function setCurrentDateTime() {
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const now = new Date();
  
  dateInput.value = now.toISOString().split('T')[0];
  timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
setCurrentDateTime();

// Main suggestion fetching function
async function fetchSuggestions(query, suggestionBox, isSearchWrapper = false) {
  if (query.length < 2) {
    suggestionBox.innerHTML = "";
    suggestionBox.classList.remove("active");
    return;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=IN&addressdetails=1`,
      { headers: { "User-Agent": "YourApp/1.0 (contact@example.com)" } }
    );
    
    const data = await response.json();
    suggestionBox.innerHTML = "";

    if (data.length === 0) {
      suggestionBox.innerHTML = `<div class="suggestion-item">No Indian locations found</div>`;
      suggestionBox.classList.add("active");
      return;
    }

    data.slice(0, 5).forEach(place => {
      const address = place.address;
      const placeName = address.city || address.town || address.village || address.neighbourhood || address.locality;
      const district = address.county || address.district;
      const state = address.state;
      const formattedAddress = `${placeName}${district ? `, ${district}` : ''}, ${state}`;

      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = formattedAddress;
      div.onclick = () => {
        const inputField = suggestionBox.previousElementSibling;
        inputField.value = formattedAddress;
        suggestionBox.classList.remove("active");
        
        if (isSearchWrapper) {
          locatePlace(place.lat, place.lon, formattedAddress);
        }
      };
      
      suggestionBox.appendChild(div);
    });

    suggestionBox.classList.add("active");
  } catch (error) {
    console.error("Search error:", error);
    suggestionBox.innerHTML = `<div class="suggestion-item">Search unavailable</div>`;
    suggestionBox.classList.add("active");
  }
}

// Map location functions
async function locatePlace(lat, lon, placeName) {
  if (!lat || !lon) return;

  if (currentMarker) map.removeLayer(currentMarker);
  currentMarker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(placeName)
    .openPopup();
  
  map.setView([lat, lon], 13);
  closeSearch();
}

// Current location handler
function getCurrentLocation() {
  const startInput = document.getElementById("start-point");
  
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  startInput.placeholder = "Locating...";
  
  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&countrycodes=IN`,
          { headers: { "User-Agent": "YourApp/1.0 (contact@example.com)" } }
        );
        
        const data = await response.json();
        const address = data.address;
        const placeName = address.city || address.town || address.village || address.neighbourhood;
        const district = address.county || address.district;
        const state = address.state;
        
        startInput.value = `${placeName}${district ? `, ${district}` : ''}, ${state}`;
      } catch (error) {
        console.error("Location error:", error);
        alert("Couldn't fetch location details");
      } finally {
        startInput.placeholder = "Enter Starting Point";
      }
    },
    error => {
      console.error("Geolocation error:", error);
      startInput.placeholder = "Enter Starting Point";
      alert("Location access denied");
    }
  );
}

// Event handlers
searchInput.addEventListener("input", () => fetchSuggestions(searchInput.value, suggestionBox, true));
startInput.addEventListener("input", () => fetchSuggestions(startInput.value, startSuggestions));
endInput.addEventListener("input", () => fetchSuggestions(endInput.value, endSuggestions));

document.getElementById("locate-btn").addEventListener("click", getCurrentLocation);

searchIcon.addEventListener("click", async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=IN`,
      { headers: { "User-Agent": "YourApp/1.0 (contact@example.com)" } }
    );
    
    const data = await response.json();
    if (data.length > 0) {
      locatePlace(data[0].lat, data[0].lon, data[0].display_name);
    }
  } catch (error) {
    console.error("Search error:", error);
  }
});

// Helper functions
function closeSearch() {
  searchWrapper.classList.remove("active");
  searchInput.value = "";
  suggestionBox.innerHTML = "";
}

document.addEventListener("click", (e) => {
  if (!searchWrapper.contains(e.target)) suggestionBox.classList.remove("active");
  if (!startInput.contains(e.target)) startSuggestions.classList.remove("active");
  if (!endInput.contains(e.target)) endSuggestions.classList.remove("active");
});

// Recent searches handling
const recentSearches = {
  get: () => JSON.parse(localStorage.getItem("recentSearches")) || [],
  save: (query) => {
    const searches = recentSearches.get().filter(item => item !== query);
    searches.unshift(query);
    localStorage.setItem("recentSearches", JSON.stringify(searches.slice(0, 5)));
  },
  display: (container) => {
    const searches = recentSearches.get();
    container.innerHTML = searches.map(search => `
      <div class="suggestion-item">${search}</div>
    `).join("");
    container.classList.add("active");
  }
};

startInput.addEventListener("focus", () => recentSearches.display(startSuggestions));
endInput.addEventListener("focus", () => recentSearches.display(endSuggestions));


async function geocodeAddress(address) {
  try {
      const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          { headers: { "User-Agent": "YourApp/1.0 (contact@example.com)" } }
      );
      const data = await response.json();
      if (data.length === 0) throw new Error("Location not found");
      
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (error) {
      console.error("Geocode error:", error);
      alert("Error finding location: " + error.message);
      return null;
  }
}


document.getElementById("route-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const start = document.getElementById("start-point").value;
  const end = document.getElementById("end-point").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!start || !end || !date || !time) {
    alert("Please fill in all fields.");
    return;
  }

  // Geocode start and end points
  const startCoords = await geocodeAddress(start);
  const endCoords = await geocodeAddress(end);

  if (!startCoords || !endCoords) {
    alert("Could not find coordinates for the entered locations.");
    return;
  }

  // Fetch route and calculate sun exposure
  const route = await fetchRoute(startCoords, endCoords);
  if (!route) {
    alert("Could not fetch route.");
    return;
  }

  const sunExposure = await calculateSunExposure(route, date, time);
  if (!sunExposure) {
    alert("Could not calculate sun exposure.");
    return;
  }

  // Display route and sun exposure data
  displayRoute(route);
  displayRouteInfo(route.distance, route.duration, sunExposure);
});

async function fetchRoute(startCoords, endCoords) {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance, // Distance in meters
        duration: route.duration, // Duration in seconds
        coordinates: route.geometry.coordinates, // Route coordinates
      };
    } else {
      throw new Error("No route found.");
    }
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
}

async function calculateSunExposure(route, date, time) {
  const coordinates = route.coordinates;

  // Create startTime without timezone
  const startTime = new Date(`${date}T${time}:00`);
  console.log("Start Time:", startTime); // Debugging

  if (isNaN(startTime.getTime())) {
    console.error("Invalid start time:", startTime);
    return null;
  }

  let leftExposure = 0;
  let rightExposure = 0;
  let noExposure = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    // Calculate sun position
    const sunPos = SunCalc.getPosition(startTime, lat1, lon1);
    console.log("SunCalc Inputs:", { startTime, lat1, lon1 }); // Debugging
    console.log("Sun Position:", sunPos); // Debugging

    if (isNaN(sunPos.azimuth)) {
      console.error("Invalid sun position:", sunPos);
      return null;
    }

    const sunAzimuth = (sunPos.azimuth * (180 / Math.PI) + 180); // Convert to degrees and adjust for direction
    console.log("Sun Azimuth:", sunAzimuth); // Debugging

    // Calculate travel direction (bearing)
    const travelBearing = calculateBearing(lat1, lon1, lat2, lon2);
    console.log("Travel Bearing:", travelBearing); // Debugging

    // Calculate the difference between sun azimuth and travel bearing
    let angleDiff = (sunAzimuth - travelBearing + 360) % 360;
    console.log("Angle Difference:", angleDiff); // Debugging

    // Determine sun exposure
    if (angleDiff > 90 && angleDiff < 270) {
      // Sun is on the left side
      leftExposure++;
    } else if (angleDiff < 90 || angleDiff > 270) {
      // Sun is on the right side
      rightExposure++;
    } else {
      // No sun exposure
      noExposure++;
    }
  }

  const total = leftExposure + rightExposure + noExposure;
  console.log("Sun Exposure Results:", { leftExposure, rightExposure, noExposure, total }); // Debugging
  return {
    left: ((leftExposure / total) * 100).toFixed(2),
    right: ((rightExposure / total) * 100).toFixed(2),
    none: ((noExposure / total) * 100).toFixed(2),
  };
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  let bearing = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
  return bearing;
}


let routeLayer = null;

function displayRoute(route) {
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  const routeCoordinates = route.coordinates.map(coord => [coord[1], coord[0]]);
  routeLayer = L.polyline(routeCoordinates, { color: "blue" }).addTo(map);

  // Fit the map to the route bounds
  const bounds = L.latLngBounds(routeCoordinates);
  map.fitBounds(bounds);
}

function displayRouteInfo(distance, duration, sunExposure) {
  document.getElementById("distance").textContent = `${(distance / 1000).toFixed(2)} km`;
  document.getElementById("time-taken").textContent = `${(duration / 60).toFixed(2)} mins`;
  document.getElementById("sun-exposure").textContent = `Left: ${sunExposure.left}%, Right: ${sunExposure.right}%, None: ${sunExposure.none}%`;
}

