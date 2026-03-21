import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const NUM_STARS = 80;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function Star({ delay }) {
  const opacity = useRef(new Animated.Value(Math.random())).current;
  const scale = useRef(new Animated.Value(randomBetween(0.5, 1.2))).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: randomBetween(0.1, 0.4),
          duration: randomBetween(800, 2000),
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: randomBetween(0.6, 1),
          duration: randomBetween(800, 2000),
          useNativeDriver: true,
        }),
      ])
    );
    twinkle.start();
    return () => twinkle.stop();
  }, []);

  const size = randomBetween(1, 3);
  const left = randomBetween(0, width);
  const top = randomBetween(0, height);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          top,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

export default function StarBackground({ children }) {
  const stars = Array.from({ length: NUM_STARS }, (_, i) => i);

  return (
    <View style={styles.container}>
      {stars.map((i) => (
        <Star key={i} delay={i * 30} />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
});
