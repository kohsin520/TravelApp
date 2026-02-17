const STORAGE_KEY = 'my_trips';

export interface TripRecord {
  tripId: string;
  trip_name: string;
  destination: string;
  created_at: string;
}

export function saveTripToHistory(record: TripRecord): void {
  const trips = getTripHistory();
  const idx = trips.findIndex((t) => t.tripId === record.tripId);
  if (idx >= 0) {
    trips[idx] = record;
  } else {
    trips.unshift(record);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export function getTripHistory(): TripRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeTripFromHistory(tripId: string): void {
  const trips = getTripHistory().filter((t) => t.tripId !== tripId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}
