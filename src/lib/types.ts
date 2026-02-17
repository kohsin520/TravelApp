export interface Trip {
  trip_id: string;
  trip_name: string;
  destination: string;
  days: number;
  season: string;
  trip_type: string;
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
