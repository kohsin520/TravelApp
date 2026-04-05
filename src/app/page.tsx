'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TRIP_TYPES } from '@/lib/types';
import { getTripHistory, removeTripFromHistory, TripRecord, saveTripToHistory } from '@/lib/tripHistory';

function calculateSeason(dateStr: string): string {
  const month = new Date(dateStr).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [myTrips, setMyTrips] = useState<TripRecord[]>([]);

  useEffect(() => {
    setMyTrips(getTripHistory());
  }, []);

  const [form, setForm] = useState({
    trip_name: '',
    destination: '',
    days: 5,
    start_date: '',
    trip_type: 'city',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const season = form.start_date ? calculateSeason(form.start_date) : 'summer';
      const res = await fetch('/api/trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, season }),
      });
      const data = await res.json();
      if (data.tripId) {
        saveTripToHistory({
          tripId: data.tripId,
          trip_name: form.trip_name,
          destination: form.destination,
          created_at: new Date().toISOString(),
        });
        router.push(`/trip/${data.tripId}`);
      } else {
        alert(`建立旅程失敗：${data.error || '未知錯誤'}`);
      }
    } catch {
      alert('建立旅程失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">TravelAPP</h1>
          <p className="text-gray-500 mt-2">和旅伴一起整理行李、準備出國事項</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">旅程名稱</label>
            <input
              type="text"
              required
              value={form.trip_name}
              onChange={(e) => setForm({ ...form, trip_name: e.target.value })}
              placeholder="例：2026 東京自由行"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目的地</label>
            <input
              type="text"
              required
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="例：日本東京"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">天數</label>
              <input
                type="number"
                required
                min={1}
                max={90}
                value={form.days}
                onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出發日期</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
              <select
                value={form.trip_type}
                onChange={(e) => setForm({ ...form, trip_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                {TRIP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '建立中...' : '建立旅程'}
          </button>
        </form>

        {myTrips.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">我的旅程</h2>
            <div className="space-y-2">
              {myTrips.map((t) => (
                <div key={t.tripId} className="flex items-center gap-2">
                  <a
                    href={`/trip/${t.tripId}`}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate">{t.trip_name}</p>
                      <p className="text-xs text-gray-400">{t.destination}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </a>
                  <button
                    onClick={() => {
                      removeTripFromHistory(t.tripId);
                      setMyTrips(getTripHistory());
                    }}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    title="從列表移除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
