'use client';

import { Trip } from '@/lib/types';
import ShareButton from './ShareButton';

interface TripHeaderProps {
  trip: Trip;
}

export default function TripHeader({ trip }: TripHeaderProps) {
  const typeLabels: Record<string, string> = {
    beach: '海島',
    city: '都市',
    ski: '滑雪',
    hiking: '登山',
  };
  const seasonLabels: Record<string, string> = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬',
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{trip.trip_name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
            {trip.destination}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-50 text-green-700">
            {trip.days} 天
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700">
            {seasonLabels[trip.season] || trip.season}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
            {typeLabels[trip.trip_type] || trip.trip_type}
          </span>
        </div>
      </div>
      <ShareButton tripId={trip.trip_id} />
    </div>
  );
}
