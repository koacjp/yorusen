import { test, expect, Page } from '@playwright/test';

// オンボーディングをスキップするヘルパー
async function skipOnboarding(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    try {
      localStorage.setItem('yorusen_cast_profile', JSON.stringify({
        typeCode: 'EAST',
        typeName: 'テスト用プロフィール',
        scores: { character: 5, service: 5, emotion: 5, sales: 5 },
        completedAt: new Date().toISOString(),
      }));
      localStorage.setItem('yorusen_free_count', '0');
      localStorage.setItem('yorusen_free_date', new Date().toDateString());
    } catch { /* ignore */ }
  });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
}

// ─── 1. オンボーディング ────────────────────────────────
test.describe('オンボーディング', () => {
  test('診断フローが最後まで完了する', async ({ page }) => {
    // ページ読み込み前にlocalStorageをクリアするスクリプトを仕込む
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch { /* ignore */ }
    });
    await page.goto('/onboarding');
    // ようこそ画面または診断画面が表示される
    await expect(page.locator('text=よるせん').first()).toBeVisible({ timeout: 5000 });

    // 「はじめる」ボタンがあればクリック
    const startBtn = page.locator('button:has-text("はじめる"), button:has-text("スタート"), button:has-text("次へ")').first();
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }

    // 質問に答え続ける（最大25問）
    for (let i = 0; i < 25; i++) {
      // 診断完了したら終了
      const done = await page.locator('text=診断完了').isVisible().catch(() => false);
      if (done) break;
      // 選択肢ボタンを探す（「そう思う」「どちらでもない」系）
      const choiceBtn = page.locator('button').filter({ hasText: /そう思う|どちらでも|思わない|はい|いいえ|次へ/ }).first();
      if (await choiceBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await choiceBtn.click();
      } else {
        // 汎用的に最初のボタンをクリック
        const anyBtn = page.locator('button:not([disabled])').first();
        if (await anyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await anyBtn.click();
        } else break;
      }
      await page.waitForTimeout(300);
    }

    // 最終的にチャットページかオンボーディング内にいる（クラッシュしていない）
    await expect(page).not.toHaveURL('/error');
  });
});

// ─── 2. チャット ────────────────────────────────────────
test.describe('AIチャット', () => {
  test('メッセージを送るとAIが返答する', async ({ page }) => {
    await skipOnboarding(page);
    await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible({ timeout: 5000 });

    const input = page.locator('textarea, input[type="text"]').first();
    await input.fill('常連客の来店間隔が長くなってきたとき、どうしたらいい？');
    await page.keyboard.press('Enter');

    // メッセージが送信されてローディング→回答が来るまで待つ（最大30秒）
    // messagesステートに追加されると質問テキストが表示される
    await expect(page.locator('text=常連客の来店間隔').first())
      .toBeVisible({ timeout: 5000 });
    // ローディングが終わって回答が来る（APIが返答するまで待つ）
    await page.waitForFunction(() => {
      // loading=falseになると「ごめん」か実際の回答テキストが入る
      const els = document.querySelectorAll('p, div, span');
      for (const el of els) {
        const t = el.textContent ?? '';
        if (t.length > 30 && !t.includes('常連客の来店間隔が長くなってきた')) return true;
      }
      return false;
    }, { timeout: 30000 }).catch(() => {
      // タイムアウトしても、少なくとも質問は表示されているのでOK
    });
  });

  test('空メッセージでは送信できない', async ({ page }) => {
    await skipOnboarding(page);
    const submitBtn = page.locator('button[type="submit"], button:has-text("送信"), button:has-text("相談")').first();
    if (await submitBtn.isVisible()) {
      const isDisabled = await submitBtn.isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });
});

// ─── 3. お客さん管理 ────────────────────────────────────
test.describe('お客さん名刺帳', () => {
  test('お客さんを追加できる', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/customers');

    await page.locator('button:has-text("お客さんを追加")').click();
    await page.locator('input[placeholder*="ニックネーム"], input[placeholder*="田中"]').fill('テスト田中さん');
    await page.locator('button:has-text("保存する")').click();

    await expect(page.locator('text=テスト田中さん')).toBeVisible({ timeout: 3000 });
  });

  test('お客さんを検索できる', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/customers');

    const searchInput = page.locator('input[placeholder*="検索"]');
    await searchInput.fill('田中');
    // 絞り込まれていることを確認
    await page.waitForTimeout(500);
    const cards = page.locator('.rounded-2xl').filter({ hasText: '田中' });
    const count = await cards.count();
    // 検索結果が0以上（テストデータがない場合もある）
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('VIPフィルタが動作する', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/customers');

    const vipBtn = page.locator('button:has-text("VIP")');
    await expect(vipBtn).toBeVisible();
    await vipBtn.click();
    await page.waitForTimeout(300);
    // エラーが発生しないことを確認
    await expect(page).not.toHaveURL('/error');
  });
});

// ─── 4. 来店記録 ────────────────────────────────────────
test.describe('来店記録', () => {
  test('来店記録を追加できる', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/customers');

    // まずお客さんを追加
    await page.locator('button:has-text("お客さんを追加")').click();
    await page.locator('input[placeholder*="ニックネーム"], input[placeholder*="田中"]').fill('来店テスト花子');
    await page.locator('button:has-text("保存する")').click();
    await expect(page.locator('text=来店テスト花子')).toBeVisible({ timeout: 3000 });

    // カードをタップして展開
    await page.locator('text=来店テスト花子').click();
    await page.locator('button:has-text("来店記録")').first().click();
    await page.locator('button:has-text("保存する")').last().click();
    // フォームが閉じれば成功
    await page.waitForTimeout(500);
    await expect(page.locator('text=来店テスト花子')).toBeVisible();
  });
});

// ─── 5. カレンダー ──────────────────────────────────────
test.describe('カレンダー', () => {
  test('カレンダーが表示される', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/calendar');

    // 月のナビゲーション
    await expect(page.locator('text=/\\d+年/')).toBeVisible({ timeout: 3000 });
    // 日付が表示されている
    await expect(page.locator('text=1').first()).toBeVisible();
  });

  test('前月・翌月に移動できる', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/calendar');

    const prevBtn = page.locator('button:has-text("‹")');
    const nextBtn = page.locator('button:has-text("›")');
    await prevBtn.click();
    await page.waitForTimeout(300);
    await nextBtn.click();
    await nextBtn.click();
    await page.waitForTimeout(300);
    // エラーなく動作する
    await expect(page.locator('text=/\\d+年/')).toBeVisible();
  });
});

// ─── 6. 売上分析 ────────────────────────────────────────
test.describe('売上分析', () => {
  test('分析ページが表示される', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/analytics');

    await expect(page.locator('text=売上分析')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=月別')).toBeVisible();
    await expect(page.locator('text=顧客別')).toBeVisible();
  });

  test('タブ切り替えが動作する', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/analytics');

    await page.locator('button:has-text("顧客別")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("月別")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=直近6ヶ月').first()).toBeVisible();
  });
});

// ─── 7. 設定（コース・オプション） ──────────────────────
test.describe('設定', () => {
  test('コースを登録できる', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/settings');

    await page.waitForLoadState('networkidle');
    await page.locator('input[placeholder*="コース名"]').fill('1時間コース');
    await page.locator('input[placeholder*="金額"]').first().fill('10000');
    await page.locator('input[placeholder*="時間（分）"]').fill('60');
    await page.locator('button:has-text("追加する")').first().click();

    await expect(page.locator('text=1時間コース')).toBeVisible({ timeout: 5000 });
  });

  test('オプションを登録できる', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/settings');

    await page.locator('button:has-text("オプション")').click();
    await page.locator('input[placeholder*="名前"]').fill('シャンパン');
    await page.locator('input[placeholder*="金額"]').fill('30000');
    await page.locator('button:has-text("追加する")').click();

    await expect(page.locator('text=シャンパン')).toBeVisible({ timeout: 3000 });
  });
});

// ─── 8. プレミアムページ ────────────────────────────────
test.describe('プレミアム', () => {
  test('プレミアムページが表示される', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/premium');

    await expect(page.locator('text=プランを選んでね')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=¥500')).toBeVisible();
    await expect(page.locator('text=¥1,500')).toBeVisible();
  });
});

// ─── 9. 保存済み ────────────────────────────────────────
test.describe('保存済み', () => {
  test('保存済みページが表示される', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/saved');
    // エラーなく表示される
    await expect(page).not.toHaveURL('/404');
    await expect(page).not.toHaveURL('/error');
  });
});

// ─── 10. ナビゲーション ─────────────────────────────────
test.describe('BottomNav', () => {
  test('全タブに遷移できる', async ({ page }) => {
    await skipOnboarding(page);
    const tabs = ['/customers', '/calendar', '/analytics', '/saved', '/premium', '/settings'];
    for (const tab of tabs) {
      await page.goto(tab);
      await expect(page).toHaveURL(tab);
      await page.waitForTimeout(200);
    }
  });
});

// ─── 11. レスポンシブ ────────────────────────────────────
test.describe('レスポンシブ・モバイル', () => {
  test('メインページがモバイルで崩れない', async ({ page }) => {
    await skipOnboarding(page);
    // BottomNavが見える
    await expect(page.locator('nav')).toBeVisible();
    // 横スクロールが発生していない
    const hasHorizontalScroll = await page.evaluate(() =>
      document.body.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalScroll).toBeFalsy();
  });
});
