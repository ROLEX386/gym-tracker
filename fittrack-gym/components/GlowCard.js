import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../theme/SpaceTheme';

export default function GlowCard({ children, style, glowColor = Colors.neonBlue, intensity = 1 }) {
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: `${glowColor}60`,
          shadowColor: glowColor,
          shadowOpacity: 0.4 * intensity,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0, 10, 40, 0.85)',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
    marginVertical: 6,
  },
});
