/**
 * SyndicSage Design Tokens
 * Source of truth — locked from syndicsage-v5-mockup3.html
 * Never change these without updating the mockup reference.
 */

export const colors = {
  // Core
  navy:   '#1E3A5F',
  amber:  '#F59E0B',   // alerts + CTAs only
  green:  '#16a34a',
  red:    '#dc2626',
  blue:   '#0891b2',

  // Surfaces
  bg:      '#F2F2F7',  // iOS-style light gray — app background
  surface: '#FFFFFF',  // cards, panels
  sidebar: '#F0F0F5',  // light macOS-style sidebar

  // Text
  text:      '#1E3A5F',
  textDim:   '#475569',
  textMuted: '#6E6E73',

  // Borders
  border:   'rgba(60,60,67,0.10)',
  borderHi: 'rgba(60,60,67,0.20)',
  sidebarBorder: 'rgba(60,60,67,0.14)',
} as const

export const fonts = {
  sans:  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
} as const

export const radii = {
  sm: '9px',
  md: '14px',
} as const

export const shadows = {
  card:  '0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)',
  hover: '0 4px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.07)',
} as const

export const layout = {
  sidebarW:    52,   // collapsed width px
  sidebarOpen: 220,  // expanded width px
  topbarH:     52,   // topbar height px
} as const
