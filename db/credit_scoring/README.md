# Credit Scoring System

This directory contains the database schema and functions for the DataboxMVL credit scoring engine.

## Overview

The credit scoring system provides a comprehensive solution for evaluating persona creditworthiness based on transaction history, remittances, bill payments, and microcredit activity.

## Database Schema

### Tables

1. **`score_factors`** - Model feature weights for credit scoring calculations
2. **`risk_bands`** - Score ranges and corresponding risk band classifications
3. **`credit_scores`** - Historical credit scores computed for personas

### Functions

1. **`extract_features(persona_id)`** - Extract credit scoring features from persona data
2. **`apply_weights(features, model_id)`** - Apply model weights to features
3. **`normalize_score(raw_score)`** - Normalize scores to 0-1000 scale
4. **`compute_credit_score(persona_id, model_id)`** - Compute and persist complete credit score
5. **`get_score_trend(persona_id, model_id, months)`** - Get historical score trends
6. **`simulate_credit_score(persona_id, model_id, feature_overrides)`** - Simulate scores without persistence

## Setup Instructions

Run the SQL files in order:

```bash
# 1. Create tables
psql -f 01_tables.sql

# 2. Create functions
psql -f 02_functions.sql

# 3. Set up RLS policies
psql -f 03_policies.sql

# 4. Create performance indexes
psql -f 04_indexes.sql

# 5. Populate initial data for model 1
psql -f 05_initial_data.sql
```

## API Endpoints

The Supabase Edge Function provides the following endpoints:

- `POST /api-v1/credit-score/compute` - Compute and persist credit score
- `POST /api-v1/credit-score/simulate` - Simulate credit score with overrides
- `GET /api-v1/credit-score/trend` - Get score trend over time
- `GET /api-v1/credit-score/history` - Get credit score history
- `GET /api-v1/models/factors` - Get model scoring factors
- `GET /api-v1/models/risk-bands` - Get risk band definitions

## Features Extracted

The system extracts these features from persona data:

- `tx_6m_count` - Number of transactions in last 6 months
- `tx_6m_avg_amount` - Average transaction amount in last 6 months
- `tx_6m_sum` - Sum of transactions in last 6 months
- `days_since_last_tx` - Days since last transaction
- `remesa_12m_sum` - Sum of remittances in last 12 months
- `bills_paid_ratio` - Ratio of paid utility bills
- `avg_bill_amount` - Average bill amount
- `micro_active` - Has active microcredit (boolean)
- `micro_active_sum` - Sum of active microcredits

## Risk Bands (Model 1)

- **Band A (800-1000)**: Premium credit products with lowest interest rates
- **Band B (650-799)**: Standard credit products with competitive rates
- **Band C (450-649)**: Basic credit products with standard rates
- **Band D (0-449)**: Limited eligibility, secured credit options only

## Security

- Row-Level Security (RLS) enabled on all tables
- User access restricted to their own personas
- Service roles can access all data for administrative purposes
- All functions use SECURITY INVOKER for proper permission checking

## Performance

- Optimized indexes for common query patterns
- Composite indexes for persona-model lookups
- Chronological indexes for time-series queries
- Score range indexes for risk band classification