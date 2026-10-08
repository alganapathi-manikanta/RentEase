/**
 * Helper utilities for Rent Ease property listing and editing forms.
 */

/**
 * Checks whether a given property type string corresponds to land or plot.
 * Handles cases like 'Land', 'land', 'Plot', 'plot', 'Land / Plot', etc.
 *
 * @param {string} propertyType
 * @returns {boolean}
 */
export function isPlotOrLandType(propertyType = '') {
  const norm = String(propertyType || '').toLowerCase().trim();
  return (
    norm === 'land' ||
    norm === 'plot' ||
    norm === 'land / plot' ||
    norm.includes('plot') ||
    norm.includes('land')
  );
}

/**
 * Returns dynamic listing title placeholder based on property type and listing type.
 *
 * Rule specification:
 * - HOUSE (any listing type)           -> "e.g. Sunrise Meadows 3BHK"
 * - FLAT (any listing type)            -> "e.g. Sunrise Residency 2BHK Flat"
 * - PLOT / LAND + RENT                 -> "e.g. 1200 Sq.Ft Commercial Plot for Rent"
 * - PLOT / LAND + SALE                 -> "e.g. 1200 Sq.Ft Residential Plot for Sale"
 * - PLOT / LAND + BOTH (Rent + Sale)   -> "e.g. 1200 Sq.Ft Residential Plot for Rent/Sale"
 * - PLOT / LAND (default/unspecified)  -> "e.g. 1200 Sq.Ft Residential Plot for Sale"
 *
 * @param {string} propertyType - e.g. 'House', 'Flat', 'Land'
 * @param {string} listingType  - e.g. 'Rent', 'Sale', 'Both'
 * @returns {string} placeholder string
 */
export function getListingTitlePlaceholder(propertyType = '', listingType = '') {
  const normProp = String(propertyType || '').toLowerCase().trim();
  const normListing = String(listingType || '').toLowerCase().trim();

  if (isPlotOrLandType(normProp)) {
    if (normListing === 'rent') {
      return 'e.g. 1200 Sq.Ft Commercial Plot for Rent';
    }
    if (normListing === 'both') {
      return 'e.g. 1200 Sq.Ft Residential Plot for Rent/Sale';
    }
    // Sale or fallback default for plot/land
    return 'e.g. 1200 Sq.Ft Residential Plot for Sale';
  }

  if (normProp === 'flat' || normProp.includes('flat') || normProp.includes('apartment')) {
    return 'e.g. Sunrise Residency 2BHK Flat';
  }

  // House / Villa or default
  return 'e.g. Sunrise Meadows 3BHK';
}

/**
 * Returns the appropriate size label based on property type.
 * Plot/Land: "Plot area (sq. ft.)"
 * House/Flat: "Property size (sq. ft.)"
 *
 * @param {string} propertyType
 * @returns {string} label string
 */
export function getSizeLabel(propertyType = '') {
  return isPlotOrLandType(propertyType) ? 'Plot area (sq. ft.)' : 'Property size (sq. ft.)';
}
