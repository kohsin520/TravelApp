# 行程規劃器 (Itinerary Planner) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full itinerary planner to each trip — grouped by day and morning/afternoon/evening, with drag-drop reordering, Google Maps links, AI generation, and paste-to-parse.

**Architecture:** New `{tripId}_itinerary` Google Sheet tab per trip, accessed via a `useItinerary` SWR hook and `/api/itinerary` route. `ItineraryBlock` component renders items grouped by day/period with dnd-kit drag-drop scoped per period. Two AI flows: generate from scratch (Gemini) and parse pasted free-text (Gemini), both show a preview before saving.

**Tech Stack:** Next.js 14 App Router, TypeScript, google-spreadsheet v5, SWR, dnd-kit, Gemini (gemini-2.5-flash-lite), Tailwind CSS v4.

---

## File Map

**New files:**
- `src/hooks/useItinerary.ts` — SWR hook for itinerary CRUD + reorder
- `src/app/api/itinerary/route.ts` — GET/POST/PATCH/DELETE/PUT endpoints
- `src/app/api/ai/generate-itinerary/route.ts` — POST, calls Gemini generate
- `src/app/api/ai/parse-itinerary/route.ts` — POST, calls Gemini parse
- `src/components/ItineraryBlock.tsx` — main itinerary UI (display + dnd + AI)
- `src/components/ItineraryDayGroup.tsx` — per-day section with period groups + dnd

**Modified files:**
- `src/lib/types.ts` — add `Period`, `ItineraryItem`, `PERIOD_LABELS`, `PERIOD_ORDER`
- `src/lib/sheets.ts` — add itinerary CRUD functions
- `src/lib/gemini.ts` — add `ItineraryItemAI`, `generateItinerary`, `parseItinerary`
- `src/components/navItems.ts` — add `itinerary` nav item
- `src/components/BottomNav.tsx` — add itinerary icon
- `src/app/trip/[tripId]/page.tsx` — import and render `ItineraryBlock`

---

## Task 1: ItineraryItem type + Google Sheets CRUD

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/sheets.ts`

- [ ] **Step 1: Add types to `src/lib/types.ts`**

Append to the end of the file:

```typescript
// ─── Itinerary ───

export type Period = 'morning' | 'afternoon' | 'evening';

export const PERIOD_LABELS: Record<Period, string> = {
  morning: '早上',
  afternoon: '下午',
  evening: '晚上',
};

export const PERIOD_ORDER: Record<Period, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

export const PERIODS: Period[] = ['morning', 'afternoon', 'evening'];

export interface ItineraryItem {
  id: string;
  day: number;       // 1-based
  period: Period;
  activity: string;
  order: number;     // within same day+period
  created_at: string;
}
```

- [ ] **Step 2: Add itinerary CRUD to `src/lib/sheets.ts`**

First, update the import at line 3 to include the new types:

```typescript
import { Trip, PackingItem, ChecklistItem, Ticket, Hotel, ItineraryItem, Period, PERIOD_ORDER } from './types';
```

Then append to the end of the file:

```typescript
// ─── Itinerary CRUD ───

const ITINERARY_HEADERS = ['id', 'day', 'period', 'activity', 'order', 'created_at'];

async function getItinerarySheet(doc: GoogleSpreadsheet, tripId: string) {
  return getOrCreateSheet(doc, `${tripId}_itinerary`, ITINERARY_HEADERS);
}

export async function getItineraryItems(tripId: string): Promise<ItineraryItem[]> {
  const doc = await getDoc();
  const sheet = await getItinerarySheet(doc, tripId);
  const rows = await sheet.getRows();
  return rows
    .map((r) => ({
      id: r.get('id'),
      day: Number(r.get('day')),
      period: r.get('period') as Period,
      activity: r.get('activity'),
      order: Number(r.get('order')) || 0,
      created_at: r.get('created_at'),
    }))
    .sort((a, b) =>
      a.day - b.day ||
      PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period] ||
      a.order - b.order
    );
}

export async function addItineraryItems(
  tripId: string,
  items: Omit<ItineraryItem, 'id' | 'created_at'>[]
): Promise<void> {
  const doc = await getDoc();
  const sheet = await getItinerarySheet(doc, tripId);
  const now = new Date().toISOString();
  const { nanoid } = await import('nanoid');
  const rowData = items.map((item) => ({
    id: nanoid(10),
    day: item.day,
    period: item.period,
    activity: item.activity,
    order: item.order,
    created_at: now,
  }));
  await sheet.addRows(rowData);
}

export async function updateItineraryItem(
  tripId: string,
  itemId: string,
  updates: Partial<Pick<ItineraryItem, 'activity' | 'order'>>
): Promise<void> {
  const doc = await getDoc();
  const sheet = await getItinerarySheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === itemId);
  if (!row) throw new Error('Item not found');
  if (updates.activity !== undefined) row.set('activity', updates.activity);
  if (updates.order !== undefined) row.set('order', updates.order);
  await row.save();
}

export async function deleteItineraryItem(tripId: string, itemId: string): Promise<void> {
  const doc = await getDoc();
  const sheet = await getItinerarySheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === itemId);
  if (!row) throw new Error('Item not found');
  await row.delete();
}

export async function bulkUpdateItineraryOrder(
  tripId: string,
  items: { id: string; order: number }[]
): Promise<void> {
  const doc = await getDoc();
  const sheet = await getItinerarySheet(doc, tripId);
  const rows = await sheet.getRows();
  const orderMap = new Map(items.map((i) => [i.id, i.order]));
  const toUpdate = rows.filter((r) => orderMap.has(r.get('id')));
  for (const row of toUpdate) {
    row.set('order', orderMap.get(row.get('id'))!);
  }
  await Promise.all(toUpdate.map((r) => r.save()));
}
```

Note: `nanoid` is dynamically imported to match how it's used in other sheets functions (top-level import is also fine since the package exists — use whichever is consistent with the rest of the file. Check: other functions use `nanoid` from the API route level, not sheets.ts. So in sheets.ts, use the dynamic import OR just pass pre-generated IDs from the caller. Since `addItineraryItems` generates IDs here, dynamic import is fine. Alternative: accept `id` as required in the items parameter and generate IDs in the API route like all other entities. **Use this alternative** — it's more consistent:

Replace `addItineraryItems` signature and implementation with:

```typescript
export async function addItineraryItems(
  tripId: string,
  items: Omit<ItineraryItem, 'created_at'>[]
): Promise<void> {
  const doc = await getDoc();
  const sheet = await getItinerarySheet(doc, tripId);
  const now = new Date().toISOString();
  const rowData = items.map((item) => ({
    id: item.id,
    day: item.day,
    period: item.period,
    activity: item.activity,
    order: item.order,
    created_at: now,
  }));
  await sheet.addRows(rowData);
}
```

IDs will be generated by nanoid in the API route (same as checklist, packing, etc.).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
git add src/lib/types.ts src/lib/sheets.ts
git commit -m "feat: add ItineraryItem type and Google Sheets CRUD"
```

---

## Task 2: useItinerary hook + /api/itinerary route

**Files:**
- Create: `src/hooks/useItinerary.ts`
- Create: `src/app/api/itinerary/route.ts`

- [ ] **Step 1: Create `src/hooks/useItinerary.ts`**

```typescript
import useSWR from 'swr';
import { ItineraryItem, Period } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export function useItinerary(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<ItineraryItem[]>(
    tripId ? `/api/itinerary?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const addItems = async (items: Omit<ItineraryItem, 'id' | 'created_at'>[]) => {
    await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items }),
    });
    mutate();
  };

  const updateItem = async (
    itemId: string,
    updates: Partial<Pick<ItineraryItem, 'activity' | 'order'>>
  ) => {
    mutate(
      (current) => current?.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
      false
    );
    await fetch('/api/itinerary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, itemId, updates }),
    });
    mutate();
  };

  const deleteItem = async (itemId: string) => {
    mutate(
      (current) => current?.filter((i) => i.id !== itemId),
      false
    );
    await fetch('/api/itinerary', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, itemId }),
    });
    mutate();
  };

  const reorderPeriod = async (
    day: number,
    period: Period,
    orderedItems: ItineraryItem[]
  ) => {
    const updates = orderedItems.map((item, i) => ({ id: item.id, order: i }));
    mutate(
      (current) => {
        if (!current) return current;
        const updateMap = new Map(updates.map((u) => [u.id, u.order]));
        return current.map((i) =>
          updateMap.has(i.id) ? { ...i, order: updateMap.get(i.id)! } : i
        );
      },
      false
    );
    await fetch('/api/itinerary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items: updates }),
    });
    mutate();
  };

  return {
    items: data ?? [],
    isLoading,
    isError: !!error,
    addItems,
    updateItem,
    deleteItem,
    reorderPeriod,
  };
}
```

- [ ] **Step 2: Create `src/app/api/itinerary/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  getItineraryItems,
  addItineraryItems,
  updateItineraryItem,
  deleteItineraryItem,
  bulkUpdateItineraryOrder,
} from '@/lib/sheets';
import { ItineraryItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
    const items = await getItineraryItems(tripId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Get itinerary error:', error);
    return NextResponse.json({ error: '取得行程失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items } = body as {
      tripId: string;
      items: Omit<ItineraryItem, 'id' | 'created_at'>[];
    };
    if (!tripId || !items?.length) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const itemsWithIds = items.map((item) => ({ ...item, id: nanoid(10) }));
    await addItineraryItems(tripId, itemsWithIds);
    return NextResponse.json({ success: true, count: itemsWithIds.length });
  } catch (error) {
    console.error('Add itinerary error:', error);
    return NextResponse.json({ error: '新增行程失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId, updates } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await updateItineraryItem(tripId, itemId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return NextResponse.json({ error: '更新行程失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await deleteItineraryItem(tripId, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return NextResponse.json({ error: '刪除行程失敗' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items } = body as {
      tripId: string;
      items: { id: string; order: number }[];
    };
    if (!tripId || !items?.length) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await bulkUpdateItineraryOrder(tripId, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder itinerary error:', error);
    return NextResponse.json({ error: '排序更新失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
git add src/hooks/useItinerary.ts src/app/api/itinerary/route.ts
git commit -m "feat: add useItinerary hook and /api/itinerary route"
```

---

## Task 3: Gemini AI functions (generate + parse)

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Append to `src/lib/gemini.ts`**

```typescript
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
  const prompt = `請將以下行程文字解析成結構化格式。

行程文字：
${itineraryText}

解析規則：
- day 從 1 開始（第一天=1, Day1=1, 第二天=2...）
- period 只能是以下三種：
  - 早上/上午/morning/AM → "morning"
  - 下午/午後/afternoon/PM → "afternoon"
  - 晚上/夜晚/evening/night → "evening"
  - 若無法判斷：早餐類→morning，晚餐類→evening，其他→afternoon
- activity：保留原文活動名稱，保持繁體中文

回傳 JSON 陣列（不要有其他文字）：
[
  { "day": 1, "period": "morning", "activity": "活動名稱" }
]`;

  const text = await generateText(prompt);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('無法解析行程文字');
  return JSON.parse(jsonMatch[0]) as ItineraryItemAI[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
git add src/lib/gemini.ts
git commit -m "feat: add generateItinerary and parseItinerary Gemini functions"
```

---

## Task 4: AI API routes (generate + parse)

**Files:**
- Create: `src/app/api/ai/generate-itinerary/route.ts`
- Create: `src/app/api/ai/parse-itinerary/route.ts`

- [ ] **Step 1: Create `src/app/api/ai/generate-itinerary/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateItinerary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, days, tripType, weatherSummary } = body as {
      destination: string;
      days: number;
      tripType: string;
      weatherSummary?: string;
    };
    if (!destination || !days || !tripType) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const items = await generateItinerary(destination, days, tripType, weatherSummary);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Generate itinerary error:', error);
    return NextResponse.json({ error: '行程生成失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `src/app/api/ai/parse-itinerary/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseItinerary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body as { text: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: '缺少行程文字' }, { status: 400 });
    }
    const items = await parseItinerary(text);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Parse itinerary error:', error);
    return NextResponse.json({ error: '行程解析失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
git add src/app/api/ai/generate-itinerary/route.ts src/app/api/ai/parse-itinerary/route.ts
git commit -m "feat: add AI generate and parse itinerary API routes"
```

---

## Task 5: ItineraryDayGroup component (display + dnd-kit per period)

**Files:**
- Create: `src/components/ItineraryDayGroup.tsx`

This component renders one day's worth of itinerary, grouped by period. Each period group has its own `DndContext` + `SortableContext` so drag-drop is scoped within a period. Each activity row has a drag handle, editable activity name, Google Maps link, and delete button.

- [ ] **Step 1: Create `src/components/ItineraryDayGroup.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { ItineraryItem, Period, PERIOD_LABELS, PERIODS } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityRowProps {
  item: ItineraryItem;
  onUpdate: (itemId: string, updates: { activity?: string }) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  dragHandle: React.ReactNode;
}

function ActivityRow({ item, onUpdate, onDelete, dragHandle }: ActivityRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.activity);

  const handleBlur = async () => {
    setEditing(false);
    if (value.trim() && value !== item.activity) {
      await onUpdate(item.id, { activity: value.trim() });
    } else {
      setValue(item.activity);
    }
  };

  const mapsUrl = `https://maps.google.com?q=${encodeURIComponent(item.activity)}`;

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
      {dragHandle}
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setValue(item.activity); setEditing(false); } }}
          className="flex-1 text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      ) : (
        <span
          className="flex-1 text-sm text-gray-700 cursor-text"
          onClick={() => setEditing(true)}
        >
          {item.activity}
        </span>
      )}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
        title="在 Google Maps 開啟"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      </a>
      <button
        onClick={() => onDelete(item.id)}
        className="shrink-0 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        title="刪除"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function SortableActivityRow(props: ActivityRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ActivityRow
        {...props}
        dragHandle={
          <span
            {...attributes}
            {...listeners}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 select-none"
            title="拖曳排序"
          >
            ⠿
          </span>
        }
      />
    </div>
  );
}

interface ItineraryDayGroupProps {
  day: number;
  items: ItineraryItem[];  // all items for this day, all periods
  onUpdate: (itemId: string, updates: { activity?: string }) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onReorder: (day: number, period: Period, orderedItems: ItineraryItem[]) => Promise<void>;
}

export default function ItineraryDayGroup({
  day,
  items,
  onUpdate,
  onDelete,
  onReorder,
}: ItineraryDayGroupProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const periodItems = (period: Period) =>
    items.filter((i) => i.period === period).sort((a, b) => a.order - b.order);

  const handleDragEnd = (period: Period) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = periodItems(period);
    const oldIndex = current.findIndex((i) => i.id === active.id);
    const newIndex = current.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(current, oldIndex, newIndex);
    onReorder(day, period, reordered);
  };

  return (
    <div className="space-y-3">
      {PERIODS.map((period) => {
        const pItems = periodItems(period);
        if (pItems.length === 0) return null;
        return (
          <div key={period}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-8">
                {PERIOD_LABELS[period]}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd(period)}
            >
              <SortableContext
                items={pItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {pItems.map((item) => (
                    <SortableActivityRow
                      key={item.id}
                      item={item}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      dragHandle={null}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
git add src/components/ItineraryDayGroup.tsx
git commit -m "feat: add ItineraryDayGroup with dnd-kit per-period drag-drop"
```

---

## Task 6: ItineraryBlock component (full UI: display + manual add + AI generate + paste)

**Files:**
- Create: `src/components/ItineraryBlock.tsx`

This is the main itinerary UI. It uses `useItinerary` hook, renders days using `ItineraryDayGroup`, and adds AI generate / paste-to-parse flows with a preview step before saving.

- [ ] **Step 1: Create `src/components/ItineraryBlock.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Trip, ItineraryItem, Period, PERIODS, PERIOD_LABELS } from '@/lib/types';
import { useItinerary } from '@/hooks/useItinerary';
import CollapsibleCard from './CollapsibleCard';
import ItineraryDayGroup from './ItineraryDayGroup';

interface ItineraryBlockProps {
  tripId: string;
  trip: Trip;
  weatherSummary?: string;
}

type UIMode = 'idle' | 'add' | 'ai-generate' | 'paste';

export default function ItineraryBlock({ tripId, trip, weatherSummary }: ItineraryBlockProps) {
  const { items, isLoading, addItems, updateItem, deleteItem, reorderPeriod } = useItinerary(tripId);

  // UI mode
  const [mode, setMode] = useState<UIMode>('idle');

  // Manual add form
  const [addForm, setAddForm] = useState<{ day: number; period: Period; activity: string }>({
    day: 1,
    period: 'morning',
    activity: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // AI generate
  const [generating, setGenerating] = useState(false);

  // Paste parse
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);

  // Preview (shared for both AI generate and paste)
  const [previewItems, setPreviewItems] = useState<Omit<ItineraryItem, 'id' | 'created_at'>[]>([]);
  const [saving, setSaving] = useState(false);

  // Days array for display
  const days = Array.from(new Set(items.map((i) => i.day))).sort((a, b) => a - b);
  const allDays = Array.from({ length: trip.days }, (_, i) => i + 1);

  const handleManualAdd = async () => {
    if (!addForm.activity.trim()) return;
    setAddSubmitting(true);
    try {
      const existingInPeriod = items.filter(
        (i) => i.day === addForm.day && i.period === addForm.period
      );
      await addItems([{
        day: addForm.day,
        period: addForm.period,
        activity: addForm.activity.trim(),
        order: existingInPeriod.length,
      }]);
      setAddForm((prev) => ({ ...prev, activity: '' }));
      setMode('idle');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: trip.destination,
          days: trip.days,
          tripType: trip.trip_type,
          weatherSummary,
        }),
      });
      if (!res.ok) throw new Error('生成失敗');
      const data = await res.json();
      const rawItems = data.items as { day: number; period: Period; activity: string }[];
      // Assign order within each day+period group
      const orderMap = new Map<string, number>();
      const withOrder = rawItems.map((item) => {
        const key = `${item.day}-${item.period}`;
        const order = orderMap.get(key) ?? 0;
        orderMap.set(key, order + 1);
        return { day: item.day, period: item.period, activity: item.activity, order };
      });
      setPreviewItems(withOrder);
      setMode('ai-generate');
    } catch {
      alert('AI 行程生成失敗，請稍後再試');
    } finally {
      setGenerating(false);
    }
  };

  const handlePaste = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/ai/parse-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });
      if (!res.ok) throw new Error('解析失敗');
      const data = await res.json();
      const rawItems = data.items as { day: number; period: Period; activity: string }[];
      const orderMap = new Map<string, number>();
      const withOrder = rawItems.map((item) => {
        const key = `${item.day}-${item.period}`;
        const order = orderMap.get(key) ?? 0;
        orderMap.set(key, order + 1);
        return { day: item.day, period: item.period, activity: item.activity, order };
      });
      setPreviewItems(withOrder);
    } catch {
      alert('行程解析失敗，請確認格式後重試');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmPreview = async () => {
    if (!previewItems.length) return;
    setSaving(true);
    try {
      await addItems(previewItems);
      setPreviewItems([]);
      setPasteText('');
      setMode('idle');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewItems([]);
    if (mode === 'paste') setPasteText('');
    else setMode('idle');
  };

  // Group preview items by day for display
  const previewDays = Array.from(new Set(previewItems.map((i) => i.day))).sort((a, b) => a - b);

  const totalItems = items.length;

  return (
    <CollapsibleCard
      id="itinerary"
      title="行程"
      count={totalItems}
      defaultOpen={false}
    >
      {isLoading ? (
        <p className="text-sm text-gray-400 py-4 text-center">載入中...</p>
      ) : (
        <div className="space-y-4">
          {/* Items display */}
          {allDays.map((day) => {
            const dayItems = items.filter((i) => i.day === day);
            return (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-600">第 {day} 天</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {dayItems.length > 0 ? (
                  <ItineraryDayGroup
                    day={day}
                    items={dayItems}
                    onUpdate={(itemId, updates) => updateItem(itemId, updates)}
                    onDelete={deleteItem}
                    onReorder={reorderPeriod}
                  />
                ) : (
                  <p className="text-xs text-gray-300 pl-2">尚未新增活動</p>
                )}
              </div>
            );
          })}

          {/* Preview area */}
          {previewItems.length > 0 && (
            <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-700">
                  預覽（{previewItems.length} 個活動）
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelPreview}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmPreview}
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? '儲存中...' : '確認儲存'}
                  </button>
                </div>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {previewDays.map((day) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">第 {day} 天</p>
                    {PERIODS.map((period) => {
                      const pItems = previewItems.filter((i) => i.day === day && i.period === period);
                      if (!pItems.length) return null;
                      return (
                        <div key={period} className="ml-2 mb-1">
                          <span className="text-xs text-gray-400">{PERIOD_LABELS[period]}：</span>
                          {pItems.map((item, idx) => (
                            <span key={idx} className="text-xs text-gray-600 ml-1">
                              {item.activity}{idx < pItems.length - 1 ? '、' : ''}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paste mode textarea */}
          {mode === 'paste' && previewItems.length === 0 && (
            <div className="space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'在此貼上行程文字，例如：\n第一天\n早上：淺草寺\n下午：秋葉原\n晚上：拉麵晚餐'}
                rows={6}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setMode('idle'); setPasteText(''); }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handlePaste}
                  disabled={parsing || !pasteText.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {parsing ? 'AI 解析中...' : 'AI 解析'}
                </button>
              </div>
            </div>
          )}

          {/* Manual add form */}
          {mode === 'add' && (
            <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs text-gray-500">天</span>
                  <select
                    value={addForm.day}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, day: Number(e.target.value) }))}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: trip.days }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>第 {d} 天</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">時段</span>
                  <select
                    value={addForm.period}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, period: e.target.value as Period }))}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <input
                value={addForm.activity}
                onChange={(e) => setAddForm((prev) => ({ ...prev, activity: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdd(); }}
                placeholder="輸入活動名稱"
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setMode('idle')}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleManualAdd}
                  disabled={!addForm.activity.trim() || addSubmitting}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {addSubmitting ? '新增中...' : '新增活動'}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {mode === 'idle' && previewItems.length === 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode('add')}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                新增活動
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-purple-500 hover:text-purple-700 hover:bg-purple-50 border border-dashed border-purple-200 hover:border-purple-300 rounded-xl transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI 生成中...
                  </>
                ) : (
                  <>✨ AI 生成行程</>
                )}
              </button>
              <button
                onClick={() => setMode('paste')}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-blue-500 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-200 hover:border-blue-300 rounded-xl transition-colors"
              >
                📋 貼上行程
              </button>
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
git add src/components/ItineraryBlock.tsx
git commit -m "feat: add ItineraryBlock with manual add, AI generate, paste-to-parse"
```

---

## Task 7: Navigation integration + trip page wiring

**Files:**
- Modify: `src/components/navItems.ts`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/app/trip/[tripId]/page.tsx`

- [ ] **Step 1: Add itinerary to `src/components/navItems.ts`**

Replace the `NAV_ITEMS` array:

```typescript
export const NAV_ITEMS: NavItem[] = [
  { id: 'itinerary', label: '行程', type: 'scroll' },
  { id: 'tickets', label: '票券', type: 'scroll' },
  { id: 'hotels', label: '住宿', type: 'scroll' },
  { id: 'packing', label: '行李表', type: 'scroll' },
  { id: 'checklist', label: '事前準備', type: 'scroll' },
  { id: 'share', label: '分享', type: 'action' },
  { id: 'home', label: '首頁', type: 'link', href: '/' },
];
```

- [ ] **Step 2: Add itinerary icon to `src/components/BottomNav.tsx`**

In the `icons` record (around line 49), add an entry for `itinerary` before `tickets`:

```typescript
  itinerary: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
```

- [ ] **Step 3: Update `src/app/trip/[tripId]/page.tsx`**

Add the import:

```typescript
import ItineraryBlock from '@/components/ItineraryBlock';
```

In the JSX, add `ItineraryBlock` before `TicketsList` (so it appears first in the scrollable list, matching the nav order):

```typescript
          <TicketsList tripId={tripId} trip={trip} />
```

→ becomes:

```typescript
          <ItineraryBlock tripId={tripId} trip={trip} weatherSummary={weatherSummary} />
          <TicketsList tripId={tripId} trip={trip} />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit and push**

```bash
cd /Users/kohsin/Desktop/Codes/TravelAPP
git add src/components/navItems.ts src/components/BottomNav.tsx src/app/trip/[tripId]/page.tsx
git commit -m "feat: add itinerary to navigation and trip page"
git push origin main && git push mine main
```

---

## Self-Review

**Spec coverage check:**
- ✅ `{tripId}_itinerary` Google Sheet — Task 1
- ✅ Fields: `id`, `day`, `period`, `activity`, `order`, `created_at` — Task 1
- ✅ GET/POST/PATCH/DELETE API + bulk reorder (PUT) — Task 2
- ✅ AI generate itinerary (Gemini) — Task 3 + Task 4
- ✅ AI parse pasted text (Gemini) — Task 3 + Task 4
- ✅ ItineraryBlock with day grouping + period grouping — Task 6
- ✅ Drag-drop within same period only — Task 5 (each period has its own DndContext)
- ✅ Google Maps icon per activity (opens `maps.google.com?q=...`) — Task 5
- ✅ Preview before confirm save (generate + paste) — Task 6
- ✅ Manual add form (day + period + activity) — Task 6
- ✅ Inline edit activity name (click to edit) — Task 5
- ✅ Bottom nav itinerary tab — Task 7
- ✅ ItineraryBlock in trip page — Task 7
- ✅ weatherSummary passed to AI generate — Task 6

**Type consistency:**
- `ItineraryItem` defined in Task 1, used consistently in Tasks 2, 5, 6
- `Period` type defined in Task 1, `PERIOD_LABELS`/`PERIOD_ORDER`/`PERIODS` also Task 1
- `addItineraryItems` accepts `Omit<ItineraryItem, 'created_at'>[]` (IDs pre-generated in API route) — consistent with Task 2 API route
- `useItinerary.addItems` accepts `Omit<ItineraryItem, 'id' | 'created_at'>[]` — IDs generated in API route ✅
- `ItineraryItemAI` defined in Task 3, used in Task 4 API routes ✅
