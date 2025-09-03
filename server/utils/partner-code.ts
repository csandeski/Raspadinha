// Generate unique partner invite code (2 numbers + 4 letters)
export function generatePartnerInviteCode(): string {
  const numbers = Math.floor(10 + Math.random() * 90).toString(); // 2 random numbers (10-99)
  const letters = Array.from({ length: 4 }, () => 
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join(''); // 4 random uppercase letters
  
  return numbers + letters;
}

// Validate partner invite code format
export function validatePartnerInviteCode(code: string): boolean {
  // Must be exactly 6 characters: 2 numbers followed by 4 letters
  const pattern = /^[0-9]{2}[A-Z]{4}$/;
  return pattern.test(code);
}