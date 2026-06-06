/**
 * Calculates the number of remaining days between the current date and an expiry date.
 * 
 * @param expiryDate - The expiration date (ISO string or Date object)
 * @returns The number of remaining days (minimum 0)
 */
export const calculateRemainingDays = (expiryDate: string | Date): number => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  
  // Calculate the difference in milliseconds
  const diffTime = expiry.getTime() - now.getTime();
  
  // Convert to days and round up
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};
