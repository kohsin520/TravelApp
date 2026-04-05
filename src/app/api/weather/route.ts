import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const destination = searchParams.get('destination');
  const startDate = searchParams.get('startDate');
  const days = Number(searchParams.get('days') ?? '1');

  if (!destination || !startDate) {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
  }

  // Step 1: Geocoding
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) {
    return NextResponse.json({ error: '找不到該地點' }, { status: 404 });
  }
  const { latitude, longitude } = geoData.results[0];

  // Step 2: Check 16-day limit
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 15) {
    return NextResponse.json({ unavailable: true });
  }

  // Step 3: Compute end date
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  const endDate = end.toISOString().split('T')[0];

  // Step 4: Fetch forecast
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weathercode&timezone=auto&start_date=${startDate}&end_date=${endDate}`
  );
  const weatherData = await weatherRes.json();

  const daily = weatherData.daily;
  const weather = (daily.time as string[]).map((date, i) => ({
    date,
    maxTemp: Math.round(daily.temperature_2m_max[i] ?? 0),
    minTemp: Math.round(daily.temperature_2m_min[i] ?? 0),
    rainProb: Math.round(daily.precipitation_probability_mean[i] ?? 0),
    weatherCode: daily.weathercode[i] ?? 0,
    emoji: getWeatherEmoji(daily.weathercode[i] ?? 0),
  }));

  return NextResponse.json({ weather });
}
