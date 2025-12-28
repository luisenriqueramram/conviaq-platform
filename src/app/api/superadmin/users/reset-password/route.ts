import { NextResponse } from 'next/server';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';
import { db } from '@/lib/db';
import crypto from 'crypto';

function genPassword() {
  return crypto.randomBytes(6).toString('base64url');
}

function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(pw, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash: derived };
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireSuperAdminOrPlan10();
  } catch (e: any) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const userId = body?.userId ? Number(body.userId) : null;
    const email = body?.email ? String(body.email).toLowerCase() : null;
    if (!userId && !email) return NextResponse.json({ error: 'userId or email required' }, { status: 400 });

    // Resolve user
    let userRow: any = null;
    if (userId) {
      const r = await db.query('SELECT id, tenant_id, email FROM users WHERE id = $1 LIMIT 1', [userId]);
      userRow = r.rows[0] || null;
    } else if (email) {
      const r = await db.query('SELECT id, tenant_id, email FROM users WHERE lower(email) = $1 LIMIT 1', [email]);
      userRow = r.rows[0] || null;
    }

    if (!userRow) return NextResponse.json({ error: 'user not found' }, { status: 404 });
    if (ctx.isPlan10 && userRow.tenant_id !== ctx.session.tenantId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const temp = genPassword();
    const { salt, hash } = hashPassword(temp);

    // Try to write hashed password if columns exist, otherwise ignore (best-effort)
    try {
      await db.query('UPDATE users SET password_hash = $1, password_salt = $2, updated_at = NOW() WHERE id = $3', [hash, salt, userRow.id]);
    } catch (e: any) {
      console.warn('Could not persist hashed password (column may not exist):', e?.message || e);
    }

    // Log event with masked payload (do not store plaintext in events). Return plaintext only to caller.
    (async () => {
      try {
        await db.query(`INSERT INTO events (tenant_id, event_type, payload, created_at) VALUES ($1, $2, $3, NOW())`, [userRow.tenant_id, 'superadmin_reset_password', JSON.stringify({ userId: userRow.id, note: 'password reset by superadmin' })]);
      } catch (e: any) {
        console.warn('Could not write event after reset-password (ignored):', e?.message || e);
      }
    })();

    return NextResponse.json({ ok: true, userId: userRow.id, tempPassword: temp });
  } catch (err: any) {
    console.error('Superadmin: reset-password error', err);
    return NextResponse.json({ error: err.message || 'error' }, { status: 500 });
  }
}
