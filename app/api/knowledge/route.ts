import { loadAllKnowledge, addCustomKnowledge } from '@/lib/knowledge';
import type { KnowledgeEntry } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const knowledge = loadAllKnowledge();
    return Response.json(knowledge);
  } catch (error) {
    console.error('Failed to load knowledge:', error);
    return Response.json({ error: 'ナレッジの読み込みに失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      category?: string;
      title?: string;
      description?: string;
      content?: string[];
      tags?: string[];
    };

    const { category, title, description, content, tags } = body;

    if (!category || !title) {
      return Response.json(
        { error: 'カテゴリとタイトルは必須です' },
        { status: 400 }
      );
    }

    if (!['customer_types', 'situations', 'mental'].includes(category)) {
      return Response.json(
        { error: '無効なカテゴリです' },
        { status: 400 }
      );
    }

    const entry: KnowledgeEntry = {
      id: `custom_${Date.now()}`,
      category: category as KnowledgeEntry['category'],
      title,
      description: description ?? '',
      content: content ?? [],
      tags: tags ?? [],
      createdAt: new Date().toISOString(),
    };

    addCustomKnowledge(entry);

    return Response.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    console.error('Failed to add knowledge:', error);
    return Response.json({ error: 'ナレッジの保存に失敗しました' }, { status: 500 });
  }
}
