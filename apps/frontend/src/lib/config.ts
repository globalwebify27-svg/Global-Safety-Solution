// Hardcoded for production to ensure Vercel doesn't fall back to localhost,
// but dynamically checks hostname to allow local development testing.
export const API_BASE_URL = 
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : 'https://global-safety-solution.onrender.com';
