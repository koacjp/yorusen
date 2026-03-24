/**
 * Yahoo!知恵袋 データ収集スクリプト
 *
 * 事前準備:
 * 1. https://developer.yahoo.co.jp/start/ でアプリ登録
 * 2. Client ID（App ID）を取得
 * 3. .env.local に YAHOO_APP_ID=your_app_id を追加
 *
 * 実行: npx ts-node scripts/collect-chie.ts
 */

import fs from "fs";
import path from "path";

const YAHOO_APP_ID = process.env.YAHOO_APP_ID;
const OUTPUT_FILE = path.join(__dirname, "../data/collected/chie_raw.json");
const FILTERED_FILE = path.join(__dirname, "../data/collected/chie_filtered.json");

// 収集するキーワード一覧
const KEYWORDS = [
  "キャバクラ 接客",
  "キャバ嬢 お客さん 断り方",
  "夜職 痛客 対処",
  "キャバクラ 指名 増やす",
  "ホストクラブ キャバクラ お客さん 心理",
  "夜職 LINE 返し方",
  "キャバ嬢 同伴 断る",
  "夜職 メンタル 保ち方",
  "キャバクラ お客さん 来なくなった",
  "夜職 しんどい",
];

interface ChieAnswer {
  title: string;
  question: string;
  bestAnswer: string;
  answers: string[];
  url: string;
  timestamp: string;
}

interface FilteredEntry {
  id: string;
  category: "useful_advice" | "psychology" | "rant" | "anti" | "irrelevant";
  confidence: number; // 0-1
  original: ChieAnswer;
  extracted_tip?: string; // AIが抽出した有益なポイント
}

// Yahoo!知恵袋 API呼び出し
async function searchChie(query: string, start = 1): Promise<ChieAnswer[]> {
  if (!YAHOO_APP_ID) {
    throw new Error("YAHOO_APP_ID が設定されていません");
  }

  const url = new URL("https://jlp.yahooapis.jp/KnowledgeGraphService/V2/search");
  // 実際はYahoo!知恵袋検索API (chiebukuro/search)
  const apiUrl = `https://chiebukuro.yahoo.co.jp/api/v2/search?appid=${YAHOO_APP_ID}&query=${encodeURIComponent(query)}&results=10&start=${start}`;

  const res = await fetch(apiUrl);
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();

  // レスポンスをChieAnswer形式に変換
  const results: ChieAnswer[] = (data.question || []).map((q: Record<string, unknown>) => ({
    title: (q.subject as string) || "",
    question: (q.content as string) || "",
    bestAnswer: (q.bestanswer as Record<string, unknown>)?.content as string || "",
    answers: ((q.answer as Record<string, unknown>[]) || []).map((a: Record<string, unknown>) => a.content as string || ""),
    url: (q.url as string) || "",
    timestamp: new Date().toISOString(),
  }));

  return results;
}

// Claude APIで有益度を判定・有益なポイントを抽出
async function filterWithAI(entries: ChieAnswer[]): Promise<FilteredEntry[]> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const filtered: FilteredEntry[] = [];

  for (const entry of entries) {
    const prompt = `以下は夜職（キャバクラ・コンカフェ等）に関するYahoo!知恵袋の質問と回答です。

質問: ${entry.title}
内容: ${entry.question}
ベストアンサー: ${entry.bestAnswer}

この内容を以下のカテゴリに分類し、有益な場合はポイントを1文で抽出してください。

カテゴリ:
- useful_advice: キャストへの実践的なアドバイス・体験談
- psychology: お客さんの心理・行動パターンの分析
- rant: 愚痴・感情的な吐き出し（有益な情報なし）
- anti: アンチコメント・批判のみ
- irrelevant: 夜職と無関係

JSON形式で返してください:
{
  "category": "useful_advice",
  "confidence": 0.9,
  "extracted_tip": "痛客には店のルールを盾にして断ると個人攻撃にならない"
}`;

    try {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });

      const text = res.content[0].type === "text" ? res.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        filtered.push({
          id: `chie_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          category: parsed.category,
          confidence: parsed.confidence,
          original: entry,
          extracted_tip: parsed.extracted_tip,
        });
      }
    } catch (e) {
      console.error("AI分類エラー:", e);
    }

    // レート制限対策
    await new Promise((r) => setTimeout(r, 500));
  }

  return filtered;
}

// メイン処理
async function main() {
  console.log("Yahoo!知恵袋 データ収集開始...");

  // 出力ディレクトリ作成
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const allRaw: ChieAnswer[] = [];

  // キーワードごとに収集
  for (const keyword of KEYWORDS) {
    console.log(`収集中: "${keyword}"`);
    try {
      const results = await searchChie(keyword);
      allRaw.push(...results);
      console.log(`  → ${results.length}件取得`);
      await new Promise((r) => setTimeout(r, 1000)); // レート制限
    } catch (e) {
      console.error(`  エラー: ${e}`);
    }
  }

  // 生データ保存
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRaw, null, 2), "utf-8");
  console.log(`\n生データ保存: ${OUTPUT_FILE} (${allRaw.length}件)`);

  // AI分類
  console.log("\nAI分類開始...");
  const filtered = await filterWithAI(allRaw);

  // 有益なものだけ抽出
  const useful = filtered.filter(
    (e) => (e.category === "useful_advice" || e.category === "psychology") && e.confidence >= 0.7
  );

  fs.writeFileSync(FILTERED_FILE, JSON.stringify(useful, null, 2), "utf-8");
  console.log(`\n有益データ保存: ${FILTERED_FILE}`);
  console.log(`総数: ${allRaw.length}件 → 有益: ${useful.length}件`);

  // サマリー表示
  const categories = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log("\nカテゴリ別集計:", categories);
}

main().catch(console.error);
