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