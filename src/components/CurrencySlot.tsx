import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Props {
  currencyCode: string;
  value: string;
  isActive: boolean;
  isDuplicate: boolean;
  onFocus: () => void;
  onChangeText: (text: string) => void;
  onPressCurrency: () => void;
}

export default function CurrencySlot({
  currencyCode,
  value,
  isActive,
  isDuplicate,
  onFocus,
  onChangeText,
  onPressCurrency,
}: Props) {
  return (
    <View style={[styles.row, isActive && styles.activeRow, isDuplicate && styles.duplicateRow]}>
      <TouchableOpacity style={styles.badge} onPress={onPressCurrency}>
        <Text style={styles.badgeText}>{currencyCode}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={value}
        onFocus={onFocus}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="#555"
        selectTextOnFocus
      />
    </View>
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
  activeRow: {
    borderColor: '#4f8ef7',
  },
  duplicateRow: {
    borderColor: '#c0392b',
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
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    textAlign: 'right',
  },
});
