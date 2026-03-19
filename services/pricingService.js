/**
 * Pricing Engine — Rule based price calculator
 */

const PRICES = {
  'Haircut': 200,
  'Beard': 100,
  'Facial': 500,
};

function getPriceForService(serviceName) {
  if (!serviceName) return 0;

  // Normalize name
  const normalized = Object.keys(PRICES).find(
    k => k.toLowerCase() === serviceName.toLowerCase().trim()
  );

  return PRICES[normalized] || 0;
}

module.exports = {
  getPriceForService,
  PRICES
};
