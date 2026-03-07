import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getTickets, addTicket, updateTicket, deleteTicket, bulkUpdateTicketOrder } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  try {
    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
    const items = await getTickets(tripId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json({ error: '取得票券失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, ticket } = body;
    if (!tripId || !ticket) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const newTicket = {
      id: nanoid(10),
      ticket_type: ticket.ticket_type || 'other',
      title: ticket.title || '',
      datetime: ticket.datetime || '',
      seat: ticket.seat || '',
      confirmation: ticket.confirmation || '',
      note: ticket.note || '',
      image: ticket.image || '',
      order: ticket.order ?? 0,
    };
    await addTicket(tripId, newTicket);
    return NextResponse.json({ success: true, id: newTicket.id });
  } catch (error) {
    console.error('Add ticket error:', error);
    return NextResponse.json({ error: '新增票券失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, ticketId, updates } = body;
    if (!tripId || !ticketId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await updateTicket(tripId, ticketId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json({ error: '更新票券失敗' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items } = body;
    if (!tripId || !Array.isArray(items)) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await bulkUpdateTicketOrder(tripId, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bulk update ticket order error:', error);
    return NextResponse.json({ error: '更新票券排序失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, ticketId } = body;
    if (!tripId || !ticketId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await deleteTicket(tripId, ticketId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json({ error: '刪除票券失敗' }, { status: 500 });
  }
}
