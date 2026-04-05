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

type UpdatePayload = { activity?: string; day?: number; period?: Period };

interface ActivityRowProps {
  item: ItineraryItem;
  tripDays: number;
  onUpdate: (itemId: string, updates: UpdatePayload) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  dragHandle: React.ReactNode;
}

function ActivityRow({ item, tripDays, onUpdate, onDelete, dragHandle }: ActivityRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.activity);
  const [moving, setMoving] = useState(false);
  const [moveDay, setMoveDay] = useState(item.day);
  const [movePeriod, setMovePeriod] = useState<Period>(item.period);
  const [moveSaving, setMoveSaving] = useState(false);

  const handleBlur = async () => {
    setEditing(false);
    if (value.trim() && value !== item.activity) {
      await onUpdate(item.id, { activity: value.trim() });
    } else {
      setValue(item.activity);
    }
  };

  const handleMoveConfirm = async () => {
    if (moveDay === item.day && movePeriod === item.period) {
      setMoving(false);
      return;
    }
    setMoveSaving(true);
    try {
      await onUpdate(item.id, { day: moveDay, period: movePeriod });
      setMoving(false);
    } finally {
      setMoveSaving(false);
    }
  };

  const mapsUrl = `https://maps.google.com?q=${encodeURIComponent(item.activity)}`;

  return (
    <div>
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
        {dragHandle}
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') { setValue(item.activity); setEditing(false); }
            }}
            className="flex-1 text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        ) : (
          <span
            className="flex-1 text-sm text-gray-700 cursor-text select-none"
            onClick={() => setEditing(true)}
          >
            {item.activity}
          </span>
        )}
        {/* Google Maps */}
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
        {/* Move button */}
        <button
          onClick={() => { setMoving((v) => !v); setMoveDay(item.day); setMovePeriod(item.period); }}
          className="shrink-0 text-gray-400 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100"
          title="移動到其他天/時段"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>
        {/* Delete */}
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

      {/* Move picker */}
      {moving && (
        <div className="ml-8 mb-2 flex items-center gap-2 flex-wrap">
          <select
            value={moveDay}
            onChange={(e) => setMoveDay(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1"
          >
            {Array.from({ length: tripDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>第 {d} 天</option>
            ))}
          </select>
          <select
            value={movePeriod}
            onChange={(e) => setMovePeriod(e.target.value as Period)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
            ))}
          </select>
          <button
            onClick={handleMoveConfirm}
            disabled={moveSaving}
            className="text-xs bg-orange-500 text-white px-2 py-1 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {moveSaving ? '移動中...' : '確認'}
          </button>
          <button
            onClick={() => setMoving(false)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            取消
          </button>
        </div>
      )}
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
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 select-none touch-none"
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
  tripDays: number;
  items: ItineraryItem[];
  onUpdate: (itemId: string, updates: UpdatePayload) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onReorder: (day: number, period: Period, orderedItems: ItineraryItem[]) => Promise<void>;
}

export default function ItineraryDayGroup({
  day,
  tripDays,
  items,
  onUpdate,
  onDelete,
  onReorder,
}: ItineraryDayGroupProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Increased delay to 400ms to prevent text selection on mobile
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } })
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
                      tripDays={tripDays}
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
