import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius } from '../theme/SpaceTheme';

export default function NeonButton({
  title,
  onPress,
  color = Colors.neonBlue,
  variant = 'primary', // 'primary' | 'danger' | 'success'
  loading = false,
  disabled = false,
  style,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const glowColors = {
    primary: Colors.neonBlue,
    danger: Colors.neonRed,
    success: Colors.neonGreen,
    purple: Colors.neonPurple,
  };

  const glowColor = glowColors[variant] || color;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            borderColor: glowColor,
            shadowColor: glowColor,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={glowColor} size="small" />
        ) : (
          <Text style={[styles.text, { color: glowColor }]}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 10, 30, 0.9)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
