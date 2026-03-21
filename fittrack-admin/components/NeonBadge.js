import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../theme/SpaceTheme';

const MAP = {
  pending:  { color: Colors.neonYellow, label: 'PENDING'  },
  approved: { color: Colors.neonGreen,  label: 'APPROVED' },
  rejected: { color: Colors.neonRed,    label: 'REJECTED' },
};

export default function NeonBadge({ status }) {
  const { color, label } = MAP[status] || { color: Colors.neonBlue, label: status?.toUpperCase() };
  return (
    <View style={[styles.badge, { borderColor: color, shadowColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 4, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  label: { fontFamily: 'Orbitron_700Bold', fontSize: 9, letterSpacing: 1.5 },
});
