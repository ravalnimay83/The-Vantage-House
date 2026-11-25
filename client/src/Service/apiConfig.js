// Use relative path so Vite's /api proxy routes requests to Spring Boot (localhost:8080)
// This works seamlessly on localhost, Wi-Fi mobile IPs, and HTTPS tunnels without port 8080 firewall issues.
export const API_BASE_URL = '/api/v1.0';
