/**
 * Gemini API client — mirrors ../llm library design for TypeScript/Next.js
 *
 * Features:
 *  - Multi-key round-robin rotation (GEMINI_API_KEY, GEMINI_API_KEY_1 … GEMINI_API_KEY_19)
 *  - GEMINI_SKIP_KEYS: comma-separated env var names to pre-skip exhausted keys
 *  - GEMINI_MODEL: override default model (default: gemini-2.5-flash-lite)
 *  - Prompt length validation (8,000 chars max)
 *  - Optional Amplitude analytics (set AMPLITUDE_API_KEY to enable)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PackingCategory, TicketType } from './types';

// ─── Config ──────────────────────────────────────────────────────────────────

const MAX_PROMPT_LENGTH = 8000;
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';

// ─── Key rotation ─────────────────────────────────────────────────────────────

function collectApiKeys(): string[] {
  const keys: string[] = [];

  const primary = process.env.GEMINI_API_KEY;
  if (primary) keys.push(primary);

  for (let i = 1; i <= 19; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k) keys.push(k);
  }

  // Remove keys listed in GEMINI_SKIP_KEYS (comma-separated env var names)
  const skipNames = (process.env.GEMINI_SKIP_KEYS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const skipValues = new Set(
    skipNames.map(name => process.env[name]).filter(Boolean)
  );

  return keys.filter(k => !skipValues.has(k));
}

let _keyIndex = 0;

function nextApiKey(): string {
  const keys = collectApiKeys();
  if (keys.length === 0) throw new Error('No Gemini API keys configured (GEMINI_API_KEY missing)');
  const key = keys[_keyIndex % keys.length];
  _keyIndex = (_keyIndex + 1) % keys.length;
  return key;
}

// ─── Amplitude (optional) ─────────────────────────────────────────────────────

type AmplitudeEvent = {
  provider: string;
  model: string;
  input_preview: string;
  output_preview: string;
  duration_ms: number;
  success: boolean;
  error_type?: string;
  app_name: string;
};

async function trackLlmCall(event: AmplitudeEvent): Promise<void> {
  const apiKey = process.env.AMPLITUDE_API_KEY;
  if (!apiKey) return; // silent no-op when key absent

  try {
    // HTTP API — no extra package needed
    await fetch('https://api2.amplitude.com/2/httpapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        events: [{
          user_id: process.env.LLM_APP_NAME ?? 'TravelAPP',
          event_type: 'llm_call',
          event_properties: event,
        }],
      }),
    });
  } catch {
    // silent degradation
  }
}

// ─── Core generation helpers ──────────────────────────────────────────────────

async function generateText(prompt: string, model = DEFAULT_MODEL): Promise<string> {
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt too long: ${prompt.length} chars (max ${MAX_PROMPT_LENGTH})`);
  }

  const apiKey = nextApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });

  const t0 = Date.now();
  try {
    const result = await m.generateContent(prompt);
    const text = result.response.text();

    await trackLlmCall({
      provider: 'gemini',
      model,
      input_preview: prompt.slice(0, 100),
      output_preview: text.split(/\s+/).slice(0, 100).join(' '),
      duration_ms: Date.now() - t0,
      success: true,
      app_name: process.env.LLM_APP_NAME ?? 'TravelAPP',
    });

    return text;
  } catch (err) {
    await trackLlmCall({
      provider: 'gemini',
      model,
      input_preview: prompt.slice(0, 100),
      output_preview: '',
      duration_ms: Date.now() - t0,
      success: false,
      error_type: err instanceof Error ? err.message.split(':')[0] : 'unknown',
      app_name: process.env.LLM_APP_NAME ?? 'TravelAPP',
    });
    throw err;
  }
}

async function generateTextWithImage(
  prompt: string,
  base64: string,
  mimeType: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const apiKey = nextApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });

  const t0 = Date.now();
  try {
    const result = await m.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64 } },
    ]);
    const text = result.response.text();

    await trackLlmCall({
      provider: 'gemini',
      model,
      input_preview: prompt.slice(0, 100),
      output_preview: text.split(/\s+/).slice(0, 100).join(' '),
      duration_ms: Date.now() - t0,
      success: true,
      app_name: process.env.LLM_APP_NAME ?? 'TravelAPP',
    });

    return text;
  } catch (err) {
    await trackLlmCall({
      provider: 'gemini',
      model,
      input_preview: prompt.slice(0, 100),
      output_preview: '',
      duration_ms: Date.now() - t0,
      success: false,
      error_type: err instanceof Error ? err.message.split(':')[0] : 'unknown',
      app_name: process.env.LLM_APP_NAME ?? 'TravelAPP',
    });
    throw err;
  }
}

// ─── Domain functions ─────────────────────────────────────────────────────────

interface RecognizedTicket {
  ticket_type?: TicketType;
  title?: string;
  datetime?: string;
  seat?: string;
  confirmation?: string;
  note?: string;
}

export async function recognizeTicketFromImage(base64: string, mimeType: string): Promise<RecognizedTicket> {
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

  const text = await generateTextWithImage(prompt, base64, mimeType);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('無法解析 AI 回應');
  return JSON.parse(jsonMatch[0]) as RecognizedTicket;
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

export async function recognizeHotelFromImage(base64: string, mimeType: string): Promise<RecognizedHotel> {
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

  const text = await generateTextWithImage(prompt, base64, mimeType);
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
  const prompt = `你是台灣旅客的旅遊出發前準備專家。請根據以下旅行資訊，以台灣護照持有人的角度，生成出發前需要完成的準備事項清單：
- 目的地：${destination}
- 天數：${days} 天
- 季節：${season}
- 旅行類型：${tripType}

請務必涵蓋以下面向（若適用）：
1. 【入境文件】：台灣護照前往該目的地是否需要簽證？需要哪種簽證（落地簽/電子簽/事先申辦）？還是免簽但需要 eTA/電子旅行授權？需要回程機票或財力證明嗎？
2. 【健康/衛生】：是否需要打疫苗？是否需要黃熱病證明？當地有哪些常見疾病需預防？
3. 【金融】：當地使用什麼貨幣？是否需要事先換匯？信用卡普及度如何？
4. 【通訊】：當地網路/SIM卡建議，台灣手機是否需要特別設定？
5. 【保險】：旅遊保險、醫療保險建議
6. 【交通/住宿】：提前預訂建議、交通票券
7. 【目的地特殊規定】：該地特有的法規、禁忌、注意事項（如新加坡禁止帶口香糖、中東著裝規定等）
8. 【季節相關】：該季節的天氣/活動特殊準備

請列出 10~15 個具體可執行的行動項目（繁體中文），每項用動詞開頭（如「確認」、「申請」、「購買」、「下載」）。

回傳格式：
["準備事項1", "準備事項2", ...]

只回傳 JSON 陣列，不要有其他文字。`;

  const text = await generateText(prompt);
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

  const text = await generateText(prompt);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
  return JSON.parse(jsonMatch[0]) as AiRecommendation[];
}
