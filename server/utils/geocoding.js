const axios = require('axios');

/**
 * Server-side geocoding utility with Nominatim primary + Photon fallback.
 * 
 * Why server-side?
 * - Nominatim requires a proper User-Agent and enforces 1 req/s rate limit
 * - We can add retry/fallback logic cleanly
 * - Future-proof for adding paid providers (Google, Mapbox) without exposing keys
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE = 'https://photon.komoot.io';
const USER_AGENT = 'SavourMeals/1.0 (food-redistribution-platform)';

// Common noise words in Indian addresses that confuse geocoders
const NOISE_PATTERNS = [
  /\b(near|opp\.?|opposite|behind|beside|next\s+to|adjacent\s+to|in\s+front\s+of)\b/gi,
];

/**
 * Light normalization of Indian addresses for better geocoding hits.
 * Extracts pin code separately if present.
 */
function normalizeAddress(rawAddress) {
  let address = rawAddress.trim();

  // Extract 6-digit Indian pin code
  const pinMatch = address.match(/\b(\d{6})\b/);
  const pinCode = pinMatch ? pinMatch[1] : null;

  // Remove noise words
  for (const pattern of NOISE_PATTERNS) {
    address = address.replace(pattern, ' ');
  }

  // Collapse multiple spaces/commas
  address = address.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();

  return { address, pinCode };
}

/**
 * Sleep utility for retry backoff
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Try Nominatim geocoding with structured parameters
 */
async function tryNominatim(rawAddress, retries = 2) {
  const { address, pinCode } = normalizeAddress(rawAddress);

  const params = {
    q: address,
    format: 'json',
    limit: 5,
    countrycodes: 'in',          // Bias to India
    addressdetails: 1,
    'accept-language': 'en',
  };

  // Note: Do NOT mix 'postalcode' with 'q' — Nominatim returns 400.
  // The pin code stays inside the q string, which works fine.

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`${NOMINATIM_BASE}/search`, {
        params,
        headers: { 'User-Agent': USER_AGENT },
        timeout: 8000,
      });

      if (response.data && response.data.length > 0) {
        const best = response.data[0];
        return {
          lat: parseFloat(best.lat),
          lng: parseFloat(best.lon),
          displayName: best.display_name,
          source: 'nominatim',
          confidence: parseFloat(best.importance || 0),
        };
      }

      // No results — don't retry, fall through to fallback
      return null;
    } catch (error) {
      console.warn(`Nominatim attempt ${attempt + 1} failed:`, error.message);
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1)); // Exponential backoff: 1s, 2s
      }
    }
  }

  return null;
}

/**
 * Fallback: Photon geocoder (by Komoot, built on OSM data)
 * Better fuzzy matching for landmarks, colleges, and partial addresses.
 */
async function tryPhoton(rawAddress, retries = 1) {
  const { address } = normalizeAddress(rawAddress);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`${PHOTON_BASE}/api`, {
        params: {
          q: address,
          limit: 5,
          lang: 'en',
          lat: 12.97,   // Bias toward Bangalore (common use case)
          lon: 77.59,
        },
        headers: { 'User-Agent': USER_AGENT },
        timeout: 8000,
      });

      const features = response.data?.features;
      if (features && features.length > 0) {
        const best = features[0];
        const [lng, lat] = best.geometry.coordinates;
        const props = best.properties;
        const displayName = [props.name, props.street, props.city, props.state, props.country]
          .filter(Boolean)
          .join(', ');

        return {
          lat,
          lng,
          displayName,
          source: 'photon',
          confidence: 0.5, // Photon doesn't provide importance scores
        };
      }

      return null;
    } catch (error) {
      console.warn(`Photon attempt ${attempt + 1} failed:`, error.message);
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  return null;
}
/**
 * Generate progressively simplified versions of an address.
 * Indian addresses often fail when too specific (house numbers, building names).
 * Strategy: try full → remove house number → remove first segment → fewer segments.
 */
function generateAddressVariants(rawAddress) {
  const variants = [rawAddress]; // Always try the original first

  // Split by commas
  const parts = rawAddress.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length > 2) {
    // Try without the first segment (usually house number / building name)
    variants.push(parts.slice(1).join(', '));
  }

  if (parts.length > 3) {
    // Try without the first two segments
    variants.push(parts.slice(2).join(', '));
  }

  if (parts.length > 4) {
    // Try without the first three segments (jump to locality level)
    variants.push(parts.slice(3).join(', '));
  }

  // Try the last 4 segments (usually locality, city, state, pincode)
  if (parts.length > 4) {
    variants.push(parts.slice(-4).join(', '));
  }

  // Try the last 3 segments (city, state, pincode)
  if (parts.length > 3) {
    variants.push(parts.slice(-3).join(', '));
  }

  // Try removing leading numbers (house numbers like "30, ...")
  const withoutLeadingNum = rawAddress.replace(/^\d+[\s,./\\-]+/, '').trim();
  if (withoutLeadingNum !== rawAddress && withoutLeadingNum.length > 5) {
    variants.push(withoutLeadingNum);
  }

  // Try stripping "Near ..." / "Opp ..." segments entirely
  const cleanedParts = parts.filter(p => !p.match(/^(near|opp\.?|opposite|behind)\s/i));
  if (cleanedParts.length < parts.length && cleanedParts.length >= 2) {
    variants.push(cleanedParts.join(', '));
    // Also try without first segment after cleaning
    if (cleanedParts.length > 2) {
      variants.push(cleanedParts.slice(1).join(', '));
    }
  }

  // Deduplicate
  return [...new Set(variants)];
}

/**
 * Main geocode function — tries Nominatim first, then Photon as fallback.
 * Uses progressive address simplification for resilience.
 * @param {string} address - The address string to geocode
 * @returns {Object|null} { lat, lng, displayName, source } or null if not found
 */
async function geocode(address) {
  if (!address || typeof address !== 'string' || address.trim().length < 3) {
    return null;
  }

  const variants = generateAddressVariants(address.trim());

  for (const variant of variants) {
    // Try Nominatim
    const nominatimResult = await tryNominatim(variant);
    if (nominatimResult) {
      console.log(`[Geocode] Resolved via Nominatim: "${variant}" → ${nominatimResult.lat}, ${nominatimResult.lng}`);
      return nominatimResult;
    }

    // Try Photon
    const photonResult = await tryPhoton(variant);
    if (photonResult) {
      console.log(`[Geocode] Resolved via Photon: "${variant}" → ${photonResult.lat}, ${photonResult.lng}`);
      return photonResult;
    }

    console.log(`[Geocode] Variant failed: "${variant}"`);
  }

  console.warn(`[Geocode] All variants/providers failed for: "${address}"`);
  return null;
}

module.exports = { geocode, normalizeAddress };
