#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[trimmed.slice(0, eq).trim()] = val;
    }
  }
  return env;
}

function unescapeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

async function main() {
  const env = loadEnv();
  const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL;
  const serverKey = env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
  const apiUrl = env.BETTER_AUTH_URL || 'http://localhost:4000';

  if (!serverKey) {
    console.error('❌ MIDTRANS_SERVER_KEY tidak ditemukan di .env.local');
    process.exit(1);
  }

  let orderId = process.argv[2];
  if (!orderId && dbUrl) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    try {
      const res = await pool.query(
        "SELECT id FROM membership_orders WHERE status = 'pending' AND checkout_url IS NOT NULL ORDER BY created_at DESC LIMIT 1"
      );
      if (res.rows.length > 0) {
        orderId = res.rows[0].id;
      }
    } finally {
      await pool.end();
    }
  }

  if (!orderId) {
    console.log('ℹ️ Tidak ada order pending yang ditemukan.');
    return;
  }

  console.log(`🔍 Memproses pembayaran sandbox untuk Order ID: ${orderId}...`);

  // 1. Ambil transaction_id dari API Midtrans
  const statusRes = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
    headers: {
      Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
      Accept: 'application/json',
    },
  });
  const statusData = await statusRes.json();

  if (!statusRes.ok || !statusData.transaction_id) {
    console.error('❌ Gagal memeriksa status ke Midtrans:', statusData);
    process.exit(1);
  }

  if (statusData.transaction_status === 'settlement') {
    console.log('✅ Order ini sudah lunas (settlement) di Midtrans!');
  } else if (statusData.transaction_status === 'expire') {
    console.log('⚠️ Order ini sudah kedaluwarsa (expire) di Midtrans.');
    return;
  } else {
    // 2. Scan QR di Simulator Midtrans v2
    const transactionId = statusData.transaction_id;
    const qrCodeUrl = `https://api.sandbox.midtrans.com/v2/qris/${transactionId}/qr-code`;

    const scanRes = await fetch('https://simulator.sandbox.midtrans.com/v2/qris/payment', {
      method: 'POST',
      body: new URLSearchParams({ qrCodeUrl }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const scanHtml = await scanRes.text();

    const formMatch = scanHtml.match(/<form[^>]*action="([^"]+)"[^>]*method="post"([\s\S]*?)<\/form>/i);
    if (!formMatch) {
      console.error('❌ Simulator Midtrans menolak QR URL:', scanHtml.slice(0, 300));
      process.exit(1);
    }

    const action = formMatch[1];
    const formBody = formMatch[2];
    const fields = {};
    const inputMatches = formBody.matchAll(/<input\s+name="([^"]+)"\s+type="hidden"\s+value="([^"]*)"/gi);
    for (const m of inputMatches) {
      fields[m[1]] = unescapeHtml(m[2]);
    }

    const payUrl = new URL(action, 'https://simulator.sandbox.midtrans.com/v2/qris/payment').href;
    const payParams = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      payParams.set(k, v);
    }
    payParams.set('issuer', 'gopay');

    const payRes = await fetch(payUrl, {
      method: 'POST',
      body: payParams,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!payRes.ok) {
      console.error('❌ Gagal mengeksekusi pembayaran di simulator Midtrans');
      process.exit(1);
    }
    console.log('💳 Berhasil disimulasikan di Midtrans Simulator (GoPay QRIS)!');
  }

  // 3. Verifikasi status akhir di API Midtrans
  const verifyRes = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
    headers: {
      Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
      Accept: 'application/json',
    },
  });
  const verifyData = await verifyRes.json();
  console.log(`\n🎉 STATUS TERBARU MIDTRANS: ${verifyData.transaction_status?.toUpperCase()}`);
  console.log(`   Order ID:       ${verifyData.order_id}`);
  console.log(`   Gross Amount:   Rp ${Number(verifyData.gross_amount).toLocaleString('id-ID')}`);
  console.log(`   Payment Type:   ${verifyData.payment_type}`);
  console.log(`   Settlement:     ${verifyData.settlement_time || 'Baru saja'}`);
  console.log('\n✨ Kamu tinggal refresh halaman AnzaBook sekarang!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
