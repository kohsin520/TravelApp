import { NextRequest, NextResponse } from 'next/server';
import { getAiTicketRecommendations } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, days, tripType } = body;
    if (!destination || !days || !tripType) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const recommendations = await getAiTicketRecommendations(destination, days, tripType);
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('AI ticket recommend error:', error);
    return NextResponse.json({ error: 'AI 推薦失敗' }, { status: 500 });
  }
}
