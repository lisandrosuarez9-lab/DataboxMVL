-- Row-Level Security Policies
-- Step 3: Implement Row-Level Security Policies

-- Enable RLS on tables
ALTER TABLE public.score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;

-- Risk bands policies
CREATE POLICY risk_bands_read_policy ON public.risk_bands
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY risk_bands_write_policy ON public.risk_bands
  FOR ALL USING (auth.role() IN ('service_role', 'admin'));

-- Score factors policies
CREATE POLICY score_factors_read_policy ON public.score_factors
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY score_factors_write_policy ON public.score_factors
  FOR ALL USING (auth.role() IN ('service_role', 'admin'));

-- Credit scores policies
-- Note: Assuming user_personas table exists to link users to personas
CREATE POLICY credit_scores_read_policy ON public.credit_scores
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_personas 
      WHERE persona_id = credit_scores.persona_id
    ) OR auth.role() IN ('service_role', 'admin')
  );
  
CREATE POLICY credit_scores_write_policy ON public.credit_scores
  FOR INSERT USING (
    auth.uid() IN (
      SELECT user_id FROM user_personas 
      WHERE persona_id = credit_scores.persona_id
    ) OR auth.role() IN ('service_role', 'admin')
  );

-- Add policy comments for documentation
COMMENT ON POLICY risk_bands_read_policy ON public.risk_bands IS 'Allow authenticated users to read risk band definitions';
COMMENT ON POLICY risk_bands_write_policy ON public.risk_bands IS 'Allow service roles to manage risk band configurations';
COMMENT ON POLICY score_factors_read_policy ON public.score_factors IS 'Allow authenticated users to read scoring factors';
COMMENT ON POLICY score_factors_write_policy ON public.score_factors IS 'Allow service roles to manage scoring model configurations';
COMMENT ON POLICY credit_scores_read_policy ON public.credit_scores IS 'Allow users to read their own credit scores and service roles to read all';
COMMENT ON POLICY credit_scores_write_policy ON public.credit_scores IS 'Allow users to compute their own credit scores and service roles to compute all';