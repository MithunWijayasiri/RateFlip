import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getRates, forceRefreshRates, convert, Rates } from '../api/exchangeApi';
import CurrencySlot from '../components/CurrencySlot';
import NumPad from '../components/NumPad';
import SettingsScreen from './SettingsScreen';
import { DEFAULT_SLOTS, POPULAR_CURRENCIES } from '../constants/currencies';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConverterScreen() {
  const { colors, decimals, hapticsEnabled } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [hapticsEnabled]);

  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [values, setValues] = useState<string[]>(['1', '', '']);
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const [isNewInput, setIsNewInput] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);
  const [lastFetched, setLastFetched] = useState<string>('');
  const [isCached, setIsCached] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinAnim = React.useRef(new Animated.Value(0)).current;
  const loopAnim = React.useRef<Animated.CompositeAnimation | null>(null);

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
    return () => {
      // Clean up the animation safely on unmount
      loopAnim.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (rates) {
      recalculate(activeSlot, values[activeSlot] || '', slots, rates);
    }
  }, [decimals]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    init();
  }, []);

  async function fetchSettings() {
    try {
      const savedSlots = await AsyncStorage.getItem('@setting_default_slots');
      if (savedSlots) {
        const parsed = JSON.parse(savedSlots);
        const isValidArray = Array.isArray(parsed) &&
          parsed.length === DEFAULT_SLOTS.length &&
          parsed.every((item: any) => typeof item === 'string' && POPULAR_CURRENCIES.some(c => c.code === item));

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
    const currentSlots = await fetchSettings();
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
    if (isRefreshing) return;
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

    // Limit to two decimal places
    if (current.includes('.')) {
      const decimalPart = current.split('.')[1] || '';
      if (key === '00' && decimalPart.length >= 1) return;
      if (decimalPart.length >= 2) return;
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

  function openPicker(slotIdx: number) {
    triggerHaptic();
    setPickerTarget(slotIdx);
    setSearchQuery('');
    setPickerVisible(true);
  }

  const selectCurrency = useCallback((code: string) => {
    triggerHaptic();
    if (pickerTarget === null) return;
    const newSlots = [...slots];
    newSlots[pickerTarget] = code;
    setSlots(newSlots);
    AsyncStorage.setItem('@setting_default_slots', JSON.stringify(newSlots)).catch(() => {});
    setPickerVisible(false);
    setSearchQuery('');
    if (rates) recalculate(activeSlot, values[activeSlot], newSlots, rates);
  }, [pickerTarget, slots, rates, activeSlot, values]);

  // Pre-compute which currency codes appear more than once so the filter
  // doesn't run inside the render of every slot on every state change
  const duplicateCodes = useMemo(() => {
    const count: Record<string, number> = {};
    slots.forEach((s) => { count[s] = (count[s] ?? 0) + 1; });
    return new Set(Object.keys(count).filter((k) => count[k] > 1));
  }, [slots]);

  const renderCurrencyItem = useCallback(
    ({ item }: { item: { code: string; name: string } }) => (
      <TouchableOpacity
        style={styles.currencyItem}
        onPress={() => selectCurrency(item.code)}
      >
        <Text style={styles.currencyCode}>{item.code}</Text>
        <Text style={styles.currencyName}>{item.name}</Text>
      </TouchableOpacity>
    ),
    [selectCurrency, styles]
  );

  const filteredCurrencies = useMemo(
    () =>
      POPULAR_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  if (showSettings) {
    return (
      <SettingsScreen
        onClose={() => {
          setShowSettings(false);
          fetchSettings();
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
            <CurrencySlot
              key={i}
              currencyCode={code}
              value={values[i]}
              isActive={activeSlot === i}
              isDuplicate={duplicateCodes.has(code)}
              onFocus={() => handleFocus(i)}
              onPressCurrency={() => openPicker(i)}
            />
          ))}
        </View>

        <Text style={styles.subtitle}>
          Rates updated: {lastFetched}{isCached ? '  (cached)' : ''}
        </Text>

        <TouchableOpacity
          style={[styles.refreshBtn, { flexDirection: 'row', alignItems: 'center' }]}
          onPress={() => { triggerHaptic(); handleManualRefresh(); }}
          disabled={isRefreshing}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Text style={[styles.refreshText, { marginRight: 6 }]}>↻</Text>
          </Animated.View>
          <Text style={styles.refreshText}>
            {isRefreshing ? 'Refreshing...' : 'Refresh Rates'}
          </Text>
        </TouchableOpacity>
      </View>

      <NumPad
        onKeyPress={handleNumPadKey}
        onBackspace={handleBackspace}
        onClear={handleClear}
      />

      {/* Currency Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setPickerVisible(false); setSearchQuery(''); }}
      >
        <TouchableWithoutFeedback onPress={() => { setPickerVisible(false); setSearchQuery(''); }}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Currency</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search currency..."
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <FlatList
            data={filteredCurrencies}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={renderCurrencyItem}
            ListEmptyComponent={
              <Text style={styles.noResults}>No currencies found</Text>
            }
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 12 : 0,
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
      gap: 4,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
      paddingHorizontal: 16,
      maxHeight: '60%',
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
      textAlign: 'center',
    },
    searchInput: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      color: colors.textPrimary,
      fontSize: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    noResults: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 24,
      fontSize: 14,
    },
    currencyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceRaised,
    },
    currencyCode: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 16,
      width: 56,
    },
    currencyName: {
      color: colors.textSecondary,
      fontSize: 14,
    },
  });
}
