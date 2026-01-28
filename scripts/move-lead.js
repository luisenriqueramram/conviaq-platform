#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return {};
  const content = fs.readFileSync(p, 'utf8');
  const out = {};
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let v = m[2] || '';
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  });
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: node scripts/move-lead.js <leadId> <stageId>');
    process.exit(1);
  }
  const leadId = Number(argv[0]);
  const stageId = Number(argv[1]);
  if (!Number.isFinite(leadId) || !Number.isFinite(stageId)) {
    console.error('Invalid ids');
    process.exit(1);
  }

  const env = Object.assign({}, process.env, loadEnvLocal());
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in env or .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  try {
    console.log('Checking lead', leadId);
    const leadRes = await client.query('SELECT id, tenant_id, pipeline_id, stage_id FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) {
      console.error('Lead not found');
      process.exit(2);
    }
    const lead = leadRes.rows[0];
    console.log('Lead:', lead);

    console.log('Checking stage', stageId);
    const stageRes = await client.query('SELECT id, pipeline_id FROM pipeline_stages WHERE id = $1', [stageId]);
    if (stageRes.rows.length === 0) {
      console.error('Stage not found');
      process.exit(3);
    }
    const stage = stageRes.rows[0];
    console.log('Stage:', stage);

    console.log('Beginning transaction to move lead');
    await client.query('BEGIN');
    const prevStage = lead.stage_id;
    await client.query('UPDATE leads SET stage_id = $1, updated_at = NOW() WHERE id = $2', [stageId, leadId]);

    await client.query(
      `INSERT INTO lead_stage_history (lead_id, from_stage_id, to_stage_id, changed_by_user, source, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [leadId, prevStage, stageId, null, 'manual_script', null]
    );

    await client.query(
      `INSERT INTO lead_activity_log (lead_id, tenant_id, activity_type, description, performed_by_ai, metadata, created_at)
       VALUES ($1, $2, 'stage_change', $3, false, $4, NOW())`,
      [leadId, lead.tenant_id, 'Movimiento manual via script', JSON.stringify({ script: 'move-lead.js', stageId })]
    );

    await client.query('COMMIT');
    console.log('Lead moved successfully to stage', stageId);

    const verify = await client.query('SELECT id, stage_id FROM leads WHERE id = $1', [leadId]);
    console.log('Verify:', verify.rows[0]);
  } catch (err) {
    console.error('Error:', err && err.message);
    try { await client.query('ROLLBACK'); } catch (_) {}
    process.exit(10);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
