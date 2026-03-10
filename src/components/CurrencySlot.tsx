import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { formatCurrencyValue } from '../utils/format';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const formattedValue = formatCurrencyValue(value);

  const styles = makeStyles(colors);

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

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginVertical: 8,
      paddingHorizontal: 12,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowPressed: {
      opacity: 0.75,
    },
    activeRow: {
      borderColor: colors.accent,
    },
    duplicateRow: {
      borderColor: colors.duplicate,
      backgroundColor: colors.duplicateBackground,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceRaised,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 12,
      minWidth: 80,
    },
    badgeText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      marginRight: 4,
    },
    chevron: {
      color: colors.textMuted,
      fontSize: 10,
    },
    valueContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    valueText: {
      color: colors.textPrimary,
      fontSize: 27,
      fontWeight: '300',
      textAlign: 'right',
    },
    placeholderText: {
      color: colors.textPlaceholder,
    },
    cursor: {
      width: 2,
      height: 28,
      backgroundColor: colors.accent,
      marginLeft: 2,
      borderRadius: 1,
    },
  });
}
