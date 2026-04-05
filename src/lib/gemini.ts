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
1. 【入境文件】：根據你確實知道的資訊，台灣護照前往該目的地是否需要簽證或電子入境申請？請依事實回答，不可猜測或假設免簽。以下是已知的正確資訊，請直接使用對應網址：
   - 香港：需申請「預辦入境登記」→ https://www.immd.gov.hk/hkt/services/visas/pre-arrival_registration_for_taiwan_residents.html
   - 日本：免簽，但建議填寫 Visit Japan Web → https://vjw-lp.digital.go.jp/
   - 澳洲：需申請 eTA → https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601
   - 紐西蘭：需申請 NZeTA → https://www.immigration.govt.nz/new-zealand-visas/visa-type/nzeta
   - 美國：需申請 ESTA → https://esta.cbp.dhs.gov/
   - 加拿大：需申請 eTA → https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html
   - 英國：需申請 ETA → https://www.gov.uk/apply-for-an-eta
   - 新加坡：入境前需填 SG Arrival Card → https://eservices.ica.gov.sg/sgarrivalcard/
   - 馬來西亞：需填 e-Arrival → https://imigresen-online.imi.gov.my/mdac/main
   - 中國大陸：需台胞證，不可用台灣護照入境
   - 印度：需事先申辦電子簽（e-Visa）→ https://indianvisaonline.gov.in/evisa/
   - 其他地區請依實際規定判斷，不確定時提醒使用者出發前確認

   若該目的地有對應網址，請在清單項目中附上，格式：「申請 XXX → https://...」
2. 【健康/衛生】：是否需要打疫苗或準備醫療文件？
3. 【金融】：請根據目的地的實際消費習慣給出具體建議，說明刷卡方不方便、現金用量大不大，格式範例：「換港幣備用（香港刷卡普及，現金備 2 成即可）」、「換日幣（小店多不收卡，建議帶 5 成現金）」、「泰銖為主（攤販市場現金為主，建議帶 6 成現金）」。要讓使用者清楚知道到底要不要大量換錢。
4. 【通訊/網路】：根據目的地給出一個明確建議——eSIM 還是國際漫遊哪個更划算、更方便？說明理由（例如「日本建議買 eSIM，比漫遊便宜很多」或「短程港澳開漫遊即可」）。若目的地在中國大陸，必須提醒需提前在台灣購買並設定好 VPN。
5. 【保險】：旅遊平安險
6. 【交通/住宿】：提前預訂或票券建議
7. 【目的地特殊規定】：重要法規、禁忌（如有）
8. 【季節相關】：該季節特殊準備（如有）

注意事項：
- 不要列任何衣物、服裝類建議（行李清單另有處理）
- 通訊只給一個建議，不要同時列「買 SIM 卡」又列「開漫遊」

請列出 8~12 個具體可執行的行動項目（繁體中文）：
- 每項用動詞開頭（如「確認」、「申請」、「購買」、「下載」）
- 一般項目控制在 18 字以內，簡潔精準；若附有網址則不限字數

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
  tripType: string,
  weatherSummary?: string
): Promise<AiRecommendation[]> {
  const weatherLine = weatherSummary ? `\n- 天氣：${weatherSummary}` : '';
  const prompt = `你是一個旅行行李打包專家。請根據以下旅行資訊推薦行李清單：
- 目的地：${destination}
- 天數：${days} 天
- 季節：${season}
- 旅行類型：${tripType}${weatherLine}

請回傳 JSON 格式，分為以下類別：衣物、3C、盥洗、證件、藥品、其他。
每個類別列出建議攜帶的物品名稱（繁體中文）。
不要重複基本款，專注在該目的地/季節/類型特別需要的物品。
${weatherSummary ? '衣物類請根據天氣資訊給出具體適合的衣物建議。' : ''}

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

export interface AiTicketRecommendation {
  title: string;
  ticket_type: TicketType;
}

export async function getAiTicketRecommendations(
  destination: string,
  days: number,
  tripType: string
): Promise<AiTicketRecommendation[]> {
  const prompt = `你是旅遊達人。請根據以下旅行資訊，推薦旅客應提前預訂的票券（景點門票、交通票卡、體驗活動、套票等）：
- 目的地：${destination}
- 天數：${days} 天
- 旅行類型：${tripType}

請列出 5~8 個最值得提前預訂的票券，回傳 JSON 陣列：
[
  { "title": "票券名稱（繁體中文，附上英文名稱如常見）", "ticket_type": "flight" | "train" | "bus" | "other" }
]

規則：
- 只回傳 JSON 陣列，不要其他文字
- ticket_type：火車/高鐵等陸上交通用 train，巴士用 bus，飛機用 flight，景點/體驗/套票用 other
- 優先推薦熱門且常常售完、建議提前購買的票券
- 以繁體中文為主，括號內可加英文名稱`;

  const text = await generateText(prompt);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('無法解析 AI 回應');
  return JSON.parse(jsonMatch[0]) as AiTicketRecommendation[];
}

// ─── Itinerary AI ───

export interface ItineraryItemAI {
  day: number;
  period: 'morning' | 'afternoon' | 'evening';
  activity: string;
}

export async function generateItinerary(
  destination: string,
  days: number,
  tripType: string,
  weatherSummary?: string
): Promise<ItineraryItemAI[]> {
  const weatherLine = weatherSummary ? `\n- 天氣：${weatherSummary}` : '';
  const prompt = `你是旅遊規劃師。請為以下旅行生成詳細的每日行程：
- 目的地：${destination}
- 天數：${days} 天
- 旅遊類型：${tripType}${weatherLine}

請生成完整 ${days} 天的行程，每天分成早上(morning)/下午(afternoon)/晚上(evening)，每個時段 1-3 個活動。
活動名稱要具體，包含景點或餐廳名稱（繁體中文為主，可附英文名稱）。

回傳 JSON 陣列（不要有其他文字）：
[
  { "day": 1, "period": "morning", "activity": "活動名稱" },
  { "day": 1, "period": "afternoon", "activity": "活動名稱" }
]`;

  const text = await generateText(prompt);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('無法解析 AI 行程回應');
  return JSON.parse(jsonMatch[0]) as ItineraryItemAI[];
}

export async function parseItinerary(itineraryText: string): Promise<ItineraryItemAI[]> {
  const prompt = `請將以下行程文字解析成結構化格式，每個「具體地點、餐廳、景點、活動」都要獨立成一筆。

行程文字：
${itineraryText}

解析規則：
1. day 從 1 開始（Day 1 = 1, Day 2 = 2, 第一天 = 1...）
2. period 只能是：
   - 早上/上午/morning/09:xx/10:xx/11:xx → "morning"
   - 下午/午後/afternoon/12:xx/13:xx/14:xx/15:xx/16:xx → "afternoon"
   - 晚上/夜晚/evening/17:xx/18:xx/19:xx/20:xx/21:xx/22:xx → "evening"
3. activity 規則（最重要）：
   - 每個具體地點、餐廳、景點、店家都要獨立成一筆
   - 直接使用店家/景點的名稱，例如：「澳洲牛奶公司」「M+ 博物館」「K11 MUSEA」「甘牌燒鵝」
   - 若名稱後有括號補充說明，可保留，例如：「澳洲牛奶公司（佐敦）」
   - 不要用時間描述（如「10:00 抵達」），不要用動詞開頭（如「前往」「搭乘」）
   - 若一個時段有多個地點，每個地點各自一筆

範例輸入：
• 10:00 - 11:30：抵達飯店，步行前往澳洲牛奶公司（佐敦）吃早餐
• 13:00 - 16:30：搭車前往 M+ 博物館

範例輸出：
[
  { "day": 1, "period": "morning", "activity": "澳洲牛奶公司（佐敦）" },
  { "day": 1, "period": "afternoon", "activity": "M+ 博物館" }
]

回傳 JSON 陣列（不要有其他文字）：`;

  const text = await generateText(prompt);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('無法解析行程文字');
  return JSON.parse(jsonMatch[0]) as ItineraryItemAI[];
}
