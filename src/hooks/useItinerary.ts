import useSWR from 'swr';
import { ItineraryItem, Period } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export function useItinerary(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<ItineraryItem[]>(
    tripId ? `/api/itinerary?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const addItems = async (items: Omit<ItineraryItem, 'id' | 'created_at'>[]) => {
    await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items }),
    });
    mutate();
  };

  const updateItem = async (
    itemId: string,
    updates: Partial<Pick<ItineraryItem, 'activity' | 'order'>>
  ) => {
    mutate(
      (current) => current?.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
      false
    );
    await fetch('/api/itinerary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, itemId, updates }),
    });
    mutate();
  };

  const deleteItem = async (itemId: string) => {
    mutate(
      (current) => current?.filter((i) => i.id !== itemId),
      false
    );
    await fetch('/api/itinerary', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, itemId }),
    });
    mutate();
  };

  const reorderPeriod = async (
    day: number,
    period: Period,
    orderedItems: ItineraryItem[]
  ) => {
    const updates = orderedItems.map((item, i) => ({ id: item.id, order: i }));
    mutate(
      (current) => {
        if (!current) return current;
        const updateMap = new Map(updates.map((u) => [u.id, u.order]));
        return current.map((i) =>
          updateMap.has(i.id) ? { ...i, order: updateMap.get(i.id)! } : i
        );
      },
      false
    );
    await fetch('/api/itinerary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items: updates }),
    });
    mutate();
  };

  return {
    items: data ?? [],
    isLoading,
    isError: !!error,
    addItems,
    updateItem,
    deleteItem,
    reorderPeriod,
  };
}
