'use client';

import { useState } from 'react';
import { Ticket, TICKET_TYPES, TicketType } from '@/lib/types';
import { compressImage } from '@/lib/imageUtils';

const typeIcons: Record<TicketType, string> = {
  flight: '✈️',
  train: '🚄',
  bus: '🚌',
  other: '🎫',
};

interface TicketCardProps {
  ticket: Ticket;
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => Promise<void>;
  onDelete: (ticketId: string) => Promise<void>;
  dragHandle?: React.ReactNode;
}

export default function TicketCard({ ticket, onUpdate, onDelete, dragHandle }: TicketCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(ticket);
  const [datetimeTbd, setDatetimeTbd] = useState(!ticket.datetime);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  const handleSave = async () => {
    const updates: Record<string, string> = {};
    const fields = ['ticket_type', 'title', 'datetime', 'seat', 'confirmation', 'note', 'image'] as const;
    for (const key of fields) {
      if (form[key] !== ticket[key]) updates[key] = form[key];
    }
    if (Object.keys(updates).length > 0) {
      await onUpdate(ticket.id, updates);
    }
    setEditing(false);
  };

  const handleAiRecognize = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setRecognizing(true);
      try {
        const { compressImage: compress } = await import('@/lib/imageUtils');
        const dataUrl = await compress(file);
        const res = await fetch('/api/ai/recognize-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [dataUrl] }),
        });
        const data = await res.json();
        if (data.results?.[0]) {
          const r = data.results[0];
          setForm((prev) => ({
            ...prev,
            ticket_type: r.ticket_type || prev.ticket_type,
            title: r.title || prev.title,
            datetime: r.datetimeTbd ? '' : (r.datetime || prev.datetime),
            seat: r.seat || prev.seat,
            confirmation: r.confirmation || prev.confirmation,
            note: r.note || prev.note,
            image: dataUrl,
          }));
          if (r.datetimeTbd) setDatetimeTbd(true);
        }
      } catch {
        alert('AI 辨識失敗，請手動輸入');
      } finally {
        setRecognizing(false);
      }
    };
    input.click();
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
          <label className="block">
            <span className="text-xs text-gray-500">票種</span>
            <select
              value={form.ticket_type}
              onChange={(e) => setForm({ ...form, ticket_type: e.target.value as TicketType })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {TICKET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">標題</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="block">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">日期時間</span>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={datetimeTbd}
                  onChange={(e) => {
                    setDatetimeTbd(e.target.checked);
                    if (e.target.checked) setForm({ ...form, datetime: '' });
                  }}
                  className="rounded"
                />
                未定
              </label>
            </div>
            <input
              type="datetime-local"
              value={form.datetime}
              disabled={datetimeTbd}
              onChange={(e) => setForm({ ...form, datetime: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <label className="block">
            <span className="text-xs text-gray-500">座位</span>
            <input
              value={form.seat}
              onChange={(e) => setForm({ ...form, seat: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block col-span-2">
            <span className="text-xs text-gray-500">訂位代號</span>
            <input
              value={form.confirmation}
              onChange={(e) => setForm({ ...form, confirmation: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
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
            <span className="text-xs text-gray-500">圖片（QR Code / 車票）</span>
            <input type="file" accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm" />
            {uploading && <p className="text-xs text-gray-400 mt-1">壓縮中...</p>}
            {form.image && (
              <img src={form.image} alt="preview" className="mt-2 max-h-32 rounded-lg" />
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-between">
          <button
            onClick={handleAiRecognize}
            disabled={recognizing}
            className="px-3 py-1.5 text-sm text-purple-500 hover:text-purple-700 hover:bg-purple-50 border border-dashed border-purple-200 rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            {recognizing ? 'AI 辨識中...' : '📷 AI 辨識'}
          </button>
          <div className="flex gap-2">
            <button onClick={() => { setForm(ticket); setEditing(false); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              取消
            </button>
            <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              儲存
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {dragHandle}
          <span className="text-2xl shrink-0">{typeIcons[ticket.ticket_type] || '🎫'}</span>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-800 truncate">{ticket.title || '未命名票券'}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
              {ticket.datetime ? (
                <span>{new Date(ticket.datetime).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              ) : (
                <span className="text-orange-400">日期未定</span>
              )}
              {ticket.seat && <span>座位: {ticket.seat}</span>}
              {ticket.confirmation && <span className="font-mono text-blue-600">{ticket.confirmation}</span>}
            </div>
            {ticket.note && <p className="text-sm text-gray-400 mt-1">{ticket.note}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="編輯">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button onClick={() => onDelete(ticket.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="刪除">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
      {ticket.image && (
        <>
          <img
            src={ticket.image}
            alt="票券圖片"
            className="mt-3 max-h-40 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setPreviewImage(ticket.image)}
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
