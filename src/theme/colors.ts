// Centralized color tokens — all screens and components must reference these, never hardcode hex values

export type ColorPalette = {
  // Backgrounds
  background: string;
  surface: string;
  surfaceRaised: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;

  // Borders
  border: string;
  borderSubtle: string;

  // Accent (brand blue — works on both themes)
  accent: string;

  // Numpad keys
  keyBackground: string;
  keyBorder: string;
  keyActionBackground: string;

  // Status / semantic
  duplicate: string;
  duplicateBackground: string;
  error: string;
  onPrimary: string;

  // Settings segmented control
  segmentBackground: string;
  segmentSelected: string;
  segmentSelectedText: string;
  segmentUnselectedText: string;
};

export const darkColors: ColorPalette = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceRaised: '#2a2a2a',

  textPrimary: '#ffffff',
  textSecondary: '#aaaaaa',
  textMuted: '#555555',
  textPlaceholder: '#555555',

  border: '#2e2e2e',
  borderSubtle: '#3a3a3a',

  accent: '#4f8ef7',

  keyBackground: '#1e1e1e',
  keyBorder: '#2e2e2e',
  keyActionBackground: '#2a2a2a',

  duplicate: '#c0392b',
  duplicateBackground: '#3b1c1c',
  error: '#ff6b6b',
  onPrimary: '#ffffff',

  segmentBackground: '#1e1e1e',
  segmentSelected: '#2a2a2a',
  segmentSelectedText: '#ffffff',
  segmentUnselectedText: '#666666',
};

export const lightColors: ColorPalette = {
  background: '#f2f2f7',
  surface: '#ffffff',
  surfaceRaised: '#e8e8ed',

  textPrimary: '#000000',
  textSecondary: '#3c3c43',
  textMuted: '#8e8e93',
  textPlaceholder: '#aeaeb2',

  border: '#d1d1d6',
  borderSubtle: '#c7c7cc',

  accent: '#4f8ef7',

  keyBackground: '#ffffff',
  keyBorder: '#d1d1d6',
  keyActionBackground: '#e8e8ed',

  duplicate: '#c0392b',
  duplicateBackground: '#ffe5e5',
  error: '#ff3b30',
  onPrimary: '#ffffff',

  segmentBackground: '#e8e8ed',
  segmentSelected: '#ffffff',
  segmentSelectedText: '#000000',
  segmentUnselectedText: '#8e8e93',
};
