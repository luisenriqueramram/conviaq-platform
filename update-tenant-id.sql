-- Script para cambiar tenant_id a 24 en todas las tablas de autolavado

-- Bookings
UPDATE bookings SET tenant_id = 24 WHERE tenant_id != 24;

-- Location Candidates
UPDATE location_candidates SET tenant_id = 24 WHERE tenant_id != 24;

-- Meal Policy
UPDATE meal_policy SET tenant_id = 24 WHERE tenant_id != 24;

-- Service Vehicle Modifiers
UPDATE service_vehicle_modifiers SET tenant_id = 24 WHERE tenant_id != 24;

-- Services
UPDATE services SET tenant_id = 24 WHERE tenant_id != 24;

-- Tenant Settings
UPDATE tenant_settings SET tenant_id = 24 WHERE tenant_id != 24;

-- Weekly Hours
UPDATE weekly_hours SET tenant_id = 24 WHERE tenant_id != 24;

-- Workers
UPDATE workers SET tenant_id = 24 WHERE tenant_id != 24;

-- Zones
UPDATE zones SET tenant_id = 24 WHERE tenant_id != 24;
