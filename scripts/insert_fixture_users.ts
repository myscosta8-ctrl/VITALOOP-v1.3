import fs from 'fs';
import pg from 'pg';

(async () => {
  const env = fs.readFileSync('./.env', 'utf8');
  const match = env.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error('DATABASE_URL not found');
  const adminUrl = match[1].trim().replace('vitaloop_app.ovwqbmmsppkeekhsnrbv', 'postgres.ovwqbmmsppkeekhsnrbv');
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();

  const sql = `
    insert into app.users (id, auth_subject, username, name, email, status) values
      ('83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b', '00000000-0000-0000-0000-000000000001', 'test_user_full', 'Médico Teste Full', 'testfull@vitaloop.local', 'active'),
      ('10243fdf-2cc4-4f35-8544-1f1d2e338472', '00000000-0000-0000-0000-000000000002', 'test_user_readonly', 'Médico Teste Readonly', 'testreadonly@vitaloop.local', 'active'),
      ('464ef92a-6d14-446e-9a9b-95801b515c6d', '00000000-0000-0000-0000-000000000003', 'test_user_noperm', 'Médico Teste NoPerm', 'testnoperm@vitaloop.local', 'active')
    on conflict (id) do nothing;
  `;

  await client.query(sql);
  console.log('FIXTURE USERS INSERIDOS EM APP.USERS COM SUCESSO!');
  await client.end();
})();
