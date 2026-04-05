import useSWR from 'swr';
import { Hotel } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

function sortByOrder(hotels: Hotel[]): Hotel[] {
  return [...hotels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function useHotels(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<Hotel[]>(
    tripId ? `/api/hotels?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 120000 }
  );

  const addHotel = async (hotel: Omit<Hotel, 'id' | 'created_at'>) => {
    await fetch('/api/hotels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, hotel }),
    });
    mutate();
  };

  const updateHotel = async (hotelId: string, updates: Partial<Hotel>) => {
    mutate(
      (current) => current?.map((h) => (h.id === hotelId ? { ...h, ...updates } : h)),
      false
    );
    await fetch('/api/hotels', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, hotelId, updates }),
    });
    mutate();
  };

  const deleteHotel = async (hotelId: string) => {
    mutate(
      (current) => current?.filter((h) => h.id !== hotelId),
      false
    );
    await fetch('/api/hotels', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, hotelId }),
    });
    mutate();
  };

  const reorderHotels = async (ordered: Hotel[]) => {
    const items = ordered.map((h, i) => ({ id: h.id, order: i }));
    const updated = ordered.map((h, i) => ({ ...h, order: i }));
    mutate(updated, false);
    await fetch('/api/hotels', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items }),
    });
    mutate();
  };

  const autoSortHotels = async () => {
    const current = data ?? [];
    const sorted = [...current].sort((a, b) => {
      if (!a.check_in && !b.check_in) return 0;
      if (!a.check_in) return -1;
      if (!b.check_in) return 1;
      return a.check_in.localeCompare(b.check_in);
    });
    await reorderHotels(sorted);
  };

  return {
    hotels: sortByOrder(data ?? []),
    isLoading,
    isError: !!error,
    mutate,
    addHotel,
    updateHotel,
    deleteHotel,
    reorderHotels,
    autoSortHotels,
  };
}
