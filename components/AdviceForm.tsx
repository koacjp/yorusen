"use client";

import { useState, useRef } from "react";

interface Props {
  onSubmit: (message: string) => void;
  loading: boolean;
}

export default function AdviceForm({ onSubmit, loading }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const examples = [
    "お客さんが急に無口になった",
    "しつこくLINEしてくる痛客の返し方",
    "本指名を増やしたい",
    "同伴を断りたいけど角が立たない方法",
  ];

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="今日の悩みを話してみて💕&#10;（Enterで送信、Shift+Enterで改行）"
          rows={3}
          className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-pink-400 focus:outline-none resize-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full rounded-2xl bg-pink-400 py-3 text-white font-bold text-sm transition-all hover:bg-pink-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "考え中…" : "よるせんに相談する ✨"}
        </button>
      </form>

      <div className="mt-4">
        <p className="text-xs text-gray-400 mb-2">よくある相談 →</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              disabled={loading}
              className="rounded-full bg-pink-50 border border-pink-200 px-3 py-1 text-xs text-pink-600 hover:bg-pink-100 transition-colors disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
