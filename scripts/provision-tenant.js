#!/usr/bin/env node
/* eslint-disable no-console */
const { Client } = require('pg');
const crypto = require('crypto');

const DEFAULT_STAGE_TEMPLATE = [
  { name: 'Nuevo', color: '#0ea5e9' },
  { name: 'Contacto', color: '#34d399' },
  { name: 'Propuesta', color: '#f59e0b' },
  { name: 'Negociación', color: '#fb7185' },
  { name: 'Ganado', color: '#60a5fa', is_final: true },
];

const DEFAULT_CALENDAR_SCHEMA = (timezone) => ({
  active: false,
  timezone: timezone || 'America/Mexico_City',
  services: {},
  schedules: {},
  metadata: {},
});

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [key, inlineValue] = token.replace(/^--/, '').split('=');
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }
    const nextToken = argv[i + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      args[key] = nextToken;
      i += 1;
    } else {
      args[key] = 'true';
    }
  }
  return args;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
  }
  return false;
}

function randomPassword() {
  return crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
}

async function validatePlan(client, planId) {
  if (!planId) return null;
  const result = await client.query('SELECT id FROM plans WHERE id = $1 LIMIT 1', [planId]);
  if (result.rowCount === 0) {
    console.warn(`⚠️  Plan ${planId} no existe. Se omitirá plan_id.`);
    return null;
  }
  return planId;
}

async function ensureTenant(client, { name, slug, domain, planId }) {
  const existing = await client.query(
    'SELECT id, custom_modules FROM tenants WHERE slug = $1 LIMIT 1',
    [slug]
  );

  if (existing.rowCount > 0) {
    const tenantId = existing.rows[0].id;
    await client.query(
      `UPDATE tenants
       SET name = $2,
           domain = $3,
           plan_id = COALESCE($4, plan_id),
           is_active = true,
           updated_at = NOW()
       WHERE id = $1`,
      [tenantId, name, domain, planId]
    );
    return { tenantId, customModules: existing.rows[0].custom_modules || [] };
  }

  const insert = await client.query(
    `INSERT INTO tenants (name, slug, domain, plan_id, is_active, custom_modules, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, '[]'::jsonb, NOW(), NOW())
     RETURNING id, custom_modules`,
    [name, slug, domain, planId]
  );

  return { tenantId: insert.rows[0].id, customModules: insert.rows[0].custom_modules || [] };
}

async function ensureAdminUser(client, { tenantId, adminName, adminEmail, adminPassword }) {
  if (!adminEmail) {
    console.warn('⚠️  No se proporcionó --admin-email. Se omitirá creación de usuario.');
    return null;
  }
  const email = adminEmail.toLowerCase();
  const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
  if (existing.rowCount > 0) {
    const userId = existing.rows[0].id;
    await client.query(
      `UPDATE users
       SET name = COALESCE($2, name),
           tenant_id = $3,
           password_hash = $4,
           role = COALESCE(role, 'admin'),
           is_active = true,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, adminName, tenantId, adminPassword]
    );
    return { userId, password: adminPassword, wasCreated: false };
  }

  const insert = await client.query(
    `INSERT INTO users (name, email, password_hash, tenant_id, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'admin', true, NOW(), NOW())
     RETURNING id`,
    [adminName || 'Administrador', email, adminPassword, tenantId]
  );

  return { userId: insert.rows[0].id, password: adminPassword, wasCreated: true };
}

async function ensureRuntime(client, tenantId) {
  await client.query(
    `INSERT INTO tenant_runtime_state (tenant_id, human_outbound_ai_behavior, human_outbound_cooldown_minutes, created_at, updated_at)
     VALUES ($1, 'none', 0, NOW(), NOW())
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId]
  );
}

async function ensureBotProfile(client, tenantId) {
  const existing = await client.query(
    `SELECT id FROM bot_profiles WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
    [tenantId]
  );
  if (existing.rowCount > 0) return existing.rows[0].id;

  const insert = await client.query(
    `INSERT INTO bot_profiles (tenant_id, name, is_active, ai_enabled, language, config_version, created_at, updated_at)
     VALUES ($1, 'Default', true, true, 'es-MX', 1, NOW(), NOW())
     RETURNING id`,
    [tenantId]
  );
  return insert.rows[0].id;
}

async function ensurePipeline(client, tenantId) {
  const existing = await client.query(
    `SELECT id FROM pipelines WHERE tenant_id = $1 LIMIT 1`,
    [tenantId]
  );
  if (existing.rowCount > 0) return existing.rows[0].id;

  const pipelineInsert = await client.query(
    `INSERT INTO pipelines (name, tenant_id, is_default, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW())
     RETURNING id`,
    ['Pipeline Principal', tenantId]
  );

  const pipelineId = pipelineInsert.rows[0].id;
  const stageIds = [];
  for (let idx = 0; idx < DEFAULT_STAGE_TEMPLATE.length; idx += 1) {
    const stage = DEFAULT_STAGE_TEMPLATE[idx];
    const insert = await client.query(
      `INSERT INTO pipeline_stages (pipeline_id, name, color, position, is_final, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [pipelineId, stage.name, stage.color, idx, Boolean(stage.is_final)]
    );
    stageIds.push(insert.rows[0].id);
  }

  await client.query(
    `UPDATE pipelines SET stage_order = $2::int4[], updated_at = NOW() WHERE id = $1`,
    [pipelineId, stageIds]
  );

  return pipelineId;
}

async function ensureCalendarConfig(client, tenantId, timezone) {
  const existing = await client.query(
    `SELECT id FROM industry_configs WHERE tenant_id = $1 AND booking_schema IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
    [tenantId]
  );
  if (existing.rowCount > 0) return existing.rows[0].id;

  const schema = DEFAULT_CALENDAR_SCHEMA(timezone);
  const insert = await client.query(
    `INSERT INTO industry_configs (tenant_id, industry, booking_schema, created_at, updated_at)
     VALUES ($1, NULL, $2::jsonb, NOW(), NOW())
     RETURNING id`,
    [tenantId, JSON.stringify(schema)]
  );
  return insert.rows[0].id;
}

async function ensureIndustries(client, tenantId, industries) {
  if (!industries || industries.length === 0) return [];
  
  const createdIds = [];
  for (const industry of industries) {
    const trimmed = (industry || '').trim();
    if (!trimmed) continue;
    
    const existing = await client.query(
      `SELECT id FROM industry_configs WHERE tenant_id = $1 AND industry = $2 LIMIT 1`,
      [tenantId, trimmed]
    );
    
    if (existing.rowCount === 0) {
      const insert = await client.query(
        `INSERT INTO industry_configs (tenant_id, industry, schema_json, booking_schema, created_at, updated_at)
         VALUES ($1, $2, '{}'::jsonb, '{}'::jsonb, NOW(), NOW())
         RETURNING id`,
        [tenantId, trimmed]
      );
      createdIds.push({ industry: trimmed, id: insert.rows[0].id });
    }
  }
  return createdIds;
}

function upsertModule(modules, module) {
  const list = Array.isArray(modules) ? [...modules] : [];
  const index = list.findIndex((item) => item && item.slug === module.slug);
  if (index >= 0) {
    list[index] = { ...list[index], ...module };
  } else {
    list.push(module);
  }
  return list;
}

async function ensureAiAutomationSettings(client, tenantId) {
  const existing = await client.query(
    `SELECT id FROM ai_automation_settings WHERE tenant_id = $1 LIMIT 1`,
    [tenantId]
  );
  if (existing.rowCount > 0) return;

  await client.query(
    `INSERT INTO ai_automation_settings (tenant_id, reengage_active, reengage_interval_minutes, max_reengage_attempts, auto_move_pipeline, auto_tagging_enabled, updated_at)
     VALUES ($1, true, 180, 3, true, true, NOW())`,
    [tenantId]
  );
}

async function updateTenantModules(client, tenantId, modules) {
  if (!modules || modules.length === 0) return;
  const existing = await client.query('SELECT custom_modules FROM tenants WHERE id = $1', [tenantId]);
  const current = existing.rows[0]?.custom_modules ?? [];
  let merged = current;
  modules.forEach((module) => {
    merged = upsertModule(merged, module);
  });
  await client.query(
    `UPDATE tenants SET custom_modules = $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [tenantId, JSON.stringify(merged)]
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Falta la variable de entorno DATABASE_URL');
    process.exit(1);
  }

  const argv = parseArgs(process.argv.slice(2));
  const name = argv.name || argv.tenant || argv.t;
  if (!name) {
    console.error('❌ Debes especificar --name "Nombre del Tenant"');
    process.exit(1);
  }

  const slug = argv.slug ? slugify(argv.slug) : slugify(name);
  const domain = argv.domain || `${slug}.example.com`;
  const planIdRaw = argv.plan ? Number(argv.plan) : 1;
  const timezone = argv.timezone || 'America/Mexico_City';
  const adminEmail = argv['admin-email'] || argv.email;
  const adminName = argv['admin-name'] || `${name} Admin`;
  const adminPassword = argv['admin-password'] || randomPassword();
  const industriesRaw = argv.industries || '';
  const industries = industriesRaw
    .split(',')
    .map((s) => (s || '').trim())
    .filter((s) => s.length > 0);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    const validPlanId = await validatePlan(client, planIdRaw);
    const { tenantId } = await ensureTenant(client, { name, slug, domain, planId: validPlanId });

    const adminResult = await ensureAdminUser(client, {
      tenantId,
      adminName,
      adminEmail,
      adminPassword,
    });

    await ensureRuntime(client, tenantId);
    await ensureBotProfile(client, tenantId);
    await ensurePipeline(client, tenantId);
    await ensureCalendarConfig(client, tenantId, timezone);
    await ensureAiAutomationSettings(client, tenantId);

    const industriesCreated = await ensureIndustries(client, tenantId, industries);

    const modulesToEnable = [];
    if (industriesCreated.length > 0) {
      industriesCreated.forEach((ic) => {
        modulesToEnable.push({
          slug: ic.industry,
          name: ic.industry.charAt(0).toUpperCase() + ic.industry.slice(1),
          icon: 'Settings',
          route: `/portal/custom/${ic.industry}/${ic.id}`,
        });
      });
    }

    await updateTenantModules(client, tenantId, modulesToEnable);

    await client.query('COMMIT');

    console.log('✅ Tenant listo');
    console.log(`   • Tenant ID: ${tenantId}`);
    console.log(`   • Slug: ${slug}`);
    console.log(`   • Dominio: ${domain}`);
    if (validPlanId) {
      console.log(`   • Plan ligado: ${validPlanId}`);
    } else {
      console.log('   • Plan no asignado (plan_id nulo)');
    }
    if (adminResult) {
      if (adminResult.wasCreated) {
        console.log(`   • Usuario admin creado: ${adminEmail}`);
      } else {
        console.log(`   • Usuario admin actualizado: ${adminEmail}`);
      }
      console.log(`   • Contraseña inicial: ${adminResult.password}`);
    } else {
      console.log('   • No se creó usuario admin (falta --admin-email)');
    }
    if (industries.length > 0) {
      console.log(`   • Industries creadas: ${industries.join(', ')}`);
    } else {
      console.log('   • Sin industries (usa --industries "turismo,solar,..." para agregar)');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error aprovisionando tenant:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')</string>}