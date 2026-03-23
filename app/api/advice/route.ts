import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompts";
import { searchKnowledge, buildKnowledgePrompt } from "@/lib/knowledge";
import type { CastProfile, Customer } from "@/lib/types";

const client = new Anthropic();

export async function POST(req: Request) {
  const body = await req.json();
  const { message, castProfile, customer } = body as {
    message: unknown;
    castProfile?: CastProfile | null;
    customer?: Customer | null;
  };

  if (!message || typeof message !== "string" || message.trim() === "") {
    return new Response("メッセージを入力してください", { status: 400 });
  }

  let systemPrompt = buildSystemPrompt(castProfile, customer);

  // ナレッジベースから関連情報を検索してシステムプロンプトに注入
  try {
    const knowledgeResults = searchKnowledge(message);
    const knowledgePrompt = buildKnowledgePrompt(knowledgeResults);
    if (knowledgePrompt) {
      systemPrompt += knowledgePrompt;
    }
  } catch {
    // ナレッジ検索失敗時はそのまま続行
  }

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: message }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
