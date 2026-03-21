import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Typography } from '../theme/SpaceTheme';

export default function StarBackground({ children }) {
  const NUM_STARS = 80;
  const stars = Array.from({ length: NUM_STARS }, (_, i) => ({
    id: i,
    x: Math.random() * 400,
    y: Math.random() * 900,
    size: Math.random() * 2 + 1,
  }));

  return (
    <View style={styles.container}>
      {stars.map(star => (
        <View
          key={star.id}
          style={[styles.star, {
            left: star.x, top: star.y,
            width: star.size, height: star.size, borderRadius: star.size / 2,
          }]}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  star: { position: 'absolute', backgroundColor: '#ffffff', opacity: 0.6 },
});
