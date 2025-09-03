/**
 * Abbreviates middle names to keep the full name concise
 * Example: "João Giroto Aguiar Junior Melão" -> "João G. A. J. Melão"
 */
export function abbreviateName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  
  const names = fullName.trim().split(' ');
  
  // If 3 or fewer names, return as is
  if (names.length <= 3) {
    return fullName;
  }
  
  // Keep first and last name, abbreviate middle names
  const firstName = names[0];
  const lastName = names[names.length - 1];
  const middleNames = names.slice(1, -1);
  
  // Abbreviate middle names to first letter + dot
  const abbreviatedMiddle = middleNames
    .map(name => name.charAt(0).toUpperCase() + '.')
    .join(' ');
  
  return `${firstName} ${abbreviatedMiddle} ${lastName}`;
}