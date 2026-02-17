'use client';

import { useState } from 'react';
import { CATEGORIES, PackingCategory } from '@/lib/types';

interface AddItemFormProps {
  onAdd: (items: { category: string; item_name: string; source: string }[]) => void;
}

export default function AddItemForm({ onAdd }: AddItemFormProps) {
  const [category, setCategory] = useState<PackingCategory>(CATEGORIES[0]);
  const [itemName, setItemName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = itemName.trim();
    if (!name) return;
    onAdd([{ category, item_name: name, source: 'custom' }]);
    setItemName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mt-3">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as PackingCategory)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="新增行李項目..."
        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        新增
      </button>
    </form>
  );
}
