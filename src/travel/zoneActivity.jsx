// Zone activity levels for cities and states
// HOT = super active (red, 🔥), +50% battles, -50% heat cost
// NORMAL = average (green, ⚡)
// COLD = low activity (blue, ❄️)

export const ZONE_ACTIVITY = {
  // ── US CITIES ──────────────────────────────────────────────────────────────
  // HOT zones — major metros with high crime/activity
  "New York City":      "hot",
  "Los Angeles":        "hot",
  "Chicago":            "hot",
  "Houston":            "hot",
  "Miami":              "hot",
  "Philadelphia":       "hot",
  "Detroit":            "hot",
  "Baltimore":          "hot",
  "New Orleans":        "hot",
  "Memphis":            "hot",
  "Atlanta":            "hot",
  "Oakland":            "hot",
  "St. Louis":          "hot",
  "Newark":             "hot",
  "Las Vegas":          "hot",
  "San Francisco":      "hot",

  // COLD zones — smaller/quieter cities
  "Juneau":             "cold",
  "Helena":             "cold",
  "Bismarck":           "cold",
  "Pierre":             "cold",
  "Montpelier":         "cold",
  "Cheyenne":           "cold",
  "Casper":             "cold",
  "Idaho Falls":        "cold",
  "Concord":            "cold",
  "Burlington":         "cold",
  "Provo":              "cold",
  "Augusta":            "cold",
  "Dover":              "cold",
  "Providence":         "cold",
  "Fargo":              "cold",
  "Sioux Falls":        "cold",
  "Topeka":             "cold",
  "Lincoln":            "cold",

  // ── GLOBAL CITIES ──────────────────────────────────────────────────────────
  // HOT global metros
  "Mexico City":        "hot",
  "São Paulo":          "hot",
  "Lagos":              "hot",
  "Cairo":              "hot",
  "Mumbai":             "hot",
  "Jakarta":            "hot",
  "Manila":             "hot",
  "Bogotá":             "hot",
  "Istanbul":           "hot",
  "Bangkok":            "hot",
  "Johannesburg":       "hot",
  "Karachi":            "hot",

  // COLD global cities
  "Auckland":           "cold",
  "Zurich":             "cold",
  "Vienna":             "cold",
  "Brussels":           "cold",
  "Doha":               "cold",
  "Nairobi":            "cold",
  "Casablanca":         "cold",
};

// Get activity for a city — default to "normal"
export function getCityActivity(cityName) {
  return ZONE_ACTIVITY[cityName] || "normal";
}

// Get state activity — derive from its hottest city
export function getStateActivity(stateName, cities = []) {
  const activities = cities.map(c => getCityActivity(c));
  if (activities.includes("hot")) return "hot";
  if (activities.includes("cold") && !activities.includes("normal")) return "cold";
  return "normal";
}

export const ACTIVITY_CONFIG = {
  hot: {
    label: "Hot",
    emoji: "🔥",
    color: "text-red-400",
    border: "border-red-700/60",
    bg: "bg-red-900/20",
    hoverBg: "hover:bg-red-900/30",
    battleMultiplier: 1.5,   // +50% battles
    heatMultiplier: 0.5,     // -50% heat cost
  },
  normal: {
    label: "Active",
    emoji: "⚡",
    color: "text-emerald-400",
    border: "border-emerald-800/40",
    bg: "bg-emerald-900/10",
    hoverBg: "hover:bg-emerald-900/20",
    battleMultiplier: 1.0,
    heatMultiplier: 1.0,
  },
  cold: {
    label: "Cold",
    emoji: "❄️",
    color: "text-blue-400",
    border: "border-blue-800/40",
    bg: "bg-blue-900/10",
    hoverBg: "hover:bg-blue-900/20",
    battleMultiplier: 1.0,
    heatMultiplier: 1.0,
  },
};