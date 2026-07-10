// Trigger Vercel build to apply environment variables update
// Hardcoded for production to ensure Vercel doesn't fall back to localhost,
// but dynamically checks hostname to allow local development testing.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://global-safety-solution.onrender.com';
const sanitizedApiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export const API_BASE_URL = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname))
    ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3001`)
    : sanitizedApiUrl;
