# TravelAPP — 出國旅遊計畫

個人旅遊規劃 app，用連結就能和旅伴共用，不需登入。

## 功能

**行程規劃**
- **行程表** — AI 一鍵生成完整每日行程（早/午/晚），或貼上文字讓 AI 解析
- 每個活動可點地圖圖示直接開啟 Google Maps
- 支援跨天、跨時段移動活動，同時段內可拖拉排序

**票券 & 住宿**
- 新增航班、火車、巴士、景點票券，附圖片/訂位代號/座位
- AI 辨識票券照片自動填入資訊
- AI 推薦目的地必買預訂票券
- 住宿資訊管理（含 Google Maps、訂房網址）

**行李 & 準備事項**
- 行李表分類管理（衣物/3C/盥洗/證件/藥品/其他）
- 模板快速載入（海島/都市/滑雪/登山）
- AI 根據目的地、天數、天氣推薦行李
- 事前準備清單，預設常見項目自動載入

**天氣預報**
- 出發日期後自動顯示旅遊期間每日天氣（Open-Meteo，免費無需 API key）
- 天氣摘要自動帶入 AI 行李推薦

**其他**
- 分享連結給旅伴即可共同編輯，無需登入
- 手機/平板/桌面響應式設計
- PWA 支援（可加入主畫面）

## 技術棧

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Google Sheets** — 資料儲存（每個旅程獨立工作表）
- **Gemini API** (gemini-2.5-flash-lite) — 行李推薦、票券辨識、行程生成/解析
- **Open-Meteo** — 天氣預報（免費，無需 API key）
- **SWR** — 客戶端資料抓取
- **dnd-kit** — 拖拉排序
- **Vercel** — 部署

## 快速開始

```bash
npm install
cp .env.example .env.local
# 填入環境變數（見下方說明）
npm run dev
```

打開 http://localhost:3333

## 環境變數

| 變數 | 說明 |
|------|------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google 服務帳戶 email |
| `GOOGLE_PRIVATE_KEY` | 服務帳戶私鑰（完整 PEM，含換行） |
| `GOOGLE_SHEET_ID` | Google Sheets 試算表 ID |
| `GEMINI_API_KEY` | Gemini API 金鑰 |

多組 Gemini key 可用 `GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`... 輪替，避免觸及速率限制。

## 部署

推送到 `main` 分支後 Vercel 自動部署。

需在 Vercel 專案設定中填入以上環境變數。`GOOGLE_PRIVATE_KEY` 直接貼入完整私鑰內容，不需加引號。
