'use client';

import { useState } from 'react';
import { TicketType, TICKET_TYPES } from '@/lib/types';
import { useTickets } from '@/hooks/useTickets';
import { compressImage } from '@/lib/imageUtils';
import CollapsibleCard from './CollapsibleCard';
import TicketCard from './TicketCard';

interface TicketsListProps {
  tripId: string;
}

const emptyForm = {
  ticket_type: 'other' as TicketType,
  title: '',
  datetime: '',
  seat: '',
  confirmation: '',
  note: '',
  image: '',
};

export default function TicketsList({ tripId }: TicketsListProps) {
  const { tickets, isLoading, addTicket, updateTicket, deleteTicket } = useTickets(tripId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  const handleAiRecognize = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setRecognizing(true);
      try {
        const dataUrl = await compressImage(file);
        const res = await fetch('/api/ai/recognize-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        });
        if (!res.ok) throw new Error('辨識失敗');
        const data = await res.json();
        setForm({
          ticket_type: data.ticket_type || emptyForm.ticket_type,
          title: data.title || '',
          datetime: data.datetime || '',
          seat: data.seat || '',
          confirmation: data.confirmation || '',
          note: data.note || '',
          image: dataUrl,
        });
        setShowForm(true);
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

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await addTicket(form);
      setForm(emptyForm);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="tickets">
      <CollapsibleCard
        title="票券"
        subtitle={tickets.length > 0 ? `${tickets.length} 張票券` : undefined}
      >
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4 text-center">載入中...</p>
        ) : (
          <>
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onUpdate={updateTicket}
                  onDelete={deleteTicket}
                />
              ))}
              {tickets.length === 0 && !showForm && (
                <p className="text-sm text-gray-400 py-4 text-center">尚未新增票券</p>
              )}
            </div>

            {showForm ? (
              <div className="mt-4 border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
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
                    <span className="text-xs text-gray-500">標題 *</span>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="例：台北→東京"
                      className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">日期時間</span>
                    <input
                      type="datetime-local"
                      value={form.datetime}
                      onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
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
                    {form.image && <img src={form.image} alt="preview" className="mt-2 max-h-32 rounded-lg" />}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setForm(emptyForm); setShowForm(false); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    取消
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!form.title.trim() || submitting}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? '新增中...' : '新增票券'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowForm(true)}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  新增票券
                </button>
                <button
                  onClick={handleAiRecognize}
                  disabled={recognizing}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-purple-500 hover:text-purple-700 hover:bg-purple-50 border border-dashed border-purple-200 hover:border-purple-300 rounded-xl transition-colors disabled:opacity-50"
                >
                  {recognizing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      AI 辨識中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      AI 辨識
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </CollapsibleCard>
    </section>
  );
}
