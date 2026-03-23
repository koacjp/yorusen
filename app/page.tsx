"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdviceForm from "@/components/AdviceForm";
import AdviceResult from "@/components/AdviceResult";
import CustomerSelect from "@/components/CustomerSelect";
import { WELCOME_MESSAGES } from "@/lib/prompts";
import { getCastProfile } from "@/lib/storage";
import type { CastProfile, Customer } from "@/lib/types";

const welcome = WELCOME_MESSAGES[0];

export default function Home() {
  const router = useRouter();
  const [castProfile, setCastProfile] = useState<CastProfile | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const profile = getCastProfile();
    if (!profile) {
      router.replace("/onboarding");
    } else {
      setCastProfile(profile);
      setInitialized(true);
    }
  }, [router]);

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
  };

  const handleSubmit = async (message: string) => {
    setQuestion(message);
    setAnswer("");
    setLoading(true);

    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          castProfile,
          customer: selectedCustomer,
        }),
      });

      if (!res.ok || !res.body) throw new Error("APIエラー");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value));
      }
    } catch {
      setAnswer("ごめん、うまく答えられなかった💦 もう一回試してみて！");
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-pink-300 text-sm">読み込み中…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center px-4 py-8 pb-24">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-pink-500">🌙 よるせん</h1>
          <p className="text-xs text-gray-400 mt-1">夜職女子のAI先輩</p>
        </div>

        <div className="flex items-start gap-2">
          <span className="text-2xl">🌙</span>
          <div className="bg-white rounded-xl rounded-tl-none border border-pink-100 px-3 py-2 text-sm text-gray-700 shadow-sm">
            {welcome}
          </div>
        </div>

        <CustomerSelect onSelect={handleCustomerSelect} />

        <AdviceResult question={question} answer={answer} loading={loading} />

        <AdviceForm onSubmit={handleSubmit} loading={loading} />

        <p className="text-center text-xs text-gray-300">
          AIのアドバイスです。最終判断はあなた自身で💕
        </p>
      </div>
    </main>
  );
}
