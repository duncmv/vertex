const { Client } = require('pg');

const regions = [
  'eu-central-1',
  'us-east-1',
  'eu-west-1',
  'eu-west-2',
  'eu-south-1',
  'us-west-1',
  'us-west-2',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'sa-east-1',
  'ca-central-1'
];

async function probe() {
  console.log("Starting region probe...");
  let found = false;

  for (const r of regions) {
    const uri = `postgresql://postgres.yygqxsswifjuhcqbckja:Beba%400462210860@aws-0-${r}.pooler.supabase.com:6543/postgres`;
    const client = new Client({ connectionString: uri, connectionTimeoutMillis: 3000 });
    
    try {
      await client.connect();
      console.log(`\n✅ SUCCESS! Database found in region: ${r}`);
      console.log(`URI: ${uri}`);
      await client.end();
      found = true;
      break;
    } catch (e) {
      process.stdout.write('.');
    }
  }

  if (!found) {
    console.log("\n❌ Could not find the database in any known region.");
  }
  process.exit(0);
}

probe();
