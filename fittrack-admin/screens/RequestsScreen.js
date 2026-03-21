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

export default function RequestsScreen() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    const devicesRef = ref(db, 'devices');
    const unsubscribe = onValue(devicesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, d]) => ({ ...d, id }))
          .filter(d => d.status === 'pending')
          .sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
        setDevices(list);
      } else {
        setDevices([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleAction(deviceId, action) {
    setProcessing(p => ({ ...p, [deviceId]: action }));
    try {
      await update(ref(db, `devices/${deviceId}`), {
        status: action,
        processedAt: Date.now(),
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setProcessing(p => ({ ...p, [deviceId]: null }));
  }

  function formatTime(ts) {
    if (!ts) return 'Unknown';
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <StarBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>INCOMING REQUESTS</Text>
        <Text style={styles.pageSubtitle}>{devices.length} PENDING</Text>

        {loading && <ActivityIndicator color={Colors.neonPurple} size="large" style={{ marginTop: 60 }} />}

        {!loading && devices.length === 0 && (
          <GlowCard style={styles.emptyCard} glowColor={Colors.neonGreen}>
            <Text style={styles.emptyIcon}>🛸</Text>
            <Text style={styles.emptyText}>ALL CLEAR</Text>
            <Text style={styles.emptySubtext}>No pending authorization requests</Text>
          </GlowCard>
        )}

        {devices.map(device => (
          <GlowCard key={device.id} glowColor={Colors.neonYellow}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.deviceLabel}>DEVICE ID</Text>
                <Text style={styles.deviceId}>
                  {device.id.substring(0, 20).toUpperCase()}
                </Text>
              </View>
              <NeonBadge status="pending" />
            </View>

            {/* Details */}
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>⏱  RECEIVED</Text>
                <Text style={styles.detailVal}>{formatTime(device.requestedAt)}</Text>
              </View>
              {device.location && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>📍 LOCATION</Text>
                  <Text style={styles.detailVal}>{device.location}</Text>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <NeonButton
                title="✗  REJECT"
                variant="danger"
                loading={processing[device.id] === 'rejected'}
                disabled={!!processing[device.id]}
                onPress={() =>
                  Alert.alert('Confirm Reject', `Reject device ${device.id.substring(0, 8)}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reject', style: 'destructive', onPress: () => handleAction(device.id, 'rejected') },
                  ])
                }
                style={{ flex: 1, marginRight: 8 }}
              />
              <NeonButton
                title="✓  APPROVE"
                variant="success"
                loading={processing[device.id] === 'approved'}
                disabled={!!processing[device.id]}
                onPress={() => handleAction(device.id, 'approved')}
                style={{ flex: 1 }}
              />
            </View>
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
  pageSubtitle: { ...Typography.caption, textAlign: 'center', marginBottom: Spacing.lg, color: Colors.neonYellow },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  deviceLabel: { ...Typography.caption, marginBottom: 2 },
  deviceId: { ...Typography.body, fontSize: 11, color: Colors.neonBlue, letterSpacing: 1.5, maxWidth: 220 },
  details: { marginBottom: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailKey: { ...Typography.caption, color: Colors.textMuted },
  detailVal: { ...Typography.caption, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md },
  actionRow: { flexDirection: 'row' },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl, marginTop: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { ...Typography.subheading, fontSize: 16, color: Colors.neonGreen },
  emptySubtext: { ...Typography.body, fontSize: 11, marginTop: 6, textAlign: 'center' },
});
