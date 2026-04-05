import useSWR from 'swr';

export interface DailyWeather {
  date: string;
  maxTemp: number;
  minTemp: number;
  rainProb: number;
  weatherCode: number;
  emoji: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWeather(destination: string, startDate: string | undefined, days: number) {
  const key =
    destination && startDate
      ? `/api/weather?destination=${encodeURIComponent(destination)}&startDate=${startDate}&days=${days}`
      : null;

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    weather: (data?.weather ?? []) as DailyWeather[],
    unavailable: (data?.unavailable ?? false) as boolean,
    isLoading,
    isError: !!error,
  };
}

export function buildWeatherSummary(weather: DailyWeather[]): string {
  if (!weather.length) return '';
  const maxTemps = weather.map((d) => d.maxTemp);
  const minTemps = weather.map((d) => d.minTemp);
  const rainyDays = weather.filter((d) => d.rainProb > 60).length;
  const overallMax = Math.max(...maxTemps);
  const overallMin = Math.min(...minTemps);
  let summary = `旅遊期間氣溫 ${overallMin}–${overallMax}°C`;
  if (rainyDays > 0) summary += `，有 ${rainyDays} 天降雨機率 > 60%`;
  return summary;
}
