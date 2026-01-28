export type BookingServiceConfig = {
  name: string;
  modality?: "virtual" | "presential" | "hybrid" | string;
  duration_minutes?: number | null;
  requires_address?: boolean;
  buffer_after_minutes?: number | null;
  description?: string | null;
  schedule_keys?: string[];
};

export type BookingScheduleBlock = {
  label?: string;
  days: number[];
  start: string; // HH:mm (24h)
  end: string;   // HH:mm (24h)
  breaks?: string[];
  capacity?: number | null;
};

export type BookingSchema = {
  active?: boolean;
  timezone?: string;
  services?: Record<string, BookingServiceConfig>;
  schedules?: Record<string, BookingScheduleBlock>;
  fixed_capacity?: number | null;
  concurrency_mode?: "users" | "services" | "slots" | string;
  metadata?: Record<string, any>;
};

export type BookingSchemaConfig = {
  id: number;
  industry?: string | null;
  updated_at?: string | null;
  booking_schema: BookingSchema;
};

export type CalendarEventSource = "appointment" | "booking";

export type CalendarEvent = {
  id: string;
  tenant_id: number;
  source: CalendarEventSource;
  modality: "virtual" | "presential";
  status: string;
  title: string;
  start_at: string;
  end_at: string | null;
  channel?: string | null;
  service_type?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  location?: string | null;
  notes?: string | null;
  price_label?: string | null;
  metadata?: Record<string, any> | null;
};

export type CalendarEventsResponse = {
  ok: boolean;
  events: CalendarEvent[];
  range: {
    start: string;
    end: string;
  };
};
