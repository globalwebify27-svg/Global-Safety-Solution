/**
 * Convert a number to Indian English words
 * e.g., 150000 → "One Lakh Fifty Thousand Rupees Only"
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
}

function threeDigitWords(n: number): string {
  if (n === 0) return '';
  if (n < 100) return twoDigitWords(n);
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigitWords(n % 100) : '');
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const num = Math.round(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - num) * 100);
  
  if (num === 0 && paise === 0) return 'Zero Rupees Only';

  let words = '';
  
  // Indian numbering: Crore, Lakh, Thousand, Hundred
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  if (crore > 0) words += twoDigitWords(crore) + ' Crore ';
  if (lakh > 0) words += twoDigitWords(lakh) + ' Lakh ';
  if (thousand > 0) words += twoDigitWords(thousand) + ' Thousand ';
  if (remainder > 0) words += threeDigitWords(remainder);

  words = words.trim();
  
  if (paise > 0) {
    words += ' Rupees and ' + twoDigitWords(paise) + ' Paise Only';
  } else {
    words += ' Rupees Only';
  }

  return (amount < 0 ? 'Minus ' : '') + words;
}
