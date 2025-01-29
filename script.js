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


function searchToggle(obj, evt){
  var container = $(obj).closest('.search-wrapper');
      if(!container.hasClass('active')){
          container.addClass('active');
          evt.preventDefault();
      }
      else if(container.hasClass('active') && $(obj).closest('.input-holder').length == 0){
          container.removeClass('active');
          // clear input
          container.find('.search-input').val('');
      }
}

// Function to locate the user and add a marker
function locateUser() {
  if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
  }

  navigator.geolocation.getCurrentPosition(
      function (position) {
          var lat = position.coords.latitude;
          var lng = position.coords.longitude;

          // Set the map view to the user's location
          map.setView([lat, lng], 13);

          // Add a marker at the user's location
          L.marker([lat, lng])
              .addTo(map)
              .bindPopup("You are here!")
              .openPopup();
      },
      function () {
          alert("Unable to retrieve your location.");
      }
  );
}

// Attach function to the "Use Current Location" button
document.getElementById('locate-btn').addEventListener('click', locateUser);