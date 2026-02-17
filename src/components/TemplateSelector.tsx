'use client';

import { useState } from 'react';
import { TripType, TRIP_TYPES, CATEGORIES } from '@/lib/types';
import { packingTemplates } from '@/lib/templates';

interface TemplateSelectorProps {
  onLoadTemplate: (items: { category: string; item_name: string; source: string }[]) => void;
}

export default function TemplateSelector({ onLoadTemplate }: TemplateSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleSelect = (type: TripType) => {
    setLoading(true);
    const template = packingTemplates[type];
    const items: { category: string; item_name: string; source: string }[] = [];
    for (const cat of CATEGORIES) {
      for (const itemName of template[cat]) {
        items.push({ category: cat, item_name: itemName, source: 'preset' });
      }
    }
    onLoadTemplate(items);
    setLoading(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TRIP_TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => handleSelect(t.value)}
          disabled={loading}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          {t.label}模板
        </button>
      ))}
    </div>
  );
}
