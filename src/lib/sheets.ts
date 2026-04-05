import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Trip, PackingItem, ChecklistItem, Ticket, Hotel } from './types';

function getAuth(): JWT {
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getDoc(): Promise<GoogleSpreadsheet> {
  const auth = getAuth();
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth);
  await doc.loadInfo();
  return doc;
}

async function getOrCreateSheet(
  doc: GoogleSpreadsheet,
  title: string,
  headers: string[]
): Promise<GoogleSpreadsheetWorksheet> {
  let sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues: headers });
  }
  return sheet;
}

// ─── Trip CRUD ───

const TRIP_HEADERS = ['trip_id', 'trip_name', 'destination', 'days', 'season', 'trip_type', 'created_at'];

export async function createTrip(trip: Trip): Promise<void> {
  const doc = await getDoc();
  const sheet = await getOrCreateSheet(doc, '_trips', TRIP_HEADERS);
  await sheet.addRow({
    trip_id: trip.trip_id,
    trip_name: trip.trip_name,
    destination: trip.destination,
    days: trip.days,
    season: trip.season,
    trip_type: trip.trip_type,
    created_at: trip.created_at,
  });
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['_trips'];
  if (!sheet) return null;
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('trip_id') === tripId);
  if (!row) return null;
  return {
    trip_id: row.get('trip_id'),
    trip_name: row.get('trip_name'),
    destination: row.get('destination'),
    days: Number(row.get('days')),
    season: row.get('season'),
    trip_type: row.get('trip_type'),
    created_at: row.get('created_at'),
  };
}

// ─── Packing CRUD ───

const PACKING_HEADERS = ['id', 'category', 'item_name', 'packed', 'source', 'created_at'];

async function getPackingSheet(doc: GoogleSpreadsheet, tripId: string) {
  return getOrCreateSheet(doc, `${tripId}_packing`, PACKING_HEADERS);
}

export async function getPackingItems(tripId: string): Promise<PackingItem[]> {
  const doc = await getDoc();
  const sheet = await getPackingSheet(doc, tripId);
  const rows = await sheet.getRows();
  return rows.map((r) => ({
    id: r.get('id'),
    category: r.get('category'),
    item_name: r.get('item_name'),
    packed: r.get('packed') === 'true',
    source: r.get('source') as PackingItem['source'],
    created_at: r.get('created_at'),
  }));
}

export async function addPackingItems(tripId: string, items: Omit<PackingItem, 'created_at'>[]): Promise<void> {
  const doc = await getDoc();
  const sheet = await getPackingSheet(doc, tripId);
  const now = new Date().toISOString();
  const rowData = items.map((item) => ({
    id: item.id,
    category: item.category,
    item_name: item.item_name,
    packed: String(item.packed),
    source: item.source,
    created_at: now,
  }));
  await sheet.addRows(rowData);
}

export async function updatePackingItem(
  tripId: string,
  itemId: string,
  updates: Partial<Pick<PackingItem, 'packed' | 'item_name' | 'category'>>
): Promise<void> {
  const doc = await getDoc();
  const sheet = await getPackingSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === itemId);
  if (!row) throw new Error('Item not found');
  if (updates.packed !== undefined) row.set('packed', String(updates.packed));
  if (updates.item_name !== undefined) row.set('item_name', updates.item_name);
  if (updates.category !== undefined) row.set('category', updates.category);
  await row.save();
}

export async function deletePackingItem(tripId: string, itemId: string): Promise<void> {
  const doc = await getDoc();
  const sheet = await getPackingSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === itemId);
  if (!row) throw new Error('Item not found');
  await row.delete();
}

export async function deletePackingItemsBySource(tripId: string, source: string): Promise<number> {
  const doc = await getDoc();
  const sheet = await getPackingSheet(doc, tripId);
  const rows = await sheet.getRows();
  const toDelete = source === 'all' ? rows : rows.filter((r) => r.get('source') === source);
  // Delete in reverse order to avoid index shifting
  for (let i = toDelete.length - 1; i >= 0; i--) {
    await toDelete[i].delete();
  }
  return toDelete.length;
}

// ─── Checklist CRUD ───

const CHECKLIST_HEADERS = ['id', 'task_name', 'done', 'source', 'created_at'];

async function getChecklistSheet(doc: GoogleSpreadsheet, tripId: string) {
  return getOrCreateSheet(doc, `${tripId}_checklist`, CHECKLIST_HEADERS);
}

export async function getChecklistItems(tripId: string): Promise<ChecklistItem[]> {
  const doc = await getDoc();
  const sheet = await getChecklistSheet(doc, tripId);
  const rows = await sheet.getRows();
  return rows.map((r) => ({
    id: r.get('id'),
    task_name: r.get('task_name'),
    done: String(r.get('done')).toLowerCase() === 'true',
    source: r.get('source') as ChecklistItem['source'],
    created_at: r.get('created_at'),
  }));
}

export async function addChecklistItems(tripId: string, items: Omit<ChecklistItem, 'created_at'>[]): Promise<void> {
  const doc = await getDoc();
  const sheet = await getChecklistSheet(doc, tripId);
  const now = new Date().toISOString();
  const rowData = items.map((item) => ({
    id: item.id,
    task_name: item.task_name,
    done: String(item.done),
    source: item.source,
    created_at: now,
  }));
  await sheet.addRows(rowData);
}

export async function updateChecklistItem(
  tripId: string,
  itemId: string,
  updates: Partial<Pick<ChecklistItem, 'done' | 'task_name'>>
): Promise<string> {
  const doc = await getDoc();
  const sheet = await getChecklistSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === itemId);
  if (!row) throw new Error('Item not found');
  if (updates.done !== undefined) row.set('done', String(updates.done));
  if (updates.task_name !== undefined) row.set('task_name', updates.task_name);
  await row.save();
  return row.get('done');
}

export async function deleteChecklistItem(tripId: string, itemId: string): Promise<void> {
  const doc = await getDoc();
  const sheet = await getChecklistSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === itemId);
  if (!row) throw new Error('Item not found');
  await row.delete();
}

// ─── Ticket CRUD ───

const TICKET_HEADERS = ['id', 'ticket_type', 'title', 'datetime', 'seat', 'confirmation', 'note', 'image', 'order', 'created_at'];

async function getTicketSheet(doc: GoogleSpreadsheet, tripId: string) {
  return getOrCreateSheet(doc, `${tripId}_tickets`, TICKET_HEADERS);
}

export async function getTickets(tripId: string): Promise<Ticket[]> {
  const doc = await getDoc();
  const sheet = await getTicketSheet(doc, tripId);
  const rows = await sheet.getRows();
  return rows.map((r) => ({
    id: r.get('id'),
    ticket_type: r.get('ticket_type') as Ticket['ticket_type'],
    title: r.get('title'),
    datetime: r.get('datetime'),
    seat: r.get('seat'),
    confirmation: r.get('confirmation'),
    note: r.get('note'),
    image: r.get('image'),
    order: Number(r.get('order')) || 0,
    created_at: r.get('created_at'),
  }));
}

export async function addTicket(tripId: string, ticket: Omit<Ticket, 'created_at'>): Promise<void> {
  const doc = await getDoc();
  const sheet = await getTicketSheet(doc, tripId);
  await sheet.addRow({
    id: ticket.id,
    ticket_type: ticket.ticket_type,
    title: ticket.title,
    datetime: ticket.datetime,
    seat: ticket.seat,
    confirmation: ticket.confirmation,
    note: ticket.note,
    image: ticket.image,
    order: ticket.order ?? 0,
    created_at: new Date().toISOString(),
  });
}

export async function updateTicket(
  tripId: string,
  ticketId: string,
  updates: Partial<Omit<Ticket, 'id' | 'created_at'>>
): Promise<void> {
  const doc = await getDoc();
  const sheet = await getTicketSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === ticketId);
  if (!row) throw new Error('Ticket not found');
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) row.set(key, value);
  }
  await row.save();
}

export async function deleteTicket(tripId: string, ticketId: string): Promise<void> {
  const doc = await getDoc();
  const sheet = await getTicketSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === ticketId);
  if (!row) throw new Error('Ticket not found');
  await row.delete();
}

export async function bulkUpdateTicketOrder(tripId: string, items: { id: string; order: number }[]): Promise<void> {
  const doc = await getDoc();
  const sheet = await getTicketSheet(doc, tripId);
  const rows = await sheet.getRows();
  const orderMap = new Map(items.map((i) => [i.id, i.order]));
  const toUpdate = rows.filter((r) => orderMap.has(r.get('id')));
  for (const row of toUpdate) {
    row.set('order', orderMap.get(row.get('id'))!);
  }
  await Promise.all(toUpdate.map((r) => r.save()));
}

// ─── Hotel CRUD ───

const HOTEL_HEADERS = ['id', 'hotel_name', 'address', 'check_in', 'check_out', 'confirmation', 'map_url', 'booking_url', 'note', 'image', 'order', 'created_at'];

async function getHotelSheet(doc: GoogleSpreadsheet, tripId: string) {
  return getOrCreateSheet(doc, `${tripId}_hotels`, HOTEL_HEADERS);
}

export async function getHotels(tripId: string): Promise<Hotel[]> {
  const doc = await getDoc();
  const sheet = await getHotelSheet(doc, tripId);
  const rows = await sheet.getRows();
  return rows.map((r) => ({
    id: r.get('id'),
    hotel_name: r.get('hotel_name'),
    address: r.get('address'),
    check_in: r.get('check_in'),
    check_out: r.get('check_out'),
    confirmation: r.get('confirmation'),
    map_url: r.get('map_url'),
    booking_url: r.get('booking_url'),
    note: r.get('note'),
    image: r.get('image'),
    order: Number(r.get('order')) || 0,
    created_at: r.get('created_at'),
  }));
}

export async function addHotel(tripId: string, hotel: Omit<Hotel, 'created_at'>): Promise<void> {
  const doc = await getDoc();
  const sheet = await getHotelSheet(doc, tripId);
  await sheet.addRow({
    id: hotel.id,
    hotel_name: hotel.hotel_name,
    address: hotel.address,
    check_in: hotel.check_in,
    check_out: hotel.check_out,
    confirmation: hotel.confirmation,
    map_url: hotel.map_url,
    booking_url: hotel.booking_url,
    note: hotel.note,
    image: hotel.image,
    order: hotel.order ?? 0,
    created_at: new Date().toISOString(),
  });
}

export async function updateHotel(
  tripId: string,
  hotelId: string,
  updates: Partial<Omit<Hotel, 'id' | 'created_at'>>
): Promise<void> {
  const doc = await getDoc();
  const sheet = await getHotelSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === hotelId);
  if (!row) throw new Error('Hotel not found');
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) row.set(key, value);
  }
  await row.save();
}

export async function deleteHotel(tripId: string, hotelId: string): Promise<void> {
  const doc = await getDoc();
  const sheet = await getHotelSheet(doc, tripId);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get('id') === hotelId);
  if (!row) throw new Error('Hotel not found');
  await row.delete();
}

export async function bulkUpdateHotelOrder(tripId: string, items: { id: string; order: number }[]): Promise<void> {
  const doc = await getDoc();
  const sheet = await getHotelSheet(doc, tripId);
  const rows = await sheet.getRows();
  const orderMap = new Map(items.map((i) => [i.id, i.order]));
  const toUpdate = rows.filter((r) => orderMap.has(r.get('id')));
  for (const row of toUpdate) {
    row.set('order', orderMap.get(row.get('id'))!);
  }
  await Promise.all(toUpdate.map((r) => r.save()));
}
