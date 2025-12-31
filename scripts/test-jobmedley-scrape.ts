/**
 * JobMedleyスクレイピングテストスクリプト
 *
 * 使用方法:
 * node scripts/test-jobmedley-scrape.ts
 * DEBUG=true node scripts/test-jobmedley-scrape.ts  # ブラウザ表示
 */

const { chromium } = require('playwright');
const fs = require('fs');
const dotenv = require('dotenv');

// .env.localを読み込み
dotenv.config({ path: '.env.local' });

const JOBMEDLEY_LOGIN_URL = 'https://customers.job-medley.com/customers/sign_in';
const JOBMEDLEY_ANALYSIS_URL = 'https://customers.job-medley.com/customers/analysis';
const JOBMEDLEY_MESSAGES_URL = 'https://customers.job-medley.com/customers/messages';

async function testJobMedleyScrape() {
  console.log('=== JobMedleyスクレイピングテスト ===\n');

  const email = process.env.JOBMEDLEY_EMAIL;
  const password = process.env.JOBMEDLEY_PASSWORD;

  if (!email || !password) {
    console.error('JOBMEDLEY_EMAIL and JOBMEDLEY_PASSWORD must be set in .env.local');
    process.exit(1);
  }

  const isDebug = process.env.DEBUG === 'true';
  let browser = null;

  try {
    console.log('1. ブラウザを起動中...');
    browser = await chromium.launch({
      headless: !isDebug,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    console.log('2. ログイン中...');
    await page.goto(JOBMEDLEY_LOGIN_URL, { waitUntil: 'networkidle' });

    // ログインフォームを探す
    console.log('   ログインページURL:', page.url());
    await page.screenshot({ path: 'debug-jobmedley-login.png', fullPage: true });

    // メールアドレス入力
    const emailInput = await page.$('input[name="email"], input[type="email"], input[name="customer[email]"]');
    if (emailInput) {
      await emailInput.fill(email);
      console.log('   メールアドレス入力完了');
    } else {
      console.log('   メールアドレス入力欄が見つかりません');
      const loginHtml = await page.content();
      fs.writeFileSync('debug-jobmedley-login.html', loginHtml);
    }

    // パスワード入力
    const passwordInput = await page.$('input[name="password"], input[type="password"], input[name="customer[password]"]');
    if (passwordInput) {
      await passwordInput.fill(password);
      console.log('   パスワード入力完了');
    }

    // ログインボタンクリック
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('   ログインボタンクリック');
    }

    await page.waitForTimeout(5000);

    console.log(`   ログイン後URL: ${page.url()}`);

    // ログイン確認
    if (page.url().includes('login')) {
      console.error('   ログイン失敗');
      await page.screenshot({ path: 'debug-jobmedley-login-failed.png', fullPage: true });
      return;
    }

    console.log('   ログイン成功!');

    // 分析ページに移動（URLパラメータで月間・2024年12月を指定）
    console.log('\n3. 分析ページに移動中（2024年12月）...');
    // URLパラメータで直接期間を指定してみる
    const analysisUrlWithParams = `${JOBMEDLEY_ANALYSIS_URL}?period_type=2&target_period=202412`;
    await page.goto(analysisUrlWithParams, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    console.log(`   URL: ${page.url()}`);

    await page.screenshot({ path: 'debug-jobmedley-analysis.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-jobmedley-analysis.png');

    // HTMLを保存
    const analysisHtml = await page.content();
    fs.writeFileSync('debug-jobmedley-analysis.html', analysisHtml);
    console.log('   HTML保存: debug-jobmedley-analysis.html');

    // 現在の選択状態を確認
    const currentSelection = await page.evaluate(() => {
      const periodType = document.querySelector('select[name="period_type"]') as HTMLSelectElement;
      const targetPeriod = document.querySelector('select[name="target_period"]') as HTMLSelectElement;
      return {
        periodType: periodType?.value,
        periodTypeText: periodType?.options[periodType?.selectedIndex]?.text,
        targetPeriod: targetPeriod?.value,
        targetPeriodText: targetPeriod?.options[targetPeriod?.selectedIndex]?.text,
        targetPeriodOptions: Array.from(targetPeriod?.options || []).map(opt => ({ value: opt.value, text: opt.textContent }))
      };
    });
    console.log('   現在の選択:', JSON.stringify(currentSelection, null, 2));

    // URLパラメータが効かない場合はフォームで選択
    if (currentSelection.periodTypeText !== '月間') {
      console.log('\n4. 月間・12月をフォームで選択中...');

      // 期間タイプを月間に変更
      const periodTypeSelect = await page.$('select[name="period_type"]');
      if (periodTypeSelect) {
        await periodTypeSelect.selectOption('2'); // 月間
        console.log('   期間タイプを月間に変更');
        await page.waitForTimeout(3000);
      }

      // 月間選択後のオプションを確認
      const monthOptions = await page.evaluate(() => {
        const select = document.querySelector('select[name="target_period"]') as HTMLSelectElement;
        if (!select) return [];
        return Array.from(select.options).map(opt => ({ value: opt.value, text: opt.textContent }));
      });
      console.log('   利用可能な期間オプション:', JSON.stringify(monthOptions));

      // 対象期間を選択
      const targetPeriodSelect = await page.$('select[name="target_period"]');
      if (targetPeriodSelect && monthOptions.length > 0) {
        // 2024/12を含むオプションを探す（インデックスで見つける）
        const dec2024Index = monthOptions.findIndex((opt: {value: string, text: string | null}) =>
          opt.text && opt.text.includes('2024/12')
        );
        if (dec2024Index >= 0) {
          await targetPeriodSelect.selectOption(monthOptions[dec2024Index].value);
          console.log(`   対象期間を ${monthOptions[dec2024Index].text} に変更`);
        } else if (monthOptions.length > 1) {
          // 2番目のオプション（1つ前の月）を選択
          await targetPeriodSelect.selectOption(monthOptions[1].value);
          console.log(`   対象期間を ${monthOptions[1].text} に変更`);
        }
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({ path: 'debug-jobmedley-analysis-dec.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-jobmedley-analysis-dec.png');

    // HTMLを保存
    const analysisDecHtml = await page.content();
    fs.writeFileSync('debug-jobmedley-analysis-dec.html', analysisDecHtml);
    console.log('   HTML保存: debug-jobmedley-analysis-dec.html');

    // グラフデータを抽出
    console.log('\n5. グラフデータを抽出中...');

    const graphData = await page.evaluate(() => {
      const results: { title: string; yAxisMax: number; lastDotY: number }[] = [];

      // 各グラフセクションを取得
      const graphSections = document.querySelectorAll('.c-graph');

      graphSections.forEach((section) => {
        const heading = section.querySelector('h2.c-heading');
        const title = heading?.textContent?.trim() || 'Unknown';

        // Y軸の最大値を取得
        const yAxisTicks = section.querySelectorAll('.recharts-y-axis .recharts-cartesian-axis-tick-value');
        let yAxisMax = 0;
        yAxisTicks.forEach((tick) => {
          const val = parseFloat(tick.textContent?.trim() || '0');
          if (!isNaN(val) && val > yAxisMax) {
            yAxisMax = val;
          }
        });

        // 最後のドットのY座標を取得
        const dots = section.querySelectorAll('.recharts-area-dot');
        let lastDotY = 0;
        if (dots.length > 0) {
          const lastDot = dots[dots.length - 1] as SVGCircleElement;
          lastDotY = parseFloat(lastDot.getAttribute('cy') || '0');
        }

        results.push({ title, yAxisMax, lastDotY });
      });

      return results;
    });

    console.log('   グラフデータ:');
    graphData.forEach((data: { title: string; yAxisMax: number; lastDotY: number }) => {
      // Y座標から値を計算 (y=10が最大、y=199が0)
      const graphMinY = 10;
      const graphMaxY = 199;
      const normalizedY = (graphMaxY - data.lastDotY) / (graphMaxY - graphMinY);
      const value = Math.round(normalizedY * data.yAxisMax);
      console.log(`   - ${data.title}: Y軸最大=${data.yAxisMax}, lastDotY=${data.lastDotY}, 推定値=${value}`);
    });

    // メッセージページに移動
    console.log('\n6. メッセージページに移動中...');
    await page.goto(JOBMEDLEY_MESSAGES_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    console.log(`   URL: ${page.url()}`);

    await page.screenshot({ path: 'debug-jobmedley-messages.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-jobmedley-messages.png');

    // HTMLを保存
    const messagesHtml = await page.content();
    fs.writeFileSync('debug-jobmedley-messages.html', messagesHtml);
    console.log('   HTML保存: debug-jobmedley-messages.html');

    // スカウト送信数を探す
    const scoutData = await page.evaluate(() => {
      const text = document.body.innerText;
      // スカウト関連のテキストを探す
      const scoutMatches = text.match(/スカウト[：:\s]*([0-9,]+)/g);
      return {
        scoutMatches: scoutMatches || [],
        pageText: text.substring(0, 2000)
      };
    });

    console.log('   スカウト関連テキスト:', scoutData.scoutMatches);

    // 検索順位テスト
    console.log('\n7. 検索順位テスト...');
    const searchUrl = 'https://job-medley.com/dds/designated_city15/';
    const clinicName = 'うえほんまち歯科';

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

    await page.screenshot({ path: 'debug-jobmedley-search.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-jobmedley-search.png');

    // HTMLを保存
    const searchHtml = await page.content();
    fs.writeFileSync('debug-jobmedley-search.html', searchHtml);
    console.log('   HTML保存: debug-jobmedley-search.html');

    // 検索結果から順位を取得
    const rankData = await page.evaluate((targetName: string) => {
      const cards = document.querySelectorAll('.c-job-offer-card, .p-job-search-list__item, article, .job-card');
      let rank = 0;
      let found = false;
      const cardTexts: string[] = [];

      cards.forEach((card, index) => {
        const text = (card as HTMLElement).innerText || '';
        cardTexts.push(`${index + 1}: ${text.substring(0, 50)}...`);
        if (text.includes(targetName)) {
          rank = index + 1;
          found = true;
        }
      });

      return { rank, found, totalCards: cards.length, cardTexts: cardTexts.slice(0, 10) };
    }, clinicName);

    console.log(`   検索結果カード数: ${rankData.totalCards}`);
    console.log(`   「${clinicName}」の順位: ${rankData.found ? rankData.rank : '見つからず'}`);
    console.log('   上位カード:');
    rankData.cardTexts.forEach((text: string) => console.log(`     ${text}`));
    } catch (searchError) {
      console.log('   検索順位テストでエラー:', searchError);
    }

    // デバッグモードの場合は待機
    if (isDebug) {
      console.log('\n[デバッグモード] ブラウザを60秒間表示します...');
      await page.waitForTimeout(60000);
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
testJobMedleyScrape();
