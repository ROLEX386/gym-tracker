import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import StarBackground from '../components/StarBackground';
import GlowCard from '../components/GlowCard';
import { Colors, Typography, Spacing } from '../theme/SpaceTheme';

function StatCard({ icon, label, value, color = Colors.neonBlue }) {
  return (
    <GlowCard style={styles.statCard} glowColor={color}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlowCard>
  );
}

function AlertRow({ member, plans }) {
  const plan = plans.find(p => p.id === member.plan) || {};
  const daysLeft = member.daysLeft;
  const color = daysLeft < 0 ? Colors.neonRed : daysLeft <= 5 ? Colors.neonRed : Colors.neonYellow;

  return (
    <GlowCard style={styles.alertRow} glowColor={color}>
      <View style={styles.alertInfo}>
        <Text style={styles.alertName}>{member.name}</Text>
        <Text style={styles.alertPhone}>📱 {member.phone}</Text>
      </View>
      <View style={[styles.alertBadge, { borderColor: color }]}>
        <Text style={[styles.alertDays, { color }]}>
          {daysLeft < 0 ? 'EXPIRED' : `${daysLeft}d`}
        </Text>
      </View>
    </GlowCard>
  );
}

export default function DashboardScreen({ deviceId }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!deviceId) return;
    const membersRef = ref(db, `members/${deviceId}`);
    const unsubscribe = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setMembers(list);
    });
    return () => unsubscribe();
  }, [deviceId]);

  function getDaysLeft(member) {
    const days = member.plan === 'custom' ? (member.customDays || 0)
      : ({ plan1: 30, plan2: 90, plan3: 180, plan4: 365 }[member.plan] || 30);
    const expiry = new Date(member.joinDate);
    expiry.setDate(expiry.getDate() + days);
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  }

  const membersWithDays = members.map(m => ({ ...m, daysLeft: getDaysLeft(m) }));
  const active = membersWithDays.filter(m => m.daysLeft >= 0);
  const expired = membersWithDays.filter(m => m.daysLeft < 0);
  const expiring = membersWithDays.filter(m => m.daysLeft >= 0 && m.daysLeft <= 7);
  const revenue = members.reduce((s, m) => {
    const price = m.plan === 'custom' ? (m.customPrice || 0)
      : ({ plan1: 800, plan2: 2100, plan3: 3800, plan4: 6500 }[m.plan] || 0);
    return s + price;
  }, 0);

  return (
    <StarBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>COMMAND CENTER</Text>
        <Text style={styles.pageSubtitle}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        </Text>

        <View style={styles.statsGrid}>
          <StatCard icon="👥" label="TOTAL" value={members.length} color={Colors.neonBlue} />
          <StatCard icon="✅" label="ACTIVE" value={active.length} color={Colors.neonGreen} />
          <StatCard icon="⚠️" label="EXPIRING" value={expiring.length} color={Colors.neonYellow} />
          <StatCard icon="💰" label="REVENUE" value={`₹${(revenue/1000).toFixed(1)}k`} color={Colors.neonPurple} />
        </View>

        {expiring.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>⚠️  EXPIRING SOON</Text>
            {expiring.map(m => <AlertRow key={m.id} member={m} plans={[]} />)}
          </>
        )}

        {expired.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🔴  EXPIRED</Text>
            {expired.slice(0, 5).map(m => <AlertRow key={m.id} member={m} plans={[]} />)}
          </>
        )}

        {members.length === 0 && (
          <GlowCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚀</Text>
            <Text style={styles.emptyText}>No members yet</Text>
            <Text style={styles.emptySubtext}>Add your first member to get started</Text>
          </GlowCard>
        )}
      </ScrollView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: Spacing.md, paddingBottom: 100 },
  pageTitle: { ...Typography.heading, fontSize: 22, textAlign: 'center', marginTop: Spacing.md },
  pageSubtitle: { ...Typography.caption, textAlign: 'center', marginBottom: Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  statCard: { width: '48%', alignItems: 'center', paddingVertical: Spacing.md },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontFamily: 'Orbitron_700Bold', fontSize: 26, letterSpacing: 1 },
  statLabel: { ...Typography.caption, marginTop: 4 },
  sectionTitle: { ...Typography.subheading, fontSize: 12, marginBottom: Spacing.sm, marginTop: Spacing.md },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertInfo: { flex: 1 },
  alertName: { ...Typography.body, fontSize: 13, fontFamily: 'Orbitron_600SemiBold' },
  alertPhone: { ...Typography.caption, marginTop: 2 },
  alertBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  alertDays: { fontFamily: 'Orbitron_700Bold', fontSize: 12 },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl, marginTop: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { ...Typography.subheading, fontSize: 14 },
  emptySubtext: { ...Typography.body, fontSize: 11, marginTop: 6, textAlign: 'center' },
});
