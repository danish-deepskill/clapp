import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F1E8',
        'paper-2': '#EFE9DC',
        surface: '#FCFAF5',
        'surface-2': '#F9F5EC',
        'ink-900': '#1B1814',
        'ink-700': '#4A4640',
        'ink-500': '#7A746A',
        'ink-400': '#9C968B',
        'ink-300': '#C8C2B5',
        'ink-200': '#DCD6C8',
        rule: '#D9D2C2',
        'rule-strong': '#B8B0A0',
        focus: '#325E8C',
        hadir: '#2E7048',
        'hadir-ink': '#1E4D31',
        'hadir-bg': '#E1ECDC',
        alpa: '#B23A3A',
        'alpa-ink': '#7E2828',
        'alpa-bg': '#F4DCD8',
        sakit: '#325E8C',
        'sakit-ink': '#234062',
        'sakit-bg': '#DCE5F0',
        izin: '#B17A1F',
        'izin-ink': '#7F5614',
        'izin-bg': '#F2E5C7',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '3px',
      },
      fontSize: {
        eyebrow: ['11px', { lineHeight: '14px', letterSpacing: '0.12em' }],
      },
    },
  },
  corePlugins: {
    // We never want shadcn-style fully-rounded utilities. Keep rounded-full
    // available only for explicit circle elements (badge dots).
  },
  plugins: [],
};

export default config;
