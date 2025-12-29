import { chromium } from 'playwright';

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_ACCESS_LOG_URL = 'https://www.guppy.jp/service/access_logs';

async function exploreGuppyMonths() {
  const loginId = process.argv[2];
  const password = process.argv[3];

  if (!loginId || !password) {
    console.error('Usage: npx ts-node scripts/explore-guppy-months.ts <loginId> <password>');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false }); // headless: false で実際に見る
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ログイン
    console.log('ログイン中...');
    await page.goto(GUPPY_LOGIN_URL, { waitUntil: 'networkidle' });
    await page.fill('input[name="data[Account][login_id]"]', loginId);
    await page.fill('input[name="data[Account][password]"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    if (page.url().includes('login')) {
      console.error('ログイン失敗');
      return;
    }
    console.log('ログイン成功');

    // アクセスログページに移動
    console.log('\nアクセスログページに移動...');
    await page.goto(GUPPY_ACCESS_LOG_URL, { waitUntil: 'networkidle' });
    console.log('現在のURL:', page.url());

    // ページのHTML構造を調査
    const pageInfo = await page.evaluate(() => {
      const info: Record<string, unknown> = {};

      // フォーム要素を探す
      const forms = document.querySelectorAll('form');
      info.forms = Array.from(forms).map(f => ({
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, select')).map(i => ({
          name: (i as HTMLInputElement).name,
          type: (i as HTMLInputElement).type || 'select',
          value: (i as HTMLInputElement).value,
          options: i.tagName === 'SELECT'
            ? Array.from((i as HTMLSelectElement).options).map(o => ({ value: o.value, text: o.text }))
            : undefined
        }))
      }));

      // セレクトボックスを探す（月選択用）
      const selects = document.querySelectorAll('select');
      info.selects = Array.from(selects).map(s => ({
        name: s.name,
        id: s.id,
        options: Array.from(s.options).map(o => ({ value: o.value, text: o.text }))
      }));

      // リンクを探す（月切り替え用）
      const links = document.querySelectorAll('a');
      info.monthLinks = Array.from(links)
        .filter(a => a.href.includes('access_log') || a.textContent?.includes('月'))
        .map(a => ({ href: a.href, text: a.textContent?.trim() }));

      // ボタンを探す
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      info.buttons = Array.from(buttons).map(b => ({
        type: (b as HTMLInputElement).type,
        text: b.textContent?.trim(),
        name: (b as HTMLInputElement).name
      }));

      return info;
    });

    console.log('\n=== ページ構造 ===');
    console.log(JSON.stringify(pageInfo, null, 2));

    // 異なるURLパターンを試す
    console.log('\n=== URLパターンテスト ===');
    const testUrls = [
      `${GUPPY_ACCESS_LOG_URL}?year=2024&month=11`,
      `${GUPPY_ACCESS_LOG_URL}?ym=202411`,
      `${GUPPY_ACCESS_LOG_URL}/2024/11`,
      `${GUPPY_ACCESS_LOG_URL}?date=2024-11`,
    ];

    for (const url of testUrls) {
      console.log(`\nテスト: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });

      // テーブルの最初の日付を確認
      const firstDate = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return null;
        const firstRow = table.querySelector('tr:nth-child(2) td:first-child');
        return firstRow?.textContent?.trim();
      });
      console.log('最初の日付:', firstDate);
    }

    // 30秒待機して手動で確認できるようにする
    console.log('\n30秒間ブラウザを開いたままにします。手動で月切り替えを試してください...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await browser.close();
  }
}

exploreGuppyMonths();
