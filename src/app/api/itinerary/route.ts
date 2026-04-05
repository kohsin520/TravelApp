import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  getItineraryItems,
  addItineraryItems,
  updateItineraryItem,
  deleteItineraryItem,
  bulkUpdateItineraryOrder,
} from '@/lib/sheets';
import { ItineraryItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
    const items = await getItineraryItems(tripId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Get itinerary error:', error);
    return NextResponse.json({ error: '取得行程失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items } = body as {
      tripId: string;
      items: Omit<ItineraryItem, 'id' | 'created_at'>[];
    };
    if (!tripId || !items?.length) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const itemsWithIds = items.map((item) => ({ ...item, id: nanoid(10) }));
    await addItineraryItems(tripId, itemsWithIds);
    return NextResponse.json({ success: true, count: itemsWithIds.length });
  } catch (error) {
    console.error('Add itinerary error:', error);
    return NextResponse.json({ error: '新增行程失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId, updates } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await updateItineraryItem(tripId, itemId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return NextResponse.json({ error: '更新行程失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await deleteItineraryItem(tripId, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return NextResponse.json({ error: '刪除行程失敗' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items } = body as {
      tripId: string;
      items: { id: string; order: number }[];
    };
    if (!tripId || !items?.length) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await bulkUpdateItineraryOrder(tripId, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder itinerary error:', error);
    return NextResponse.json({ error: '排序更新失敗' }, { status: 500 });
  }
}
