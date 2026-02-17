# TravelAPP — 出國旅遊計畫

和旅伴一起整理行李、準備出國事項。有連結就能編輯，不需登入。

## 功能

- **行李表** — 模板快速載入（海島/都市/滑雪/登山），分類收合，勾選打包進度
- **事前準備** — 預設清單自動載入，勾選完成狀態
- **AI 智慧推薦** — 根據目的地、天數、季節推薦行李（Gemini API）
- **多人協作** — 分享連結給旅伴，30 秒自動同步
- **手機友善** — 響應式設計，手機/平板/桌面都能用

## 技術棧

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Google Sheets** — 資料儲存
- **Gemini API** — AI 行李推薦
- **SWR** — 客戶端資料抓取 + polling

## 快速開始

```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env.local
# 填入 Google Sheets 和 Gemini API 憑證

# 啟動開發伺服器
npm run dev
```

打開 http://localhost:3333

## 環境變數

| 變數 | 說明 |
|------|------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google 服務帳戶 email |
| `GOOGLE_PRIVATE_KEY` | 服務帳戶私鑰 |
| `GOOGLE_SHEET_ID` | Google Sheets 試算表 ID |
| `GEMINI_API_KEY` | Gemini API 金鑰 |
| `NEXT_PUBLIC_BASE_URL` | 網站網址 |

## 部署（Synology NAS）

```bash
docker compose up -d --build
```

推送到 `main` 分支會自動透過 GitHub Actions 部署到 NAS。
