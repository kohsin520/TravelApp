import { GoogleGenerativeAI } from '@google/generative-ai';
import { PackingCategory, TicketType } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface RecognizedTicket {
  ticket_type?: TicketType;
  title?: string;
  datetime?: string;
  seat?: string;
  confirmation?: string;
  note?: string;
}

interface RecognizedHotel {
  hotel_name?: string;
  address?: string;
  check_in?: string;
  check_out?: string;
  confirmation?: string;
  map_url?: string;
  booking_url?: string;
  note?: string;
}

export async function recognizeTicketFromImage(base64: string, mimeType: string): Promise<RecognizedTicket> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `你是票券辨識專家。請分析這張圖片（可能是車票、機票、船票、QR Code、電子票券截圖等），擷取以下資訊並回傳 JSON：

{
  "ticket_type": "flight" | "train" | "bus" | "other",
  "title": "票券標題，例如：台北→東京、高鐵 台北→左營",
  "datetime": "出發日期時間，格式 YYYY-MM-DDTHH:mm（24小時制）",
  "seat": "座位號碼",
  "confirmation": "訂位代號/確認碼",
  "note": "其他重要資訊（如航班號、車次、閘門等）"
}

規則：
- 只回傳 JSON，不要有其他文字
- 無法辨識的欄位請留空字串 ""
- ticket_type 只能是 flight / train / bus / other
- datetime 格式必須是 YYYY-MM-DDTHH:mm`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64 } },
  ]);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('無法解析 AI 回應');
  return JSON.parse(jsonMatch[0]) as RecognizedTicket;
}

export async function recognizeHotelFromImage(base64: string, mimeType: string): Promise<RecognizedHotel> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `你是住宿訂房辨識專家。請分析這張圖片（可能是訂房確認信、飯店預訂截圖、住宿憑證等），擷取以下資訊並回傳 JSON：

{
  "hotel_name": "飯店/旅館名稱",
  "address": "地址",
  "check_in": "入住日期，格式 YYYY-MM-DD",
  "check_out": "退房日期，格式 YYYY-MM-DD",
  "confirmation": "訂房代號/確認碼",
  "note": "其他重要資訊（如房型、人數等）"
}

規則：
- 只回傳 JSON，不要有其他文字
- 無法辨識的欄位請留空字串 ""
- 日期格式必須是 YYYY-MM-DD`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64 } },
  ]);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('無法解析 AI 回應');
  return JSON.parse(jsonMatch[0]) as RecognizedHotel;
}

export async function getAiChecklistRecommendations(
  destination: string,
  days: number,
  season: string,
  tripType: string
): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `你是旅遊出發前準備專家。請根據以下旅行資訊，生成出發前需要完成的準備事項清單：
- 目的地：${destination}
- 天數：${days} 天
- 季節：${season}
- 旅行類型：${tripType}

請回傳 JSON 格式的字串陣列，列出 8~15 個出發前需要完成的具體行動項目（繁體中文），例如辦簽證、換外幣、買保險、預訂餐廳等。
根據目的地和旅行類型給出特別相關的建議，不要只列通用項目。

回傳格式：
["準備事項1", "準備事項2", ...]

只回傳 JSON 陣列，不要有其他文字。`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('無法解析 AI 回應');
  return JSON.parse(jsonMatch[0]) as string[];
}

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
