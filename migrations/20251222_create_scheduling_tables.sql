-- Migration: Create scheduling and services tables for tenants

BEGIN;

-- 1) tenant_scheduling_config
CREATE TABLE IF NOT EXISTS tenant_scheduling_config (
  tenant_id bigint PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  slot_interval_min integer NOT NULL DEFAULT 30,
  lead_time_min integer NOT NULL DEFAULT 60,
  default_travel_time_min integer NOT NULL DEFAULT 0,
  before_buffer_min integer NOT NULL DEFAULT 0,
  after_buffer_min integer NOT NULL DEFAULT 0,
  same_day_cutoff_local time NOT NULL DEFAULT '12:00:00',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) tenant_weekly_hours
CREATE TABLE IF NOT EXISTS tenant_weekly_hours (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time_local time NOT NULL,
  close_time_local time NOT NULL,
  breaks_json jsonb NULL,
  CONSTRAINT tenant_weekly_hours_unique UNIQUE (tenant_id, day_of_week)
);

-- 3) tenant_services
CREATE TABLE IF NOT EXISTS tenant_services (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  base_duration_min integer NOT NULL DEFAULT 30,
  duration_delta_min integer NOT NULL DEFAULT 0,
  price_mxn numeric(12,2) NOT NULL DEFAULT 0,
  metadata jsonb NULL,
  CONSTRAINT tenant_services_code_unique UNIQUE (tenant_id, code)
);

COMMIT;
