export type TenantConfigBundle = {
  tenant: TenantCore;
  tenant_features?: TenantFeature[];
  tenant_runtime_state?: Record<string, any> | null;
  integrations?: Integration[];
  channel_accounts?: ChannelAccount[];
  bot_profiles?: BotProfile[];
  workflows?: Workflow[];
  workflow_assignments?: WorkflowAssignment[];
  tenant_apps?: TenantApp[];
  users?: UserSummary[];
};

export type TenantCore = {
  id?: number;
  name: string;
  slug: string;
  plan_id?: number | null;
  status?: string;
};

export type TenantFeature = {
  feature_key: string;
  enabled: boolean;
};

export type Integration = {
  id?: number;
  type: string;
  name: string;
  is_active: boolean;
  config?: any;
};

export type ChannelAccount = {
  id?: number;
  channel_type: string;
  provider: string;
  account_label?: string;
  account_type?: string;
  phone_e164?: string | null;
  wa_business_account_id?: string | null;
  wa_phone_number_id?: string | null;
  provider_account_id?: string | null;
  integration_id?: number | null;
  is_default?: boolean;
  is_active?: boolean;
};

export type BotProfile = {
  id?: number;
  name?: string;
  ai_enabled?: boolean;
  tone?: string;
  attitude?: string;
  purpose?: string;
  language?: string;
  use_custom_prompt?: boolean;
  custom_prompt?: string;
  tools?: any;
  policies?: any;
  config_version?: string;
};

export type Workflow = {
  id?: number;
  key: string;
  name: string;
  engine?: string;
  trigger_type?: string;
  trigger_filter?: any;
  integration_id?: number | null;
  is_active?: boolean;
};

export type WorkflowAssignment = {
  id?: number;
  workflow_id?: number;
  target_type?: string;
  target_filter?: any;
  is_active?: boolean;
};

export type TenantApp = {
  id?: number;
  key: string;
  name: string;
  ui_url?: string;
  api_webhook_url?: string;
  config?: any;
  is_active?: boolean;
};

export type UserSummary = {
  id?: number;
  name: string;
  email: string;
  role?: string;
  is_active?: boolean;
};
