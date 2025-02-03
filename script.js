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




// // Function to locate the user and add a marker
// function locateUser() {
//   if (!navigator.geolocation) {
//       alert("Geolocation is not supported by your browser.");
//       return;
//   }

//   navigator.geolocation.getCurrentPosition(
//       function (position) {
//           var lat = position.coords.latitude;
//           var lng = position.coords.longitude;

//           // Set the map view to the user's location
//           map.setView([lat, lng], 13);

//           // Add a marker at the user's location
//           L.marker([lat, lng])
//               .addTo(map)
//               .bindPopup("You are here!")
//               .openPopup();
//       },
//       function () {
//           alert("Unable to retrieve your location.");
//       }
//   );
// }

// // Attach function to the "Use Current Location" button
// document.getElementById('locate-btn').addEventListener('click', locateUser);
// Constants for DOM elements
// Constants for DOM elements


// Constants for DOM elements
const searchInput = document.getElementById("search");
const startInput = document.getElementById("start-point");
const endInput = document.getElementById("end-point");
const suggestionBox = document.getElementById("suggestions");
const startSuggestions = document.getElementById("start-suggestions");
const endSuggestions = document.getElementById("end-suggestions");
const searchIcon = document.querySelector(".search-icon");
const searchWrapper = document.querySelector(".search-wrapper");

let currentMarker = null; // Store the current marker

// Function to set current date and time
function setCurrentDateTime() {
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");

  // Get current date and time
  const now = new Date();

  // Format date as YYYY-MM-DD (required for input type="date")
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  // Format time as HH:MM (required for input type="time")
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const formattedTime = `${hours}:${minutes}`;

  // Set default values
  dateInput.value = formattedDate;
  timeInput.value = formattedTime;
}

// Call the function to set default date and time when the page loads
setCurrentDateTime();

// Function to fetch and show place suggestions using Nominatim OSM
async function fetchSuggestions(query, suggestionBox, isSearchWrapper = false) {
  if (query.length < 2) {
    suggestionBox.innerHTML = "";
    suggestionBox.classList.remove("active");
    return;
  }

  try {
    let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1`);
    let data = await response.json();

    suggestionBox.innerHTML = ""; // Clear previous suggestions
    if (data.length === 0) {
      suggestionBox.classList.remove("active");
      return;
    }

    data.slice(0, 5).forEach(place => {
      // Create a simplified address (only city, state, country)
      const simpleAddress = `${place.address.city || place.address.town || place.address.village || place.address.district}, ${place.address.state}, ${place.address.country}`;
      
      let div = document.createElement("div");
      div.classList.add("suggestion-item");
      div.textContent = simpleAddress;
      div.onclick = async () => {
        suggestionBox.previousElementSibling.value = simpleAddress; // Update input value
        suggestionBox.innerHTML = "";
        suggestionBox.classList.remove("active");

        // Only locate and mark the place if it's from the search wrapper
        if (isSearchWrapper) {
          await locatePlace(place.lat, place.lon, simpleAddress);
        }
      };
      suggestionBox.appendChild(div);
    });

    suggestionBox.classList.add("active");
  } catch (error) {
    console.error("Error fetching places:", error);
  }
}

// Add event listeners for the search inputs
searchInput.addEventListener("input", () => fetchSuggestions(searchInput.value, suggestionBox, true)); // Search wrapper
startInput.addEventListener("input", () => fetchSuggestions(startInput.value, startSuggestions)); // Search container
endInput.addEventListener("input", () => fetchSuggestions(endInput.value, endSuggestions)); // Search container

// Function to search and move the map to the selected location (only for search wrapper)
async function locatePlace(lat, lon, placeName) {
  if (!lat || !lon) return;

  // Remove previous marker if exists
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  // Add new marker
  currentMarker = L.marker([lat, lon]).addTo(map).bindPopup(placeName).openPopup();

  // Move the map to the searched location
  map.setView([lat, lon], 13);

  // Close and clear search
  closeSearch();
}

// Trigger search when pressing "Enter" on any input
function handleEnterKey(event, input, suggestionBox, isSearchWrapper = false) {
  if (event.key === "Enter") {
    event.preventDefault();

    try {
      let query = input.value.trim();
      fetchSuggestions(query, suggestionBox, isSearchWrapper).then(() => {
        if (suggestionBox.children.length > 0) {
          const firstSuggestion = suggestionBox.children[0];
          input.value = firstSuggestion.textContent;
          if (isSearchWrapper) {
            locatePlace(firstSuggestion.dataset.lat, firstSuggestion.dataset.lon, firstSuggestion.textContent);
          }
        }
      });
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  }
}

searchInput.addEventListener("keypress", (event) => handleEnterKey(event, searchInput, suggestionBox, true)); // Search wrapper
startInput.addEventListener("keypress", (event) => handleEnterKey(event, startInput, startSuggestions)); // Search container
endInput.addEventListener("keypress", (event) => handleEnterKey(event, endInput, endSuggestions)); // Search container

// Trigger search when clicking the search icon
searchIcon.addEventListener("click", async function (event) {
  event.preventDefault();

  try {
    let query = searchInput.value.trim();
    let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1`);
    let data = await response.json();

    if (data.length > 0) {
      locatePlace(data[0].lat, data[0].lon, data[0].display_name);
    }
  } catch (error) {
    console.error("Error fetching location:", error);
  }
});

// Function to clear input and search results when clicking the wrapper again
searchWrapper.addEventListener("click", function () {
  searchInput.value = ""; // Clear input
  suggestionBox.innerHTML = "";
  suggestionBox.classList.remove("active");
});

// Function to close search wrapper
function closeSearch() {
  searchWrapper.classList.remove("active", "shift-left", "shift-right");
  searchInput.value = ""; // Clear input after search
  suggestionBox.innerHTML = "";
  suggestionBox.classList.remove("active");
}

// Close suggestion box if clicked outside
document.addEventListener("click", (e) => {
  if (!searchWrapper.contains(e.target)) {
    suggestionBox.classList.remove("active");
  }
  if (!startInput.contains(e.target)) {
    startSuggestions.classList.remove("active");
  }
  if (!endInput.contains(e.target)) {
    endSuggestions.classList.remove("active");
  }
});


// Function to get current location and fill it into the start-point field
function getCurrentLocation() {
    const startInput = document.getElementById("start-point");
  
    // Check if Geolocation is supported
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
  
    // Show loading message or spinner (optional)
    startInput.placeholder = "Fetching your location...";
  
    // Get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
  
        // Fetch address using Nominatim Reverse Geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((response) => response.json())
          .then((data) => {
            const address = data.display_name || "Unknown Location";
            startInput.value = address; // Fill the address into the start-point field
            startInput.placeholder = "Enter Starting Point"; // Reset placeholder
          })
          .catch((error) => {
            console.error("Error fetching address:", error);
            startInput.placeholder = "Enter Starting Point"; // Reset placeholder
            alert("Unable to fetch your location. Please try again.");
          });
      },
      (error) => {
        console.error("Error getting location:", error);
        startInput.placeholder = "Enter Starting Point"; // Reset placeholder
        alert("Unable to fetch your location. Please try again.");
      }
    );
  }
  
  // Add event listener to the "Use Current Location" button
  document.getElementById("locate-btn").addEventListener("click", getCurrentLocation);