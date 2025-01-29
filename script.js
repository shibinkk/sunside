// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13); // Centered at London

// Light and dark tile layers
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
});

// Add light tiles by default
lightTiles.addTo(map);

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  if (isDark) {
    map.removeLayer(lightTiles);
    map.addLayer(darkTiles);
  } else {
    map.removeLayer(darkTiles);
    map.addLayer(lightTiles);
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