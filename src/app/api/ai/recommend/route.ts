import { NextRequest, NextResponse } from 'next/server';
import { getAiPackingRecommendations } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, days, season, tripType, weatherSummary } = body;

    if (!destination || !days || !season || !tripType) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const recommendations = await getAiPackingRecommendations(destination, days, season, tripType, weatherSummary);
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('AI recommend error:', error);
    return NextResponse.json({ error: 'AI 推薦失敗' }, { status: 500 });
  }
}
