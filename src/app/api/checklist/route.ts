import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getChecklistItems, addChecklistItems, updateChecklistItem, deleteChecklistItem } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
    const items = await getChecklistItems(tripId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Get checklist error:', error);
    return NextResponse.json({ error: '取得準備事項失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items } = body as {
      tripId: string;
      items: { task_name: string }[];
    };
    if (!tripId || !items?.length) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const checklistItems = items.map((item) => ({
      id: nanoid(10),
      task_name: item.task_name,
      done: false,
      source: 'custom' as const,
    }));
    await addChecklistItems(tripId, checklistItems);
    return NextResponse.json({ success: true, count: checklistItems.length });
  } catch (error) {
    console.error('Add checklist error:', error);
    return NextResponse.json({ error: '新增準備事項失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId, updates } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await updateChecklistItem(tripId, itemId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update checklist error:', error);
    return NextResponse.json({ error: '更新準備事項失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, itemId } = body;
    if (!tripId || !itemId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await deleteChecklistItem(tripId, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete checklist error:', error);
    return NextResponse.json({ error: '刪除準備事項失敗' }, { status: 500 });
  }
}
