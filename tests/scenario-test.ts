/**
 * よるせん AIシナリオテスト
 * 実際のAPIにリクエストを送り、回答の質・適切さを自動評価する
 * 使い方: npx tsx tests/scenario-test.ts
 */

const BASE_URL = process.env.TEST_URL ?? 'https://yorusen.vercel.app';

const TEST_PROFILE = {
  typeCode: 'EAST',
  typeName: '百戦錬磨の先輩',
  scores: { character: 7, service: 6, emotion: 5, sales: 8 },
  completedAt: new Date().toISOString(),
  area: '池袋',
  shopName: 'コンカフェ',
};

// ─── テストシナリオ一覧 ───────────────────────────────────
const SCENARIOS = [
  // 基本接客
  { id: 'S01', category: '初来店対応', q: '今日初めて来たお客さんで全然話が続かない。どうしたらいい？' },
  { id: 'S02', category: '常連化促進', q: '2回目に来てくれたお客さんを常連にするには？' },
  { id: 'S03', category: '来店促進LINE', q: '1ヶ月来ていない常連さんへのLINEはどう送る？' },
  // 難しい客
  { id: 'S04', category: '痛客対処', q: '指名してくれるけど毎回プライベートを聞いてくる客への対処法' },
  { id: 'S05', category: '店外誘い断り', q: '「仕事終わり飯行こう」と毎回誘ってくる客をうまく断りたい' },
  { id: 'S06', category: '怒り客', q: 'ドリンク注文しないのに2時間居座る客。どう促す？' },
  { id: 'S07', category: '恋愛感情', q: '「好きになっちゃった」と言われた。どう返せばいい？' },
  // 売上アップ
  { id: 'S08', category: 'シャンパン促進', q: 'シャンパン入れてもらいやすい会話の流れは？' },
  { id: 'S09', category: '同伴獲得', q: '同伴に誘う自然なLINEの送り方を教えて' },
  { id: 'S10', category: '本指名増やす', q: '本指名をもっと増やすにはどうすればいい？' },
  // メンタル・仕事観
  { id: 'S11', category: 'メンタル', q: '全然売れない日が続いてメンタルがきつい' },
  { id: 'S12', category: '客層の違い', q: 'コンカフェとキャバクラって客の違いは何？' },
  { id: 'S13', category: '新人', q: 'コンカフェ始めたばかりで何を話していいかわからない' },
  // エッジケース
  { id: 'S14', category: '英語客', q: '英語しか話せない外国人のお客さんが来た' },
  { id: 'S15', category: '無関係な質問', q: '明日の天気は？' }, // 無関係 → よるせんらしく返すか？
  { id: 'S16', category: '長文相談', q: '先週来た田中さんというお客さんなんですが、最初は普通だったのに急に「他の子と話さないで」って言い出して、指名してくれるのはありがたいんだけど、毎回LINEも10通くらい来て正直重くなってきた。でも売上には必要だし、どうしたらうまく距離を保ちながら来店継続してもらえる？' },
];

// ─── 評価ロジック ─────────────────────────────────────────
function evaluateResponse(scenario: typeof SCENARIOS[0], response: string): {
  score: number; issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // 長さチェック（短すぎ・長すぎ）
  if (response.length < 50) { issues.push('回答が短すぎる'); score -= 30; }
  if (response.length > 1500) { issues.push('回答が長すぎる（読む気が失せる）'); score -= 10; }

  // エラーレスポンスチェック
  if (response.includes('エラー') || response.includes('申し訳') && response.length < 100) {
    issues.push('エラーレスポンス'); score -= 50;
  }

  // 夜職文脈チェック（無関係な質問以外）
  if (scenario.id !== 'S15') {
    const nightworkKeywords = ['お客', 'キャスト', '接客', '来店', 'LINE', '売上', 'セット', '指名', '同伴', '店'];
    const hasContext = nightworkKeywords.some((k) => response.includes(k));
    if (!hasContext) { issues.push('夜職文脈がない一般的な回答'); score -= 20; }
  }

  // マークダウン記号チェック（**が残っていないか）
  if (response.includes('**')) { issues.push('**マークダウンが残っている'); score -= 10; }

  // 具体性チェック（箇条書きまたは具体例があるか）
  const hasConcrete = response.includes('・') || response.includes('例') || response.includes('たとえば') || response.includes('\n');
  if (!hasConcrete && response.length > 100) { issues.push('具体例・箇条書きがなく抽象的'); score -= 15; }

  return { score: Math.max(0, score), issues };
}

// ─── メイン実行 ───────────────────────────────────────────
async function runScenarioTests() {
  console.log('====================================');
  console.log('  よるせん AIシナリオテスト');
  console.log(`  ${SCENARIOS.length}シナリオ × 1回 = ${SCENARIOS.length}回`);
  console.log('====================================\n');

  const results: { scenario: typeof SCENARIOS[0]; response: string; score: number; issues: string[]; ms: number }[] = [];

  for (const scenario of SCENARIOS) {
    process.stdout.write(`[${scenario.id}] ${scenario.category}: `);
    const start = Date.now();

    try {
      const res = await fetch(`${BASE_URL}/api/advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: scenario.q, castProfile: TEST_PROFILE }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // ストリーミングを読み切る
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let response = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response += decoder.decode(value, { stream: true });
      }

      const ms = Date.now() - start;
      const { score, issues } = evaluateResponse(scenario, response);
      results.push({ scenario, response, score, issues, ms });

      const mark = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
      console.log(`${mark} スコア${score} (${ms}ms)`);
      if (issues.length > 0) console.log(`   └ ${issues.join(' / ')}`);

    } catch (err) {
      const ms = Date.now() - start;
      console.log(`❌ エラー: ${err}`);
      results.push({ scenario, response: '', score: 0, issues: [`接続エラー: ${err}`], ms });
    }

    // API負荷軽減
    await new Promise((r) => setTimeout(r, 1000));
  }

  // ─── サマリー ───────────────────────────────────────────
  console.log('\n====================================');
  console.log('  結果サマリー');
  console.log('====================================');
  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  const passed = results.filter((r) => r.score >= 80).length;
  console.log(`総合スコア: ${avgScore}/100`);
  console.log(`合格(80点以上): ${passed}/${results.length}`);
  console.log(`平均応答時間: ${avgMs}ms`);

  console.log('\n【要改善シナリオ】');
  const failed = results.filter((r) => r.score < 80).sort((a, b) => a.score - b.score);
  if (failed.length === 0) {
    console.log('なし（全シナリオ合格）');
  } else {
    failed.forEach((r) => {
      console.log(`\n${r.scenario.id} [${r.scenario.category}] スコア${r.score}`);
      console.log(`Q: ${r.scenario.q.slice(0, 50)}...`);
      console.log(`問題: ${r.issues.join(' / ')}`);
      console.log(`A: ${r.response.slice(0, 100)}...`);
    });
  }

  // ─── 詳細ログをファイル保存 ──────────────────────────────
  const logPath = `test-results/scenario-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fs = await import('fs');
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  console.log(`\n詳細ログ: ${logPath}`);

  return results;
}

runScenarioTests().catch(console.error);
