-- Add vehicle count tracking to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS vehicle_count integer NOT NULL DEFAULT 1;
