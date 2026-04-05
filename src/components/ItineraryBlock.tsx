'use client';

import { useState } from 'react';
import { Trip, ItineraryItem, Period, PERIODS, PERIOD_LABELS } from '@/lib/types';
import { useItinerary } from '@/hooks/useItinerary';
import CollapsibleCard from './CollapsibleCard';
import ItineraryDayGroup from './ItineraryDayGroup';

interface ItineraryBlockProps {
  tripId: string;
  trip: Trip;
  weatherSummary?: string;
}

type UIMode = 'idle' | 'add' | 'paste';

export default function ItineraryBlock({ tripId, trip, weatherSummary }: ItineraryBlockProps) {
  const { items, isLoading, addItems, updateItem, deleteItem, reorderPeriod } = useItinerary(tripId);

  const [mode, setMode] = useState<UIMode>('idle');

  // Manual add form
  const [addForm, setAddForm] = useState<{ day: number; period: Period; activity: string }>({
    day: 1,
    period: 'morning',
    activity: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // AI generate
  const [generating, setGenerating] = useState(false);

  // Paste parse
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);

  // Preview (shared for AI generate and paste)
  const [previewItems, setPreviewItems] = useState<Omit<ItineraryItem, 'id' | 'created_at'>[]>([]);
  const [saving, setSaving] = useState(false);

  const allDays = Array.from({ length: trip.days }, (_, i) => i + 1);

  const assignOrders = (raw: { day: number; period: Period; activity: string }[]) => {
    const orderMap = new Map<string, number>();
    return raw.map((item) => {
      const key = `${item.day}-${item.period}`;
      const order = orderMap.get(key) ?? 0;
      orderMap.set(key, order + 1);
      return { day: item.day, period: item.period, activity: item.activity, order };
    });
  };

  const handleManualAdd = async () => {
    if (!addForm.activity.trim()) return;
    setAddSubmitting(true);
    try {
      const existingInPeriod = items.filter(
        (i) => i.day === addForm.day && i.period === addForm.period
      );
      await addItems([{
        day: addForm.day,
        period: addForm.period,
        activity: addForm.activity.trim(),
        order: existingInPeriod.length,
      }]);
      setAddForm((prev) => ({ ...prev, activity: '' }));
      setMode('idle');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: trip.destination,
          days: trip.days,
          tripType: trip.trip_type,
          weatherSummary,
        }),
      });
      if (!res.ok) throw new Error('生成失敗');
      const data = await res.json();
      const withOrder = assignOrders(data.items as { day: number; period: Period; activity: string }[]);
      if (withOrder.length === 0) {
        alert('AI 未能生成行程，請稍後再試');
        return;
      }
      setPreviewItems(withOrder);
    } catch {
      alert('AI 行程生成失敗，請稍後再試');
    } finally {
      setGenerating(false);
    }
  };

  const handlePaste = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/ai/parse-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });
      if (!res.ok) throw new Error('解析失敗');
      const data = await res.json();
      const withOrder = assignOrders(data.items as { day: number; period: Period; activity: string }[]);
      if (withOrder.length === 0) {
        alert('AI 無法解析此行程，請確認格式');
        return;
      }
      setPreviewItems(withOrder);
    } catch {
      alert('行程解析失敗，請確認格式後重試');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmPreview = async () => {
    if (!previewItems.length) return;
    setSaving(true);
    try {
      await addItems(previewItems);
      setPreviewItems([]);
      setPasteText('');
      setMode('idle');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewItems([]);
    // In paste mode, keep mode='paste' so textarea reappears for editing.
    // In AI generate mode, mode is already 'idle' — this is a no-op.
    if (mode !== 'paste') setMode('idle');
  };

  const previewDays = Array.from(new Set(previewItems.map((i) => i.day))).sort((a, b) => a - b);

  return (
    <section id="itinerary">
    <CollapsibleCard
      title="行程"
      subtitle={items.length > 0 ? `${items.length} 個活動` : undefined}
      defaultOpen={false}
    >
      {isLoading ? (
        <p className="text-sm text-gray-400 py-4 text-center">載入中...</p>
      ) : (
        <div className="space-y-4">
          {/* Items display grouped by day */}
          {allDays.map((day) => {
            const dayItems = items.filter((i) => i.day === day);
            return (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-600">第 {day} 天</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {dayItems.length > 0 ? (
                  <ItineraryDayGroup
                    day={day}
                    items={dayItems}
                    onUpdate={(itemId, updates) => updateItem(itemId, updates)}
                    onDelete={deleteItem}
                    onReorder={reorderPeriod}
                  />
                ) : (
                  <p className="text-xs text-gray-300 pl-2">尚未新增活動</p>
                )}
              </div>
            );
          })}

          {/* Preview area (AI generate or paste result) */}
          {previewItems.length > 0 && (
            <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-700">
                  預覽（{previewItems.length} 個活動）
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelPreview}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmPreview}
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? '儲存中...' : '確認儲存'}
                  </button>
                </div>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {previewDays.map((day) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">第 {day} 天</p>
                    {PERIODS.map((period) => {
                      const pItems = previewItems.filter((i) => i.day === day && i.period === period);
                      if (!pItems.length) return null;
                      return (
                        <div key={period} className="ml-2 mb-1">
                          <span className="text-xs text-gray-400">{PERIOD_LABELS[period]}：</span>
                          {pItems.map((item, idx) => (
                            <span key={idx} className="text-xs text-gray-600 ml-1">
                              {item.activity}{idx < pItems.length - 1 ? '、' : ''}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paste mode textarea */}
          {mode === 'paste' && previewItems.length === 0 && (
            <div className="space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'在此貼上行程文字，例如：\n第一天\n早上：淺草寺\n下午：秋葉原\n晚上：拉麵晚餐'}
                rows={6}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setMode('idle'); setPasteText(''); }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handlePaste}
                  disabled={parsing || !pasteText.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {parsing ? 'AI 解析中...' : 'AI 解析'}
                </button>
              </div>
            </div>
          )}

          {/* Manual add form */}
          {mode === 'add' && (
            <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs text-gray-500">天</span>
                  <select
                    value={addForm.day}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, day: Number(e.target.value) }))}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: trip.days }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>第 {d} 天</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">時段</span>
                  <select
                    value={addForm.period}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, period: e.target.value as Period }))}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <input
                value={addForm.activity}
                onChange={(e) => setAddForm((prev) => ({ ...prev, activity: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdd(); }}
                placeholder="輸入活動名稱"
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setMode('idle')}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleManualAdd}
                  disabled={!addForm.activity.trim() || addSubmitting}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {addSubmitting ? '新增中...' : '新增活動'}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons — only in idle mode with no preview */}
          {mode === 'idle' && previewItems.length === 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode('add')}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                新增活動
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-purple-500 hover:text-purple-700 hover:bg-purple-50 border border-dashed border-purple-200 hover:border-purple-300 rounded-xl transition-colors disabled:opacity-50"
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
                  <>✨ AI 生成行程</>
                )}
              </button>
              <button
                onClick={() => setMode('paste')}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-blue-500 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-200 hover:border-blue-300 rounded-xl transition-colors"
              >
                📋 貼上行程
              </button>
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
    </section>
  );
}
