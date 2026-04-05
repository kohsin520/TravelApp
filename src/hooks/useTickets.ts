import useSWR from 'swr';
import { Ticket } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

function sortByOrder(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function useTickets(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<Ticket[]>(
    tripId ? `/api/tickets?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 120000 }
  );

  const addTicket = async (ticket: Omit<Ticket, 'id' | 'created_at'>) => {
    await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, ticket }),
    });
    mutate();
  };

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    mutate(
      (current) => current?.map((t) => (t.id === ticketId ? { ...t, ...updates } : t)),
      false
    );
    await fetch('/api/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, ticketId, updates }),
    });
    mutate();
  };

  const deleteTicket = async (ticketId: string) => {
    mutate(
      (current) => current?.filter((t) => t.id !== ticketId),
      false
    );
    await fetch('/api/tickets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, ticketId }),
    });
    mutate();
  };

  const reorderTickets = async (ordered: Ticket[]) => {
    const items = ordered.map((t, i) => ({ id: t.id, order: i }));
    const updated = ordered.map((t, i) => ({ ...t, order: i }));
    mutate(updated, false);
    await fetch('/api/tickets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, items }),
    });
    mutate();
  };

  const autoSortTickets = async () => {
    const current = data ?? [];
    const sorted = [...current].sort((a, b) => {
      if (!a.datetime && !b.datetime) return 0;
      if (!a.datetime) return -1;
      if (!b.datetime) return 1;
      return a.datetime.localeCompare(b.datetime);
    });
    await reorderTickets(sorted);
  };

  return {
    tickets: sortByOrder(data ?? []),
    isLoading,
    isError: !!error,
    mutate,
    addTicket,
    updateTicket,
    deleteTicket,
    reorderTickets,
    autoSortTickets,
  };
}
