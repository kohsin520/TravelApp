'use client';

import { useState } from 'react';
import { Hotel } from '@/lib/types';
import { compressImage } from '@/lib/imageUtils';

interface HotelCardProps {
  hotel: Hotel;
  onUpdate: (hotelId: string, updates: Partial<Hotel>) => Promise<void>;
  onDelete: (hotelId: string) => Promise<void>;
  dragHandle?: React.ReactNode;
}

export default function HotelCard({ hotel, onUpdate, onDelete, dragHandle }: HotelCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(hotel);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    const updates: Record<string, string> = {};
    const fields = ['hotel_name', 'address', 'check_in', 'check_out', 'confirmation', 'map_url', 'booking_url', 'note', 'image'] as const;
    for (const key of fields) {
      if (form[key] !== hotel[key]) updates[key] = form[key];
    }
    if (Object.keys(updates).length > 0) {
      await onUpdate(hotel.id, updates);
    }
    setEditing(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setForm({ ...form, image: dataUrl });
    } finally {
      setUploading(false);
    }
  };

  if (editing) {
    return (
      <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50/30">
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2">
            <span className="text-xs text-gray-500">飯店名稱</span>
            <input
              value={form.hotel_name}
              onChange={(e) => setForm({ ...form, hotel_name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block col-span-2">
            <span className="text-xs text-gray-500">地址</span>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">入住日期</span>
            <input
              type="date"
              value={form.check_in}
              onChange={(e) => setForm({ ...form, check_in: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">退房日期</span>
            <input
              type="date"
              value={form.check_out}
              onChange={(e) => setForm({ ...form, check_out: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block col-span-2">
            <span className="text-xs text-gray-500">訂房代號</span>
            <input
              value={form.confirmation}
              onChange={(e) => setForm({ ...form, confirmation: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Google Maps 連結</span>
            <input
              value={form.map_url}
              onChange={(e) => setForm({ ...form, map_url: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">訂房連結</span>
            <input
              value={form.booking_url}
              onChange={(e) => setForm({ ...form, booking_url: e.target.value })}
              placeholder="https://..."
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block col-span-2">
            <span className="text-xs text-gray-500">備註</span>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="col-span-2">
            <span className="text-xs text-gray-500">圖片</span>
            <input type="file" accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm" />
            {uploading && <p className="text-xs text-gray-400 mt-1">壓縮中...</p>}
            {form.image && (
              <img src={form.image} alt="preview" className="mt-2 max-h-32 rounded-lg" />
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setForm(hotel); setEditing(false); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            取消
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            儲存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {dragHandle}
          <span className="text-2xl shrink-0">🏨</span>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-800 truncate">{hotel.hotel_name || '未命名住宿'}</h3>
            {hotel.address && <p className="text-sm text-gray-500 mt-0.5">{hotel.address}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
              {hotel.check_in && <span>入住: {hotel.check_in}</span>}
              {hotel.check_out && <span>退房: {hotel.check_out}</span>}
              {hotel.confirmation && <span className="font-mono text-blue-600">{hotel.confirmation}</span>}
            </div>
            <div className="flex gap-3 mt-1">
              {hotel.map_url && (
                <a href={hotel.map_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  地圖
                </a>
              )}
              {hotel.booking_url && (
                <a href={hotel.booking_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  訂房頁面
                </a>
              )}
            </div>
            {hotel.note && <p className="text-sm text-gray-400 mt-1">{hotel.note}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="編輯">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button onClick={() => onDelete(hotel.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="刪除">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
      {hotel.image && (
        <>
          <img
            src={hotel.image}
            alt="飯店圖片"
            className="mt-3 max-h-40 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setPreviewImage(hotel.image)}
          />
          {previewImage && (
            <div
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setPreviewImage(null)}
            >
              <img src={previewImage} alt="放大預覽" className="max-w-full max-h-full rounded-xl" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
