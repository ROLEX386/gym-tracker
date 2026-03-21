import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebaseConfig';
import StarBackground from '../components/StarBackground';
import GlowCard from '../components/GlowCard';
import NeonButton from '../components/NeonButton';
import NeonBadge from '../components/NeonBadge';
import { Colors, Typography, Spacing } from '../theme/SpaceTheme';

export default function ApprovedScreen() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState({});

  useEffect(() => {
    const devicesRef = ref(db, 'devices');
    const unsubscribe = onValue(devicesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, d]) => ({ ...d, id }))
          .filter(d => d.status === 'approved')
          .sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0));
        setDevices(list);
      } else {
        setDevices([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleRevoke(deviceId) {
    setRevoking(r => ({ ...r, [deviceId]: true }));
    try {
      await update(ref(db, `devices/${deviceId}`), {
        status: 'rejected',
        revokedAt: Date.now(),
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setRevoking(r => ({ ...r, [deviceId]: false }));
  }

  function formatTime(ts) {
    if (!ts) return 'Unknown';
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <StarBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>APPROVED DEVICES</Text>
        <Text style={styles.pageSubtitle}>{devices.length} AUTHORIZED</Text>

        {loading && <ActivityIndicator color={Colors.neonGreen} size="large" style={{ marginTop: 60 }} />}

        {!loading && devices.length === 0 && (
          <GlowCard style={styles.emptyCard} glowColor={Colors.neonBlue}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>NO APPROVED DEVICES</Text>
          </GlowCard>
        )}

        {devices.map(device => (
          <GlowCard key={device.id} glowColor={Colors.neonGreen}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceLabel}>DEVICE ID</Text>
                <Text style={styles.deviceId} numberOfLines={1}>{device.id.substring(0, 24).toUpperCase()}</Text>
              </View>
              <NeonBadge status="approved" />
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>✅ APPROVED</Text>
                <Text style={styles.detailVal}>{formatTime(device.processedAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>📤 REQUESTED</Text>
                <Text style={styles.detailVal}>{formatTime(device.requestedAt)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <NeonButton
              title="🚫  REVOKE ACCESS"
              variant="danger"
              loading={revoking[device.id]}
              onPress={() =>
                Alert.alert('Revoke Access', 'This device will be locked out immediately.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Revoke', style: 'destructive', onPress: () => handleRevoke(device.id) },
                ])
              }
            />
          </GlowCard>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md },
  pageTitle: { ...Typography.heading, fontSize: 20, textAlign: 'center', marginTop: Spacing.sm },
  pageSubtitle: { ...Typography.caption, textAlign: 'center', marginBottom: Spacing.lg, color: Colors.neonGreen },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  deviceLabel: { ...Typography.caption, marginBottom: 2 },
  deviceId: { ...Typography.body, fontSize: 11, color: Colors.neonBlue, letterSpacing: 1 },
  details: { marginBottom: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailKey: { ...Typography.caption, color: Colors.textMuted },
  detailVal: { ...Typography.caption, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl, marginTop: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { ...Typography.subheading, fontSize: 14 },
});
