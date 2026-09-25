// State risk tier system
export const STATE_RISK_TIERS = {
  "Connecticut": { tier: 3, label: "High" },
  "Massachusetts": { tier: 4, label: "Extreme" },
  "New York": { tier: 5, label: "Extreme" },
  "California": { tier: 4, label: "Extreme" },
  "Texas": { tier: 3, label: "High" },
  "Florida": { tier: 3, label: "High" },
  "Illinois": { tier: 4, label: "Extreme" },
  "Nevada": { tier: 4, label: "Extreme" },
  "New Jersey": { tier: 3, label: "High" },
  "Pennsylvania": { tier: 2, label: "Medium" },
  "Ohio": { tier: 2, label: "Medium" },
  "Georgia": { tier: 2, label: "Medium" },
  "Michigan": { tier: 2, label: "Medium" },
  "Arizona": { tier: 3, label: "High" },
  "Washington": { tier: 3, label: "High" },
  // Default for other states
};

export const getStateRisk = (stateName) => {
  return STATE_RISK_TIERS[stateName] || { tier: 1, label: "Low" };
};

// Risk modifier for jobs (heat and payout)
export const getRiskJobModifier = (tier) => {
  const modifiers = {
    1: { heatMult: 0.9, payoutVariance: 0.05 },
    2: { heatMult: 1.0, payoutVariance: 0.10 },
    3: { heatMult: 1.1, payoutVariance: 0.15 },
    4: { heatMult: 1.2, payoutVariance: 0.20 },
    5: { heatMult: 1.3, payoutVariance: 0.25 },
  };
  return modifiers[tier] || modifiers[1];
};

// Risk influence on Trade Wars bot types
export const getRiskBotWeights = (tier) => {
  const weights = {
    1: { Whale: 5, Strong: 15, Average: 40, Weak: 25, Noob: 15 },
    2: { Whale: 7, Strong: 18, Average: 40, Weak: 22, Noob: 13 },
    3: { Whale: 10, Strong: 20, Average: 40, Weak: 20, Noob: 10 },
    4: { Whale: 13, Strong: 22, Average: 40, Weak: 17, Noob: 8 },
    5: { Whale: 15, Strong: 25, Average: 40, Weak: 15, Noob: 5 },
  };
  return weights[tier] || weights[1];
};

// Get state code from full name
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

export const getStateCode = (stateName) => {
  return STATE_CODES[stateName] || stateName;
};

export const getLocationDisplay = (cityName, stateName) => {
  if (!cityName || !stateName) return "📍 Unassigned Location";
  const stateCode = getStateCode(stateName);
  const risk = getStateRisk(stateName);
  return `${cityName}, ${stateCode} • Risk: ${risk.label}`;
};