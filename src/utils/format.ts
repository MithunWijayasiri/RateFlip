/**
 * Formats a string representation of a number with thousands separators (commas).
 * It preserves decimal points and trailing zeros while typing.
 *
 * Example:
 * "10000" -> "10,000"
 * "10000.5" -> "10,000.5"
 * "10000." -> "10,000."
 */
export function formatCurrencyValue(value: string): string {
  if (!value) return '';
  
  // Split into integer and decimal parts to avoid formatting the decimal part
  const [integerPart, decimalPart] = value.split('.');
  
  // Use regex to add commas to the integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Rejoin with decimal part if it exists
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}
