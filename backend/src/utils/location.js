/**
 * Location Utils — Reverse geocoding, India validation, distance
 */

const axios = require('axios');

/**
 * Coordinates se address nikaalo (OpenStreetMap Nominatim)
 * FREE API — no key needed
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const url = 'https://nominatim.openstreetmap.org/reverse';
    const params = {
      lat: latitude,
      lon: longitude,
      format: 'json',
      addressdetails: 1,
      'accept-language': 'en',
    };

    const response = await axios.get(url, {
      params,
      timeout: 5000,
      headers: {
        'User-Agent': 'CowRescuePlatform/1.0',
      },
    });

    const data = response.data;
    if (!data || !data.address) {
      return null;
    }

    const addr = data.address;
    return {
      full_address: data.display_name || null,
      state: addr.state || null,
      district: addr.state_district || addr.county || null,
      city: addr.city || addr.town || addr.village || addr.suburb || null,
      pincode: addr.postcode || null,
      country: addr.country || null,
      country_code: addr.country_code ? addr.country_code.toUpperCase() : null,
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error.message);
    return null;
  }
}

/**
 * Check karo coordinates India ke andar hain ya nahi
 * India bounding box: 6.5°N to 37.6°N, 68.7°E to 97.25°E
 */
function isLocationInIndia(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng)) return false;

  return lat >= 6.5 && lat <= 37.6 && lng >= 68.7 && lng <= 97.25;
}

/**
 * Do coordinates ke beech distance (km) — Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  reverseGeocode,
  isLocationInIndia,
  calculateDistance,
};