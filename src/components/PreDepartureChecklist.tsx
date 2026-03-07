'use client';

import { useState } from 'react';
import { Trip } from '@/lib/types';
import { useChecklist } from '@/hooks/useChecklist';
import CollapsibleCard from './CollapsibleCard';
import ChecklistItem from './ChecklistItem';

interface PreDepartureChecklistProps {
  tripId: string;
  trip: Trip;
}

export default function PreDepartureChecklist({ tripId, trip }: PreDepartureChecklistProps) {
  const { items, isLoading, toggleDone, addItems, deleteItem } = useChecklist(tripId);
  const [taskName, setTaskName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pendingItems, setPendingItems] = useState<{ text: string; checked: boolean }[]>([]);
  const [addingPending, setAddingPending] = useState(false);

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = taskName.trim();
    if (!name) return;
    addItems([{ task_name: name }]);
    setTaskName('');
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/recommend-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: trip.destination,
          days: trip.days,
          season: trip.season,
          tripType: trip.trip_type,
        }),
      });
      if (!res.ok) throw new Error('生成失敗');
      const data = await res.json();
      setPendingItems((data.items as string[]).map((text) => ({ text, checked: true })));
    } catch {
      alert('AI 生成失敗，請稍後再試');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddPending = async () => {
    const selected = pendingItems.filter((i) => i.checked).map((i) => ({ task_name: i.text }));
    if (selected.length === 0) return;
    setAddingPending(true);
    try {
      await addItems(selected);
      setPendingItems([]);
    } finally {
      setAddingPending(false);
    }
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

            {totalCount > 0 && (
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
            )}

            {/* AI 生成待確認清單 */}
            {pendingItems.length > 0 && (
              <div className="border border-purple-200 rounded-xl p-3 bg-purple-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    AI 建議（{pendingItems.filter((i) => i.checked).length} 項已勾選）
                  </span>
                  <button
                    onClick={() => setPendingItems([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    取消
                  </button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {pendingItems.map((item, index) => (
                    <label key={index} className="flex items-center gap-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) =>
                          setPendingItems((prev) =>
                            prev.map((p, i) => i === index ? { ...p, checked: e.target.checked } : p)
                          )
                        }
                        className="rounded text-green-600"
                      />
                      <span className="text-sm text-gray-700">{item.text}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 justify-between pt-1">
                  <button
                    onClick={() => setPendingItems((prev) => prev.map((p) => ({ ...p, checked: true })))}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    全選
                  </button>
                  <button
                    onClick={handleAddPending}
                    disabled={addingPending || pendingItems.every((i) => !i.checked)}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {addingPending ? '新增中...' : `加入 ${pendingItems.filter((i) => i.checked).length} 項`}
                  </button>
                </div>
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

            {/* AI 生成按鈕 */}
            {pendingItems.length === 0 && (
              <button
                onClick={handleAiGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-purple-500 hover:text-purple-700 hover:bg-purple-50 border border-dashed border-purple-200 hover:border-purple-300 rounded-xl transition-colors disabled:opacity-50"
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
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI 依旅遊資訊生成準備清單
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </CollapsibleCard>
    </section>
  );
}
