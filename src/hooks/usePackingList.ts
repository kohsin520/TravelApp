import useSWR from 'swr';
import { PackingItem } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export function usePackingList(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<PackingItem[]>(
    tripId ? `/api/packing?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const togglePacked = async (itemId: string, packed: boolean) => {
    // Optimistic update
    mutate(
      (current) => current?.map((item) => (item.id === itemId ? { ...item, packed } : item)),
      false
    );
    await fetch('/api/packing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, itemId, updates: { packed } }),
    });
    mutate();
  };

  const addItems = async (items: { category: string; item_name: string; source?: string }[], replaceSource?: string) => {
    await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items, replaceSource }),
    });
    mutate();
  };

  const deleteItem = async (itemId: string) => {
    mutate(
      (current) => current?.filter((item) => item.id !== itemId),
      false
    );
    await fetch('/api/packing', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, itemId }),
    });
    mutate();
  };

  return {
    items: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
    togglePacked,
    addItems,
    deleteItem,
  };
}
