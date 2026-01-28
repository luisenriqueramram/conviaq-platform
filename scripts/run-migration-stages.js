// Lightweight migration runner for pipeline_stages.position
// Uses DATABASE_URL by default; falls back to AUTOLAVADO_DB_URL if needed.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  if (process.env.DATABASE_URL || process.env.AUTOLAVADO_DB_URL) return;
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        const key = m[1];
        let val = m[2];
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  } catch (e) {
    // ignore if env file missing
  }
}

async function run() {
  loadEnv();
  const conn = process.env.DATABASE_URL || process.env.AUTOLAVADO_DB_URL;
  if (!conn) {
    console.error('❌ No DATABASE_URL or AUTOLAVADO_DB_URL found. Set one in .env.local or environment.');
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), 'migrations', '20260122_add_position_to_pipeline_stages.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Migration file not found:', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('🔌 Connected. Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch {}
  }
}

run();
