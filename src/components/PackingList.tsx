'use client';

import { Trip, CATEGORIES } from '@/lib/types';
import { usePackingList } from '@/hooks/usePackingList';
import CollapsibleCard from './CollapsibleCard';
import PackingCategory from './PackingCategory';
import AddItemForm from './AddItemForm';
import TemplateSelector from './TemplateSelector';
import AiRecommendForm from './AiRecommendForm';

interface PackingListProps {
  tripId: string;
  trip: Trip;
}

export default function PackingList({ tripId, trip }: PackingListProps) {
  const { items, isLoading, togglePacked, addItems, deleteItem } = usePackingList(tripId);

  const packedCount = items.filter((i) => i.packed).length;
  const totalCount = items.length;

  const loadTemplate = (newItems: { category: string; item_name: string; source?: string }[]) => {
    addItems(newItems, 'preset');
  };

  const reorganizeWithAi = (newItems: { category: string; item_name: string; source: string }[]) => {
    addItems(newItems, 'all');
  };

  const groupedItems = CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <section id="packing">
    <CollapsibleCard
      title="行李表"
      subtitle={totalCount > 0 ? `${packedCount}/${totalCount} 已打包` : undefined}
    >
      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">載入中...</div>
      ) : (
        <div className="space-y-4">
          {/* Template selector */}
          <div>
            <p className="text-xs text-gray-500 mb-2">快速載入模板：</p>
            <TemplateSelector onLoadTemplate={loadTemplate} />
          </div>

          {/* AI recommend */}
          <AiRecommendForm trip={trip} existingItems={items} onAddItems={addItems} onReorganize={reorganizeWithAi} />

          {/* Packing categories */}
          {groupedItems.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {groupedItems.map((group) => (
                <PackingCategory
                  key={group.category}
                  category={group.category}
                  items={group.items}
                  onToggle={togglePacked}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">
              還沒有行李項目，選擇模板或手動新增吧！
            </p>
          )}

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(packedCount / totalCount) * 100}%` }}
              />
            </div>
          )}

          {/* Add item form */}
          <AddItemForm onAdd={addItems} />
        </div>
      )}
    </CollapsibleCard>
    </section>
  );
}
