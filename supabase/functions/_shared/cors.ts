// Shared CORS configuration for Supabase Edge Functions
// Ensures consistent CORS policy across all functions

/**
 * Dynamic CORS headers for all Edge Functions
 * 
 * Features:
 * - Dynamic origin validation against whitelist
 * - Echoes Access-Control-Request-Headers to support custom headers
 * - Includes Access-Control-Max-Age for preflight caching
 * - Adds Vary header to prevent cache poisoning
 * - Supports x-factora-correlation-id and other custom headers
 */

const ALLOWED_ORIGINS = new Set([
  "https://lisandrosuarez9-lab.github.io"
]);

/**
 * Generate dynamic CORS headers based on the incoming request
 * @param req - The incoming request object
 * @returns Record of CORS headers to include in the response
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const requestHeaders = req.headers.get('access-control-request-headers');
  const requestMethod = req.headers.get('access-control-request-method');
  
  // Validate and reflect origin
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) 
    ? origin 
    : Array.from(ALLOWED_ORIGINS)[0];
  
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours preflight cache
  };
  
  // Echo requested headers to allow custom headers like x-factora-correlation-id
  if (requestHeaders) {
    headers["Access-Control-Allow-Headers"] = requestHeaders;
  } else {
    // Fallback to standard headers if not specified
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info, x-factora-correlation-id";
  }
  
  // Add Vary header to prevent cache poisoning
  const varyHeaders = ["Origin"];
  if (requestHeaders) {
    varyHeaders.push("Access-Control-Request-Headers");
  }
  if (requestMethod) {
    varyHeaders.push("Access-Control-Request-Method");
  }
  headers["Vary"] = varyHeaders.join(", ");
  
  return headers;
}

// Keep legacy static export for backward compatibility
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://lisandrosuarez9-lab.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-factora-correlation-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
