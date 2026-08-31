const fs = require('fs');
const path = require('path');
const pg = require('pg');
const { execSync } = require('child_process');

async function runGoLiveValidationScript() {
  console.log('====================================================');
  console.log('   VITALOOP v1.3 — GO-LIVE REAL VALIDATION RUNNER   ');
  console.log('====================================================');

  const envPath = path.join(__dirname, '../../.env');
  let envText = '';
  if (fs.existsSync(envPath)) {
    envText = fs.readFileSync(envPath, 'utf8');
  }

  let dbUrl = '';
  let supabaseUrl = '';
  let rndsCert = '';
  let sisregKey = '';
  let pacsUrl = '';

  for (const line of envText.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) dbUrl = line.replace('DATABASE_URL=', '').trim();
    if (line.startsWith('SUPABASE_URL=')) supabaseUrl = line.replace('SUPABASE_URL=', '').trim();
    if (line.startsWith('RNDS_CERT_PATH=')) rndsCert = line.replace('RNDS_CERT_PATH=', '').trim();
    if (line.startsWith('SISREG_API_KEY=')) sisregKey = line.replace('SISREG_API_KEY=', '').trim();
    if (line.startsWith('PACS_SERVER_URL=')) pacsUrl = line.replace('PACS_SERVER_URL=', '').trim();
  }

  let databaseConnected = false;
  let isSuperuser = false;
  let hasBypassRls = false;

  if (dbUrl) {
    try {
      const pool = new pg.Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000 });
      const client = await pool.connect();
      databaseConnected = true;

      const { rows } = await client.query(`
        select r.rolsuper, r.rolbypassrls 
        from pg_roles r 
        where r.rolname = current_user
      `);
      if (rows.length > 0) {
        isSuperuser = rows[0].rolsuper;
        hasBypassRls = rows[0].rolbypassrls;
      }
      client.release();
      await pool.end();
    } catch (err) {
      databaseConnected = false;
    }
  }

  let dockerAvailable = false;
  try {
    execSync('docker info', { stdio: 'ignore' });
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
  }

  const { runGoLiveRealValidation } = require('../../packages/domain/dist/quality/go-live-validator.js');

  const report = runGoLiveRealValidation({
    environment: process.env.NODE_ENV || 'production',
    databaseConnected,
    isSuperuser,
    hasBypassRls,
    dockerAvailable,
    rndsCredentialsAvailable: Boolean(rndsCert && fs.existsSync(rndsCert)),
    sisregCredentialsAvailable: Boolean(sisregKey),
    pacsServerAvailable: Boolean(pacsUrl),
  });

  console.log(`\nTIMESTAMP: ${report.timestamp}`);
  console.log(`AMBIENTE:  ${report.environment}`);
  console.log('\n--- MATRIZ DE COMPONENTES ---');

  for (const c of report.components) {
    console.log(`[${c.status.padEnd(7)}] ${c.component.padEnd(32)} | ${c.evidence}`);
    if (c.detail) {
      console.log(`          -> Detalhe: ${c.detail}`);
    }
  }

  console.log('\n--- RESUMO EXECUTIVO ---');
  console.log(`Total de Componentes Auditados: ${report.summary.total}`);
  console.log(`Componentes Validados (PASS):     ${report.summary.pass}`);
  console.log(`Componentes Bloqueados (BLOCKED): ${report.summary.blocked}`);
  console.log(`Componentes Falhos (FAIL):        ${report.summary.fail}`);

  console.log('\n====================================================');
  console.log(`   GO-LIVE REAL GATE: ${report.gateResult}`);
  console.log('====================================================\n');
}

runGoLiveValidationScript();
