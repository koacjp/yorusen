"use client";

import { useState } from "react";

type Category = "customer_types" | "situations" | "mental";

const CATEGORY_LABELS: Record<Category, string> = {
  customer_types: "お客さんタイプ別対応",
  situations: "シチュエーション別対応",
  mental: "メンタル管理・生存戦略",
};

interface SaveResult {
  success: boolean;
  message: string;
}

export default function KnowledgeAdminPage() {
  const [category, setCategory] = useState<Category>("situations");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentText, setContentText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setResult({ success: false, message: "タイトルを入力してください" });
      return;
    }

    setSaving(true);
    setResult(null);

    const content = contentText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const tags = tagsText
      .split(/[,、\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          content,
          tags,
        }),
      });

      if (res.ok) {
        setResult({ success: true, message: "ナレッジを保存しました！" });
        setTitle("");
        setDescription("");
        setContentText("");
        setTagsText("");
      } else {
        const data = (await res.json()) as { error?: string };
        setResult({
          success: false,
          message: data.error ?? "保存に失敗しました",
        });
      }
    } catch {
      setResult({ success: false, message: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-purple-300 mb-1">
            ナレッジベース管理
          </h1>
          <p className="text-gray-400 text-sm">
            新しい接客ノウハウをナレッジベースに追加します
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* カテゴリ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              カテゴリ
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(
                ([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      category === key
                        ? "border-purple-500 bg-purple-900/30"
                        : "border-gray-700 bg-gray-900 hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={key}
                      checked={category === key}
                      onChange={() => setCategory(key)}
                      className="text-purple-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                )
              )}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              タイトル <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: お客さんの愚痴に付き合うコツ"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          {/* 概要 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              概要・説明
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 愚痴が多いお客さんへの対応と距離感の保ち方"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              内容（1行1項目）
            </label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder={`例:\n共感しながらも自分の意見を押し付けない\n「それは大変でしたね」で受け流す\n「○○さんなりに頑張ってるんですよね」と肯定する`}
              rows={8}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none"
            />
            <p className="text-gray-500 text-xs mt-1">
              改行で区切ると複数の項目として保存されます
            </p>
          </div>

          {/* タグ */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              タグ（カンマ・スペース区切り）
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="例: 愚痴 共感 距離感 メンタル"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          {/* 結果メッセージ */}
          {result && (
            <div
              className={`p-4 rounded-lg text-sm ${
                result.success
                  ? "bg-green-900/40 border border-green-700 text-green-300"
                  : "bg-red-900/40 border border-red-700 text-red-300"
              }`}
            >
              {result.message}
            </div>
          )}

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-purple-400 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {saving ? "保存中..." : "ナレッジを保存する"}
          </button>
        </form>

        {/* 説明 */}
        <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-sm font-medium text-gray-300 mb-2">
            このページについて
          </h2>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>追加したナレッジはAIの回答に自動的に活用されます</li>
            <li>ユーザーの質問に関連するナレッジが自動で選ばれます</li>
            <li>タグを設定すると検索精度が上がります</li>
            <li>内容は1行1項目で箇条書き形式が最適です</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
