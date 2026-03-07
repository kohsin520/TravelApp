import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getHotels, addHotel, updateHotel, deleteHotel, bulkUpdateHotelOrder } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  try {
    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
    const items = await getHotels(tripId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Get hotels error:', error);
    return NextResponse.json({ error: '取得住宿失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, hotel } = body;
    if (!tripId || !hotel) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    const newHotel = {
      id: nanoid(10),
      hotel_name: hotel.hotel_name || '',
      address: hotel.address || '',
      check_in: hotel.check_in || '',
      check_out: hotel.check_out || '',
      confirmation: hotel.confirmation || '',
      map_url: hotel.map_url || '',
      booking_url: hotel.booking_url || '',
      note: hotel.note || '',
      image: hotel.image || '',
      order: hotel.order ?? 0,
    };
    await addHotel(tripId, newHotel);
    return NextResponse.json({ success: true, id: newHotel.id });
  } catch (error) {
    console.error('Add hotel error:', error);
    return NextResponse.json({ error: '新增住宿失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, hotelId, updates } = body;
    if (!tripId || !hotelId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await updateHotel(tripId, hotelId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update hotel error:', error);
    return NextResponse.json({ error: '更新住宿失敗' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, items } = body;
    if (!tripId || !Array.isArray(items)) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await bulkUpdateHotelOrder(tripId, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bulk update hotel order error:', error);
    return NextResponse.json({ error: '更新住宿排序失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, hotelId } = body;
    if (!tripId || !hotelId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    await deleteHotel(tripId, hotelId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete hotel error:', error);
    return NextResponse.json({ error: '刪除住宿失敗' }, { status: 500 });
  }
}
