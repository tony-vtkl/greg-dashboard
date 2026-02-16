// Retry migration for todos and opportunities (schema was fixed)

const OLD_URL = 'https://mmwbiogqmgmtxboipyko.supabase.co';
const OLD_KEY = 'sb_publishable_r6q0-iEnygKZiZkaOuY-hg_Tvlb-66U';

const OLD_URL_2 = 'https://brthvgtoddnxdnlwcppk.supabase.co';
const OLD_KEY_2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydGh2Z3RvZGRueGRubHdjcHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTYzNTMsImV4cCI6MjA4NjMzMjM1M30.khJoQLDRNFDky9xEZ3ZhjKtvmRe-tuI9GivKTLp0TSk';

const NEW_URL = 'https://glihiakqispoxwyfzhoi.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsaWhpYWtxaXNwb3h3eWZ6aG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTM5NjgsImV4cCI6MjA4Njc2OTk2OH0.vacX_vZebmLF4YTCj8rHfTUCycPjLf7MNKtUPNYTyBQ';

async function fetchAll(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  if (!res.ok) {
    console.log(`  FETCH ERROR ${table}: ${res.status} ${await res.text()}`);
    return [];
  }
  return await res.json();
}

async function insertAll(table, rows) {
  if (!rows.length) return;
  // Remove id to let new DB generate
  const clean = rows.map(({ id, ...rest }) => rest);
  const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': NEW_KEY,
      'Authorization': `Bearer ${NEW_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(clean)
  });
  if (!res.ok) {
    console.log(`  INSERT ERROR ${table}: ${res.status} ${await res.text()}`);
  } else {
    const data = await res.json();
    console.log(`  INSERTED ${data.length} rows into ${table}`);
  }
}

async function run() {
  console.log('=== RETRY MIGRATION: todos + opportunities ===\n');

  // 1. Todos from old DB 1
  console.log('--- todos from mmwbiogqmgmtxboipyko ---');
  const todos = await fetchAll(OLD_URL, OLD_KEY, 'todos');
  console.log(`  Found ${todos.length} todos`);
  if (todos.length) {
    console.log(`  Sample:`, JSON.stringify(todos[0]).substring(0, 300));
    await insertAll('todos', todos);
  }

  // 2. Opportunities from old DB 2
  console.log('\n--- opportunities from brthvgtoddnxdnlwcppk ---');
  const opps = await fetchAll(OLD_URL_2, OLD_KEY_2, 'opportunities');
  console.log(`  Found ${opps.length} opportunities`);
  if (opps.length) {
    console.log(`  Sample:`, JSON.stringify(opps[0]).substring(0, 300));
    await insertAll('opportunities', opps);
  }

  // 3. Verify
  console.log('\n--- Verify new DB ---');
  for (const t of ['todos', 'opportunities']) {
    const rows = await fetchAll(NEW_URL, NEW_KEY, t);
    console.log(`  ${t}: ${rows.length} rows`);
  }

  console.log('\n=== DONE ===');
}

run().catch(e => console.error('Failed:', e));
