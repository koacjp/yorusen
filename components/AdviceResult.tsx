"use client";

interface Props {
  question: string;
  answer: string;
  loading: boolean;
}

export default function AdviceResult({ question, answer, loading }: Props) {
  if (!question && !loading) return null;

  return (
    <div className="w-full rounded-2xl bg-white border-2 border-pink-100 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span className="text-lg">🙋‍♀️</span>
        <div className="bg-pink-50 rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-700">
          {question}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <span className="text-lg">🌙</span>
        <div className="bg-white rounded-xl rounded-tl-none border border-pink-100 px-3 py-2 text-sm text-gray-800 leading-relaxed min-h-[48px]">
          {loading && !answer ? (
            <span className="inline-flex gap-1 items-center text-gray-400">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce [animation-delay:0.1s]">●</span>
              <span className="animate-bounce [animation-delay:0.2s]">●</span>
            </span>
          ) : (
            <span className="whitespace-pre-wrap">{answer}</span>
          )}
        </div>
      </div>
    </div>
  );
}
