// src/types/autolavado.ts

export type BookingStatus = "confirmed" | "pending" | "done" | "cancelled" | "blocked";
export type VehicleSize = "small" | "medium" | "large" | "suv" | "pickup";
export type ZoneMode = "NAME_ONLY" | "COORDINATES" | "POLYGON";

export interface Booking {
  id: string;
  tenant_id: number;
  service_id: number;
  vehicle_size: VehicleSize | null;
  vehicle_count: number | null;
  status: BookingStatus;
  start_at: string;
  end_at: string;
  timezone: string;
  workers_assigned: number;
  customer_name: string;
  customer_phone: string;
  location_type: string | null;
  address_text: string;
  maps_link: string | null;
  lat: number | null;
  lng: number | null;
  zone_id: number | null;
  total_duration_min: number;
  total_price_mxn: string;
  notes: string | null;
  crm_ref: Record<string, any>;
  created_at: string;
  updated_at: string;
  travel_time_min: number;
  travel_included: boolean;
}

export interface Service {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  is_active: boolean;
  description: string | null;
  includes: string[];
  base_duration_min: number;
  base_price_mxn: string | null;
  min_workers: number;
  max_workers: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceVehicleModifier {
  id: number;
  tenant_id: number;
  service_id: number;
  size: VehicleSize;
  duration_delta_min: number;
  price_delta_mxn: string;
  absolute_price_mxn: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceExtra {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  is_active: boolean;
  duration_min: number;
  price_mxn: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: number;
  tenant_id: number;
  name: string;
  is_active: boolean;
  pin: string;
  meta: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: number;
  tenant_id: number;
  name: string;
  is_active: boolean;
  mode: ZoneMode;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  polygon: any | null;
  synonyms: string[];
  created_at: string;
  updated_at: string;
}

export interface WeeklyHours {
  id: number;
  tenant_id: number;
  day_of_week: number; // 1-7
  start_local: string;
  end_local: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPolicy {
  id: number;
  tenant_id: number;
  base_start_local: string;
  base_end_local: string;
  duration_min: number;
  flex_before_min: number;
  flex_after_min: number;
  applies_to_all_workers: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  tenant_id: number;
  timezone: string;
  slot_interval_min: number;
  lead_time_min: number;
  same_day_cutoff_local: string | null;
  max_workers_per_booking: number;
  allow_parallel_within_booking: boolean;
  default_service_duration_min: number;
  default_travel_time_min: number;
  before_buffer_min: number;
  after_buffer_min: number;
  max_bookings_per_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocationCandidate {
  id: number;
  tenant_id: number;
  conversation_id: number;
  contact_id: number;
  message_id: string | null;
  provider_message_id: string;
  place_id: string;
  maps_link: string;
  formatted_address: string;
  colonia: string | null;
  postal_code: string | null;
  lat: number;
  lng: number;
  rank: number;
  created_at: string;
}

// Para dashboard
export interface DashboardSummary {
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  today_bookings: number;
  total_revenue_today: string;
  active_zones: number;
  active_workers: number;
  next_booking: {
    id: string;
    customer_name: string;
    customer_phone: string;
    status: BookingStatus;
    start_at: string;
    address_text: string;
  } | null;
}
