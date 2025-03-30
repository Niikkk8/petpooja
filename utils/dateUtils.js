// Common Date Utilities for Inventory System

/**
 * Formats a date object to DD/MM/YYYY format
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateToDDMMYYYY = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Parses a date string to a Date object
 * Handles both DD/MM/YYYY and MM/DD/YYYY formats
 * @param {string} dateStr - The date string to parse
 * @param {boolean} isMMDDYYYY - Whether the input is in MM/DD/YYYY format
 * @returns {Date|null} Date object or null if invalid
 */
export const parseDateString = (dateStr, isMMDDYYYY = false) => {
  if (!dateStr) return null;

  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  try {
    if (isMMDDYYYY) {
      // Convert from MM/DD/YYYY to Date object
      return new Date(
        parseInt(parts[2]),
        parseInt(parts[0]) - 1,
        parseInt(parts[1])
      );
    } else {
      // Parse from DD/MM/YYYY
      return new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0])
      );
    }
  } catch (e) {
    console.error("Date parsing error:", e);
    return null;
  }
};

/**
 * Converts date from MM/DD/YYYY to DD/MM/YYYY format
 * @param {string} mmddyyyyStr - MM/DD/YYYY formatted date string
 * @returns {string} DD/MM/YYYY formatted date string
 */
export const convertMMDDToDD = (mmddyyyyStr) => {
  if (!mmddyyyyStr || mmddyyyyStr === "No date found") return mmddyyyyStr;

  const parts = mmddyyyyStr.split("/");
  if (parts.length !== 3) return mmddyyyyStr;

  return `${parts[1]}/${parts[0]}/${parts[2]}`;
};

/**
 * Converts date from DD/MM/YYYY to MM/DD/YYYY format
 * @param {string} ddmmyyyyStr - DD/MM/YYYY formatted date string
 * @returns {string} MM/DD/YYYY formatted date string
 */
export const convertDDToMMDD = (ddmmyyyyStr) => {
  if (!ddmmyyyyStr) return ddmmyyyyStr;

  const parts = ddmmyyyyStr.split("/");
  if (parts.length !== 3) return ddmmyyyyStr;

  return `${parts[1]}/${parts[0]}/${parts[2]}`;
};

/**
 * Calculate days until expiry with DD/MM/YYYY format
 * @param {string} expiryDateStr - Date string in DD/MM/YYYY format
 * @returns {number|null} Days until expiry or null if invalid
 */
export const getDaysUntilExpiry = (expiryDateStr) => {
  if (!expiryDateStr) return null;

  // Parse the DD/MM/YYYY format
  const parts = expiryDateStr.split("/");
  if (parts.length !== 3) return null;

  const expiryDate = new Date(parts[2], parts[1] - 1, parts[0]);
  const today = new Date();

  // Reset time part for accurate day calculation
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};
