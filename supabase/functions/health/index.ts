// health: Simple health check function for platform verification
// Returns { ok: true } to verify Supabase Edge Functions runtime is healthy
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Health check handler
 * Responds to OPTIONS, GET, and POST with { ok: true }
 * Includes CORS headers for cross-origin requests
 */
async function handler(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    });
  }
  
  // Respond to GET or POST with health status
  const healthStatus = {
    ok: true,
    timestamp: new Date().toISOString(),
    function: 'health',
    runtime: 'supabase-edge-functions'
  };
  
  return new Response(JSON.stringify(healthStatus), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

serve(handler);
