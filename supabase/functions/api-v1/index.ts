import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface CreditScoreRequest {
  persona_id: string;
  model_id: number;
}

interface ScoreSimulationRequest extends CreditScoreRequest {
  feature_overrides?: Record<string, any>;
}

interface ScoreTrendRequest extends CreditScoreRequest {
  months?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);
    const path = url.pathname.replace('/api-v1', '');

    // Route handling
    switch (path) {
      case '/credit-score/compute':
        return await handleComputeScore(req, supabaseClient);
      
      case '/credit-score/simulate':
        return await handleSimulateScore(req, supabaseClient);
      
      case '/credit-score/trend':
        return await handleScoreTrend(req, supabaseClient);
      
      case '/credit-score/history':
        return await handleScoreHistory(req, supabaseClient);
      
      case '/models/factors':
        return await handleModelFactors(req, supabaseClient);
      
      case '/models/risk-bands':
        return await handleRiskBands(req, supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Not Found', message: `Route ${path} not found` }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Compute and persist credit score
async function handleComputeScore(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { persona_id, model_id }: CreditScoreRequest = await req.json();

  if (!persona_id || !model_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: persona_id, model_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .rpc('compute_credit_score', { persona_id, model_id });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Database error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Simulate credit score without persistence
async function handleSimulateScore(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { persona_id, model_id, feature_overrides }: ScoreSimulationRequest = await req.json();

  if (!persona_id || !model_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: persona_id, model_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .rpc('simulate_credit_score', { 
      persona_id, 
      model_id, 
      feature_overrides: feature_overrides || {} 
    });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Database error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get score trend over time
async function handleScoreTrend(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const persona_id = url.searchParams.get('persona_id');
  const model_id = parseInt(url.searchParams.get('model_id') || '1');
  const months = parseInt(url.searchParams.get('months') || '12');

  if (!persona_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: persona_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .rpc('get_score_trend', { persona_id, model_id, months });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Database error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get credit score history
async function handleScoreHistory(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const persona_id = url.searchParams.get('persona_id');
  const model_id = url.searchParams.get('model_id');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  if (!persona_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: persona_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let query = supabase
    .from('credit_scores')
    .select('*')
    .eq('persona_id', persona_id)
    .order('computed_at', { ascending: false })
    .limit(limit);

  if (model_id) {
    query = query.eq('model_id', parseInt(model_id));
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Database error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get model factors
async function handleModelFactors(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const model_id = url.searchParams.get('model_id') || '1';

  const { data, error } = await supabase
    .from('score_factors')
    .select('*')
    .eq('model_id', parseInt(model_id))
    .order('feature_key');

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Database error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get risk bands
async function handleRiskBands(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const model_id = url.searchParams.get('model_id') || '1';

  const { data, error } = await supabase
    .from('risk_bands')
    .select('*')
    .eq('model_id', parseInt(model_id))
    .order('min_score');

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Database error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}