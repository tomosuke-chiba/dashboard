import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateSlug(name: string): string {
  // 日本語名からslugを生成（ローマ字化は手動で調整が必要な場合あり）
  return name
    .toLowerCase()
    .replace(/[\s　]/g, '-')
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf-]/g, '')
    .slice(0, 50);
}

async function importClinics() {
  const csvPath = path.join(process.cwd(), 'data', 'clinics-guppy-pw.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at data/clinics.csv');
    console.log('Expected format: 医院名,ID,パスワード');
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');

  console.log(`Found ${lines.length} lines in CSV`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // ヘッダー行をスキップ（日本語ヘッダーの場合）
    if (line.includes('医院名') || line.includes('ID') && i === 0) {
      console.log('Skipping header row');
      continue;
    }

    const parts = line.split(',');
    if (parts.length < 3) {
      console.error(`Invalid line ${i + 1}: ${line}`);
      errorCount++;
      continue;
    }

    const [name, guppyLoginId, guppyPassword] = parts.map(p => p.trim());

    // slugを生成（日本語名の場合は数字ベースのslugを使用）
    const slug = `clinic-${Date.now()}-${i}`;

    console.log(`Processing: ${name}`);

    const { data, error } = await supabase
      .from('clinics')
      .upsert({
        name,
        slug,
        guppy_login_id: guppyLoginId,
        guppy_password: guppyPassword,
      }, {
        onConflict: 'slug'
      })
      .select();

    if (error) {
      console.error(`Error inserting ${name}:`, error.message);
      errorCount++;
    } else {
      console.log(`✓ Added: ${name} (slug: ${slug})`);
      successCount++;
    }
  }

  console.log('\n--- Import Complete ---');
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  // 登録されたクリニック一覧を表示
  const { data: clinics } = await supabase
    .from('clinics')
    .select('id, name, slug')
    .order('name');

  console.log('\nRegistered clinics:');
  clinics?.forEach(c => {
    console.log(`  - ${c.name}: /clinic/${c.slug}`);
  });
}

importClinics().catch(console.error);
