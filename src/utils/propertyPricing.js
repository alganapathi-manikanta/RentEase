/**
 * Centralized property pricing and transaction-type helpers.
 * Source of truth: property.transactionType ('rent' | 'sale' | 'both')
 */

/**
 * Normalizes property transaction type to 'rent' | 'sale' | 'both'.
 * Never infers from title, price, or text matching.
 */
export function getTransactionType(property) {
  if (!property) return 'rent';
  const raw =
    property.transactionType ||
    property.listingType ||
    property.status ||
    'rent';

  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'sale') return 'sale';
  if (normalized === 'both') return 'both';
  return 'rent';
}

/**
 * Formats a numeric price into Indian currency format (Lakhs, Crores, or comma-separated).
 */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (!num || isNaN(num) || num <= 0) return '₹0';
  if (num >= 10000000) {
    const cr = num / 10000000;
    return `₹${cr.toFixed(cr % 1 === 0 ? 0 : 2)} Cr`;
  }
  if (num >= 100000) {
    const l = num / 100000;
    return `₹${l.toFixed(l % 1 === 0 ? 0 : 1)}L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Formats price safely based on transaction context.
 * A SALE amount NEVER receives '/mo' or '/month'.
 */
export function formatPrice(amount, context = 'sale') {
  const formatted = formatCurrency(amount);
  const isRentContext = String(context).toLowerCase() === 'rent';
  return isRentContext ? `${formatted}/mo` : formatted;
}

/**
 * Centralized property pricing computation.
 */
export function getPropertyPricing(property) {
  if (!property) {
    return {
      transactionType: 'rent',
      isSale: false,
      isRent: true,
      isBoth: false,
      isSaleOnly: false,
      salePrice: 0,
      monthlyRent: 0,
      salePriceFormatted: '₹0',
      monthlyRentFormatted: '₹0/mo',
      badgeText: 'For Rent',
      badgeColor: 'bg-secondary',
      cardPriceDisplay: '₹0/mo',
    };
  }

  const txType = getTransactionType(property);
  const isSale = txType === 'sale';
  const isBoth = txType === 'both';
  const isRent = txType === 'rent';
  const isSaleOnly = isSale;

  const rawPrice = Number(property.price) || 0;
  const storedSalePrice = Number(property.saleDetails?.salePrice);
  const storedMonthlyRent = Number(property.rentDetails?.monthlyRent);

  // For SALE: price is salePrice.
  // For RENT: price is monthlyRent.
  // For BOTH: separate saleDetails.salePrice and rentDetails.monthlyRent.
  let salePrice = 0;
  let monthlyRent = 0;

  if (isSale) {
    salePrice = storedSalePrice > 0 ? storedSalePrice : rawPrice;
    monthlyRent = 0;
  } else if (isRent) {
    salePrice = 0;
    monthlyRent = storedMonthlyRent > 0 ? storedMonthlyRent : rawPrice;
  } else if (isBoth) {
    salePrice = storedSalePrice > 0 ? storedSalePrice : rawPrice;
    monthlyRent = storedMonthlyRent > 0 ? storedMonthlyRent : (property.monthlyRent ? Number(property.monthlyRent) : 0);
  }

  const salePriceFormatted = formatCurrency(salePrice);
  const monthlyRentFormatted = monthlyRent > 0 ? `${formatCurrency(monthlyRent)}/mo` : '';

  // Badge text and styling
  let badgeText = 'For Rent';
  let badgeColor = 'bg-secondary';
  if (isBoth) {
    badgeText = 'Rent or Sale';
    badgeColor = 'bg-primary';
  } else if (isSale) {
    badgeText = 'For Sale';
    badgeColor = 'bg-accent';
  }

  // Display string for property cards
  let cardPriceDisplay = '';
  if (isBoth) {
    if (salePrice > 0 && monthlyRent > 0) {
      cardPriceDisplay = `${formatCurrency(salePrice)} · ${formatCurrency(monthlyRent)}/mo`;
    } else if (salePrice > 0) {
      cardPriceDisplay = formatCurrency(salePrice);
    } else {
      cardPriceDisplay = `${formatCurrency(monthlyRent || rawPrice)}/mo`;
    }
  } else if (isSale) {
    // RULE: A SALE amount must NEVER be formatted with '/mo' or '/month'
    cardPriceDisplay = formatCurrency(salePrice || rawPrice);
  } else {
    // Rent
    cardPriceDisplay = `${formatCurrency(monthlyRent || rawPrice)}/mo`;
  }

  return {
    transactionType: txType,
    isSale,
    isRent,
    isBoth,
    isSaleOnly,
    salePrice,
    monthlyRent,
    salePriceFormatted,
    monthlyRentFormatted,
    badgeText,
    badgeColor,
    cardPriceDisplay,
  };
}

/**
 * Computes safe utility charge displays for Property Details.
 * RULE: 'Included in Rent' must NEVER appear for a SALE property.
 */
export function getPropertyUtilities(property) {
  if (!property) {
    return {
      sectionTitle: 'Pricing & Utilities',
      electricity: 'Not specified',
      water: 'Not specified',
      maintenance: 'Not specified',
      showRentRow: false,
      showSaleRow: false,
    };
  }

  const txType = getTransactionType(property);
  const isSale = txType === 'sale';
  const isBoth = txType === 'both';
  const isRent = txType === 'rent';

  const rawElec = property.electricityBill || property.rentDetails?.electricityBill;
  const rawElecCharge = property.monthlyElectricityCharge ?? property.rentDetails?.monthlyElectricityCharge;
  const rawWater = property.waterCharges || property.rentDetails?.waterCharges;
  const rawWaterCharge = property.monthlyWaterCharge ?? property.rentDetails?.monthlyWaterCharge;
  const rawMaint = property.rentDetails?.maintenanceCharges || property.maintenanceCharges || property.saleDetails?.maintenanceCharges;

  let electricity = 'As per usage';
  let water = 'As per usage';
  let maintenance = 'Not specified';

  if (isSale) {
    // SALE PROPERTY
    // 1. Electricity: NEVER "Included in Rent"
    if (rawElec && rawElec !== 'Included in Rent') {
      if (rawElec === 'Fixed Monthly Amount' && Number(rawElecCharge) > 0) {
        electricity = `Fixed (₹${Number(rawElecCharge).toLocaleString('en-IN')}/mo)`;
      } else {
        electricity = rawElec;
      }
    } else {
      electricity = 'As per usage';
    }

    // 2. Water: NEVER "Included in Rent"
    if (rawWater && rawWater !== 'Included in Rent') {
      if (rawWater === 'Fixed Monthly Amount' && Number(rawWaterCharge) > 0) {
        water = `Fixed (₹${Number(rawWaterCharge).toLocaleString('en-IN')}/mo)`;
      } else {
        water = rawWater;
      }
    } else {
      water = 'As per usage';
    }

    // 3. Maintenance
    if (rawMaint && Number(rawMaint) > 0) {
      maintenance = `₹${Number(rawMaint).toLocaleString('en-IN')}/month`;
    } else {
      maintenance = 'Not specified';
    }
  } else {
    // RENT OR BOTH PROPERTY
    // 1. Electricity
    if (rawElec === 'Fixed Monthly Amount' && Number(rawElecCharge) > 0) {
      electricity = `Fixed (₹${Number(rawElecCharge).toLocaleString('en-IN')}/mo)`;
    } else if (rawElec) {
      electricity = rawElec;
    } else {
      electricity = 'Included in Rent';
    }

    // 2. Water
    if (rawWater === 'Fixed Monthly Amount' && Number(rawWaterCharge) > 0) {
      water = `Fixed (₹${Number(rawWaterCharge).toLocaleString('en-IN')}/mo)`;
    } else if (rawWater) {
      water = rawWater;
    } else {
      water = 'Included in Rent';
    }

    // 3. Maintenance
    if (rawMaint && Number(rawMaint) > 0) {
      maintenance = `₹${Number(rawMaint).toLocaleString('en-IN')}/mo`;
    } else if (rawMaint === 'Included in Rent') {
      maintenance = 'Included in Rent';
    } else if (isRent) {
      maintenance = 'Included in Rent';
    } else {
      maintenance = 'Not specified';
    }
  }

  const sectionTitle = isSale
    ? 'Pricing & Utility Information'
    : isBoth
    ? 'Pricing & Utility Charges'
    : 'Rent & Utility Charges';

  return {
    sectionTitle,
    electricity,
    water,
    maintenance,
    isSale,
    isRent,
    isBoth,
  };
}
