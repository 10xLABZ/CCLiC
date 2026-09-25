// Reputation ladder system based on Respect
export const getReputationTitle = (respect) => {
  if (respect >= 6000) return "Capital King";
  if (respect >= 3000) return "Fund Manager";
  if (respect >= 1500) return "Elite Trader";
  if (respect >= 700) return "Market Operator";
  if (respect >= 300) return "Dirty Trader";
  if (respect >= 100) return "Street Broker";
  return "Small Time";
};