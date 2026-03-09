import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { formatCurrencyValue } from '../utils/format';

interface Props {
  currencyCode: string;
  value: string;
  isActive: boolean;
  isDuplicate: boolean;
  onFocus: () => void;
  onPressCurrency: () => void;
}

export default function CurrencySlot({
  currencyCode,
  value,
  isActive,
  isDuplicate,
  onFocus,
  onPressCurrency,
}: Props) {
  const formattedValue = formatCurrencyValue(value);

  return (
    // Outer Pressable covers the value area; badge has its own separate Pressable
    <Pressable
      onPress={onFocus}
      style={({ pressed }) => [
        styles.row,
        isDuplicate && styles.duplicateRow,
        isActive && styles.activeRow,
        pressed && styles.rowPressed,
      ]}
    >
      <TouchableOpacity
        style={styles.badge}
        activeOpacity={0.7}
        onPress={() => {
          onFocus();
          onPressCurrency();
        }}
      >
        <Text style={styles.badgeText}>{currencyCode}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
      <View style={styles.valueContainer}>
        <Text
          style={[styles.valueText, !value && styles.placeholderText]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {formattedValue || '0'}
        </Text>
        {isActive && <View style={styles.cursor} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  rowPressed: {
    opacity: 0.75,
  },
  activeRow: {
    borderColor: '#4f8ef7',
  },
  duplicateRow: {
    borderColor: '#c0392b',
    backgroundColor: '#3b1c1c',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    minWidth: 80,
  },
  badgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  chevron: {
    color: '#888',
    fontSize: 10,
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  valueText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    textAlign: 'right',
  },
  placeholderText: {
    color: '#555',
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: '#4f8ef7',
    marginLeft: 2,
    borderRadius: 1,
  },
});
