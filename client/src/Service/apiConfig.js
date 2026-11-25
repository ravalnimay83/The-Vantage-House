// Use VITE_API_BASE_URL in production (e.g. https://your-backend.onrender.com/api/v1.0),
// falling back to Vite's /api proxy in local development.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1.0';
