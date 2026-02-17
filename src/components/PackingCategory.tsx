'use client';

import { useState } from 'react';
import { PackingItem as PackingItemType } from '@/lib/types';
import PackingItem from './PackingItem';

interface PackingCategoryProps {
  category: string;
  items: PackingItemType[];
  onToggle: (id: string, packed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function PackingCategory({ category, items, onToggle, onDelete }: PackingCategoryProps) {
  const [open, setOpen] = useState(true);
  const packedCount = items.filter((i) => i.packed).length;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 hover:bg-gray-50 transition-colors rounded"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-700">{category}</span>
        </div>
        <span className="text-xs text-gray-400">
          {packedCount}/{items.length}
        </span>
      </button>
      {open && (
        <div className="pl-6 pb-2">
          {items.map((item) => (
            <PackingItem key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
