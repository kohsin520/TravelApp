import useSWR from 'swr';
import { Ticket } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export function useTickets(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<Ticket[]>(
    tripId ? `/api/tickets?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 30000 }
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

  return {
    tickets: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
    addTicket,
    updateTicket,
    deleteTicket,
  };
}
