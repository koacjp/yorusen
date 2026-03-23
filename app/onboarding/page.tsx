"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCastProfile } from "@/lib/storage";
import type { CastProfile } from "@/lib/types";

// ---------------------------------------------------------------------------
// 質問データ
// ---------------------------------------------------------------------------

type Axis = "character" | "service" | "emotion" | "sales";

interface Question {
  axis: Axis;
  text: string;
  reversed: boolean; // true のとき回答スコアを反転
}

const QUESTIONS: Question[] = [
  // キャラクター軸（外向⬆ vs 内向⬇）
  { axis: "character", text: "初めてのお客さんでも自分から話題を作るのが得意だ", reversed: false },
  { axis: "character", text: "グループのテーブルより1対1の方が楽しめる", reversed: true },
  { axis: "character", text: "場が盛り上がっているとき、さらに火をつけたくなる", reversed: false },
  { axis: "character", text: "静かな時間の方が、実は落ち着いて接客できる", reversed: true },
  { axis: "character", text: "複数のテーブルを同時に気にしながら動ける", reversed: false },

  // 接客軸（積極⬆ vs 受容⬇）
  { axis: "service", text: "ドリンクのお誘いは自分から積極的にする", reversed: false },
  { axis: "service", text: "お客さんが何を飲みたいか、黙って察するのが得意", reversed: true },
  { axis: "service", text: "気になる人がいたら自分からアプローチする", reversed: false },
  { axis: "service", text: "お客さんの話が終わるまで待てる方だ", reversed: true },
  { axis: "service", text: "LINEの返信も積極的に送る方だ", reversed: false },

  // 感情軸（安定⬆ vs 共感⬇）
  { axis: "emotion", text: "お客さんが機嫌悪くても、自分は引きずらない", reversed: false },
  { axis: "emotion", text: "お客さんが泣いていると、つられて泣きそうになる", reversed: true },
  { axis: "emotion", text: "嫌いなお客さんでも、表情に出さないでいられる", reversed: false },
  { axis: "emotion", text: "お客さんの感情に共鳴して、自分も楽しくなる", reversed: true },
  { axis: "emotion", text: "閉店後に仕事のことを引きずらない", reversed: false },

  // 売上軸（戦略⬆ vs 直感⬇）
  { axis: "sales", text: "月の売上目標を数字で意識して動く", reversed: false },
  { axis: "sales", text: "その場の空気で「今日は頑張れる日だ」と感じて動く", reversed: true },
  { axis: "sales", text: "お客さんの来店頻度を頭の中で管理している", reversed: false },
  { axis: "sales", text: "計画より「なんかいける！」という感覚を信じる", reversed: true },
  { axis: "sales", text: "誰をどの順番で回るか、戦略的に考える", reversed: false },
];

// ---------------------------------------------------------------------------
// リッカート尺度
// ---------------------------------------------------------------------------

const LIKERT = [
  { label: "まったく\n違う", score: -2 },
  { label: "違う", score: -1 },
  { label: "どちらでも\nない", score: 0 },
  { label: "そう思う", score: 1 },
  { label: "とても\nそう思う", score: 2 },
] as const;

// ---------------------------------------------------------------------------
// タイプ判定
// ---------------------------------------------------------------------------

const TYPE_NAMES: Record<string, string> = {
  EAST: "百戦錬磨の先輩",
  EASN: "空気読みの女王",
  EACT: "ムードメーカー戦略家",
  EACN: "みんなの太陽",
  EPST: "静かな計算高い女",
  EPSN: "癒し系ミステリアス",
  EPCT: "共感アナリスト",
  EPCN: "天才・感情タイプ",
  IAST: "鋭い観察者",
  IASN: "直感の名人",
  IACT: "ストイック職人",
  IACN: "感性の人",
  IPST: "陰の策士",
  IPSN: "静かなる聴き上手",
  IPCT: "感情豊かな戦略家",
  IPCN: "深い共感の使い手",
};

function buildTypeCode(scores: CastProfile["scores"]): string {
  const c = scores.character > 0 ? "E" : "I";
  const s = scores.service > 0 ? "A" : "P";
  const e = scores.emotion > 0 ? "S" : "C";
  const sa = scores.sales > 0 ? "T" : "N";
  return `${c}${s}${e}${sa}`;
}

// ---------------------------------------------------------------------------
// スコアバー（結果画面用）
// ---------------------------------------------------------------------------

interface ScoreBarProps {
  leftLabel: string;
  rightLabel: string;
  score: number; // -10〜+10
}

function ScoreBar({ leftLabel, rightLabel, score }: ScoreBarProps) {
  // score を 0〜100% に変換（-10→0%, 0→50%, +10→100%）
  const pct = ((score + 10) / 20) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="relative h-3 rounded-full bg-pink-100">
        {/* 中心線 */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-pink-300" />
        {/* バー */}
        <div
          className="absolute top-0 h-full rounded-full bg-pink-400 transition-all duration-700"
          style={{
            left: score >= 0 ? "50%" : `${pct}%`,
            width: `${Math.abs(score) * 5}%`,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ページ本体
// ---------------------------------------------------------------------------

type Phase = "intro" | "quiz" | "result";

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0); // 現在の問題番号 (0-indexed)
  const [rawScores, setRawScores] = useState<number[]>([]); // 各問の生スコア
  const [result, setResult] = useState<CastProfile | null>(null);

  // -----------------------------------------------------------------------
  // 回答ハンドラ
  // -----------------------------------------------------------------------

  const handleAnswer = (baseScore: number) => {
    const q = QUESTIONS[current];
    const score = q.reversed ? -baseScore : baseScore;
    const newRaw = [...rawScores, score];
    setRawScores(newRaw);

    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else {
      // 全問回答 → 集計
      const sum = (axis: Axis) =>
        newRaw
          .map((s, i) => (QUESTIONS[i].axis === axis ? s : 0))
          .reduce((a, b) => a + b, 0);

      const scores: CastProfile["scores"] = {
        character: sum("character"),
        service: sum("service"),
        emotion: sum("emotion"),
        sales: sum("sales"),
      };

      const typeCode = buildTypeCode(scores);
      const typeName = TYPE_NAMES[typeCode] ?? typeCode;

      const profile: CastProfile = {
        typeCode,
        typeName,
        scores,
        completedAt: new Date().toISOString(),
      };

      saveCastProfile(profile);
      setResult(profile);
      setPhase("result");
    }
  };

  // -----------------------------------------------------------------------
  // イントロ画面
  // -----------------------------------------------------------------------

  if (phase === "intro") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md flex flex-col items-center gap-7 text-center">
          <div className="text-5xl">🌙</div>
          <h1 className="text-2xl font-bold text-pink-500">よるせん</h1>
          <div className="bg-white rounded-2xl border-2 border-pink-200 px-6 py-6 w-full flex flex-col gap-3">
            <p className="font-bold text-gray-800 text-base">あなたの接客タイプを診断します</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              4つの軸・20問の質問に答えるだけで、あなたにぴったりのアドバイスができるようになるよ✨
            </p>
            <ul className="text-xs text-gray-400 text-left list-none flex flex-col gap-1 mt-1">
              <li>🎭 キャラクター軸：外向 ↔ 内向</li>
              <li>💬 接客軸：積極 ↔ 受容</li>
              <li>💖 感情軸：安定 ↔ 共感</li>
              <li>💰 売上軸：戦略 ↔ 直感</li>
            </ul>
          </div>
          <p className="text-xs text-gray-400">所要時間：約3分・全20問</p>
          <button
            onClick={() => setPhase("quiz")}
            className="w-full rounded-2xl bg-pink-400 py-3.5 text-white font-bold text-sm hover:bg-pink-500 active:scale-95 transition-all shadow-md"
          >
            診断をはじめる →
          </button>
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // 結果画面
  // -----------------------------------------------------------------------

  if (phase === "result" && result) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-md flex flex-col gap-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-pink-500">🌙 よるせん</h1>
            <p className="text-xs text-gray-400 mt-1">診断完了！</p>
          </div>

          {/* タイプコード */}
          <div className="bg-white rounded-2xl border-2 border-pink-300 px-6 py-6 flex flex-col items-center gap-2 shadow-sm">
            <p className="text-xs text-gray-400 tracking-widest uppercase">あなたのタイプ</p>
            <p className="text-5xl font-extrabold text-pink-500 tracking-widest">{result.typeCode}</p>
            <p className="text-lg font-bold text-gray-700 mt-1">「{result.typeName}」</p>
          </div>

          {/* 4軸スコアバー */}
          <div className="bg-white rounded-2xl border-2 border-pink-100 px-5 py-5 flex flex-col gap-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">診断スコア</p>
            <ScoreBar
              leftLabel="内向 (I)"
              rightLabel="外向 (E)"
              score={result.scores.character}
            />
            <ScoreBar
              leftLabel="受容 (P)"
              rightLabel="積極 (A)"
              score={result.scores.service}
            />
            <ScoreBar
              leftLabel="共感 (C)"
              rightLabel="安定 (S)"
              score={result.scores.emotion}
            />
            <ScoreBar
              leftLabel="直感 (N)"
              rightLabel="戦略 (T)"
              score={result.scores.sales}
            />
          </div>

          <p className="text-xs text-center text-gray-400 px-2">
            このプロフィールをもとに、あなたに合ったアドバイスをするね💕
          </p>

          <button
            onClick={() => router.push("/")}
            className="w-full rounded-2xl bg-pink-400 py-3.5 text-white font-bold text-sm hover:bg-pink-500 active:scale-95 transition-all shadow-md"
          >
            相談を始める ✨
          </button>
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // 質問画面
  // -----------------------------------------------------------------------

  const q = QUESTIONS[current];
  const progress = ((current) / QUESTIONS.length) * 100;

  // 軸ラベル
  const AXIS_LABELS: Record<Axis, string> = {
    character: "🎭 キャラクター",
    service: "💬 接客",
    emotion: "💖 感情",
    sales: "💰 売上",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-pink-500">🌙 よるせん</h1>
        </div>

        {/* プログレスバー */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{AXIS_LABELS[q.axis]}</span>
            <span>{current + 1} / {QUESTIONS.length}</span>
          </div>
          <div className="relative h-2 rounded-full bg-pink-100 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-pink-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 質問カード */}
        <div className="bg-white rounded-2xl border-2 border-pink-100 p-5 flex flex-col gap-5 shadow-sm">
          <p className="font-bold text-gray-800 text-base leading-relaxed">{q.text}</p>

          {/* 5段階ボタン */}
          <div className="flex gap-1.5">
            {LIKERT.map(({ label, score }) => (
              <button
                key={score}
                onClick={() => handleAnswer(score)}
                className="flex-1 flex flex-col items-center gap-1 rounded-xl border-2 border-pink-100 bg-pink-50 py-3 px-1 text-center hover:border-pink-400 hover:bg-pink-100 active:scale-95 transition-all"
              >
                <span
                  className="text-lg"
                  aria-hidden="true"
                >
                  {score === -2 ? "😞" : score === -1 ? "🙁" : score === 0 ? "😐" : score === 1 ? "🙂" : "😄"}
                </span>
                <span className="text-[10px] leading-tight text-gray-500 whitespace-pre-line">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 軸セグメント（小さいドット表示） */}
        <div className="flex gap-1">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < current
                  ? "bg-pink-400"
                  : i === current
                  ? "bg-pink-300"
                  : "bg-pink-100"
              }`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
