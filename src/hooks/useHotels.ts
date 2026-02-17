import useSWR from 'swr';
import { Hotel } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export function useHotels(tripId: string) {
  const { data, error, isLoading, mutate } = useSWR<Hotel[]>(
    tripId ? `/api/hotels?tripId=${tripId}` : null,
    fetcher,
    { refreshInterval: 30000 }
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

  return {
    hotels: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
    addHotel,
    updateHotel,
    deleteHotel,
  };
}
