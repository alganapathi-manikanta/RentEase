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

/**
 * Formats a numeric price into full Indian numbering system format (e.g. ₹10,50,000).
 */
export function formatINR(amount) {
  const num = Number(amount);
  if (!num || isNaN(num) || num <= 0) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

/**
 * Deterministic Home Loan EMI & Repayment Calculator.
 * Supports zero-interest edge case (0% interest loans).
 */
export function calculateHomeLoanEmi({
  purchasePrice = 0,
  downPayment = 0,
  annualInterestRate = 8.5,
  tenureYears = 20,
} = {}) {
  const price = Math.max(0, Number(purchasePrice) || 0);
  const dp = Math.max(0, Math.min(price, Number(downPayment) || 0));
  const principal = Math.max(0, price - dp);
  const rate = Math.max(0, Math.min(100, Number(annualInterestRate) || 0));
  const years = Math.max(1, Math.min(50, Number(tenureYears) || 1));
  const months = Math.round(years * 12);

  if (principal <= 0) {
    return {
      purchasePrice: price,
      downPayment: dp,
      downPaymentPercent: price > 0 ? Math.round((dp / price) * 100) : 0,
      principal: 0,
      annualInterestRate: rate,
      tenureYears: years,
      tenureMonths: months,
      monthlyEmi: 0,
      totalInterest: 0,
      totalRepayment: 0,
      totalCost: dp,
    };
  }

  // Zero interest loan edge-case
  if (rate === 0) {
    const monthlyEmi = Math.round(principal / months);
    const totalRepayment = principal;
    return {
      purchasePrice: price,
      downPayment: dp,
      downPaymentPercent: price > 0 ? Math.round((dp / price) * 100) : 0,
      principal,
      annualInterestRate: 0,
      tenureYears: years,
      tenureMonths: months,
      monthlyEmi,
      totalInterest: 0,
      totalRepayment,
      totalCost: dp + totalRepayment,
    };
  }

  // Standard EMI formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const monthlyRate = rate / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, months);

  let monthlyEmi = 0;
  if (!isFinite(factor) || factor <= 1) {
    monthlyEmi = Math.round(principal / months);
  } else {
    monthlyEmi = Math.round((principal * monthlyRate * factor) / (factor - 1));
  }

  const totalRepayment = monthlyEmi * months;
  const totalInterest = Math.max(0, totalRepayment - principal);
  const totalCost = dp + totalRepayment;

  return {
    purchasePrice: price,
    downPayment: dp,
    downPaymentPercent: price > 0 ? Math.round((dp / price) * 100) : 0,
    principal,
    annualInterestRate: rate,
    tenureYears: years,
    tenureMonths: months,
    monthlyEmi,
    totalInterest,
    totalRepayment,
    totalCost,
  };
}

/**
 * Rent vs. Buy comparative cash-outflow projection over a user-selected horizon.
 * Non-predictive model clearly labeled with stated assumptions.
 */
export function calculateRentVsBuyProjection({
  monthlyRent = 0,
  monthlyUtilities = 0,
  annualRentHike = 5,
  purchasePrice = 0,
  downPayment = 0,
  annualInterestRate = 8.5,
  loanTenureYears = 20,
  monthlyMaintenance = 0,
  annualMaintenanceHike = 3,
  comparisonYears = 10,
} = {}) {
  const rent = Math.max(0, Number(monthlyRent) || 0);
  const utils = Math.max(0, Number(monthlyUtilities) || 0);
  const rentHike = Math.max(0, Math.min(50, Number(annualRentHike) || 0)) / 100;

  const emiData = calculateHomeLoanEmi({
    purchasePrice,
    downPayment,
    annualInterestRate,
    tenureYears: loanTenureYears,
  });

  const maint = Math.max(0, Number(monthlyMaintenance) || 0);
  const maintHike = Math.max(0, Math.min(50, Number(annualMaintenanceHike) || 0)) / 100;
  const totalYears = Math.max(1, Math.min(50, Math.round(Number(comparisonYears) || 10)));
  const loanMonths = emiData.tenureMonths;

  const projection = [];
  let cumulativeRent = 0;
  let cumulativeBuy = emiData.downPayment; // initial down payment outlay

  for (let y = 1; y <= totalYears; y++) {
    // Rent side: Rent + utilities with annual rent escalation
    const yearRentMonthly = rent * Math.pow(1 + rentHike, y - 1);
    const annualRentTotal = Math.round((yearRentMonthly + utils) * 12);
    cumulativeRent += annualRentTotal;

    // Buy side: EMI payments for active months in this year
    const startMonth = (y - 1) * 12 + 1;
    const endMonth = y * 12;
    let monthsWithEmi = 0;
    if (endMonth <= loanMonths) {
      monthsWithEmi = 12;
    } else if (startMonth <= loanMonths) {
      monthsWithEmi = loanMonths - startMonth + 1;
    } else {
      monthsWithEmi = 0;
    }

    const annualEmiTotal = emiData.monthlyEmi * monthsWithEmi;
    const yearMaintMonthly = maint * Math.pow(1 + maintHike, y - 1);
    const annualMaintTotal = Math.round(yearMaintMonthly * 12);
    const annualBuyTotal = annualEmiTotal + annualMaintTotal;
    cumulativeBuy += annualBuyTotal;

    projection.push({
      year: y,
      yearLabel: `Year ${y}`,
      annualRent: annualRentTotal,
      cumulativeRent,
      annualBuy: annualBuyTotal,
      cumulativeBuy,
    });
  }

  return {
    projection,
    totalRentOutflow: cumulativeRent,
    totalBuyOutflow: cumulativeBuy,
    difference: cumulativeBuy - cumulativeRent,
    emiData,
  };
}
