export interface Trip {
  trip_id: string;
  trip_name: string;
  destination: string;
  days: number;
  season: string;
  trip_type: string;
  start_date?: string;   // YYYY-MM-DD
  created_at: string;
}

export interface PackingItem {
  id: string;
  category: string;
  item_name: string;
  packed: boolean;
  source: 'preset' | 'ai' | 'custom';
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  task_name: string;
  done: boolean;
  source: 'preset' | 'custom';
  created_at: string;
}

export type TripType = 'beach' | 'city' | 'ski' | 'hiking';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type PackingCategory = '衣物' | '3C' | '盥洗' | '證件' | '藥品' | '其他';

export const CATEGORIES: PackingCategory[] = ['衣物', '3C', '盥洗', '證件', '藥品', '其他'];

export const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: 'beach', label: '海島' },
  { value: 'city', label: '都市' },
  { value: 'ski', label: '滑雪' },
  { value: 'hiking', label: '登山' },
];

export const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
];

// ─── Ticket & Hotel ───

export type TicketType = 'flight' | 'train' | 'bus' | 'other';

export interface Ticket {
  id: string;
  ticket_type: TicketType;
  title: string;
  datetime: string;
  seat: string;
  confirmation: string;
  note: string;
  image: string;
  order: number;
  created_at: string;
}

export interface Hotel {
  id: string;
  hotel_name: string;
  address: string;
  check_in: string;
  check_out: string;
  confirmation: string;
  map_url: string;
  booking_url: string;
  note: string;
  image: string;
  order: number;
  created_at: string;
}

export const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: 'flight', label: '飛機' },
  { value: 'train', label: '火車' },
  { value: 'bus', label: '巴士' },
  { value: 'other', label: '其他' },
];

// ─── Itinerary ───

export type Period = 'morning' | 'afternoon' | 'evening';

export const PERIOD_LABELS: Record<Period, string> = {
  morning: '早上',
  afternoon: '下午',
  evening: '晚上',
};

export const PERIOD_ORDER: Record<Period, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

export const PERIODS: Period[] = ['morning', 'afternoon', 'evening'];

export interface ItineraryItem {
  id: string;
  day: number;       // 1-based
  period: Period;
  activity: string;
  order: number;     // within same day+period
  created_at: string;
}
