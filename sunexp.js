document.getElementById("route-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Show the loader and blur the screen
  const loaderOverlay = document.getElementById("loader-overlay");
  loaderOverlay.classList.add("show");

  const start = document.getElementById("start-point").value;
  const end = document.getElementById("end-point").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!start || !end || !date || !time) {
    alert("Please fill in all fields.");
    loaderOverlay.classList.remove("show"); // Hide the loader
    return;
  }

  try {
    // Geocode start and end points
    const startCoords = await geocodeAddress(start);
    const endCoords = await geocodeAddress(end);

    if (!startCoords || !endCoords) {
      alert("Could not find coordinates for the entered locations.");
      loaderOverlay.hidden = true; // Hide the loader
      return;
    }

    // Fetch route and calculate sun exposure
    const route = await fetchRoute(startCoords, endCoords);
    if (!route) {
      alert("Could not fetch route.");
      loaderOverlay.hidden = true; // Hide the loader
      return;
    }

    const sunExposure = await calculateSunExposure(route, date, time);
    if (!sunExposure) {
      alert("Could not calculate sun exposure.");
      loaderOverlay.hidden = true; // Hide the loader
      return;
    }

    // Display route and sun exposure data
    displayRoute(route);
    displayRouteInfo(route.distance, route.duration, sunExposure);
  } catch (error) {
    alert("Error calculating route: " + error.message);
  } finally {
    // Hide the loader after the data is loaded
    loaderOverlay.classList.remove("show");
  }
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
  
      // Check if the sun is below the horizon (nighttime)
      const sunAltitude = sunPos.altitude * (180 / Math.PI); // Convert to degrees
      if (sunAltitude < 0) {
        // Sun is below the horizon (nighttime)
        noExposure++;
        continue; // Skip further calculations for this segment
      }
  
      const sunAzimuth = (sunPos.azimuth * (180 / Math.PI) + 180) % 360; // Convert to degrees and adjust for direction
      console.log("Sun Azimuth:", sunAzimuth); // Debugging
  
      // Calculate travel direction (bearing)
      const travelBearing = calculateBearing(lat1, lon1, lat2, lon2);
      console.log("Travel Bearing:", travelBearing); // Debugging
  
      // Calculate the difference between sun azimuth and travel bearing
      let angleDiff = (sunAzimuth - travelBearing + 360) % 360;
      console.log("Angle Difference:", angleDiff); // Debugging
  
      // Determine sun exposure
      if (angleDiff > 180) {
        // Sun is on the left side
        leftExposure++;
      } else {
        // Sun is on the right side
        rightExposure++;
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
    const routeInfo = document.getElementById("route-info");
    const preferredSide = document.getElementById("preferred-side");
    const leftExposure = document.getElementById("left-exposure");
    const rightExposure = document.getElementById("right-exposure");
    const noneExposure = document.getElementById("none-exposure");
    const distanceTime = document.getElementById("distance-time");
  
    // Determine preferred side
    let preferred = "No Preference";
    if (sunExposure.left > sunExposure.right) {
      preferred = "Right Side";
    } else if (sunExposure.left < sunExposure.right) {
      preferred = "Left Side";
    }
  
    // Format duration
    const formattedDuration = formatDuration(duration);
  
    // Update the panel content
    preferredSide.textContent = preferred;
    leftExposure.textContent = `${sunExposure.left}%`;
    rightExposure.textContent = `${sunExposure.right}%`;
    noneExposure.textContent = `${sunExposure.none}%`;
    distanceTime.textContent = `${(distance / 1000).toFixed(2)} km / ${formattedDuration}`;
  
    // Show the panel
    routeInfo.classList.add("visible");
    routeInfo.hidden = false;
  }
  
  function formatDuration(durationInSeconds) {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
  
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
    } else {
      return `${minutes} min`;
    }
  }