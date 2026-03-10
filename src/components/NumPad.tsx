import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface NumPadProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

// Numpad layout inspired by calculator-style grids
// 4 columns: 3 number keys + 1 action key per row
const ROWS: string[][] = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['00', '0', '.'],
];

export default function NumPad({ onKeyPress, onBackspace, onClear }: NumPadProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.key}
                activeOpacity={0.6}
                onPress={() => onKeyPress(key)}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Right action column: AC (top, tall) and Backspace (bottom, tall) */}
      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={[styles.actionKey, styles.clearKey]}
          activeOpacity={0.6}
          onPress={onClear}
        >
          <Text style={styles.actionText}>AC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionKey, styles.backspaceKey]}
          activeOpacity={0.6}
          onPress={onBackspace}
        >
          <Text style={styles.backspaceIcon}>⌫</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BUTTON_SIZE = 72;
const BUTTON_GAP = 12;

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 16,
      gap: BUTTON_GAP,
    },
    grid: {
      flex: 1,
      gap: BUTTON_GAP,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: BUTTON_GAP,
    },
    key: {
      flex: 1,
      height: BUTTON_SIZE,
      backgroundColor: colors.keyBackground,
      borderRadius: BUTTON_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.keyBorder,
    },
    keyText: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '500',
    },
    actionColumn: {
      width: BUTTON_SIZE,
      gap: BUTTON_GAP,
    },
    actionKey: {
      flex: 1,
      backgroundColor: colors.keyActionBackground,
      borderRadius: BUTTON_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.keyBorder,
    },
    clearKey: {},
    backspaceKey: {},
    actionText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
    backspaceIcon: {
      color: colors.textPrimary,
      fontSize: 22,
    },
  });
}
