import { NextRequest, NextResponse } from 'next/server';
import { recognizeTicketFromImage } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: '缺少圖片資料' }, { status: 400 });
    }

    // Parse data URL: "data:image/png;base64,iVBOR..."
    const match = image.match(/^data:(.+?);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: '圖片格式錯誤' }, { status: 400 });
    }

    const mimeType = match[1];
    const base64 = match[2];

    const result = await recognizeTicketFromImage(base64, mimeType);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI recognize ticket error:', error);
    return NextResponse.json({ error: 'AI 辨識票券失敗' }, { status: 500 });
  }
}
