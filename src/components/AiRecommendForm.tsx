'use client';

import { useState } from 'react';
import { Trip } from '@/lib/types';

interface AiRecommendation {
  category: string;
  items: string[];
}

interface AiRecommendFormProps {
  trip: Trip;
  onAddItems: (items: { category: string; item_name: string; source: string }[]) => void;
}

export default function AiRecommendForm({ trip, onAddItems }: AiRecommendFormProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AiRecommendation[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: trip.destination,
          days: trip.days,
          season: trip.season,
          tripType: trip.trip_type,
        }),
      });
      if (!res.ok) throw new Error('AI 推薦失敗');
      const data = await res.json();
      setRecommendations(data);
      // Select all by default
      const allKeys = new Set<string>();
      data.forEach((cat: AiRecommendation) =>
        cat.items.forEach((item: string) => allKeys.add(`${cat.category}|${item}`))
      );
      setSelected(allKeys);
    } catch {
      setError('AI 推薦失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddSelected = () => {
    const items = Array.from(selected).map((key) => {
      const [category, item_name] = key.split('|');
      return { category, item_name, source: 'ai' };
    });
    onAddItems(items);
    setRecommendations(null);
    setSelected(new Set());
  };

  const handleAddAll = () => {
    if (!recommendations) return;
    const items: { category: string; item_name: string; source: string }[] = [];
    recommendations.forEach((cat) =>
      cat.items.forEach((item) => items.push({ category: cat.category, item_name: item, source: 'ai' }))
    );
    onAddItems(items);
    setRecommendations(null);
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
        AI 智慧推薦
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {recommendations && (
        <div className="border border-violet-200 rounded-lg p-4 bg-violet-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-violet-800">AI 推薦結果</h4>
            <div className="flex gap-2">
              <button
                onClick={handleAddSelected}
                className="px-3 py-1 text-xs font-medium text-white bg-violet-600 rounded hover:bg-violet-700 transition-colors"
              >
                加入已選 ({selected.size})
              </button>
              <button
                onClick={handleAddAll}
                className="px-3 py-1 text-xs font-medium text-violet-600 border border-violet-300 rounded hover:bg-violet-100 transition-colors"
              >
                全部加入
              </button>
            </div>
          </div>
          {recommendations.map((cat) => (
            <div key={cat.category}>
              <p className="text-xs font-medium text-violet-600 mb-1">{cat.category}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map((item) => {
                  const key = `${cat.category}|${item}`;
                  const isSelected = selected.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleItem(key)}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                        isSelected
                          ? 'bg-violet-200 text-violet-800'
                          : 'bg-white text-gray-500 border border-gray-200'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setRecommendations(null);
              setSelected(new Set());
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            關閉推薦
          </button>
        </div>
      )}
    </div>
  );
}
