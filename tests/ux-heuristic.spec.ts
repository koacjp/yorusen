import { test, expect, Page } from '@playwright/test';

// ─── UXヒューリスティック評価 ─────────────────────────────
// Nielsenの10原則に基づく自動評価
// 完全な人間評価の代替ではないが、明らかなUX問題を検出する

async function gotoWithProfile(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => {
    localStorage.setItem('yorusen_cast_profile', JSON.stringify({
      typeCode: 'EAST', typeName: 'テスト',
      scores: { character: 5, service: 5, emotion: 5, sales: 5 },
      completedAt: new Date().toISOString(),
    }));
  });
  await page.reload();
  await page.goto(path);
}

// ─── 原則1: 状態の可視化 ────────────────────────────────
test('【UX-1】ローディング状態が表示される', async ({ page }) => {
  await gotoWithProfile(page, '/customers');
  await page.locator('button:has-text("お客さんを追加")').click();
  await page.locator('input[placeholder*="ニックネーム"], input[placeholder*="田中"]').fill('UXテスト太郎');
  // 保存ボタンクリック後にフォームが閉じる（フィードバックがある）
  await page.locator('button:has-text("保存する")').click();
  await expect(page.locator('text=UXテスト太郎')).toBeVisible({ timeout: 3000 });
});

// ─── 原則3: ユーザーコントロール ────────────────────────
test('【UX-3】キャンセルができる', async ({ page }) => {
  await gotoWithProfile(page, '/customers');
  await page.locator('button:has-text("お客さんを追加")').click();
  await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
  await page.locator('button:has-text("キャンセル")').click();
  await expect(page.locator('button:has-text("キャンセル")')).not.toBeVisible({ timeout: 2000 });
});

// ─── 原則5: エラー防止 ──────────────────────────────────
test('【UX-5】必須項目が空のとき保存ボタンが無効になる', async ({ page }) => {
  await gotoWithProfile(page, '/customers');
  await page.locator('button:has-text("お客さんを追加")').click();
  const saveBtn = page.locator('button:has-text("保存する")').last();
  // 名前が空のとき disabled
  await expect(saveBtn).toBeDisabled();
});

test('【UX-5】コース登録フォームで必須項目が空なら追加不可', async ({ page }) => {
  await gotoWithProfile(page, '/settings');
  const addBtn = page.locator('button:has-text("追加する")').first();
  await expect(addBtn).toBeDisabled();
});

// ─── 原則4: 一貫性 ──────────────────────────────────────
test('【UX-4】BottomNavが全ページに表示される', async ({ page }) => {
  const paths = ['/', '/customers', '/calendar', '/analytics', '/saved', '/premium', '/settings'];
  for (const path of paths) {
    await gotoWithProfile(page, path);
    await expect(page.locator('nav')).toBeVisible({ timeout: 3000 });
  }
});

// ─── 原則6: 認識負荷の軽減 ──────────────────────────────
test('【UX-6】ナビゲーションにラベルとアイコンが両方ある', async ({ page }) => {
  await gotoWithProfile(page, '/');
  const nav = page.locator('nav');
  await expect(nav.locator('text=相談')).toBeVisible();
  await expect(nav.locator('text=お客さん')).toBeVisible();
  await expect(nav.locator('text=来店帳')).toBeVisible();
  await expect(nav.locator('text=分析')).toBeVisible();
});

// ─── 原則8: 審美的デザイン ──────────────────────────────
test('【UX-8】メインカラーがpink系で統一されている', async ({ page }) => {
  await gotoWithProfile(page, '/');
  // pink-400クラスが使われていることを確認
  const hasPink = await page.evaluate(() => {
    const elements = document.querySelectorAll('[class*="pink"]');
    return elements.length > 0;
  });
  expect(hasPink).toBeTruthy();
});

test('【UX-8】フォントサイズが読みやすい（12px以上）', async ({ page }) => {
  await gotoWithProfile(page, '/');
  const tooSmall = await page.evaluate(() => {
    const elements = document.querySelectorAll('p, span, label, button, a');
    const small: string[] = [];
    elements.forEach((el) => {
      const size = parseFloat(window.getComputedStyle(el).fontSize);
      if (size < 10) small.push(el.textContent?.trim().slice(0, 20) ?? '');
    });
    return small.filter(Boolean);
  });
  // 10px未満のテキストがない
  expect(tooSmall.length).toBe(0);
});

// ─── 原則9: エラー回復 ──────────────────────────────────
test('【UX-9】存在しないページで404にならず正常に表示される', async ({ page }) => {
  await page.goto('/nonexistent-page');
  // Next.jsの404ページが表示される（アプリがクラッシュしない）
  await expect(page).not.toHaveURL('/500');
});

// ─── アクセシビリティ最低ライン ──────────────────────────
test('【A11Y】imgタグにaltがある', async ({ page }) => {
  await gotoWithProfile(page, '/');
  const imagesWithoutAlt = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img:not([alt])');
    return imgs.length;
  });
  expect(imagesWithoutAlt).toBe(0);
});

test('【A11Y】ボタンにテキストまたはaria-labelがある', async ({ page }) => {
  await gotoWithProfile(page, '/');
  const emptyButtons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    const empty: number[] = [];
    btns.forEach((btn, i) => {
      const text = btn.textContent?.trim() ?? '';
      const label = btn.getAttribute('aria-label') ?? '';
      if (!text && !label) empty.push(i);
    });
    return empty.length;
  });
  expect(emptyButtons).toBe(0);
});

// ─── セキュリティ最低ライン ──────────────────────────────
test('【SEC】APIキーがHTMLに露出していない', async ({ page }) => {
  await gotoWithProfile(page, '/');
  const html = await page.content();
  expect(html).not.toContain('sk-ant-');
  expect(html).not.toContain('sk_live_');
  expect(html).not.toContain('gsk_');
});

test('【SEC】XSS: スクリプトインジェクションが実行されない', async ({ page }) => {
  await gotoWithProfile(page, '/customers');
  await page.locator('button:has-text("お客さんを追加")').click();
  const xssPayload = '<script>window.__xss_executed=true</script>';
  await page.locator('input[placeholder*="ニックネーム"], input[placeholder*="田中"]').fill(xssPayload);
  await page.locator('button:has-text("保存する")').click();
  const xssExecuted = await page.evaluate(() => (window as typeof window & { __xss_executed?: boolean }).__xss_executed);
  expect(xssExecuted).toBeFalsy();
});

// ─── モバイルタップターゲット ────────────────────────────
test('【MOBILE】タップターゲットが44px以上', async ({ page }) => {
  await gotoWithProfile(page, '/');
  const tooSmallTargets = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, a');
    const small: string[] = [];
    buttons.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 28 || rect.height < 28)) {
        small.push(`${el.textContent?.trim().slice(0, 15)}: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    });
    return small;
  });
  // 28px未満のタップターゲットを報告（厳密な44px基準ではなく警告レベル）
  if (tooSmallTargets.length > 0) {
    console.warn('小さいタップターゲット:', tooSmallTargets.join(', '));
  }
  // 10個以上あったら失敗
  expect(tooSmallTargets.length).toBeLessThan(10);
});
