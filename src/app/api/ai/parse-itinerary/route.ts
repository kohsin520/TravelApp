import { NextRequest, NextResponse } from 'next/server';
import { parseItinerary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body as { text: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: '缺少行程文字' }, { status: 400 });
    }
    const items = await parseItinerary(text);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Parse itinerary error:', error);
    return NextResponse.json({ error: '行程解析失敗' }, { status: 500 });
  }
}
