export function computeExpiryDate(issueDateInput: Date | string, validityPeriod: string): Date {
  const issueDate = new Date(issueDateInput);
  if (isNaN(issueDate.getTime())) return new Date();

  const expiryDate = new Date(issueDate);
  const vp = (validityPeriod || '1y').trim();

  if (vp === '1y' || vp === '1 year' || vp === '1 Year') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else if (vp === '2y' || vp === '2 year' || vp === '2 Years') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
  } else if (vp === '3y' || vp === '3 year' || vp === '3 Years') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);
  } else if (vp === '1/2y' || vp === '1/2 year' || vp === '6 Months' || vp === '6 months') {
    expiryDate.setMonth(expiryDate.getMonth() + 6);
  } else {
    // Default 1 Year
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  // Subtract 1 day: Issue Date + Validity Period - 1 Day
  expiryDate.setDate(expiryDate.getDate() - 1);

  return expiryDate;
}
