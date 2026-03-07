import { NextRequest, NextResponse } from 'next/server';
import { getAiChecklistRecommendations } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, days, season, tripType } = body;

    if (!destination || !days || !season || !tripType) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const items = await getAiChecklistRecommendations(destination, days, season, tripType);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('AI checklist recommend error:', error);
    return NextResponse.json({ error: 'AI 生成失敗' }, { status: 500 });
  }
}
