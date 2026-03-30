"use client";

import { useState, useEffect, useCallback } from "react";
import type { CommunityPost } from "@/app/api/community/route";

const CATEGORIES = ['接客全般', '初対面', '売上アップ', '常連化', 'LINE', '痛客対処', '同伴・指名', 'メンタル'];

const AREAS = [
  '池袋', '新宿', '渋谷', '六本木', '銀座', '恵比寿', '赤坂', '上野',
  '北千住', '錦糸町', '吉祥寺', '横浜', '大阪・ミナミ', '大阪・キタ',
  '名古屋', '福岡', 'その他'
];

const JOB_TYPES = ['コンカフェ', 'キャバクラ', 'ガールズバー', 'ラウンジ', 'クラブ', '昼夜兼業', 'その他'];

const ICONS = ['🌸', '🌺', '🌻', '🌹', '🦋', '🍓', '🍒', '🌙', '⭐', '💫', '🎀', '💎', '🌈', '🦄', '👑', '🍑', '🌷', '🫶'];

const PROFILE_KEY = 'yorusen_community_profile';

interface CommunityProfile {
  icon: string;
  nickname: string;
  area: string;
  jobType: string;
  yearsExp: string; // '〜1年' | '1〜3年' | '3〜5年' | '5年以上'
}

function loadProfile(): CommunityProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function saveProfile(p: CommunityProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function buildAuthorLabel(profile: CommunityProfile, anon: boolean): string {
  if (anon) return '匿名キャスト';
  return `${profile.icon} ${profile.nickname}（${profile.jobType}・${profile.yearsExp}）`;
}

function buildAreaLabel(profile: CommunityProfile, anon: boolean): string {
  if (anon) return '';
  return profile.area;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}日前`;
  if (h > 0) return `${h}時間前`;
  return 'さっき';
}

// ─── プロフィール設定モーダル ──────────────────────────────
function ProfileSetupModal({ onSave }: { onSave: (p: CommunityProfile) => void }) {
  const existing = loadProfile();
  const [icon, setIcon] = useState(existing?.icon ?? '🌸');
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [area, setArea] = useState(existing?.area ?? '池袋');
  const [jobType, setJobType] = useState(existing?.jobType ?? 'コンカフェ');
  const [yearsExp, setYearsExp] = useState(existing?.yearsExp ?? '1〜3年');

  const handleSave = () => {
    if (!nickname.trim()) return;
    const p: CommunityProfile = { icon, nickname: nickname.trim(), area, jobType, yearsExp };
    saveProfile(p);
    onSave(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-3xl w-full max-w-md px-5 py-6 flex flex-col gap-4">
        <h2 className="font-bold text-gray-800 text-base">プロフィール設定</h2>
        <p className="text-xs text-gray-500">コミュニティでの表示情報。同エリアの人にはわからない投稿ができる「匿名モード」もあるよ。</p>

        {/* アイコン選択 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">アイコン</p>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`text-2xl rounded-xl p-1.5 transition-colors ${icon === ic ? 'bg-pink-100 ring-2 ring-pink-400' : 'hover:bg-gray-100'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* ニックネーム */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">ニックネーム *</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)}
            placeholder="れい・みく・さくら など"
            className="rounded-xl border border-pink-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-300" />
        </label>

        {/* エリア */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">働いてるエリア</span>
          <select value={area} onChange={(e) => setArea(e.target.value)}
            className="rounded-xl border border-pink-200 px-3 py-2 text-sm bg-white">
            {AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>

        <div className="flex gap-3">
          {/* 業種 */}
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-gray-500">業種</span>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}
              className="rounded-xl border border-pink-200 px-3 py-2 text-sm bg-white">
              {JOB_TYPES.map((j) => <option key={j}>{j}</option>)}
            </select>
          </label>

          {/* 経験年数 */}
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-gray-500">経験年数</span>
            <select value={yearsExp} onChange={(e) => setYearsExp(e.target.value)}
              className="rounded-xl border border-pink-200 px-3 py-2 text-sm bg-white">
              {['〜1年', '1〜3年', '3〜5年', '5年以上'].map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
        </div>

        <button onClick={handleSave} disabled={!nickname.trim()}
          className="w-full bg-pink-400 text-white rounded-2xl py-3 text-sm font-bold disabled:opacity-40">
          保存して始める
        </button>
      </div>
    </div>
  );
}

// ─── 投稿カード ──────────────────────────────────────────
function PostCard({
  post,
  myProfile,
  onAnswerAdded,
}: {
  post: CommunityPost;
  myProfile: CommunityProfile | null;
  onAnswerAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 同エリア警告
  const sameArea = myProfile && post.area && post.area === myProfile.area && post.area !== 'その他';

  const handleAnswer = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    const label = myProfile ? buildAuthorLabel(myProfile, anon) : '匿名キャスト';
    await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'answer', postId: post.id, body: answerText, authorLabel: label }),
    });
    setAnswerText('');
    setShowAnswerForm(false);
    setSubmitting(false);
    onAnswerAdded();
  };

  return (
    <div className="bg-white rounded-2xl border border-pink-100 overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">{post.category}</span>
              {post.area && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{post.area}</span>
              )}
            </div>
            <p className="font-medium text-gray-800 text-sm mt-1.5 leading-relaxed">{post.question}</p>
          </div>
          <span className="text-gray-300 text-sm mt-1">{expanded ? '▲' : '▼'}</span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
          <span>{post.authorLabel}</span>
          <span>{timeAgo(post.createdAt)}</span>
          <span>👀 {post.views}</span>
          <span>💬 {post.humanAnswers.length}件</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-pink-50 px-4 py-3 flex flex-col gap-4">
          {/* AI回答 */}
          {post.aiAnswer && (
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">🤖</span>
                <span className="text-xs font-bold text-pink-600">よるせんAI</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{post.aiAnswer}</p>
            </div>
          )}

          {/* 人間の回答 */}
          {post.humanAnswers.map((a) => (
            <div key={a.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">💬</span>
                <span className="text-xs font-bold text-gray-600">{a.authorLabel}</span>
                <span className="text-xs text-gray-400 ml-auto">{timeAgo(a.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{a.body}</p>
            </div>
          ))}

          {/* 回答フォーム */}
          {showAnswerForm ? (
            <div className="flex flex-col gap-2">
              {/* 同エリア警告 */}
              {sameArea && !anon && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-yellow-700">
                  ⚠️ 投稿者と同じエリア（{post.area}）です。特定されないよう匿名モードを検討してね。
                </div>
              )}
              {/* 匿名トグル */}
              {myProfile && (
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)}
                    className="w-4 h-4 accent-pink-400" />
                  このスレッドでは匿名で回答する
                  {anon && <span className="text-gray-400">（「匿名キャスト」として表示）</span>}
                </label>
              )}
              {/* 回答者プレビュー */}
              <p className="text-xs text-gray-400">
                表示名: {myProfile ? buildAuthorLabel(myProfile, anon) : '匿名キャスト'}
              </p>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="あなたの経験を教えてください..."
                rows={3}
                className="rounded-xl border border-pink-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-pink-300"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowAnswerForm(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm">キャンセル</button>
                <button onClick={handleAnswer} disabled={!answerText.trim() || submitting}
                  className="flex-1 bg-pink-400 text-white rounded-xl py-2 text-sm font-bold disabled:opacity-40">
                  {submitting ? '投稿中...' : '回答する'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAnswerForm(true)}
              className="w-full border-2 border-dashed border-pink-200 text-pink-400 rounded-xl py-2.5 text-sm font-medium hover:bg-pink-50 transition-colors">
              ＋ 回答する
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── メインページ ─────────────────────────────────────────
export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', category: '接客全般' });
  const [submitting, setSubmitting] = useState(false);
  const [myProfile, setMyProfile] = useState<CommunityProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [postAnon, setPostAnon] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setMyProfile(p);
    if (!p) setShowProfileSetup(true);
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const url = `/api/community${category ? `?category=${encodeURIComponent(category)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  }, [category]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handlePost = async () => {
    if (!form.question.trim()) return;
    setSubmitting(true);
    const profile = myProfile ?? null;
    const authorLabel = profile ? buildAuthorLabel(profile, postAnon) : '匿名キャスト';
    const area = profile ? buildAreaLabel(profile, postAnon) : '';
    await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, authorLabel, area }),
    });
    setForm({ question: '', category: '接客全般' });
    setShowForm(false);
    setSubmitting(false);
    await loadPosts();
  };

  const handleProfileSave = (p: CommunityProfile) => {
    setMyProfile(p);
    setShowProfileSetup(false);
  };

  return (
    <>
      {showProfileSetup && <ProfileSetupModal onSave={handleProfileSave} />}

      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white px-4 py-6 pb-28">
        <div className="w-full max-w-md mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">💭 みんなに聞く</h1>
              <p className="text-xs text-gray-400 mt-0.5">AIと先輩キャストに相談しよう</p>
            </div>
            {/* プロフィール表示 */}
            {myProfile && (
              <button onClick={() => setShowProfileSetup(true)}
                className="flex items-center gap-1.5 bg-white border border-pink-100 rounded-2xl px-3 py-1.5 text-xs text-gray-600">
                <span>{myProfile.icon}</span>
                <span className="font-medium">{myProfile.nickname}</span>
                <span className="text-gray-300">✏️</span>
              </button>
            )}
          </div>

          {/* カテゴリフィルタ */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategory('')}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${!category ? 'bg-pink-400 text-white border-pink-400' : 'bg-white text-gray-500 border-gray-200'}`}>
              すべて
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${category === c ? 'bg-pink-400 text-white border-pink-400' : 'bg-white text-gray-500 border-gray-200'}`}>
                {c}
              </button>
            ))}
          </div>

          {/* 質問投稿ボタン */}
          <button onClick={() => setShowForm((v) => !v)}
            className="w-full bg-pink-400 text-white rounded-2xl py-3 font-bold text-sm hover:bg-pink-500 transition-colors">
            {showForm ? 'キャンセル' : '✏️ 質問を投稿する'}
          </button>

          {showForm && (
            <div className="bg-white rounded-2xl border border-pink-100 p-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">カテゴリ</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="rounded-xl border border-pink-200 px-3 py-2 text-sm bg-white">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">質問 *</span>
                <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="どんなことで悩んでる？具体的に書くと答えやすいよ"
                  rows={3}
                  className="rounded-xl border border-pink-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-pink-300" />
              </label>

              {/* 匿名トグル */}
              {myProfile && (
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={postAnon} onChange={(e) => setPostAnon(e.target.checked)}
                    className="w-4 h-4 accent-pink-400" />
                  匿名で投稿する
                  {postAnon && <span className="text-gray-400">（エリア・名前は非表示）</span>}
                </label>
              )}

              <p className="text-xs text-gray-400">
                投稿者: {myProfile ? buildAuthorLabel(myProfile, postAnon) : '匿名キャスト'}
                {!postAnon && myProfile && ` / ${myProfile.area}`}
              </p>
              <button onClick={handlePost} disabled={!form.question.trim() || submitting}
                className="w-full bg-pink-400 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-40">
                {submitting ? 'AIが回答中...' : '投稿する（AIが即回答）'}
              </button>
            </div>
          )}

          {/* 質問リスト */}
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">読み込み中...</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">まだ質問がないよ。最初に投稿してみて！</p>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} myProfile={myProfile} onAnswerAdded={loadPosts} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
