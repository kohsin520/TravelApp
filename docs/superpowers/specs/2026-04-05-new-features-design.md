# TravelAPP 新功能設計文件

日期：2026-04-05

## 概覽

四個互相關聯的功能：
1. 出發日期取代季節輸入
2. 天氣區塊（Open-Meteo）
3. AI 票券推薦（保留現有 AI 辨識功能）
4. 行程規劃器

---

## 1. 資料模型變更

### Trip
`Trip` 介面與 `_trips` Google Sheet 新增 `start_date`（格式：`YYYY-MM-DD`）。
建立表單移除季節下拉選單，改從 `start_date` 自動推算：
- 12–2 月 → winter、3–5 月 → spring、6–8 月 → summer、9–11 月 → autumn

向下相容：既有旅程若無 `start_date`，保留原本的 `season` 值。天氣區塊與行程 AI 在 `start_date` 為空時不顯示。

Google Sheets：`_trips` 工作表標題列新增 `start_date` 欄位。

### 行程（Itinerary）
每個旅程新增獨立工作表：`{tripId}_itinerary`
欄位：`id`、`day`、`period`、`activity`、`order`、`created_at`

- `day`：整數，從 1 開始
- `period`：`morning`（早）| `afternoon`（午）| `evening`（晚）
- `order`：在同一個時段內的排序數字，用於拖拉調整

---

## 2. 建立旅程表單

- 季節下拉選單改成日期選擇器（`<input type="date">`）
- 送出時根據所選日期自動計算 `season`
- `start_date` 和 `season` 都存入 Google Sheets

---

## 3. 天氣區塊

### API Route：`/api/weather`
Query params：`destination`、`startDate`（YYYY-MM-DD）、`days`

步驟：
1. 呼叫 Open-Meteo geocoding：`https://geocoding-api.open-meteo.com/v1/search?name=<目的地>&count=1`
2. 取得 `latitude`、`longitude`
3. 呼叫 Open-Meteo 預報：取得每日最高/最低溫、降雨機率、天氣代碼
4. 回傳每日天氣陣列

限制：Open-Meteo 只提供未來 16 天預報。超出範圍則顯示「尚未開放預報」。

### 天氣代碼對應 Emoji
- 0：☀️ 晴
- 1–3：🌤️ 多雲
- 45–48：🌫️ 霧
- 51–67：🌧️ 雨
- 71–77：❄️ 雪
- 80–82：🌦️ 陣雨
- 95+：⛈️ 雷雨

### WeatherBlock 元件
- 放在旅程頁面頂部（旅程標題下方）
- 橫向捲動的天氣卡片，每張顯示：日期、天氣 emoji、最高/最低溫、降雨機率
- 只在 `trip.start_date` 有值時顯示
- 將天氣摘要（溫度範圍、雨天數）傳給行李清單 AI

### 行李清單 AI 整合
修改 `/api/ai/recommend`，接受選填的 `weatherSummary` 欄位。
範例：`"旅遊期間氣溫 15–25°C，有 2 天降雨機率 > 60%"`
Gemini 根據天氣推薦適合的衣物。

---

## 4. AI 票券推薦

### API Route：`/api/ai/recommend-tickets`
POST body：`{ destination, days, tripType }`

Gemini 根據目的地推薦常見預訂票券，回傳 `{ title, ticket_type }` 陣列。

### UI（TicketsList 元件）
- 新增「AI 推薦必買票券」按鈕（與準備清單 AI 按鈕風格一致）
- 點擊後呼叫 API，顯示候選清單供勾選
- 確認後將勾選項目加入票券列表（只有 `title` 和 `ticket_type`，其餘欄位之後再填）
- 既有的 AI 照片辨識功能保留不動

---

## 5. 行程規劃器

### API Routes
- `GET /api/itinerary?tripId=xxx`：取得所有行程項目
- `POST /api/itinerary`：批次新增（AI 生成或貼上解析）
- `PATCH /api/itinerary`：更新單一項目（活動名稱或排序）
- `DELETE /api/itinerary`：刪除單一項目
- `POST /api/ai/generate-itinerary`：AI 生成完整行程
- `POST /api/ai/parse-itinerary`：AI 解析貼上的文字

### AI 生成行程
Gemini 根據目的地、天數、旅遊類型、天氣摘要（選填）生成每日行程，回傳 `{ day, period, activity }` 陣列。

### AI 解析貼上文字
使用者貼入自由格式行程文字，Gemini 解析成結構化 `{ day, period, activity }` 陣列。

### ItineraryBlock 元件
- 底部導航新增「行程」tab
- 版面：以天分組 → 以時段分組（早/午/晚）
- 每個活動列：拖拉把手｜活動名稱｜🗺️ 地圖圖示
- 地圖圖示：點擊開啟 `https://maps.google.com?q=<活動名稱>`（新分頁）
- 拖拉：使用既有 dnd-kit，只能在同一時段內調整順序
- 兩種建立方式：
  1. 「AI 生成行程」→ 預覽後確認儲存
  2. 「貼上行程」→ 文字框輸入 → AI 解析 → 預覽後確認儲存
- 手動新增：表單選擇日期/時段後新增單一活動

### Google Sheets（行程）
- `getItineraryItems(tripId)`：取得並依 day、period 順序、order 排序
- `addItineraryItems(tripId, items)`：批次寫入
- `updateItineraryItem(tripId, itemId, updates)`：更新活動或排序
- `deleteItineraryItem(tripId, itemId)`：刪除列

---

## 新增／修改檔案清單

**新增：**
- `src/components/WeatherBlock.tsx`
- `src/components/ItineraryBlock.tsx`
- `src/components/ItineraryDayGroup.tsx`
- `src/hooks/useWeather.ts`
- `src/hooks/useItinerary.ts`
- `src/app/api/weather/route.ts`
- `src/app/api/itinerary/route.ts`
- `src/app/api/ai/recommend-tickets/route.ts`
- `src/app/api/ai/generate-itinerary/route.ts`
- `src/app/api/ai/parse-itinerary/route.ts`

**修改：**
- `src/lib/types.ts`：Trip 新增 `start_date`，新增 `ItineraryItem` 型別
- `src/lib/sheets.ts`：新增行程 CRUD，更新旅程讀寫支援 `start_date`
- `src/lib/gemini.ts`：新增票券推薦、行程生成/解析函式
- `src/app/page.tsx`：建立旅程表單改為日期選擇器
- `src/components/TicketsList.tsx`：新增 AI 推薦按鈕與候選清單 UI
- `src/components/TripHeader.tsx`：顯示 `start_date`
- `src/app/trip/[tripId]/page.tsx`：加入 WeatherBlock、ItineraryBlock，更新導航
- `src/components/navItems.ts`：新增行程導航項目
