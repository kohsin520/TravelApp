'use client';

import { useState } from 'react';
import { useChecklist } from '@/hooks/useChecklist';
import CollapsibleCard from './CollapsibleCard';
import ChecklistItem from './ChecklistItem';

interface PreDepartureChecklistProps {
  tripId: string;
}

export default function PreDepartureChecklist({ tripId }: PreDepartureChecklistProps) {
  const { items, isLoading, toggleDone, addItems, deleteItem } = useChecklist(tripId);
  const [taskName, setTaskName] = useState('');

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = taskName.trim();
    if (!name) return;
    addItems([{ task_name: name }]);
    setTaskName('');
  };

  return (
    <section id="checklist">
    <CollapsibleCard
      title="事前準備"
      subtitle={totalCount > 0 ? `${doneCount}/${totalCount} 已完成` : undefined}
    >
      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">載入中...</div>
      ) : (
        <div className="space-y-3">
          {items.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <ChecklistItem key={item.id} item={item} onToggle={toggleDone} onDelete={deleteItem} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">還沒有準備事項</p>
          )}

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
          )}

          {/* Add task form */}
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="新增準備事項..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              新增
            </button>
          </form>
        </div>
      )}
    </CollapsibleCard>
    </section>
  );
}
