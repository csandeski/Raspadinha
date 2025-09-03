// Script to clear expired tokens from localStorage
localStorage.removeItem('affiliateToken');
localStorage.removeItem('affiliateRememberMe');
sessionStorage.clear();
console.log('All expired tokens cleared');
