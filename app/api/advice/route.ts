import { buildSystemPrompt } from "@/lib/prompts";
import { searchKnowledge, buildKnowledgePrompt } from "@/lib/knowledge";
import type { CastProfile, Customer } from "@/lib/types";

// Groq Llama 3.3 70B 全員統一（¥0.026/回）
// Anthropic APIは不使用

function streamResponse(body: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const readable = new ReadableStream({
    async start(controller) {
      let buf = "";
      let remainder = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = remainder + decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          remainder = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const text: string = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
              if (text) {
                buf += text;
                const safe = buf.length > 2 ? buf.slice(0, -2) : "";
                if (safe) { controller.enqueue(encoder.encode(safe.replace(/\*\*/g, ""))); buf = buf.slice(-2); }
              }
            } catch { /* SSEパースエラーは無視 */ }
          }
        }
        if (buf) controller.enqueue(encoder.encode(buf.replace(/\*\*/g, "")));
      } finally { controller.close(); }
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { message, castProfile, customer } = body as {
    message: unknown;
    castProfile?: CastProfile | null;
    customer?: Customer | null;
    isPremium?: boolean;
  };

  if (!message || typeof message !== "string" || message.trim() === "") {
    return new Response("メッセージを入力してください", { status: 400 });
  }

  let systemPrompt = buildSystemPrompt(castProfile, customer);

  try {
    const knowledgeResults = searchKnowledge(message);
    const knowledgePrompt = buildKnowledgePrompt(knowledgeResults);
    if (knowledgePrompt) systemPrompt += knowledgePrompt;
  } catch { /* ナレッジ検索失敗時はそのまま続行 */ }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 1024,
      stream: true,
    }),
  });

  // 429 レート制限: 2秒待ってリトライ1回
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }], max_tokens: 1024, stream: true }),
    });
    if (retry.ok && retry.body) return streamResponse(retry.body);
    return new Response("少し混んでるみたい。もう一度試してみて！", { status: 503 });
  }

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "no body");
    console.error(`[advice] Groq error ${res.status}: ${errText}`);
    return new Response("エラーが発生しました。もう一度試してみて！", { status: 500 });
  }

  return streamResponse(res.body);
}
