import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CurrencyInfo } from '../api/exchangeApi';
import { useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  currencies: CurrencyInfo[];
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function CurrencyPickerModal({ visible, currencies, onSelect, onClose }: Props) {
  const { colors, resolvedTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const filteredCurrencies = useMemo(
    () =>
      currencies.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery, currencies]
  );

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (code: string) => {
      setSearchQuery('');
      onSelect(code);
    },
    [onSelect]
  );

  const renderItem = useCallback(
    ({ item }: { item: CurrencyInfo }) => (
      <Pressable
        style={styles.currencyItem}
        onPress={() => handleSelect(item.code)}
        android_ripple={{ color: colors.surfaceRaised }}
        accessibilityRole="button"
        accessibilityLabel={`${item.code}, ${item.name}`}
      >
        <Text style={styles.currencyItemCode}>{item.code}</Text>
        <Text style={styles.currencyItemText}>{item.name}</Text>
      </Pressable>
    ),
    [handleSelect, styles, colors]
  );

  // Sheet starts just below the status bar so no blank space appears above the header
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.55)" barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} />
      {/* Dark overlay behind the sheet — tapping it closes the picker */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      {/* Sheet — sits below the status bar, fills the rest of the screen */}
      <View style={[styles.sheet, { top: statusBarHeight }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select currency</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBarWrapper}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.textPlaceholder}
            selectionColor={colors.accent}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search currencies"
          />
        </View>

        {/* Currency list */}
        <FlatList
          ref={flatListRef}
          data={filteredCurrencies}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
          showsVerticalScrollIndicator
          indicatorStyle={resolvedTheme === 'dark' ? 'white' : 'default'}
          ListEmptyComponent={<Text style={styles.noResults}>No currencies found</Text>}
          onScrollToIndexFailed={() => {}}
        />
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    // Semi-transparent backdrop covering the full screen (including status bar area)
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    // Sheet anchored just below the status bar, fills remaining space
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: {
      marginRight: 16,
    },
    backIcon: {
      color: colors.textPrimary,
      fontSize: 24,
      lineHeight: 28,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceRaised,
      borderRadius: 14,
      marginHorizontal: 16,
      marginTop: 6,
      marginBottom: 10,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
    },
    searchIcon: {
      color: colors.textMuted,
      fontSize: 22,
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
      paddingVertical: 0,
    },
    noResults: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 40,
      fontSize: 14,
    },
    currencyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    currencyItemCode: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 16,
      width: 50,
      marginRight: 10,
    },
    currencyItemText: {
      color: colors.textSecondary,
      fontSize: 15,
      flex: 1,
    },
  });
}
