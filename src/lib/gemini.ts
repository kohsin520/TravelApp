import { GoogleGenerativeAI } from '@google/generative-ai';
import { PackingCategory } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface AiRecommendation {
  category: PackingCategory;
  items: string[];
}

export async function getAiPackingRecommendations(
  destination: string,
  days: number,
  season: string,
  tripType: string
): Promise<AiRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `你是一個旅行行李打包專家。請根據以下旅行資訊推薦行李清單：
- 目的地：${destination}
- 天數：${days} 天
- 季節：${season}
- 旅行類型：${tripType}

請回傳 JSON 格式，分為以下類別：衣物、3C、盥洗、證件、藥品、其他。
每個類別列出建議攜帶的物品名稱（繁體中文）。
不要重複基本款，專注在該目的地/季節/類型特別需要的物品。

回傳格式：
[
  { "category": "衣物", "items": ["item1", "item2"] },
  { "category": "3C", "items": ["item1", "item2"] },
  ...
]

只回傳 JSON，不要有其他文字。`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
  return JSON.parse(jsonMatch[0]) as AiRecommendation[];
}
