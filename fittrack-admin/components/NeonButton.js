import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius } from '../theme/SpaceTheme';

export default function NeonButton({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowMap = {
    primary: Colors.neonBlue,
    danger: Colors.neonRed,
    success: Colors.neonGreen,
    purple: Colors.neonPurple,
  };
  const c = glowMap[variant] || Colors.neonBlue;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.btn, { borderColor: c, shadowColor: c, opacity: disabled ? 0.4 : 1 }, style]}
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
      >
        {loading
          ? <ActivityIndicator color={c} />
          : <Text style={[styles.txt, { color: c }]}>{title}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1.5, borderRadius: BorderRadius.md,
    paddingVertical: 12, paddingHorizontal: 20,
    alignItems: 'center', backgroundColor: 'rgba(0,10,30,0.9)',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12, elevation: 8,
  },
  txt: { fontFamily: 'Orbitron_700Bold', fontSize: 12, letterSpacing: 2 },
});
