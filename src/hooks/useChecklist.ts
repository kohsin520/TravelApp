import useSWR from 'swr';
import { ChecklistItem } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export function useChecklist(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistItem[]>(
    tripId ? `/api/checklist?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 120000 }
  );

  const toggleDone = async (itemId: string, done: boolean) => {
    mutate(
      (current) => current?.map((item) => (item.id === itemId ? { ...item, done } : item)),
      false
    );
    await fetch('/api/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, itemId, updates: { done } }),
    });
    mutate();
  };

  const addItems = async (items: { task_name: string }[]) => {
    await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items }),
    });
    mutate();
  };

  const deleteItem = async (itemId: string) => {
    mutate(
      (current) => current?.filter((item) => item.id !== itemId),
      false
    );
    await fetch('/api/checklist', {
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
    toggleDone,
    addItems,
    deleteItem,
  };
}
