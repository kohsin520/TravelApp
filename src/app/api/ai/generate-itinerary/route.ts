import { NextRequest, NextResponse } from 'next/server';
import { generateItinerary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, days, tripType, weatherSummary } = body as {
      destination: string;
      days: number;
      tripType: string;
      weatherSummary?: string;
    };
    if (!destination || !days || !tripType) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const items = await generateItinerary(destination, days, tripType, weatherSummary);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Generate itinerary error:', error);
    return NextResponse.json({ error: '行程生成失敗' }, { status: 500 });
  }
}
