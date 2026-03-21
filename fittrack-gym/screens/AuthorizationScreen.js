import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
} from 'react-native';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import StarBackground from '../components/StarBackground';
import GlowCard from '../components/GlowCard';
import NeonButton from '../components/NeonButton';
import { Colors, Typography, Spacing } from '../theme/SpaceTheme';

export default function AuthorizationScreen({ deviceId, onApproved }) {
  const [status, setStatus] = useState('pending');
  const [pulse] = useState(new Animated.Value(1));
  const [ringOpacity] = useState(new Animated.Value(0));
  const [rotating] = useState(new Animated.Value(0));

  useEffect(() => {
    // Pulsing circle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Rotating ring
    Animated.loop(
      Animated.timing(rotating, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Ripple ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Write device request and listen for approval
  useEffect(() => {
    if (!deviceId) return;

    // Write the pending request
    set(ref(db, `devices/${deviceId}`), {
      status: 'pending',
      requestedAt: Date.now(),
    });

    // Listen for status changes
    const statusRef = ref(db, `devices/${deviceId}/status`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setStatus(val);
      if (val === 'approved') onApproved();
    });

    return () => unsubscribe();
  }, [deviceId]);

  const spin = rotating.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <StarBackground>
      <View style={styles.container}>
        <Text style={styles.logo}>FIT<Text style={{ color: Colors.neonBlue }}>TRACK</Text></Text>
        <Text style={styles.tagline}>GYM MANAGEMENT SYSTEM</Text>

        <View style={styles.orbitContainer}>
          {/* Outer spinning ring */}
          <Animated.View style={[styles.outerRing, { transform: [{ rotate: spin }] }]} />
          {/* Ripple */}
          <Animated.View style={[styles.ripple, { opacity: ringOpacity }]} />
          {/* Center pulse */}
          <Animated.View style={[styles.centerDot, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.lockIcon}>{status === 'rejected' ? '✗' : '🔒'}</Text>
          </Animated.View>
        </View>

        <GlowCard style={styles.card} glowColor={
          status === 'rejected' ? Colors.neonRed :
          status === 'approved' ? Colors.neonGreen : Colors.neonBlue
        }>
          {status === 'pending' && (
            <>
              <Text style={styles.statusTitle}>AWAITING AUTHORIZATION</Text>
              <Text style={styles.statusDesc}>
                Your device has been registered. Please wait for the system owner to approve your access.
              </Text>
              <View style={styles.divider} />
              <Text style={styles.deviceLabel}>DEVICE ID</Text>
              <Text style={styles.deviceId}>{deviceId?.substring(0, 16).toUpperCase()}...</Text>
            </>
          )}
          {status === 'rejected' && (
            <>
              <Text style={[styles.statusTitle, { color: Colors.neonRed }]}>ACCESS DENIED</Text>
              <Text style={styles.statusDesc}>
                Your access request was rejected. Please contact support.
              </Text>
              <View style={styles.divider} />
              <Text style={styles.deviceLabel}>DEVICE ID</Text>
              <Text style={styles.deviceId}>{deviceId?.substring(0, 16).toUpperCase()}...</Text>
            </>
          )}
        </GlowCard>
      </View>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  logo: {
    ...Typography.heading,
    fontSize: 32,
    marginBottom: 4,
  },
  tagline: {
    ...Typography.caption,
    fontSize: 10,
    marginBottom: Spacing.xl,
    color: Colors.textMuted,
  },
  orbitContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  outerRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: Colors.neonBlue,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  ripple: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: Colors.neonPurple,
  },
  centerDot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 2,
    borderColor: Colors.neonBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neonBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  lockIcon: {
    fontSize: 32,
  },
  card: {
    width: '100%',
    padding: Spacing.lg,
  },
  statusTitle: {
    ...Typography.subheading,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  statusDesc: {
    ...Typography.body,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  deviceLabel: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: 4,
  },
  deviceId: {
    ...Typography.body,
    fontSize: 11,
    textAlign: 'center',
    color: Colors.neonPurple,
    letterSpacing: 1.5,
  },
});
