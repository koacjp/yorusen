"use client";

import { useState, useEffect } from "react";
import { getCustomers } from "@/lib/storage";
import type { Customer, CustomerType } from "@/lib/types";

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  takyaku: "太客（ドーパミン系）",
  itakyaku: "痛客（依存・執着系）",
  shy: "シャイ系（無口・内向的）",
  jiman: "自慢系（話したがり）",
  tester: "テスター系（試してくる）",
  shinki: "初来店（新規）",
};

interface Props {
  onSelect: (customer: Customer | null, typeOnly?: CustomerType | null) => void;
}

export default function CustomerSelect({ onSelect }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mode, setMode] = useState<"none" | "saved" | "type">("none");
  const [selectedId, setSelectedId] = useState("");
  const [selectedType, setSelectedType] = useState<CustomerType>("shinki");

  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  const handleModeChange = (newMode: "none" | "saved" | "type") => {
    setMode(newMode);
    if (newMode === "none") {
      onSelect(null, null);
    }
  };

  const handleSavedSelect = (id: string) => {
    setSelectedId(id);
    const c = customers.find((x) => x.id === id) ?? null;
    onSelect(c, null);
  };

  const handleTypeSelect = (type: CustomerType) => {
    setSelectedType(type);
    // Create a minimal customer object with only type info
    const typeCustomer: Customer = {
      id: "__type_only__",
      nickname: "（タイプ指定）",
      type,
      createdAt: new Date().toISOString(),
    };
    onSelect(typeCustomer, type);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-xs text-gray-500 font-medium">このお客さんについて相談する？</p>

      <div className="flex gap-2">
        <button
          onClick={() => handleModeChange("none")}
          className={`flex-1 rounded-xl border-2 py-2 text-xs font-medium transition-colors ${
            mode === "none"
              ? "border-pink-400 bg-pink-50 text-pink-600"
              : "border-pink-100 bg-white text-gray-500 hover:border-pink-200"
          }`}
        >
          指定なし
        </button>
        <button
          onClick={() => handleModeChange("saved")}
          className={`flex-1 rounded-xl border-2 py-2 text-xs font-medium transition-colors ${
            mode === "saved"
              ? "border-pink-400 bg-pink-50 text-pink-600"
              : "border-pink-100 bg-white text-gray-500 hover:border-pink-200"
          }`}
        >
          名刺帳から選ぶ
        </button>
        <button
          onClick={() => handleModeChange("type")}
          className={`flex-1 rounded-xl border-2 py-2 text-xs font-medium transition-colors ${
            mode === "type"
              ? "border-pink-400 bg-pink-50 text-pink-600"
              : "border-pink-100 bg-white text-gray-500 hover:border-pink-200"
          }`}
        >
          タイプだけ
        </button>
      </div>

      {mode === "saved" && (
        <div>
          {customers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              名刺帳にお客さんがいないよ。先に登録してね。
            </p>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => handleSavedSelect(e.target.value)}
              className="w-full rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none bg-white"
            >
              <option value="">選んでください</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname}（{CUSTOMER_TYPE_LABELS[c.type]}）
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === "type" && (
        <select
          value={selectedType}
          onChange={(e) => handleTypeSelect(e.target.value as CustomerType)}
          className="w-full rounded-xl border-2 border-pink-100 px-3 py-2 text-sm focus:border-pink-300 focus:outline-none bg-white"
        >
          {(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(
            ([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            )
          )}
        </select>
      )}
    </div>
  );
}
