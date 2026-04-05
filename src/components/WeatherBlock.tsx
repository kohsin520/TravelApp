'use client';

import { useWeather } from '@/hooks/useWeather';

interface WeatherBlockProps {
  destination: string;
  startDate: string;
  days: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    weekday: weekdays[d.getDay()],
  };
}

export default function WeatherBlock({ destination, startDate, days }: WeatherBlockProps) {
  const { weather, unavailable, isLoading, isError } = useWeather(destination, startDate, days);

  if (isLoading) {
    return (
      <div className="mx-4 mb-2 text-xs text-gray-400 text-center py-2">載入天氣中...</div>
    );
  }

  if (unavailable) {
    return (
      <div className="mx-4 mb-2 text-xs text-gray-400 text-center py-2">
        出發日期超過 16 天，天氣預報尚未開放
      </div>
    );
  }

  if (isError || weather.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-2 p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">天氣預報</h3>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {weather.map((day, i) => {
          const { date, weekday } = formatDate(day.date);
          return (
            <div
              key={day.date}
              className="flex flex-col items-center min-w-[58px] bg-gray-50 rounded-xl p-2 shrink-0"
            >
              <span className="text-[10px] text-gray-400">第{i + 1}天</span>
              <span className="text-[10px] text-gray-500">{date}（{weekday}）</span>
              <span className="text-2xl my-1">{day.emoji}</span>
              <span className="text-xs font-medium text-gray-700">{day.maxTemp}°</span>
              <span className="text-xs text-gray-400">{day.minTemp}°</span>
              {day.rainProb > 0 && (
                <span className="text-[10px] text-blue-400 mt-0.5">💧{day.rainProb}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
