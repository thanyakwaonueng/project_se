// backend/validators.js

// enum lists ใช้ในฟอร์ม
const roles = ['ADMIN', 'ARTIST', 'VENUE', 'FAN'];
const bookingTypes = ['FREELANCE', 'LABEL', 'INDEPENDENT'];
const eventTypes = ['CONCERT', 'FESTIVAL', 'SHOWCASE'];
const ticketingTypes = ['FREE', 'PAID'];
const alcoholPolicies = ['NO_ALCOHOL', 'BEER_ONLY', 'FULL_BAR'];
const priceRates = ['CHEAP', 'MODERATE', 'EXPENSIVE'];

module.exports = {
  roles,
  bookingTypes,
  eventTypes,
  ticketingTypes,
  alcoholPolicies,
  priceRates,
};
