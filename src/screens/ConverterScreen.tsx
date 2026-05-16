import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getRates, forceRefreshRates, convert, Rates, getCurrenciesList, CurrencyInfo } from '../api/exchangeApi';
import CurrencySlot from '../components/CurrencySlot';
import CurrencyPickerModal from '../components/CurrencyPickerModal';
import NumPad from '../components/NumPad';
import SettingsScreen from './SettingsScreen';
import { DEFAULT_SLOTS, POPULAR_CURRENCIES } from '../constants/currencies';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const LAST_REFRESH_KEY = '@last_manual_refresh';

export default function ConverterScreen() {
  const { colors, resolvedTheme, decimals, hapticsEnabled } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [hapticsEnabled]);

  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [values, setValues] = useState<string[]>(['1', '', '']);
  const [rates, setRates] = useState<Rates | null>(null);
  const [currenciesList, setCurrenciesList] = useState<CurrencyInfo[]>(POPULAR_CURRENCIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const [isNewInput, setIsNewInput] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);
  const [lastFetched, setLastFetched] = useState<string>('');
  const [isCached, setIsCached] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownSecs, setRefreshCooldownSecs] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const loopAnim = useRef<Animated.CompositeAnimation | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownEndTimeRef = useRef<number | null>(null);

  const startSpin = useCallback(() => {
    loopAnim.current?.stop();
    spinAnim.setValue(0);
    loopAnim.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loopAnim.current.start();
  }, [spinAnim]);

  useEffect(() => {
    // Re-sync the cooldown display whenever the app returns to the foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && cooldownEndTimeRef.current !== null) {
        const remaining = Math.ceil((cooldownEndTimeRef.current - Date.now()) / 1000);
        setRefreshCooldownSecs(remaining > 0 ? remaining : 0);
        if (remaining <= 0) {
          if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
          cooldownEndTimeRef.current = null;
        }
      }
    });
    return () => {
      sub.remove();
      // Clean up the animation and cooldown timer safely on unmount
      loopAnim.current?.stop();
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  const startCooldown = useCallback((initialSecs: number) => {
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    cooldownEndTimeRef.current = Date.now() + initialSecs * 1000;
    // Derive remaining time from the end timestamp on every tick so background
    // throttling of JS timers doesn't leave a stale non-zero countdown.
    const tick = () => {
      const remaining = Math.ceil(((cooldownEndTimeRef.current ?? 0) - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(cooldownIntervalRef.current!);
        cooldownIntervalRef.current = null;
        cooldownEndTimeRef.current = null;
        setRefreshCooldownSecs(0);
      } else {
        setRefreshCooldownSecs(remaining);
      }
    };
    tick();
    cooldownIntervalRef.current = setInterval(tick, 1000);
  }, []);

  useEffect(() => {
    if (rates) {
      recalculate(activeSlot, values[activeSlot] || '', slots, rates);
    }
    // Intentionally limited deps: only re-run when decimal precision changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decimals]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    init();
  }, []);

  async function fetchSettings(currList: CurrencyInfo[] = currenciesList) {
    try {
      const savedSlots = await AsyncStorage.getItem('@setting_default_slots');
      if (savedSlots) {
        const parsed = JSON.parse(savedSlots);
        const isValidArray = Array.isArray(parsed) &&
          parsed.length === DEFAULT_SLOTS.length &&
          parsed.every((item: any) => typeof item === 'string' && currList.some(c => c.code === item));

        if (isValidArray) {
          setSlots(parsed);
          // If rates exist, recalculate to reflect new slots
          if (rates) recalculate(activeSlot, values[activeSlot], parsed, rates);
          return parsed;
        } else {
          setSlots(DEFAULT_SLOTS);
          await AsyncStorage.setItem('@setting_default_slots', JSON.stringify(DEFAULT_SLOTS));
        }
      }
    } catch (e) {
      setSlots(DEFAULT_SLOTS);
      await AsyncStorage.setItem('@setting_default_slots', JSON.stringify(DEFAULT_SLOTS)).catch(() => {});
    }
    return DEFAULT_SLOTS;
  }

  async function init() {
    let list = POPULAR_CURRENCIES;
    try {
      list = await getCurrenciesList();
      if (list && list.length > 0) {
        setCurrenciesList(list);
      } else {
        list = POPULAR_CURRENCIES;
      }
    } catch {}

    // Restore cooldown if user refreshed recently in a prior session
    try {
      const lastRefreshStr = await AsyncStorage.getItem(LAST_REFRESH_KEY);
      if (lastRefreshStr) {
        const elapsed = Date.now() - parseInt(lastRefreshStr, 10);
        const remainingSecs = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000);
        if (remainingSecs > 0) startCooldown(remainingSecs);
      }
    } catch {}

    const currentSlots = await fetchSettings(list);
    loadRates(currentSlots);
  }

  async function loadRates(currentSlots: string[] = slots) {
    try {
      setLoading(true);
      setError(null);
      const { rates: r, fromCache } = await getRates();
      setRates(r);
      setIsCached(fromCache);
      setLastFetched(
        new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      // Auto-convert with initial value
      recalculate(0, '1', currentSlots, r);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load rates');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualRefresh() {
    if (isRefreshing || refreshCooldownSecs > 0) return;
    try {
      setIsRefreshing(true);
      startSpin();
      setError(null);
      const r = await forceRefreshRates();
      setRates(r);
      setIsCached(false);
      setLastFetched(
        new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      recalculate(activeSlot, values[activeSlot] ?? '', slots, r);
      // Persist timestamp and start the 5-minute cooldown
      await AsyncStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
      startCooldown(REFRESH_COOLDOWN_MS / 1000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to refresh rates');
    } finally {
      setIsRefreshing(false);
      loopAnim.current?.stop();
    }
  }

  function recalculate(
    sourceIdx: number,
    rawText: string,
    currentSlots: string[],
    currentRates: Rates
  ) {
    const amount = parseFloat(rawText) || 0;
    const newValues = currentSlots.map((code, i) => {
      if (i === sourceIdx) return rawText;
      if (amount === 0) return '';
      
      const result = convert(amount, currentSlots[sourceIdx], code, currentRates);
      
      if (decimals === 'hide') {
        return result.toFixed(0);
      } else if (decimals === '1') {
        return result.toFixed(1);
      } else if (decimals === '4') {
        return result.toFixed(4);
      } else {
        return result.toFixed(2);
      }
    });
    setValues(newValues);
  }

  function handleFocus(slotIdx: number) {
    setActiveSlot(slotIdx);
    setIsNewInput(true);
  }

  // Append a key (digit, '.', or '00') to the active slot's value
  function handleNumPadKey(key: string) {
    let current = values[activeSlot] || '';

    // If typing right after focusing, replace the existing value
    if (isNewInput) {
      if (key === '0' || key === '00') return; // Block leading zeros on fresh focus

      let next = '';
      if (key === '.') {
        next = '0.';
      } else {
        next = key;
      }

      setIsNewInput(false);
      if (rates) recalculate(activeSlot, next, slots, rates);
      return;
    }

    // If field is empty or just '0', handle leading characters carefully
    if (current === '' || current === '0') {
      if (key === '0' || key === '00') return; // Block redundant zeros
      if (key === '.') {
        current = '0'; // will become '0.'
      } else {
        current = ''; // replace '0' with the new digit
      }
    }

    // Prevent multiple decimal points
    if (key === '.' && current.includes('.')) return;

    const maxInputDecimals = decimals === '4' ? 4 : 2;
    if (current.includes('.')) {
      const decimalPart = current.split('.')[1] || '';
      if (key === '00' && decimalPart.length + 2 > maxInputDecimals) return;
      if (decimalPart.length >= maxInputDecimals) return;
    }

    const next = current + key;

    // Limit to 15 characters
    if (next.length > 15) {
      const msg = 'Maximum limit reached (15 digits)';
      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert('Limit Reached', msg);
      }
      return;
    }

    if (rates) recalculate(activeSlot, next, slots, rates);
  }

  // Remove the last character from the active slot's value
  function handleBackspace() {
    setIsNewInput(false);
    const current = values[activeSlot] || '';
    const next = current.slice(0, -1);
    if (rates) recalculate(activeSlot, next, slots, rates);
  }

  // Clear the active slot's value entirely
  function handleClear() {
    setIsNewInput(false);
    if (rates) recalculate(activeSlot, '', slots, rates);
  }

  function handleSwap(idx1: number, idx2: number) {
    triggerHaptic();
    const newSlots = [...slots];
    [newSlots[idx1], newSlots[idx2]] = [newSlots[idx2], newSlots[idx1]];
    const newValues = [...values];
    [newValues[idx1], newValues[idx2]] = [newValues[idx2], newValues[idx1]];
    let newActiveSlot = activeSlot;
    if (activeSlot === idx1) newActiveSlot = idx2;
    else if (activeSlot === idx2) newActiveSlot = idx1;
    setSlots(newSlots);
    setValues(newValues);
    setActiveSlot(newActiveSlot);
    setIsNewInput(true);
  }

  function openPicker(slotIdx: number) {
    triggerHaptic();
    setPickerTarget(slotIdx);
    setPickerVisible(true);
  }

  const selectCurrency = useCallback((code: string) => {
    triggerHaptic();
    if (pickerTarget === null) return;
    const newSlots = [...slots];
    newSlots[pickerTarget] = code;
    setSlots(newSlots);
    setPickerVisible(false);
    if (rates) recalculate(activeSlot, values[activeSlot], newSlots, rates);
  }, [pickerTarget, slots, rates, activeSlot, values]);

  // Pre-compute which currency codes appear more than once so the filter
  // doesn't run inside the render of every slot on every state change
  const duplicateCodes = useMemo(() => {
    const count: Record<string, number> = {};
    slots.forEach((s) => { count[s] = (count[s] ?? 0) + 1; });
    return new Set(Object.keys(count).filter((k) => count[k] > 1));
  }, [slots]);

  if (showSettings) {
    return (
      <SettingsScreen
        currenciesList={currenciesList}
        onClose={() => {
          setShowSettings(false);
          fetchSettings(currenciesList);
        }}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Fetching live rates...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { triggerHaptic(); loadRates(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topContent}>
        {/* Header row: title block left, settings button right */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>RateFlip</Text>
            <Text style={styles.appSubtitle}>Currency Converter</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            activeOpacity={0.7}
            onPress={() => { triggerHaptic(); setShowSettings(true); }}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.slots}>
          {slots.map((code, i) => (
            <React.Fragment key={i}>
              <CurrencySlot
                currencyCode={code}
                value={values[i]}
                isActive={activeSlot === i}
                isDuplicate={duplicateCodes.has(code)}
                onFocus={() => handleFocus(i)}
                onPressCurrency={() => openPicker(i)}
              />
              {i < slots.length - 1 && (
                <TouchableOpacity
                  style={styles.swapBtn}
                  activeOpacity={0.7}
                  onPress={() => handleSwap(i, i + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${slots[i]} and ${slots[i + 1]}`}
                >
                  <Text style={styles.swapIcon}>⇅</Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.subtitle}>
          Rates updated: {lastFetched}{isCached ? '  (cached)' : ''}
        </Text>

        <TouchableOpacity
          style={[
            styles.refreshBtn,
            { flexDirection: 'row', alignItems: 'center' },
            (isRefreshing || refreshCooldownSecs > 0) && { opacity: 0.45 },
          ]}
          onPress={() => { triggerHaptic(); handleManualRefresh(); }}
          disabled={isRefreshing || refreshCooldownSecs > 0}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Text style={[styles.refreshText, { marginRight: 6 }]}>↻</Text>
          </Animated.View>
          <Text style={styles.refreshText}>
            {isRefreshing
              ? 'Refreshing...'
              : refreshCooldownSecs > 0
                ? `Available in ${Math.floor(refreshCooldownSecs / 60)}m ${String(refreshCooldownSecs % 60).padStart(2, '0')}s`
                : 'Refresh Rates'}
          </Text>
        </TouchableOpacity>
      </View>

      <NumPad
        onKeyPress={handleNumPadKey}
        onBackspace={handleBackspace}
        onClear={handleClear}
      />

      <CurrencyPickerModal
        visible={pickerVisible}
        currencies={currenciesList}
        onSelect={selectCurrency}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topContent: {
      flex: 1,
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 8,
    },
    settingsBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsIcon: {
      color: colors.textMuted,
      fontSize: 20,
    },
    centered: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      color: colors.textPrimary,
      fontSize: 32,
      fontWeight: '800',
      marginBottom: 2,
      letterSpacing: 0.5,
    },
    appSubtitle: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 10,
      marginBottom: 4,
      textAlign: 'center',
    },
    slots: {
      gap: 2,
    },
    swapBtn: {
      alignSelf: 'center',
      paddingVertical: 2,
      paddingHorizontal: 16,
    },
    swapIcon: {
      color: colors.textMuted,
      fontSize: 18,
    },
    loadingText: {
      color: colors.textSecondary,
      marginTop: 12,
      fontSize: 14,
    },
    errorText: {
      color: colors.error,
      fontSize: 15,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    retryBtn: {
      marginTop: 16,
      backgroundColor: colors.accent,
      paddingHorizontal: 28,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryText: {
      color: colors.onPrimary,
      fontWeight: '600',
    },
    refreshBtn: {
      marginTop: 8,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    refreshText: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
}
