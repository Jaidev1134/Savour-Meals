const axios = require('axios');

// OSRM Public Demo Server (rate-limited — use self-hosted for production)
const OSRM_BASE_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';

/**
 * Get route between two coordinate pairs using OSRM
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Object|null} Route info { distance (km), duration (min), geometry }
 */
const getRoute = async (originLat, originLng, destLat, destLng) => {
  try {
    // OSRM expects coordinates as lng,lat (not lat,lng)
    const url = `${OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const response = await axios.get(url, { timeout: 8000 });

    if (response.data && response.data.code === 'Ok' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: (route.distance / 1000).toFixed(2), // Convert meters to km
        duration: (route.duration / 60).toFixed(1),    // Convert seconds to minutes
        geometry: route.geometry                        // GeoJSON LineString for map rendering
      };
    }

    return null;
  } catch (error) {
    console.error('OSRM routing error:', error.message);
    return null;
  }
};

/**
 * Get multi-leg route through multiple waypoints using OSRM.
 * E.g., Volunteer → Pickup → Delivery
 * 
 * @param {Array<{lat: number, lng: number}>} waypoints - Ordered array of waypoints
 * @returns {Object|null} { totalDistance, totalDuration, legs: [...], geometry }
 */
const getMultiLegRoute = async (waypoints) => {
  if (!waypoints || waypoints.length < 2) {
    return null;
  }

  try {
    // Build OSRM coordinate string: lng1,lat1;lng2,lat2;lng3,lat3
    const coordString = waypoints
      .map(wp => `${wp.lng},${wp.lat}`)
      .join(';');

    const url = `${OSRM_BASE_URL}/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;

    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && response.data.code === 'Ok' && response.data.routes.length > 0) {
      const route = response.data.routes[0];

      // Build per-leg breakdown
      const legs = route.legs.map((leg, index) => ({
        legIndex: index,
        from: index === 0 ? 'Volunteer' : (index === 1 ? 'Pickup' : `Waypoint ${index}`),
        to: index === 0 ? 'Pickup' : (index === 1 ? 'Delivery' : `Waypoint ${index + 1}`),
        distance: (leg.distance / 1000).toFixed(2),  // km
        duration: (leg.duration / 60).toFixed(1),     // minutes
      }));

      return {
        totalDistance: (route.distance / 1000).toFixed(2),
        totalDuration: (route.duration / 60).toFixed(1),
        legs,
        geometry: route.geometry,  // Full combined GeoJSON LineString
      };
    }

    return null;
  } catch (error) {
    console.error('OSRM multi-leg routing error:', error.message);
    return null;
  }
};

module.exports = { getRoute, getMultiLegRoute };
