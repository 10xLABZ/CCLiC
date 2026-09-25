// Map utility for city map image retrieval
// Map filenames: STATE_CODE-CityName.png (e.g., CT-Hartford.png)

// Complete state name to code mapping
const STATE_CODES = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
};

/**
 * Gets the map image path for a given city
 * @param {string} stateName - Full state name (e.g., "Connecticut")
 * @param {string} cityName - City name (e.g., "Hartford", "New Haven")
 * @returns {string} Path to map image
 */
export const getCityMapImage = (stateName, cityName) => {
  if (!stateName || !cityName) {
    return "/assets/maps/0-Default.png";
  }
  
  const stateCode = STATE_CODES[stateName];
  
  if (stateCode) {
    // Format: STATE_CODE-CityName.png (remove spaces in city name)
    const formattedCity = cityName.replace(/\s+/g, '');
    return `/assets/maps/${stateCode}-${formattedCity}.png`;
  }
  
  // Default fallback if state not found
  return "/assets/maps/0-Default.png";
};

/**
 * Gets location display text
 * @param {string} city - City name
 * @param {string} state - State name
 * @returns {string} Formatted location text
 */
export const getLocationDisplay = (city, state) => {
  if (!city || !state) {
    return "📍 Unassigned Location";
  }
  return `📍 ${city}, ${state}`;
};