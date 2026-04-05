# 計畫 A：出發日期 + 天氣 + AI 票券推薦

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增出發日期欄位（取代季節下拉），自動推算季節；加入天氣預報區塊；新增 AI 票券推薦功能。

**Architecture:** 出發日期存入 `_trips` Google Sheet，季節由後端自動推算。天氣透過 Open-Meteo API（免費、無需 key）抓取，並將天氣摘要傳給行李清單 AI。AI 票券推薦走與準備清單 AI 相同的模式（Gemini 生成 → 候選清單 → 使用者勾選加入）。

**Tech Stack:** Next.js App Router, google-spreadsheet v5, SWR, Gemini API, Open-Meteo API, Tailwind CSS

---

### Task 1：更新 Trip 型別與 Sheets 基礎設施

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/sheets.ts`

- [ ] **Step 1：更新 Trip 介面，加入 `start_date`**

在 `src/lib/types.ts` 的 `Trip` 介面加入選填欄位：

```typescript
export interface Trip {
  trip_id: string;
  trip_name: string;
  destination: string;
  days: number;
  season: string;
  trip_type: string;
  start_date?: string;   // ← 新增，格式 YYYY-MM-DD
  created_at: string;
}
```

- [ ] **Step 2：更新 `getOrCreateSheet` 支援新增欄位**

在 `src/lib/sheets.ts` 將現有的 `getOrCreateSheet` 替換為以下版本（若 sheet 已存在則檢查並補齊缺少的 header）：

```typescript
async function getOrCreateSheet(
  doc: GoogleSpreadsheet,
  title: string,
  headers: string[]
): Promise<GoogleSpreadsheetWorksheet> {
  let sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues: headers });
  } else {
    await sheet.loadHeaderRow();
    const existing = sheet.headerValues ?? [];
    const missing = headers.filter((h) => !existing.includes(h));
    if (missing.length > 0) {
      await sheet.setHeaderRow([...existing, ...missing]);
    }
  }
  return sheet;
}
```

- [ ] **Step 3：更新 `TRIP_HEADERS` 與 `createTrip`**

在 `src/lib/sheets.ts` 中：

```typescript
const TRIP_HEADERS = ['trip_id', 'trip_name', 'destination', 'days', 'season', 'trip_type', 'start_date', 'created_at'];
```

更新 `createTrip`：

```typescript
export async function createTrip(trip: Trip): Promise<void> {
  const doc = await getDoc();
  const sheet = await getOrCreateSheet(doc, '_trips', TRIP_HEADERS);
  await sheet.addRow({
    trip_id: trip.trip_id,
    trip_name: trip.trip_name,
    destination: trip.destination,
    days: trip.days,
    season: trip.season,
    trip_type: trip.trip_type,
    start_date: trip.start_date ?? '',
    created_at: trip.created_at,
  });
}
```

- [ ] **Step 4：更新 `getTrip` 讀取 `start_date`**

更新 `getTrip` 的 return：

```typescript
return {
  trip_id: row.get('trip_id'),
  trip_name: row.get('trip_name'),
  destination: row.get('destination'),
  days: Number(row.get('days')),
  season: row.get('season'),
  trip_type: row.get('trip_type'),
  start_date: row.get('start_date') || undefined,
  created_at: row.get('created_at'),
};
```

- [ ] **Step 5：Commit**

```bash
git add src/lib/types.ts src/lib/sheets.ts
git commit -m "feat: add start_date to Trip type and sheets"
git push mine main
```

---

### Task 2：更新建立旅程表單（季節改日期）

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/api/trip/route.ts`

- [ ] **Step 1：更新 `page.tsx` 表單狀態與季節計算**

在 `src/app/page.tsx` 中，加入季節計算函式並更新 form state：

```typescript
function calculateSeason(dateStr: string): string {
  const month = new Date(dateStr).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
```

將 `form` state 的 `season: 'summer'` 改為 `start_date: ''`：

```typescript
const [form, setForm] = useState({
  trip_name: '',
  destination: '',
  days: 5,
  start_date: '',
  trip_type: 'city',
});
```

- [ ] **Step 2：更新 `handleSubmit`**

在 `handleSubmit` 的 `fetch` 呼叫中，計算 season 後一起送出：

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    const season = form.start_date ? calculateSeason(form.start_date) : 'summer';
    const res = await fetch('/api/trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, season }),
    });
    const data = await res.json();
    if (data.tripId) {
      saveTripToHistory({
        tripId: data.tripId,
        trip_name: form.trip_name,
        destination: form.destination,
        created_at: new Date().toISOString(),
      });
      router.push(`/trip/${data.tripId}`);
    } else {
      alert(`建立旅程失敗：${data.error || '未知錯誤'}`);
    }
  } catch {
    alert('建立旅程失敗，請稍後再試');
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 3：替換表單中的季節欄位**

在 `page.tsx` 的 `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">` 中，將「季節」的 `<div>` 替換為「出發日期」：

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">出發日期</label>
  <input
    type="date"
    value={form.start_date}
    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
  />
</div>
```

同時移除 `import { TRIP_TYPES, SEASONS }` 中的 `SEASONS`，改為 `import { TRIP_TYPES } from '@/lib/types'`。

- [ ] **Step 4：更新 trip API route 接受 `start_date`**

在 `src/app/api/trip/route.ts` 的 POST handler 中：

```typescript
const { trip_name, destination, days, season, trip_type, start_date } = body;

if (!trip_name || !destination || !days || !season || !trip_type) {
  return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
}

const trip = {
  trip_id: tripId,
  trip_name,
  destination,
  days: Number(days),
  season,
  trip_type,
  start_date: start_date || undefined,
  created_at: new Date().toISOString(),
};
```

- [ ] **Step 5：Commit**

```bash
git add src/app/page.tsx src/app/api/trip/route.ts
git commit -m "feat: replace season dropdown with date picker"
git push mine main
```

---

### Task 3：天氣 API Route

**Files:**
- Create: `src/app/api/weather/route.ts`

- [ ] **Step 1：建立天氣 API route**

建立 `src/app/api/weather/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const destination = searchParams.get('destination');
  const startDate = searchParams.get('startDate');
  const days = Number(searchParams.get('days') ?? '1');

  if (!destination || !startDate) {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
  }

  // Step 1: Geocoding
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) {
    return NextResponse.json({ error: '找不到該地點' }, { status: 404 });
  }
  const { latitude, longitude } = geoData.results[0];

  // Step 2: Check 16-day limit
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 15) {
    return NextResponse.json({ unavailable: true });
  }

  // Step 3: Compute end date
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  const endDate = end.toISOString().split('T')[0];

  // Step 4: Fetch forecast
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weathercode&timezone=auto&start_date=${startDate}&end_date=${endDate}`
  );
  const weatherData = await weatherRes.json();

  const daily = weatherData.daily;
  const weather = (daily.time as string[]).map((date, i) => ({
    date,
    maxTemp: Math.round(daily.temperature_2m_max[i] ?? 0),
    minTemp: Math.round(daily.temperature_2m_min[i] ?? 0),
    rainProb: Math.round(daily.precipitation_probability_mean[i] ?? 0),
    weatherCode: daily.weathercode[i] ?? 0,
    emoji: getWeatherEmoji(daily.weathercode[i] ?? 0),
  }));

  return NextResponse.json({ weather });
}
```

- [ ] **Step 2：Commit**

```bash
git add src/app/api/weather/route.ts
git commit -m "feat: add weather API route using Open-Meteo"
git push mine main
```

---

### Task 4：useWeather Hook 與 WeatherBlock 元件

**Files:**
- Create: `src/hooks/useWeather.ts`
- Create: `src/components/WeatherBlock.tsx`

- [ ] **Step 1：建立 `useWeather` hook**

建立 `src/hooks/useWeather.ts`：

```typescript
import useSWR from 'swr';

export interface DailyWeather {
  date: string;
  maxTemp: number;
  minTemp: number;
  rainProb: number;
  weatherCode: number;
  emoji: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWeather(destination: string, startDate: string | undefined, days: number) {
  const key =
    destination && startDate
      ? `/api/weather?destination=${encodeURIComponent(destination)}&startDate=${startDate}&days=${days}`
      : null;

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    weather: (data?.weather ?? []) as DailyWeather[],
    unavailable: (data?.unavailable ?? false) as boolean,
    isLoading,
    isError: !!error,
  };
}

export function buildWeatherSummary(weather: DailyWeather[]): string {
  if (!weather.length) return '';
  const maxTemps = weather.map((d) => d.maxTemp);
  const minTemps = weather.map((d) => d.minTemp);
  const rainyDays = weather.filter((d) => d.rainProb > 60).length;
  const overallMax = Math.max(...maxTemps);
  const overallMin = Math.min(...minTemps);
  let summary = `旅遊期間氣溫 ${overallMin}–${overallMax}°C`;
  if (rainyDays > 0) summary += `，有 ${rainyDays} 天降雨機率 > 60%`;
  return summary;
}
```

- [ ] **Step 2：建立 `WeatherBlock` 元件**

建立 `src/components/WeatherBlock.tsx`：

```tsx
'use client';

import { useWeather } from '@/hooks/useWeather';

interface WeatherBlockProps {
  destination: string;
  startDate: string;
  days: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    weekday: weekdays[d.getDay()],
  };
}

export default function WeatherBlock({ destination, startDate, days }: WeatherBlockProps) {
  const { weather, unavailable, isLoading, isError } = useWeather(destination, startDate, days);

  if (isLoading) {
    return (
      <div className="mx-4 mb-2 text-xs text-gray-400 text-center py-2">載入天氣中...</div>
    );
  }

  if (unavailable) {
    return (
      <div className="mx-4 mb-2 text-xs text-gray-400 text-center py-2">
        出發日期超過 16 天，天氣預報尚未開放
      </div>
    );
  }

  if (isError || weather.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-2 p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">天氣預報</h3>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {weather.map((day, i) => {
          const { date, weekday } = formatDate(day.date);
          return (
            <div
              key={day.date}
              className="flex flex-col items-center min-w-[58px] bg-gray-50 rounded-xl p-2 shrink-0"
            >
              <span className="text-[10px] text-gray-400">第{i + 1}天</span>
              <span className="text-[10px] text-gray-500">{date}（{weekday}）</span>
              <span className="text-2xl my-1">{day.emoji}</span>
              <span className="text-xs font-medium text-gray-700">{day.maxTemp}°</span>
              <span className="text-xs text-gray-400">{day.minTemp}°</span>
              {day.rainProb > 0 && (
                <span className="text-[10px] text-blue-400 mt-0.5">💧{day.rainProb}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3：Commit**

```bash
git add src/hooks/useWeather.ts src/components/WeatherBlock.tsx
git commit -m "feat: add WeatherBlock component and useWeather hook"
git push mine main
```

---

### Task 5：整合天氣到旅程頁面與行李清單 AI

**Files:**
- Modify: `src/app/trip/[tripId]/page.tsx`
- Modify: `src/components/AiRecommendForm.tsx`
- Modify: `src/app/api/ai/recommend/route.ts`
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1：在旅程頁面加入 WeatherBlock**

在 `src/app/trip/[tripId]/page.tsx` 中：

import 區塊加入：
```typescript
import WeatherBlock from '@/components/WeatherBlock';
import { buildWeatherSummary, DailyWeather } from '@/hooks/useWeather';
import { useWeather } from '@/hooks/useWeather';
```

在 `TripPage` component 內（`trip` state 之後）加入：
```typescript
const { weather } = useWeather(
  trip?.destination ?? '',
  trip?.start_date,
  trip?.days ?? 1
);
const weatherSummary = buildWeatherSummary(weather);
```

在 JSX 中，`<TripHeader trip={trip} />` 後面加入：
```tsx
{trip.start_date && (
  <WeatherBlock
    destination={trip.destination}
    startDate={trip.start_date}
    days={trip.days}
  />
)}
```

將 `<PackingList tripId={tripId} trip={trip} />` 改為：
```tsx
<PackingList tripId={tripId} trip={trip} weatherSummary={weatherSummary} />
```

將 `<TicketsList tripId={tripId} />` 改為：
```tsx
<TicketsList tripId={tripId} trip={trip} />
```

- [ ] **Step 2：更新 `AiRecommendForm` 接受 `weatherSummary`**

在 `src/components/AiRecommendForm.tsx` 中：

更新介面：
```typescript
interface AiRecommendFormProps {
  trip: Trip;
  existingItems: PackingItem[];
  onAddItems: (items: { category: string; item_name: string; source: string }[]) => void;
  onReorganize: (items: { category: string; item_name: string; source: string }[]) => void;
  weatherSummary?: string;
}
```

更新元件簽章：
```typescript
export default function AiRecommendForm({ trip, existingItems, onAddItems, onReorganize, weatherSummary }: AiRecommendFormProps) {
```

在 `handleGenerate` 的 fetch body 中加入 `weatherSummary`：
```typescript
body: JSON.stringify({
  destination: trip.destination,
  days: trip.days,
  season: trip.season,
  tripType: trip.trip_type,
  weatherSummary: weatherSummary ?? '',
}),
```

- [ ] **Step 3：確認 `PackingList` 有傳遞 `weatherSummary` 給 `AiRecommendForm`**

讀取 `src/components/PackingList.tsx`，確認它有 `weatherSummary` prop 並傳遞給 `AiRecommendForm`。若沒有，更新 interface 與 JSX：

```typescript
interface PackingListProps {
  tripId: string;
  trip: Trip;
  weatherSummary?: string;
}
```

找到 `<AiRecommendForm` 並加入 `weatherSummary={weatherSummary}`。

- [ ] **Step 4：更新 `/api/ai/recommend` route**

在 `src/app/api/ai/recommend/route.ts` 中：

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, days, season, tripType, weatherSummary } = body;

    if (!destination || !days || !season || !tripType) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const recommendations = await getAiPackingRecommendations(destination, days, season, tripType, weatherSummary);
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('AI recommend error:', error);
    return NextResponse.json({ error: 'AI 推薦失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 5：更新 `getAiPackingRecommendations` 接受天氣摘要**

在 `src/lib/gemini.ts` 中，更新 `getAiPackingRecommendations` 簽章與 prompt：

```typescript
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
```

- [ ] **Step 6：Commit**

```bash
git add src/app/trip/[tripId]/page.tsx src/components/AiRecommendForm.tsx src/app/api/ai/recommend/route.ts src/lib/gemini.ts
git commit -m "feat: integrate weather into trip page and packing AI"
git push mine main
```

---

### Task 6：AI 票券推薦 — Gemini 函式與 API Route

**Files:**
- Modify: `src/lib/gemini.ts`
- Create: `src/app/api/ai/recommend-tickets/route.ts`

- [ ] **Step 1：新增 `getAiTicketRecommendations` 到 `gemini.ts`**

在 `src/lib/gemini.ts` 最後加入：

```typescript
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
```

- [ ] **Step 2：建立 `/api/ai/recommend-tickets` route**

建立 `src/app/api/ai/recommend-tickets/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAiTicketRecommendations } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, days, tripType } = body;
    if (!destination || !days || !tripType) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const recommendations = await getAiTicketRecommendations(destination, days, tripType);
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('AI ticket recommend error:', error);
    return NextResponse.json({ error: 'AI 推薦失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 3：Commit**

```bash
git add src/lib/gemini.ts src/app/api/ai/recommend-tickets/route.ts
git commit -m "feat: add AI ticket recommendation Gemini function and API route"
git push mine main
```

---

### Task 7：AI 票券推薦 — UI in TicketsList

**Files:**
- Modify: `src/components/TicketsList.tsx`

- [ ] **Step 1：更新 `TicketsListProps` 加入 `trip`**

在 `src/components/TicketsList.tsx` 中，更新 import 與 props interface：

```typescript
import { Ticket, TicketType, TICKET_TYPES, Trip } from '@/lib/types';

interface TicketsListProps {
  tripId: string;
  trip?: Trip;
}
```

更新元件簽章：
```typescript
export default function TicketsList({ tripId, trip }: TicketsListProps) {
```

- [ ] **Step 2：新增 AI 推薦相關 state**

在現有 state 之後加入：

```typescript
const [aiRecommendPending, setAiRecommendPending] = useState<
  { title: string; ticket_type: TicketType; checked: boolean }[]
>([]);
const [aiRecommending, setAiRecommending] = useState(false);
const [addingAiRecommend, setAddingAiRecommend] = useState(false);
```

- [ ] **Step 3：新增 `handleAiRecommend` 函式**

在現有函式之後加入：

```typescript
const handleAiRecommend = async () => {
  if (!trip) return;
  setAiRecommending(true);
  try {
    const res = await fetch('/api/ai/recommend-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: trip.destination,
        days: trip.days,
        tripType: trip.trip_type,
      }),
    });
    if (!res.ok) throw new Error('推薦失敗');
    const data = await res.json();
    setAiRecommendPending(
      (data.recommendations as { title: string; ticket_type: TicketType }[]).map((r) => ({
        ...r,
        checked: true,
      }))
    );
  } catch {
    alert('AI 推薦失敗，請稍後再試');
  } finally {
    setAiRecommending(false);
  }
};

const handleAddAiRecommend = async () => {
  const selected = aiRecommendPending.filter((r) => r.checked);
  if (!selected.length) return;
  setAddingAiRecommend(true);
  try {
    for (const item of selected) {
      await addTicket({
        ticket_type: item.ticket_type,
        title: item.title,
        datetime: '',
        datetimeTbd: true,
        seat: '',
        confirmation: '',
        note: '',
        image: '',
        order: 0,
      });
    }
    setAiRecommendPending([]);
  } finally {
    setAddingAiRecommend(false);
  }
};
```

- [ ] **Step 4：加入 AI 推薦候選清單 UI**

在 `{/* Pending items from AI recognition */}` 區塊**之後**、`{showForm ? (` **之前**加入：

```tsx
{/* AI 票券推薦候選清單 */}
{aiRecommendPending.length > 0 && (
  <div className="mt-4 border border-green-200 rounded-xl p-3 bg-green-50/30 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-600">
        AI 推薦（{aiRecommendPending.filter((r) => r.checked).length} 項已勾選）
      </span>
      <button
        onClick={() => setAiRecommendPending([])}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        取消
      </button>
    </div>
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {aiRecommendPending.map((item, i) => (
        <label key={i} className="flex items-center gap-2 py-1 cursor-pointer">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) =>
              setAiRecommendPending((prev) =>
                prev.map((r, idx) => idx === i ? { ...r, checked: e.target.checked } : r)
              )
            }
            className="rounded text-green-600"
          />
          <span className="text-sm text-gray-700 flex-1">{item.title}</span>
          <span className="text-xs text-gray-400">
            {TICKET_TYPES.find((t) => t.value === item.ticket_type)?.label}
          </span>
        </label>
      ))}
    </div>
    <div className="flex justify-end gap-2 pt-1">
      <button
        onClick={() => setAiRecommendPending((prev) => prev.map((r) => ({ ...r, checked: true })))}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        全選
      </button>
      <button
        onClick={handleAddAiRecommend}
        disabled={addingAiRecommend || aiRecommendPending.every((r) => !r.checked)}
        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {addingAiRecommend ? '新增中...' : `加入 ${aiRecommendPending.filter((r) => r.checked).length} 張票券`}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 5：在底部按鈕區加入 AI 推薦按鈕**

在 `{showForm ? (` 的 else 區塊（即現有的兩個按鈕 `flex gap-2` div）中，在 `AI 辨識` 按鈕之後加入第三個按鈕：

```tsx
<button
  onClick={handleAiRecommend}
  disabled={aiRecommending || !trip}
  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 border border-dashed border-green-200 hover:border-green-300 rounded-xl transition-colors disabled:opacity-50"
>
  {aiRecommending ? (
    <>
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      AI 推薦中...
    </>
  ) : (
    <>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
      AI 推薦票券
    </>
  )}
</button>
```

- [ ] **Step 6：Commit**

```bash
git add src/components/TicketsList.tsx
git commit -m "feat: add AI ticket recommendation UI to TicketsList"
git push mine main
```

---

### Task 8：確認 PackingList 傳遞 weatherSummary

**Files:**
- Modify: `src/components/PackingList.tsx`

- [ ] **Step 1：讀取 PackingList 確認現有 interface**

讀取 `src/components/PackingList.tsx`，確認 `PackingListProps` 有沒有 `weatherSummary` 欄位。

- [ ] **Step 2：若沒有，更新 PackingList**

更新 `PackingListProps`：

```typescript
interface PackingListProps {
  tripId: string;
  trip: Trip;
  weatherSummary?: string;
}
```

更新元件簽章加入 `weatherSummary`，並在 `<AiRecommendForm` 中傳入：

```tsx
<AiRecommendForm
  trip={trip}
  existingItems={items}
  onAddItems={...}
  onReorganize={...}
  weatherSummary={weatherSummary}
/>
```

- [ ] **Step 3：Commit**

```bash
git add src/components/PackingList.tsx
git commit -m "feat: pass weatherSummary to AiRecommendForm"
git push mine main
```

---

### 完成後驗證

- [ ] 建立旅程時可選出發日期，季節欄位消失
- [ ] 旅程頁面頂部顯示天氣卡片（僅有 start_date 且在 16 天內時）
- [ ] 行李清單 AI 推薦時若有天氣資訊，衣物推薦會更具體
- [ ] 票券區塊出現「AI 推薦票券」按鈕，點擊後顯示候選清單，勾選後加入
- [ ] 既有的 AI 照片辨識功能正常運作
