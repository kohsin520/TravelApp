import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createTrip, getTrip } from '@/lib/sheets';
import { addChecklistItems } from '@/lib/sheets';
import { defaultChecklistItems } from '@/lib/templates';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trip_name, destination, days, season, trip_type } = body;

    if (!trip_name || !destination || !days || !season || !trip_type) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const tripId = nanoid(12);
    const trip = {
      trip_id: tripId,
      trip_name,
      destination,
      days: Number(days),
      season,
      trip_type,
      created_at: new Date().toISOString(),
    };

    await createTrip(trip);

    // Auto-create default checklist items
    const checklistItems = defaultChecklistItems.map((task_name) => ({
      id: nanoid(10),
      task_name,
      done: false,
      source: 'preset' as const,
    }));
    await addChecklistItems(tripId, checklistItems);

    return NextResponse.json({ tripId });
  } catch (error) {
    console.error('Create trip error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `建立旅程失敗：${message}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) {
      return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
    }
    const trip = await getTrip(tripId);
    if (!trip) {
      return NextResponse.json({ error: '找不到旅程' }, { status: 404 });
    }
    return NextResponse.json(trip);
  } catch (error) {
    console.error('Get trip error:', error);
    return NextResponse.json({ error: '取得旅程失敗' }, { status: 500 });
  }
}
