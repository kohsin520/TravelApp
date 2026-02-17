'use client';

import { PackingItem as PackingItemType } from '@/lib/types';

interface PackingItemProps {
  item: PackingItemType;
  onToggle: (id: string, packed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function PackingItem({ item, onToggle, onDelete }: PackingItemProps) {
  const sourceColors: Record<string, string> = {
    preset: 'bg-gray-100 text-gray-500',
    ai: 'bg-violet-100 text-violet-600',
    custom: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <input
        type="checkbox"
        checked={item.packed}
        onChange={() => onToggle(item.id, !item.packed)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <span className={`flex-1 text-sm ${item.packed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {item.item_name}
      </span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${sourceColors[item.source]}`}>
        {item.source === 'preset' ? '預設' : item.source === 'ai' ? 'AI' : '自訂'}
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
