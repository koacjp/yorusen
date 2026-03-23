"use client";

import { useState, useEffect } from "react";
import { getCustomers, saveCustomer, deleteCustomer } from "@/lib/storage";
import type { Customer, CustomerType } from "@/lib/types";

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  takyaku: "太客（ドーパミン系）",
  itakyaku: "痛客（依存・執着系）",
  shy: "シャイ系（無口・内向的）",
  jiman: "自慢系（話したがり）",
  tester: "テスター系（試してくる）",
  shinki: "初来店（新規）",
};

const CUSTOMER_TYPE_BADGE: Record<CustomerType, string> = {
  takyaku: "bg-yellow-100 text-yellow-700",
  itakyaku: "bg-red-100 text-red-700",
  shy: "bg-blue-100 text-blue-700",
  jiman: "bg-purple-100 text-purple-700",
  tester: "bg-orange-100 text-orange-700",
  shinki: "bg-green-100 text-green-700",
};

const emptyForm = {
  nickname: "",
  type: "shinki" as CustomerType,
  age: "",
  job: "",
  hobbies: "",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  const handleAdd = () => {
    if (!form.nickname.trim()) return;
    const customer: Customer = {
      id: crypto.randomUUID(),
      nickname: form.nickname.trim(),
      type: form.type,
      age: form.age.trim() || undefined,
      job: form.job.trim() || undefined,
      hobbies: form.hobbies.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    saveCustomer(customer);
    setCustomers(getCustomers());
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    setCustomers(getCustomers());
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center px-4 py-8 pb-24">
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-pink-500">👥 お客さん名刺帳</h1>
          <p className="text-xs text-gray-400 mt-1">お客さんの情報を保存しよう</p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full rounded-2xl bg-pink-400 py-3 text-white font-bold text-sm hover:bg-pink-500 active:scale-95 transition-all"
        >
          {showForm ? "キャンセル" : "＋ お客さんを追加"}
        </button>

        {showForm && (
          <div className="bg-white rounded-2xl border-2 border-pink-100 p-4 flex flex-col gap-3">
            <p className="font-bold text-gray-700 text-sm">新規追加</p>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ニックネーム *</span>
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="例: 田中さん"
                className="rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">タイプ</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CustomerType })}
                className="rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none bg-white"
              >
                {(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(
                  ([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">年齢</span>
              <input
                type="text"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="例: 40代"
                className="rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">仕事</span>
              <input
                type="text"
                value={form.job}
                onChange={(e) => setForm({ ...form, job: e.target.value })}
                placeholder="例: 経営者"
                className="rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">趣味</span>
              <input
                type="text"
                value={form.hobbies}
                onChange={(e) => setForm({ ...form, hobbies: e.target.value })}
                placeholder="例: ゴルフ、釣り"
                className="rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">メモ</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="自由メモ"
                rows={2}
                className="rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none resize-none"
              />
            </label>

            <button
              onClick={handleAdd}
              disabled={!form.nickname.trim()}
              className="w-full rounded-xl bg-pink-400 py-2.5 text-white font-bold text-sm hover:bg-pink-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              保存する
            </button>
          </div>
        )}

        {customers.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            まだお客さんが登録されていないよ
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border-2 border-pink-100 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{c.nickname}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${CUSTOMER_TYPE_BADGE[c.type]}`}
                    >
                      {CUSTOMER_TYPE_LABELS[c.type]}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    削除
                  </button>
                </div>
                {(c.age || c.job || c.hobbies) && (
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {c.age && <span>📅 {c.age}</span>}
                    {c.job && <span>💼 {c.job}</span>}
                    {c.hobbies && <span>🎯 {c.hobbies}</span>}
                  </div>
                )}
                {c.notes && (
                  <p className="text-xs text-gray-500 bg-pink-50 rounded-lg px-3 py-1.5">
                    {c.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
