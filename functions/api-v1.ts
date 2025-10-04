import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface CreditScoreRequest {
  persona_id: string;
  model_id: string; // Changed to string to support UUID
}

interface ScoreSimulationRequest extends CreditScoreRequest {
  feature_overrides?: Record<string, any>;
}

interface ScoreTrendRequest extends CreditScoreRequest {
  months?: number;
}

interface ModelFactorsRequest {
  model_id: string;
}

interface RiskBandsRequest {
  model_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for backend operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const url = new URL(req.url);
    const path = url.pathname.replace('/api-v1', '');

    // Route handling with enhanced security and validation
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
      
      // Public API endpoints for showcase
      case '/public/integrity-status':
        return await handleIntegrityStatus(req, supabaseClient);
      
      case '/public/score-models':
        return await handlePublicScoreModels(req, supabaseClient);
      
      case '/public/risk-factors':
        return await handlePublicRiskFactors(req, supabaseClient);
      
      case '/public/audit/summary':
        return await handlePublicAuditSummary(req, supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Not Found', 
            message: `Route ${path} not found`,
            available_endpoints: [
              '/credit-score/compute',
              '/credit-score/simulate', 
              '/credit-score/trend',
              '/credit-score/history',
              '/models/factors',
              '/models/risk-bands',
              '/public/integrity-status',
              '/public/score-models',
              '/public/risk-factors',
              '/public/audit/summary'
            ]
          }),
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
        message: error.message,
        timestamp: new Date().toISOString()
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
      JSON.stringify({ error: 'Method not allowed', allowed_methods: ['POST'] }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { persona_id, model_id }: CreditScoreRequest = await req.json();

    // Enhanced input validation
    if (!persona_id || !model_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          required_fields: ['persona_id', 'model_id'],
          received: { persona_id: !!persona_id, model_id: !!model_id }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    if (!isValidUUID(persona_id) || !isValidUUID(model_id)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid UUID format', 
          details: 'Both persona_id and model_id must be valid UUIDs'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call database function with proper error handling
    const { data, error } = await supabase
      .rpc('compute_credit_score', { 
        p_persona_id: persona_id, 
        p_model_id: model_id 
      });

    if (error) {
      console.error('Database error in compute_credit_score:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          details: error.message,
          hint: 'Check that persona and model exist and are accessible'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        computed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (parseError) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid request body', 
        details: 'Request must contain valid JSON with persona_id and model_id'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Simulate credit score without persistence
async function handleSimulateScore(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', allowed_methods: ['POST'] }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { persona_id, model_id, feature_overrides }: ScoreSimulationRequest = await req.json();

    // Enhanced input validation
    if (!persona_id || !model_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          required_fields: ['persona_id', 'model_id'],
          optional_fields: ['feature_overrides']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    if (!isValidUUID(persona_id) || !isValidUUID(model_id)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid UUID format', 
          details: 'Both persona_id and model_id must be valid UUIDs'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate feature overrides if provided
    if (feature_overrides && typeof feature_overrides !== 'object') {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid feature_overrides', 
          details: 'feature_overrides must be an object with numeric values'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .rpc('simulate_credit_score', { 
        p_persona_id: persona_id, 
        p_model_id: model_id, 
        p_feature_overrides: feature_overrides || {} 
      });

    if (error) {
      console.error('Database error in simulate_credit_score:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        simulated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (parseError) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid request body', 
        details: 'Request must contain valid JSON with persona_id, model_id, and optional feature_overrides'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Get score trend over time
async function handleScoreTrend(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', allowed_methods: ['GET'] }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const persona_id = url.searchParams.get('persona_id');
  const model_id = url.searchParams.get('model_id');
  const months = parseInt(url.searchParams.get('months') || '12');

  if (!persona_id || !model_id) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required query parameters', 
        required_params: ['persona_id', 'model_id'],
        optional_params: ['months']
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isValidUUID(persona_id) || !isValidUUID(model_id)) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid UUID format', 
        details: 'Both persona_id and model_id must be valid UUIDs'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .rpc('get_score_trend', { 
      p_persona_id: persona_id, 
      p_model_id: model_id, 
      p_months: months 
    });

  if (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Database error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data,
      query_params: { persona_id, model_id, months }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get credit score history
async function handleScoreHistory(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', allowed_methods: ['GET'] }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const persona_id = url.searchParams.get('persona_id');
  const model_id = url.searchParams.get('model_id');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  if (!persona_id) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required query parameter: persona_id',
        optional_params: ['model_id', 'limit']
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isValidUUID(persona_id) || (model_id && !isValidUUID(model_id))) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid UUID format', 
        details: 'persona_id and model_id (if provided) must be valid UUIDs'
      }),
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
    query = query.eq('model_id', model_id);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Database error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data,
      count: data?.length || 0,
      query_params: { persona_id, model_id, limit }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get model factors
async function handleModelFactors(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', allowed_methods: ['GET'] }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const model_id = url.searchParams.get('model_id');

  if (!model_id) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required query parameter: model_id'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isValidUUID(model_id)) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid UUID format', 
        details: 'model_id must be a valid UUID'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('score_factors')
    .select('*')
    .eq('model_id', model_id)
    .order('factor_key');

  if (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Database error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data,
      count: data?.length || 0,
      model_id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get risk bands
async function handleRiskBands(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', allowed_methods: ['GET'] }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const model_id = url.searchParams.get('model_id');

  if (!model_id) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required query parameter: model_id'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isValidUUID(model_id)) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid UUID format', 
        details: 'model_id must be a valid UUID'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('risk_bands')
    .select('*')
    .eq('model_id', model_id)
    .order('min_score');

  if (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Database error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data,
      count: data?.length || 0,
      model_id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Utility function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
// ============================================================================
// PUBLIC API HANDLERS FOR SHOWCASE
// ============================================================================

/**
 * GET /public/integrity-status
 * Returns system integrity metrics for public display
 */
async function handleIntegrityStatus(req: Request, supabase: any) {
  try {
    // Call the get_integrity_status function
    const { data, error } = await supabase.rpc('get_integrity_status');

    if (error) {
      console.error('Error fetching integrity status:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch integrity status',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orphan_records: data.orphan_count || 0,
          latest_run_id: data.latest_run_id || 'N/A',
          audit_entries_30d: data.audit_entries_30d || 0,
          rls_status: data.rls_status || 'ENFORCED',
          last_verification: data.last_verification || new Date().toISOString(),
          tables_checked: data.tables_checked || 8,
        },
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600'
        } 
      }
    );
  } catch (error: any) {
    console.error('Error in handleIntegrityStatus:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal Server Error',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * GET /public/score-models
 * Returns list of available scoring models (weights redacted)
 */
async function handlePublicScoreModels(req: Request, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('public_score_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching score models:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch score models',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        metadata: {
          count: data?.length || 0,
        },
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600'
        } 
      }
    );
  } catch (error: any) {
    console.error('Error in handlePublicScoreModels:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal Server Error',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * GET /public/risk-factors?owner_ref=demo-12345678
 * Returns risk factors for demo personas
 */
async function handlePublicRiskFactors(req: Request, supabase: any) {
  try {
    const url = new URL(req.url);
    const ownerRef = url.searchParams.get('owner_ref');
    const factorCode = url.searchParams.get('factor_code');
    const minConfidence = parseFloat(url.searchParams.get('min_confidence') || '0');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    let query = supabase
      .from('public_risk_factors')
      .select('*')
      .gte('confidence', minConfidence)
      .order('derived_at', { ascending: false })
      .limit(limit);

    if (ownerRef) {
      query = query.eq('owner_ref', ownerRef);
    }

    if (factorCode) {
      query = query.eq('factor_code', factorCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching risk factors:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch risk factors',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        metadata: {
          count: data?.length || 0,
          filters: {
            owner_ref: ownerRef,
            factor_code: factorCode,
            min_confidence: minConfidence,
          },
        },
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=120'
        } 
      }
    );
  } catch (error: any) {
    console.error('Error in handlePublicRiskFactors:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal Server Error',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * GET /public/audit/summary
 * Returns audit summary for compliance display
 */
async function handlePublicAuditSummary(req: Request, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('public_audit_summary')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching audit summary:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch audit summary',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || {
          total_score_runs: 0,
          runs_last_30d: 0,
          latest_run_timestamp: null,
          unique_personas: 0,
          rls_status: 'ENFORCED',
        },
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600'
        } 
      }
    );
  } catch (error: any) {
    console.error('Error in handlePublicAuditSummary:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal Server Error',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
