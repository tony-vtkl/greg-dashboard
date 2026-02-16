// Migration script: Copy data from OLD Supabase to NEW Supabase
// Old: mmwbiogqmgmtxboipyko
// New: glihiakqispoxwyfzhoi

const OLD_URL = 'https://mmwbiogqmgmtxboipyko.supabase.co';
const OLD_KEY = 'sb_publishable_r6q0-iEnygKZiZkaOuY-hg_Tvlb-66U';

const NEW_URL = 'https://glihiakqispoxwyfzhoi.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsaWhpYWtxaXNwb3h3eWZ6aG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTM5NjgsImV4cCI6MjA4Njc2OTk2OH0.vacX_vZebmLF4YTCj8rHfTUCycPjLf7MNKtUPNYTyBQ';

// Also check the brthvgtoddnxdnlwcppk project (used by opportunity.html)
const OLD_URL_2 = 'https://brthvgtoddnxdnlwcppk.supabase.co';
const OLD_KEY_2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydGh2Z3RvZGRueGRubHdjcHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTYzNTMsImV4cCI6MjA4NjMzMjM1M30.khJoQLDRNFDky9xEZ3ZhjKtvmRe-tuI9GivKTLp0TSk';

const TABLES = ['kanban_items', 'notes', 'standups', 'stream_items', 'todos', 'meal_checklist', 'opportunities'];

async function fetchFromSupabase(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!res.ok) {
    const text = await res.text();
    return { error: `${res.status} ${res.statusText}: ${text}`, data: null };
  }
  
  const data = await res.json();
  return { data, error: null };
}

async function insertToSupabase(url, key, table, rows) {
  if (!rows || rows.length === 0) return { count: 0, error: null };
  
  // Remove 'id' field to let new DB generate UUIDs (except for kanban_items where we want to preserve item_id)
  const cleanRows = rows.map(row => {
    const { id, ...rest } = row;
    return rest;
  });
  
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(cleanRows)
  });
  
  if (!res.ok) {
    const text = await res.text();
    return { count: 0, error: `${res.status} ${res.statusText}: ${text}` };
  }
  
  const data = await res.json();
  return { count: data.length, error: null };
}

async function migrate() {
  console.log('=== DATA MIGRATION: Old Supabase -> New Supabase ===\n');
  
  // Step 1: Fetch all data from old Supabase (project 1)
  console.log('--- Fetching from OLD Supabase (mmwbiogqmgmtxboipyko) ---');
  for (const table of TABLES) {
    const { data, error } = await fetchFromSupabase(OLD_URL, OLD_KEY, table);
    if (error) {
      console.log(`  ${table}: ERROR - ${error}`);
      continue;
    }
    console.log(`  ${table}: ${data.length} rows found`);
    
    if (data.length > 0) {
      console.log(`    Sample: ${JSON.stringify(data[0]).substring(0, 200)}...`);
      
      // Insert into new Supabase
      const { count, error: insertError } = await insertToSupabase(NEW_URL, NEW_KEY, table, data);
      if (insertError) {
        console.log(`    INSERT ERROR: ${insertError}`);
      } else {
        console.log(`    MIGRATED: ${count} rows inserted into new DB`);
      }
    }
  }
  
  // Step 2: Fetch from second old Supabase (brthvgtoddnxdnlwcppk - opportunities)
  console.log('\n--- Fetching from OLD Supabase 2 (brthvgtoddnxdnlwcppk) ---');
  for (const table of ['opportunities']) {
    const { data, error } = await fetchFromSupabase(OLD_URL_2, OLD_KEY_2, table);
    if (error) {
      console.log(`  ${table}: ERROR - ${error}`);
      continue;
    }
    console.log(`  ${table}: ${data.length} rows found`);
    
    if (data.length > 0) {
      console.log(`    Sample: ${JSON.stringify(data[0]).substring(0, 200)}...`);
      
      const { count, error: insertError } = await insertToSupabase(NEW_URL, NEW_KEY, table, data);
      if (insertError) {
        console.log(`    INSERT ERROR: ${insertError}`);
      } else {
        console.log(`    MIGRATED: ${count} rows inserted into new DB`);
      }
    }
  }
  
  // Step 3: Verify new DB
  console.log('\n--- Verifying NEW Supabase (glihiakqispoxwyfzhoi) ---');
  for (const table of TABLES) {
    const { data, error } = await fetchFromSupabase(NEW_URL, NEW_KEY, table);
    if (error) {
      console.log(`  ${table}: ERROR - ${error}`);
    } else {
      console.log(`  ${table}: ${data.length} rows`);
    }
  }
  
  console.log('\n=== MIGRATION COMPLETE ===');
}

migrate().catch(e => console.error('Migration failed:', e));
