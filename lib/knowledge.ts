import fs from 'fs';
import path from 'path';

export interface CustomerTypeEntry {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  dos: string[];
  donts: string[];
  scripts: string[];
}

export interface SituationEntry {
  id: string;
  title: string;
  description: string;
  steps: string[];
  tips: string[];
  scripts: string[];
}

export interface MentalEntry {
  id: string;
  title: string;
  description: string;
  steps: string[];
  tips: string[];
  scripts: string[];
}

export interface KnowledgeEntry {
  id: string;
  category: 'customer_types' | 'situations' | 'mental';
  title: string;
  description: string;
  content: string[];
  tags: string[];
  createdAt?: string;
}

export interface PhilosophyEntry {
  id: string;
  title: string;
  description: string;
  core?: string;
  principles?: string[];
  framework?: string;
  signs_of_not_picking_up?: string[];
  mental_note?: string;
  tips?: string[];
  factors?: string[];
  key_insight?: string;
  self_evaluation?: string;
  how_to?: string[];
  core_rule?: string;
  risk_mechanism?: string[];
  exception?: string;
  money_advice?: string;
}

export interface AllKnowledge {
  customer_types: CustomerTypeEntry[];
  situations: SituationEntry[];
  mental: MentalEntry[];
  custom: KnowledgeEntry[];
  philosophy: PhilosophyEntry[];
}

const DATA_DIR = path.join(process.cwd(), 'data', 'knowledge');

function readJsonFile<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filename: string, data: unknown): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function loadAllKnowledge(): AllKnowledge {
  const customerTypesData = readJsonFile<{ customer_types: CustomerTypeEntry[] }>(
    'customer_types.json',
    { customer_types: [] }
  );
  const situationsData = readJsonFile<{ situations: SituationEntry[] }>(
    'situations.json',
    { situations: [] }
  );
  const mentalData = readJsonFile<{ mental: MentalEntry[] }>(
    'mental.json',
    { mental: [] }
  );
  const customData = readJsonFile<{ custom: KnowledgeEntry[] }>(
    'custom.json',
    { custom: [] }
  );
  const philosophyData = readJsonFile<{ philosophy: PhilosophyEntry[] }>(
    'philosophy.json',
    { philosophy: [] }
  );

  return {
    customer_types: customerTypesData.customer_types ?? [],
    situations: situationsData.situations ?? [],
    mental: mentalData.mental ?? [],
    custom: customData.custom ?? [],
    philosophy: philosophyData.philosophy ?? [],
  };
}

export function addCustomKnowledge(entry: KnowledgeEntry): void {
  const customData = readJsonFile<{ custom: KnowledgeEntry[] }>(
    'custom.json',
    { custom: [] }
  );
  customData.custom.push(entry);
  writeJsonFile('custom.json', customData);
}

function entryToText(entry: CustomerTypeEntry | SituationEntry | MentalEntry | KnowledgeEntry): string {
  if ('dos' in entry) {
    const e = entry as CustomerTypeEntry;
    return [e.name, e.description, ...e.dos, ...e.donts, ...e.scripts, ...e.characteristics].join(' ');
  }
  if ('content' in entry) {
    const e = entry as KnowledgeEntry;
    return [e.title, e.description, ...e.content, ...e.tags].join(' ');
  }
  const e = entry as SituationEntry | MentalEntry;
  return [e.title, e.description, ...e.steps, ...e.tips, ...e.scripts].join(' ');
}

function scoreEntry(
  text: string,
  keywords: string[]
): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, kw) => {
    return score + (lower.includes(kw.toLowerCase()) ? 1 : 0);
  }, 0);
}

export interface KnowledgeResult {
  category: string;
  id: string;
  title: string;
  description: string;
  relevantContent: string[];
}

export function searchKnowledge(query: string): KnowledgeResult[] {
  const knowledge = loadAllKnowledge();

  // クエリを単語・キーワードに分割（日本語対応）
  const keywords = query
    .replace(/[、。！？\n]/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length >= 2);

  if (keywords.length === 0) return [];

  const results: Array<{ result: KnowledgeResult; score: number }> = [];

  for (const entry of knowledge.customer_types) {
    const text = entryToText(entry);
    const score = scoreEntry(text, keywords);
    if (score > 0) {
      results.push({
        score,
        result: {
          category: 'customer_types',
          id: entry.id,
          title: entry.name,
          description: entry.description,
          relevantContent: [
            ...entry.dos.slice(0, 3),
            ...entry.donts.slice(0, 2),
            ...entry.scripts,
          ],
        },
      });
    }
  }

  for (const entry of knowledge.situations) {
    const text = entryToText(entry);
    const score = scoreEntry(text, keywords);
    if (score > 0) {
      results.push({
        score,
        result: {
          category: 'situations',
          id: entry.id,
          title: entry.title,
          description: entry.description,
          relevantContent: [
            ...entry.steps.slice(0, 3),
            ...entry.tips.slice(0, 2),
            ...entry.scripts,
          ],
        },
      });
    }
  }

  for (const entry of knowledge.mental) {
    const text = entryToText(entry);
    const score = scoreEntry(text, keywords);
    if (score > 0) {
      results.push({
        score,
        result: {
          category: 'mental',
          id: entry.id,
          title: entry.title,
          description: entry.description,
          relevantContent: [
            ...entry.steps.slice(0, 3),
            ...entry.tips.slice(0, 2),
            ...entry.scripts,
          ],
        },
      });
    }
  }

  for (const entry of knowledge.philosophy) {
    const text = [
      entry.title, entry.description, entry.core, entry.core_rule,
      ...(entry.principles ?? []), ...(entry.tips ?? []),
      ...(entry.factors ?? []), ...(entry.how_to ?? []),
      ...(entry.signs_of_not_picking_up ?? []),
      entry.mental_note, entry.key_insight,
    ].filter(Boolean).join(' ');
    const score = scoreEntry(text, keywords);
    if (score > 0) {
      const content = [
        entry.core ?? entry.core_rule,
        ...(entry.principles ?? entry.tips ?? entry.how_to ?? []).slice(0, 3),
        entry.mental_note ?? entry.key_insight,
      ].filter((x): x is string => Boolean(x));
      results.push({
        score,
        result: {
          category: 'philosophy',
          id: entry.id,
          title: entry.title,
          description: entry.description,
          relevantContent: content,
        },
      });
    }
  }

  for (const entry of knowledge.custom) {
    const text = entryToText(entry);
    const score = scoreEntry(text, keywords);
    if (score > 0) {
      results.push({
        score,
        result: {
          category: entry.category,
          id: entry.id,
          title: entry.title,
          description: entry.description,
          relevantContent: entry.content,
        },
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.result);
}

export function buildKnowledgePrompt(results: KnowledgeResult[]): string {
  if (results.length === 0) return '';

  const sections = results.map((r) => {
    const content = r.relevantContent
      .filter(Boolean)
      .map((line) => `  - ${line}`)
      .join('\n');
    return `【${r.title}】\n${r.description}\n${content}`;
  });

  return `\n\n【ナレッジベースからの関連情報】\n以下の情報を参考にアドバイスしてください:\n\n${sections.join('\n\n')}`;
}
