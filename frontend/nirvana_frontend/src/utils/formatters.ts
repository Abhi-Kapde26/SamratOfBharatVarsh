// Formatter utility for Indian Rupee currency and formatting

export function formatIndianNumber(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  const parts = Math.round(num).toString().split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return parts.length > 1 ? formatted + '.' + parts[1] : formatted;
}

export function formatCurrency(amount: number, short: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';

  if (short) {
    if (amount >= 10000000) { // 1 Crore = 10,000,000
      const cr = amount / 10000000;
      return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
    }
    if (amount >= 100000) { // 1 Lakh = 100,000
      const lakh = amount / 100000;
      return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} Lakh`;
    }
    return `₹${formatIndianNumber(amount)}`;
  }

  return `₹${formatIndianNumber(amount)}`;
}

export function formatScore(num: number): string {
  if (isNaN(num)) return '0';
  return Math.round(num).toString();
}
