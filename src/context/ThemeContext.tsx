import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, darkColors, lightColors } from '../theme/colors';

export type ThemePreference = 'device' | 'light' | 'dark';

type ThemeContextValue = {
  colors: ColorPalette;
  // The preference the user selected (device/light/dark)
  preference: ThemePreference;
  // The resolved variant after applying device fallback
  resolvedTheme: 'light' | 'dark';
  setPreference: (pref: ThemePreference) => void;
};

const STORAGE_KEY = '@setting_theme';

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  preference: 'device',
  resolvedTheme: 'dark',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('device');

  // Load saved preference from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'device' || saved === 'light' || saved === 'dark') {
        setPreferenceState(saved);
      }
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  // Resolve actual light/dark from preference + device scheme
  const resolvedTheme: 'light' | 'dark' =
    preference === 'device'
      ? (deviceScheme === 'light' ? 'light' : 'dark')
      : preference;

  const colors = resolvedTheme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ colors, preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Convenience hook — any component can call useTheme() to get colors + helpers
export function useTheme() {
  return useContext(ThemeContext);
}
