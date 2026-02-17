'use client';

import { ChecklistItem as ChecklistItemType } from '@/lib/types';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}

export default function ChecklistItem({ item, onToggle, onDelete }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3 py-2 group">
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item.id, !item.done)}
        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
      />
      <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {item.task_name}
      </span>
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
