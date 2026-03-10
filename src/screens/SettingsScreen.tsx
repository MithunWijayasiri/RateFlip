import React, { useEffect, useState, useMemo } from 'react';
import {
  BackHandler,
  Platform,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemePreference } from '../context/ThemeContext';
import { DEFAULT_SLOTS, POPULAR_CURRENCIES } from '../constants/currencies';

interface Props {
  onClose: () => void;
}

// Labels and values for the theme segmented control
const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'Device', value: 'device' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen({ onClose }: Props) {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('@setting_default_slots').then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSlots(parsed);
          }
        } catch (e) {
          // Ignore invalid or corrupted JSON
        }
      }
    }).catch(() => {});
  }, []);

  const openPicker = (index: number) => {
    setPickerTarget(index);
    setSearchQuery('');
    setPickerVisible(true);
  };

  const selectCurrency = (code: string) => {
    if (pickerTarget === null) return;
    const newSlots = [...slots];
    newSlots[pickerTarget] = code;
    setSlots(newSlots);
    AsyncStorage.setItem('@setting_default_slots', JSON.stringify(newSlots)).catch(() => {});
    setPickerVisible(false);
  };

  const filteredCurrencies = useMemo(
    () =>
      POPULAR_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  useEffect(() => {
    const handleBackPress = () => {
      onClose();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [onClose]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        {/* Placeholder to balance the header row */}
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        {/* ── Theme Section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APPEARANCE</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Theme</Text>
                <Text style={styles.settingSubtitle}>Choose your preferred color scheme</Text>
              </View>
            </View>
            {/* Segmented control */}
            <View style={styles.segmentControl}>
              {THEME_OPTIONS.map((opt) => {
                const isSelected = preference === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.segment, isSelected && styles.segmentActive]}
                    activeOpacity={0.7}
                    onPress={() => setPreference(opt.value)}
                  >
                    <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Default Currencies Section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEFAULT CURRENCIES</Text>
          <View style={styles.card}>
            {slots.map((code, index) => {
              const currency = POPULAR_CURRENCIES.find((c) => c.code === code);
              return (
                <View key={index}>
                  <TouchableOpacity
                    style={styles.slotRow}
                    activeOpacity={0.7}
                    onPress={() => openPicker(index)}
                  >
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotCode}>{code}</Text>
                      <Text style={styles.slotName}>{currency?.name || 'Unknown'}</Text>
                    </View>
                    <Text style={styles.chevron}>▼</Text>
                  </TouchableOpacity>
                  {index < slots.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </View>
      </View>

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
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.currencyItem}
                onPress={() => selectCurrency(item.code)}
              >
                <Text style={styles.currencyCode}>{item.code}</Text>
                <Text style={styles.currencyName}>{item.name}</Text>
              </TouchableOpacity>
            )}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIcon: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: '400',
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    body: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    // Section grouping
    section: {
      marginBottom: 28,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
      paddingLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    settingTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    settingSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    // Segmented control
    segmentControl: {
      flexDirection: 'row',
      backgroundColor: colors.segmentBackground,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: colors.segmentSelected,
      // Subtle shadow for the active pill
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    segmentText: {
      color: colors.segmentUnselectedText,
      fontSize: 13,
      fontWeight: '500',
    },
    segmentTextActive: {
      color: colors.segmentSelectedText,
      fontWeight: '700',
    },
    // Slot Styles
    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    slotInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    slotCode: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      width: 48,
    },
    slotName: {
      color: colors.textSecondary,
      fontSize: 15,
    },
    chevron: {
      color: colors.textMuted,
      fontSize: 12,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderSubtle,
    },
    // Modal Styles added
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
