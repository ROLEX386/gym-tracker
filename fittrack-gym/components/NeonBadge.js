import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../theme/SpaceTheme';

const badgeConfig = {
  active:    { color: Colors.neonGreen,  label: 'ACTIVE' },
  expiring:  { color: Colors.neonYellow, label: 'EXPIRING' },
  expired:   { color: Colors.neonRed,    label: 'EXPIRED' },
  pending:   { color: Colors.neonYellow, label: 'PENDING' },
  approved:  { color: Colors.neonGreen,  label: 'APPROVED' },
  rejected:  { color: Colors.neonRed,    label: 'REJECTED' },
};

export default function NeonBadge({ status, customLabel, customColor }) {
  const config = badgeConfig[status] || { color: customColor || Colors.neonBlue, label: customLabel || status };

  return (
    <View style={[styles.badge, { borderColor: config.color, shadowColor: config.color }]}>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  label: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
  },
});
