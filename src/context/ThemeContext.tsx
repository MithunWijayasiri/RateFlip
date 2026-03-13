import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ColorPalette, darkColors, lightColors } from '../theme/colors';

export type ThemePreference = 'device' | 'light' | 'dark';
export type DecimalsPreference = 'hide' | '1' | '2' | '4';

type ThemeContextValue = {
  colors: ColorPalette;
  // The preference the user selected (device/light/dark)
  preference: ThemePreference;
  // The resolved variant after applying device fallback
  resolvedTheme: 'light' | 'dark';
  setPreference: (pref: ThemePreference) => void;
  decimals: DecimalsPreference;
  setDecimals: (pref: DecimalsPreference) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  triggerHaptic: () => void;
};

const STORAGE_KEY = '@setting_theme';
const STORAGE_KEY_DECIMALS = '@setting_decimals';
const STORAGE_KEY_HAPTICS = '@setting_haptics';

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  preference: 'device',
  resolvedTheme: 'dark',
  setPreference: () => {},
  decimals: '2',
  setDecimals: () => {},
  hapticsEnabled: true,
  setHapticsEnabled: () => {},
  triggerHaptic: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('device');
  const [decimals, setDecimalsState] = useState<DecimalsPreference>('2');
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(true);

  // Load saved preference from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'device' || saved === 'light' || saved === 'dark') {
        setPreferenceState(saved);
      }
    }).catch(() => {});

    AsyncStorage.getItem(STORAGE_KEY_DECIMALS).then((saved) => {
      if (saved === 'hide' || saved === '1' || saved === '2' || saved === '4') {
        setDecimalsState(saved);
      }
    }).catch(() => {});

    AsyncStorage.getItem(STORAGE_KEY_HAPTICS).then((saved) => {
      if (saved !== null) {
        setHapticsEnabledState(saved === 'true');
      }
    }).catch(() => {});
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const setDecimals = useCallback((pref: DecimalsPreference) => {
    setDecimalsState(pref);
    AsyncStorage.setItem(STORAGE_KEY_DECIMALS, pref).catch(() => {});
  }, []);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    setHapticsEnabledState(enabled);
    AsyncStorage.setItem(STORAGE_KEY_HAPTICS, enabled ? 'true' : 'false').catch(() => {});
  }, []);

  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [hapticsEnabled]);

  // Resolve actual light/dark from preference + device scheme
  const resolvedTheme: 'light' | 'dark' =
    preference === 'device'
      ? (deviceScheme === 'light' ? 'light' : 'dark')
      : preference;

  const colors = resolvedTheme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ colors, preference, resolvedTheme, setPreference, decimals, setDecimals, hapticsEnabled, setHapticsEnabled, triggerHaptic }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Convenience hook — any component can call useTheme() to get colors + helpers
export function useTheme() {
  return useContext(ThemeContext);
}
