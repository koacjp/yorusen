/**
 * コミュニティQ&A API
 * - POST /api/community → 質問投稿
 * - GET  /api/community → 質問一覧取得
 * - POST /api/community/answer → 回答投稿（AIが自動生成 + キャスト回答）
 *
 * データはVercel KV or localStorageフォールバック想定
 * 今はJSONファイルベース（Vercel Edge RuntimeでKVに移行可能）
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── 型定義 ─────────────────────────────────────────────
export interface CommunityPost {
  id: string;
  question: string;
  category: string;
  authorLabel: string; // 表示名（匿名時は「匿名キャスト」）
  area?: string;       // 働いてるエリア（匿名時は空）
  aiAnswer?: string;
  humanAnswers: HumanAnswer[];
  createdAt: string;
  views: number;
  helpful: number;
}

export interface HumanAnswer {
  id: string;
  postId: string;
  body: string;
  authorLabel: string;
  helpful: number;
  createdAt: string;
}

// ─── インメモリストア（Vercel Edge = リクエスト間で共有されない）
// 本番はKV/Supabaseに移行する。現時点でのプロトタイプ。
const POSTS_STORE: CommunityPost[] = [
  // サンプルデータ
  {
    id: 'sample-1',
    question: 'フリーのお客さんが入ってきたとき最初に何を話す？',
    category: '初対面',
    authorLabel: 'コンカフェ歴1年',
    aiAnswer: '最初の15秒が全て。「今日は仕事終わりですか？」より「このあたりよく来られるんですか？」の方が答えやすくて会話が広がりやすいです。相手の生活圏から入ると自然と話題が出てきます。',
    humanAnswers: [
      {
        id: 'ha-1',
        postId: 'sample-1',
        body: '私は天気とか季節の話から入るようにしてます。「今日暑かったですよね〜」みたいな。誰でも返せるから外れない。',
        authorLabel: 'キャバ歴5年',
        helpful: 12,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    views: 84,
    helpful: 23,
  },
  {
    id: 'sample-2',
    question: '同伴のお誘いってどのタイミングでLINEするのが正解？',
    category: '売上アップ',
    authorLabel: 'キャバ歴2年',
    aiAnswer: '来店直後（翌日〜3日以内）がゴールデンタイム。感情が残っている間に「次また来てほしいな」という空気を作る。同伴の話は直接せず「今度ご飯でも行きませんか」と食事に誘う形にすると応諾率が上がります。',
    humanAnswers: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    views: 56,
    helpful: 15,
  },
];

// ─── AI自動回答生成 ──────────────────────────────────────
async function generateAIAnswer(question: string, category: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: `あなたはキャバクラ・コンカフェで働くキャストのための接客アドバイザーです。
現役・元キャスト目線で、具体的で実践的なアドバイスを日本語で150字以内で答えてください。
タメ口・柔らかいトーン。余計な前置きなし。`,
    messages: [{ role: 'user', content: `カテゴリ「${category}」の質問：${question}` }],
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
}

// ─── GET: 質問一覧 ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  let posts = [...POSTS_STORE];
  if (category) posts = posts.filter((p) => p.category === category);
  posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json(posts.slice(0, limit));
}

// ─── POST: 質問投稿 or 回答投稿 ─────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  // 回答投稿
  if (body.type === 'answer') {
    const post = POSTS_STORE.find((p) => p.id === body.postId);
    if (!post) return Response.json({ error: 'not found' }, { status: 404 });

    const answer: HumanAnswer = {
      id: crypto.randomUUID(),
      postId: body.postId,
      body: body.body,
      authorLabel: body.authorLabel ?? '匿名キャスト',
      helpful: 0,
      createdAt: new Date().toISOString(),
    };
    post.humanAnswers.push(answer);
    return Response.json(answer);
  }

  // 質問投稿
  const { question, category, authorLabel, area } = body as {
    question: string; category: string; authorLabel?: string; area?: string;
  };

  if (!question?.trim()) {
    return Response.json({ error: '質問を入力してください' }, { status: 400 });
  }

  // AI回答を自動生成
  const aiAnswer = await generateAIAnswer(question, category ?? '接客全般').catch(() => undefined);

  const post: CommunityPost = {
    id: crypto.randomUUID(),
    question: question.trim(),
    category: category ?? '接客全般',
    authorLabel: authorLabel ?? '匿名キャスト',
    area: area || undefined,
    aiAnswer,
    humanAnswers: [],
    createdAt: new Date().toISOString(),
    views: 0,
    helpful: 0,
  };

  POSTS_STORE.unshift(post);
  return Response.json(post, { status: 201 });
}
