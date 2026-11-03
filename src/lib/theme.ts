export const BRAND_COLORS = {
  // Official Luxury Color System
  obsidian: '#08051B',
  midnight: '#120A2B',
  royal: '#1B103B',
  electric: '#7928FF',
  orchid: '#A855F7',
  amethyst: '#D49BFF',
  champagne: '#E8C9A0',

  // Semantic mappings
  primaryPurple: '#7928FF',
  deepPurple: '#1B103B',
  lightLavender: '#1B103B',
  softLavender: '#120A2B',
  white: '#FFFFFF',
  primaryText: '#FFFFFF',
  secondaryText: '#C9BFDF',
  mutedText: '#968AAE',
  border: 'rgba(212, 155, 255, 0.15)',
  success: '#10B981',
  error: '#EF4444',
  pageBg: '#08051B',
  cardBg: '#1B103B',
} as const;

export const ACCENT_PALETTE = [
  { id: 'electric', name: 'Electric Violet', hex: '#7928FF', textClass: 'text-white', ringClass: 'ring-[#7928FF]' },
  { id: 'orchid', name: 'Orchid Glow', hex: '#A855F7', textClass: 'text-white', ringClass: 'ring-[#A855F7]' },
  { id: 'amethyst', name: 'Luminous Amethyst', hex: '#D49BFF', textClass: 'text-[#120A2B]', ringClass: 'ring-[#D49BFF]' },
  { id: 'champagne', name: 'Metallic Champagne', hex: '#E8C9A0', textClass: 'text-[#120A2B]', ringClass: 'ring-[#E8C9A0]' },
  { id: 'indigo', name: 'Royal Indigo', hex: '#4F46E5', textClass: 'text-white', ringClass: 'ring-[#4F46E5]' },
  { id: 'emerald', name: 'Emerald Spark', hex: '#10B981', textClass: 'text-white', ringClass: 'ring-[#10B981]' },
];

export const BRAND_NAME = 'TipZeMe';
export const TAGLINE = 'Good vibes deserve good tips.';

// Suggested tips
export const TIP_TIERS = [3, 5, 10, 25];

export function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}
