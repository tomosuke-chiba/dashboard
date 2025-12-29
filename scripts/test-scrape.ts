/**
 * GUPPYスクレイピングテストスクリプト
 *
 * 使用方法:
 * npx ts-node scripts/test-scrape.ts
 *
 * または、headlessモードをオフにしてデバッグ:
 * DEBUG=true npx ts-node scripts/test-scrape.ts
 */

import { chromium, Browser, Page } from 'playwright';

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';

// テスト用ログイン情報
const TEST_LOGIN_ID = '0886556471';
const TEST_PASSWORD = 'r6p6f67x';

async function testGuppyScrape() {
  console.log('=== GUPPYスクレイピングテスト開始 ===\n');

  const isDebug = process.env.DEBUG === 'true';
  let browser: Browser | null = null;

  try {
    // ブラウザ起動
    console.log('1. ブラウザを起動中...');
    browser = await chromium.launch({
      headless: !isDebug, // DEBUG=trueの場合は画面表示
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログインページにアクセス
    console.log('2. ログインページにアクセス中...');
    await page.goto(GUPPY_LOGIN_URL, { waitUntil: 'networkidle' });
    console.log(`   現在のURL: ${page.url()}`);

    // ページの構造を確認
    console.log('\n3. ログインフォームの構造を確認中...');

    // input要素を探す
    const inputs = await page.$$('input');
    console.log(`   見つかったinput要素: ${inputs.length}個`);

    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`   - type="${type}", name="${name}", id="${id}", placeholder="${placeholder}"`);
    }

    // ログインフォームに入力
    console.log('\n4. ログイン情報を入力中...');

    // IDとパスワードの入力（セレクタは実際のページに合わせて調整が必要）
    const loginIdInput = await page.$('input[type="text"], input[name="login_id"], input[id="login_id"]');
    const passwordInput = await page.$('input[type="password"]');

    if (loginIdInput) {
      await loginIdInput.fill(TEST_LOGIN_ID);
      console.log('   ログインID入力: OK');
    } else {
      console.log('   警告: ログインID入力欄が見つかりません');
    }

    if (passwordInput) {
      await passwordInput.fill(TEST_PASSWORD);
      console.log('   パスワード入力: OK');
    } else {
      console.log('   警告: パスワード入力欄が見つかりません');
    }

    // スクリーンショット保存（ログイン前）
    await page.screenshot({ path: 'debug-before-login.png' });
    console.log('   スクリーンショット保存: debug-before-login.png');

    // ログインボタンをクリック
    console.log('\n5. ログインボタンをクリック中...');
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("ログイン")');

    if (submitButton) {
      await submitButton.click();
      console.log('   ログインボタンクリック: OK');
    } else {
      console.log('   警告: ログインボタンが見つかりません');
    }

    // ページ遷移を待つ
    await page.waitForLoadState('networkidle');
    console.log(`   ログイン後のURL: ${page.url()}`);

    // スクリーンショット保存（ログイン後）
    await page.screenshot({ path: 'debug-after-login.png' });
    console.log('   スクリーンショット保存: debug-after-login.png');

    // ログイン成功/失敗の判定
    console.log('\n6. ログイン結果を確認中...');
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      console.log('   結果: ログイン失敗の可能性（まだログインページにいます）');

      // エラーメッセージを探す
      const errorMessage = await page.$('.error, .alert-danger, [class*="error"]');
      if (errorMessage) {
        const errorText = await errorMessage.textContent();
        console.log(`   エラーメッセージ: ${errorText}`);
      }
    } else {
      console.log('   結果: ログイン成功！');

      // 管理画面の構造を確認
      console.log('\n7. 管理画面の構造を確認中...');
      const pageTitle = await page.title();
      console.log(`   ページタイトル: ${pageTitle}`);

      // PV数や応募数を探す（実際の要素に合わせて調整が必要）
      const bodyText = await page.textContent('body');

      // 数値っぽい要素を探す
      if (bodyText) {
        const pvMatch = bodyText.match(/PV[：:]\s*(\d+)/);
        const applicationMatch = bodyText.match(/応募[：:]\s*(\d+)/);

        if (pvMatch) console.log(`   見つかったPV: ${pvMatch[1]}`);
        if (applicationMatch) console.log(`   見つかった応募数: ${applicationMatch[1]}`);
      }

      // ページのHTMLを保存
      const html = await page.content();
      require('fs').writeFileSync('debug-page-content.html', html);
      console.log('   ページHTML保存: debug-page-content.html');
    }

    // デバッグモードの場合は待機
    if (isDebug) {
      console.log('\n[デバッグモード] ブラウザを30秒間表示します...');
      await page.waitForTimeout(30000);
    }

    console.log('\n=== テスト完了 ===');

  } catch (error) {
    console.error('\nエラーが発生しました:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 実行
testGuppyScrape();
