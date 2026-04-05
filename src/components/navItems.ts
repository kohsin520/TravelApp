export interface NavItem {
  id: string;
  label: string;
  type: 'scroll' | 'action' | 'link';
  href?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'itinerary', label: '行程', type: 'scroll' },
  { id: 'tickets', label: '票券', type: 'scroll' },
  { id: 'hotels', label: '住宿', type: 'scroll' },
  { id: 'packing', label: '行李表', type: 'scroll' },
  { id: 'checklist', label: '事前準備', type: 'scroll' },
  { id: 'share', label: '分享', type: 'action' },
  { id: 'home', label: '首頁', type: 'link', href: '/' },
];

export const SCROLL_SECTION_IDS = NAV_ITEMS.filter((i) => i.type === 'scroll').map((i) => i.id);
