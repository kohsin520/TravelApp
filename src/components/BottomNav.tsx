'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useActiveSection } from '@/hooks/useActiveSection';
import { NAV_ITEMS, SCROLL_SECTION_IDS } from './navItems';

async function copyUrl(): Promise<boolean> {
  const url = window.location.href;
  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ url });
      return true;
    } catch {
      // User cancelled or not supported, fall through
    }
  }
  // Try clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Clipboard API blocked, fall through
    }
  }
  // Fallback: hidden input + execCommand
  const input = document.createElement('input');
  input.value = url;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(input);
  return ok;
}

async function handleNavClick(item: (typeof NAV_ITEMS)[number], onCopied: () => void) {
  if (item.type === 'scroll') {
    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
  } else if (item.type === 'action' && item.id === 'share') {
    const ok = await copyUrl();
    if (ok) onCopied();
  }
}

const icons: Record<string, React.ReactNode> = {
  tickets: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
    </svg>
  ),
  hotels: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
  packing: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  checklist: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  share: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  ),
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
};

export default function BottomNav() {
  const activeId = useActiveSection(SCROLL_SECTION_IDS);
  const [copied, setCopied] = useState(false);

  const onCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-50">
      <ul className="flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.type === 'scroll' && activeId === item.id;
          const baseClass =
            'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-xs transition-colors';
          const activeClass = isActive
            ? 'text-blue-600 font-medium'
            : 'text-gray-500';

          if (item.type === 'link') {
            return (
              <li key={item.id} className="flex-1">
                <Link href={item.href!} className={`${baseClass} ${activeClass}`}>
                  {icons[item.id]}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => handleNavClick(item, onCopied)}
                className={`${baseClass} ${activeClass} w-full`}
              >
                {icons[item.id]}
                <span>{item.id === 'share' && copied ? '已複製!' : item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
