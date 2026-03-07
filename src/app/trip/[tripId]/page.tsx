'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trip } from '@/lib/types';
import { saveTripToHistory } from '@/lib/tripHistory';
import TripHeader from '@/components/TripHeader';
import TicketsList from '@/components/TicketsList';
import HotelsList from '@/components/HotelsList';
import PackingList from '@/components/PackingList';
import PreDepartureChecklist from '@/components/PreDepartureChecklist';
import SideNav from '@/components/SideNav';
import BottomNav from '@/components/BottomNav';

export default function TripPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    fetch(`/api/trip?tripId=${tripId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: Trip) => {
        setTrip(data);
        saveTripToHistory({
          tripId,
          trip_name: data.trip_name,
          destination: data.destination,
          created_at: data.created_at,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">載入中...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">找不到旅程</h1>
          <p className="text-gray-500">這個連結可能無效或已過期</p>
          <a href="/" className="inline-block mt-4 text-blue-600 hover:underline">
            建立新旅程
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-8">
        <SideNav />
        <div className="flex-1 min-w-0 space-y-6 pb-20 md:pb-0">
          <TripHeader trip={trip} />
          <TicketsList tripId={tripId} />
          <HotelsList tripId={tripId} />
          <PackingList tripId={tripId} trip={trip} />
          <PreDepartureChecklist tripId={tripId} trip={trip} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
