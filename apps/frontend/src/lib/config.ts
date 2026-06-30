// Hardcoded for production to ensure Vercel doesn't fall back to localhost,
// but dynamically checks hostname to allow local development testing.
export const API_BASE_URL = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname))
    ? `http://${window.location.hostname}:3001`
    : 'https://global-safety-solution.onrender.com';
