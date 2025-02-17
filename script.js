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

// Clear start input field
document.getElementById("clear-start").addEventListener("click", function () {
  document.getElementById("start-point").value = ""; // Clear the input
  this.style.display = "none"; // Hide the cross icon
});

// Clear end input field
document.getElementById("clear-end").addEventListener("click", function () {
  document.getElementById("end-point").value = ""; // Clear the input
  this.style.display = "none"; // Hide the cross icon
});

// Show/hide cross icons based on input value
document.getElementById("start-point").addEventListener("input", function () {
  const clearIcon = document.getElementById("clear-start");
  clearIcon.style.display = this.value ? "block" : "none"; // Show/hide based on input value
});

document.getElementById("end-point").addEventListener("input", function () {
  const clearIcon = document.getElementById("clear-end");
  clearIcon.style.display = this.value ? "block" : "none"; // Show/hide based on input value
});


