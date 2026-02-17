'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trip } from '@/lib/types';
import TripHeader from '@/components/TripHeader';
import PackingList from '@/components/PackingList';
import PreDepartureChecklist from '@/components/PreDepartureChecklist';

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
      .then(setTrip)
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
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <TripHeader trip={trip} />
        <PackingList tripId={tripId} trip={trip} />
        <PreDepartureChecklist tripId={tripId} />
      </div>
    </div>
  );
}
