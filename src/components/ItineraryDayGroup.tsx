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
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setValue(item.activity); setEditing(false); }
          }}
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
