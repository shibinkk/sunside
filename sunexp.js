// Helper function to convert degrees to radians
const toRad = (degrees) => degrees * Math.PI / 180;

// Helper function to convert radians to degrees
const toDeg = (radians) => radians * 180 / Math.PI;

// Get timezone offset in ISO format
function getTimezoneOffset(timezone) {
    const match = timezone.match(/UTC([+-]\d+):(\d+)/);
    if (!match) return 'Z';
    return `${match[1]}:${match[2]}`;
}

// Calculate bearing between two points
function calculateBearing(start, end) {
    const startLat = toRad(start.lat);
    const endLat = toRad(end.lat);
    const diffLong = toRad(end.lon - start.lon);

    const y = Math.sin(diffLong) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(diffLong);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Calculate sun's relative position to route
function calculateSunPosition(routeBearing, sunAzimuth) {
    // Calculate the relative angle between sun and route direction
    let relativeAngle = (sunAzimuth - routeBearing + 360) % 360;
    
    // Determine if sun is on left or right side
    const isLeft = relativeAngle > 180;
    
    // Normalize the angle to 0-180 range for exposure calculation
    if (relativeAngle > 180) {
        relativeAngle = 360 - relativeAngle;
    }
    
    return {
        isLeft,
        angle: relativeAngle
    };
}

// Calculate exposure factor based on sun angle
function calculateExposureFactor(angle, altitude) {
    // Normalize angle to 0-90 range
    const normalizedAngle = Math.min(90, angle);
    
    // Factor in both the horizontal angle and sun altitude
    // This gives more weight to times when the sun is higher in the sky
    const altitudeFactor = Math.sin(toRad(altitude));
    const angleFactor = Math.cos(toRad(normalizedAngle));
    
    return altitudeFactor * angleFactor;
}

// Get route from OSRM
async function getRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=polyline`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found');
        }

        const route = data.routes[0];
        const coordinates = decodePolyline(route.geometry);
        
        return {
            coordinates,
            distance: route.distance / 1000, // Convert to km
            duration: route.duration / 3600  // Convert to hours
        };
    } catch (error) {
        console.error('Routing error:', error);
        throw new Error('Failed to get route');
    }
}

// Main function to calculate sun analysis
async function calculateSunAnalysis(start, end, dateTime) {
    // Get actual road route
    const route = await getRoute(start, end);
    const segments = route.coordinates;
    
    let leftExposure = 0;
    let rightExposure = 0;
    let totalSegments = 0;

    // Calculate exposure for each segment
    for (let i = 0; i < segments.length - 1; i++) {
        const currentSegment = {
            lat: segments[i][0],
            lon: segments[i][1]
        };
        const nextSegment = {
            lat: segments[i + 1][0],
            lon: segments[i + 1][1]
        };
        
        // Calculate sun position for current segment
        const sunPosition = SunCalc.getPosition(
            dateTime,
            currentSegment.lat,
            currentSegment.lon
        );

        // Convert altitude and azimuth to degrees
        const sunAltitude = toDeg(sunPosition.altitude);
        const sunAzimuth = (toDeg(sunPosition.azimuth) + 360) % 360;

        // Skip if sun is below horizon
        if (sunAltitude <= 0) continue;

        // Calculate route bearing for current segment
        const routeBearing = calculateBearing(currentSegment, nextSegment);
        
        // Get sun's relative position
        const relativePosition = calculateSunPosition(routeBearing, sunAzimuth);
        
        // Calculate exposure factor
        const exposureFactor = calculateExposureFactor(relativePosition.angle, sunAltitude);

        // Add to appropriate side
        if (relativePosition.isLeft) {
            leftExposure += exposureFactor;
        } else {
            rightExposure += exposureFactor;
        }
        
        totalSegments++;
    }

    // Prevent division by zero and normalize exposures
    if (totalSegments === 0) {
        totalSegments = 1;
    }

    // Calculate average exposure for each side
    leftExposure = leftExposure / totalSegments;
    rightExposure = rightExposure / totalSegments;

    // Convert to percentages
    const total = leftExposure + rightExposure;
    const leftPercent = total > 0 ? Math.round((leftExposure / total) * 100) : 50;
    const rightPercent = total > 0 ? Math.round((rightExposure / total) * 100) : 50;

    // Draw route on map
    if (window.map) {
        // Clear existing routes
        map.eachLayer((layer) => {
            if (layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        // Draw new route
        L.polyline(segments, {
            color: '#3388ff',
            weight: 5,
            opacity: 0.7
        }).addTo(map);

        // Add markers for start and end points
        L.marker([start.lat, start.lon]).addTo(map)
            .bindPopup('Start');
        L.marker([end.lat, end.lon]).addTo(map)
            .bindPopup('End');

        // Fit map to show entire route
        map.fitBounds(segments);
    }

    // Determine preferred side based on exposure
    const preferredSide = leftExposure <= rightExposure ? "Left Side" : "Right Side";

    // Update results panel
    updateResultsPanel({
        preferredSide,
        leftPercent,
        rightPercent,
        distance: Math.round(route.distance),
        duration: Math.round(route.duration * 10) / 10
    });

    return {
        preferredSide,
        leftPercent,
        rightPercent,
        distance: Math.round(route.distance),
        duration: Math.round(route.duration * 10) / 10
    };
}

// Update results panel function
function updateResultsPanel(results) {
    try {
        document.getElementById('preferred-side').textContent = results.preferredSide;
        document.getElementById('left-percent').textContent = `${results.leftPercent}%`;
        document.getElementById('right-percent').textContent = `${results.rightPercent}%`;
        document.getElementById('distance-time').textContent = 
            `${results.distance} km / ${results.duration} hrs`;

        document.getElementById('results-panel').classList.add('visible');
    } catch (error) {
        console.error('Error updating results panel:', error);
    }
}

// Polyline decoder function
function decodePolyline(str, precision = 5) {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision);

    while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}