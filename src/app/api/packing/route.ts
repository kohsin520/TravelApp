import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getPackingItems, addPackingItems, updatePackingItem, deletePackingItem, deletePackingItemsBySource } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
    const items = await getPackingItems(tripId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Get packing error:', error);
    return NextResponse.json({ error: '取得行李清單失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items, replaceSource } = body as {
      tripId: string;
      items: { category: string; item_name: string; source?: string }[];
      replaceSource?: string;
    };
    if (!tripId || !items?.length) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    // If replaceSource is set, delete all items with that source first (e.g. template replace)
    if (replaceSource) {
      await deletePackingItemsBySource(tripId, replaceSource);
    }
    // Dedup: check remaining items in sheet before adding
    const existing = await getPackingItems(tripId);
    const existingKeys = new Set(existing.map((i) => `${i.category}|${i.item_name}`));
    const uniqueItems = items.filter((i) => !existingKeys.has(`${i.category}|${i.item_name}`));
    if (uniqueItems.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: '所有項目已存在' });
    }
    const packingItems = uniqueItems.map((item) => ({
      id: nanoid(10),
      category: item.category,
      item_name: item.item_name,
      packed: false,
      source: (item.source || 'custom') as 'preset' | 'ai' | 'custom',
    }));
    await addPackingItems(tripId, packingItems);
    return NextResponse.json({ success: true, count: packingItems.length });
  } catch (error) {
    console.error('Add packing error:', error);
    return NextResponse.json({ error: '新增行李項目失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId, updates } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await updatePackingItem(tripId, itemId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update packing error:', error);
    return NextResponse.json({ error: '更新行李項目失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await deletePackingItem(tripId, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete packing error:', error);
    return NextResponse.json({ error: '刪除行李項目失敗' }, { status: 500 });
  }
}
