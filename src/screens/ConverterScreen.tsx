import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getRates, convert, Rates } from '../api/exchangeApi';
import CurrencySlot from '../components/CurrencySlot';
import { DEFAULT_SLOTS, POPULAR_CURRENCIES } from '../constants/currencies';

export default function ConverterScreen() {
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [values, setValues] = useState<string[]>(['1', '', '']);
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);
  const [lastFetched, setLastFetched] = useState<string>('');

  useEffect(() => {
    loadRates();
  }, []);

  async function loadRates() {
    try {
      setLoading(true);
      setError(null);
      const r = await getRates();
      setRates(r);
      setLastFetched(new Date().toLocaleTimeString());
      // Auto-convert with initial value
      recalculate(0, '1', slots, r);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load rates');
    } finally {
      setLoading(false);
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
      const result = convert(amount, currentSlots[sourceIdx], code, currentRates);
      return amount === 0 ? '' : result.toFixed(1);
    });
    setValues(newValues);
  }

  function handleChangeText(slotIdx: number, text: string) {
    setActiveSlot(slotIdx);
    if (rates) recalculate(slotIdx, text, slots, rates);
  }

  function openPicker(slotIdx: number) {
    setPickerTarget(slotIdx);
    setPickerVisible(true);
  }

  function selectCurrency(code: string) {
    if (pickerTarget === null) return;
    const newSlots = [...slots];
    newSlots[pickerTarget] = code;
    setSlots(newSlots);
    setPickerVisible(false);
    if (rates) recalculate(activeSlot, values[activeSlot], newSlots, rates);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4f8ef7" />
        <Text style={styles.loadingText}>Fetching live rates...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadRates}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Currency Converter</Text>
      <Text style={styles.subtitle}>Rates updated: {lastFetched}</Text>

      <View style={styles.slots}>
        {slots.map((code, i) => (
          <CurrencySlot
            key={i}
            currencyCode={code}
            value={values[i]}
            isActive={activeSlot === i}
            onFocus={() => setActiveSlot(i)}
            onChangeText={(text) => handleChangeText(i, text)}
            onPressCurrency={() => openPicker(i)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={loadRates}>
        <Text style={styles.refreshText}>↻ Refresh Rates</Text>
      </TouchableOpacity>

      {/* Currency Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Currency</Text>
          <FlatList
            data={POPULAR_CURRENCIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.currencyItem}
                onPress={() => selectCurrency(item.code)}
              >
                <Text style={styles.currencyCode}>{item.code}</Text>
                <Text style={styles.currencyName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 12 : 0,
  },
  centered: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
    marginBottom: 24,
  },
  slots: {
    gap: 4,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#4f8ef7',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  refreshBtn: {
    marginTop: 24,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  refreshText: {
    color: '#888',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '60%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  currencyCode: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    width: 56,
  },
  currencyName: {
    color: '#aaa',
    fontSize: 14,
  },
});
