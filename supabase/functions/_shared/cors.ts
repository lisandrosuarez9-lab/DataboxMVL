// Shared CORS configuration for Supabase Edge Functions
// Ensures consistent CORS policy across all functions

/**
 * Standard CORS headers for all Edge Functions
 * 
 * Access-Control-Allow-Origin: Restricted to GitHub Pages deployment
 * Access-Control-Allow-Headers: Covers all required client headers including:
 *   - authorization: Bearer tokens for authentication
 *   - apikey: Supabase anon key
 *   - content-type: Request body content type
 *   - x-client-info: Supabase client info
 *   - x-factora-correlation-id: Request tracing/correlation
 * 
 * Future Enhancement: For multiple origins, implement dynamic origin validation:
 * const allowedOrigins = ['https://lisandrosuarez9-lab.github.io', 'https://example.com'];
 * const origin = req.headers.get('origin');
 * const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://lisandrosuarez9-lab.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-factora-correlation-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
