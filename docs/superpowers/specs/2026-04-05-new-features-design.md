# TravelAPP New Features Design

Date: 2026-04-05

## Overview

Four interconnected features:
1. Start date replaces season input
2. Weather block (Open-Meteo)
3. AI ticket recommendations + existing AI recognition preserved
4. Itinerary planner

---

## 1. Data Model Changes

### Trip
Add `start_date` (format: `YYYY-MM-DD`) to the `Trip` interface and `_trips` Google Sheet.
Remove `season` from the creation form — auto-calculate from `start_date`:
- Dec–Feb → winter, Mar–May → spring, Jun–Aug → summer, Sep–Nov → autumn

Backward compatibility: existing trips with no `start_date` keep their existing `season` value. Weather block and itinerary AI simply don't appear if `start_date` is empty.

Google Sheets: add `start_date` column to `_trips` sheet header.

### Itinerary
New sheet per trip: `{tripId}_itinerary`
Headers: `id`, `day`, `period`, `activity`, `order`, `created_at`

- `day`: integer (1-based)
- `period`: `morning` | `afternoon` | `evening`
- `order`: integer for drag-drop ordering within a period

---

## 2. Trip Creation Form

- Replace season dropdown with a date picker (`<input type="date">`)
- On submit, calculate `season` from the selected date before saving
- Both `start_date` and `season` saved to Google Sheets

---

## 3. Weather Block

### API Route: `/api/weather`
Query params: `destination`, `startDate` (YYYY-MM-DD), `days`

Steps:
1. Call Open-Meteo geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<destination>&count=1&language=en&format=json`
2. Extract `latitude`, `longitude`
3. Call Open-Meteo forecast: `https://api.open-meteo.com/v1/forecast` with `daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weathercode&timezone=auto&start_date=<start>&end_date=<end>`
4. Return array of daily weather objects

Limitation: Open-Meteo only provides forecasts up to 16 days ahead. If trip is beyond that range, return a flag indicating "forecast unavailable" and display a message.

### Weather Code → Emoji Mapping
- 0: ☀️ 晴
- 1–3: 🌤️ 多雲
- 45–48: 🌫️ 霧
- 51–67: 🌧️ 雨
- 71–77: ❄️ 雪
- 80–82: 🌦️ 陣雨
- 95+: ⛈️ 雷雨

### WeatherBlock Component
- Placed near top of trip page (below trip header)
- Horizontal scroll of day cards: each shows day number, date, emoji, max/min temp, rain probability
- Only rendered when `trip.start_date` is set
- Passes weather summary (temp range, rain days) to packing list AI prompt

### Packing AI Integration
Modify `/api/ai/recommend` to accept optional `weatherSummary` field.
Example: `"旅遊期間氣溫 15–25°C，有 2 天降雨機率 > 60%"`
Gemini uses this to recommend appropriate clothing items.

---

## 4. AI Ticket Recommendations

### API Route: `/api/ai/recommend-tickets`
POST body: `{ destination, days, tripType }`

Gemini prompt: recommend top pre-bookable tickets/passes/attractions for the destination. Return JSON array of `{ title, ticket_type }` where `ticket_type` is one of `flight | train | bus | other`.

### UI (TicketsList component)
- Add "AI 推薦必買票券" button (same style as checklist AI button)
- On click: call API, show pending list with checkboxes
- User selects → click confirm → selected items added to ticket list with `title` and `ticket_type` only (other fields empty)
- Added tickets can be edited later to fill datetime, seat, confirmation, etc.
- Existing AI photo recognition feature preserved as-is

---

## 5. Itinerary Planner

### API Routes
- `GET /api/itinerary?tripId=xxx` — fetch all items
- `POST /api/itinerary` — add items (bulk, from AI or paste)
- `PATCH /api/itinerary` — update single item (activity name or order)
- `DELETE /api/itinerary` — delete single item
- `POST /api/ai/generate-itinerary` — AI generates full itinerary
- `POST /api/ai/parse-itinerary` — AI parses pasted text into structured format

### AI Generate
Gemini generates a day-by-day itinerary given destination, days, trip_type, and optional weather summary. Returns array of `{ day, period, activity }` objects.

### AI Parse (paste text)
User pastes free-form itinerary text. Gemini parses it into structured `{ day, period, activity }` array.

### ItineraryBlock Component
- New section in trip page (added to bottom nav as new tab "行程")
- Layout: grouped by day → grouped by period (早/午/晚)
- Each activity row: drag handle | activity name | 🗺️ map icon
- Map icon: opens `https://maps.google.com?q=<activity>` in new tab
- Drag-drop: uses existing dnd-kit, reorders within same period only
- Two entry points:
  1. "AI 生成行程" button → calls generate API, shows preview, confirm to save
  2. "貼上行程" button → textarea for user input, calls parse API, shows preview, confirm to save
- Manual add: simple form to add single activity to a specific day/period

### Google Sheets (itinerary)
- `getItineraryItems(tripId)` — fetch and sort by day, period order (morning/afternoon/evening), then order
- `addItineraryItems(tripId, items)` — bulk insert
- `updateItineraryItem(tripId, itemId, updates)` — update activity or order
- `deleteItineraryItem(tripId, itemId)` — delete row

---

## Component / File Summary

New files:
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

Modified files:
- `src/lib/types.ts` — add `start_date` to Trip, add `ItineraryItem` type
- `src/lib/sheets.ts` — add itinerary CRUD, update trip read/write for `start_date`
- `src/lib/gemini.ts` — add ticket recommendation, itinerary generation/parsing functions
- `src/app/page.tsx` — update trip creation form (date picker, remove season)
- `src/components/TicketsList.tsx` — add AI recommend button + pending list UI
- `src/components/TripHeader.tsx` — show start_date if available
- `src/app/trip/[tripId]/page.tsx` — add WeatherBlock, ItineraryBlock, update nav
- `src/components/navItems.ts` — add itinerary nav item
