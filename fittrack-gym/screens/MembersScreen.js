import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../firebaseConfig';
import StarBackground from '../components/StarBackground';
import GlowCard from '../components/GlowCard';
import NeonBadge from '../components/NeonBadge';
import NeonButton from '../components/NeonButton';
import { Colors, Typography, Spacing } from '../theme/SpaceTheme';

const PLAN_LABELS = { plan1: '1 Month', plan2: '3 Months', plan3: '6 Months', plan4: '1 Year' };
const PLAN_DAYS   = { plan1: 30, plan2: 90, plan3: 180, plan4: 365 };

function getDaysLeft(member) {
  const days = member.plan === 'custom' ? (member.customDays || 0) : (PLAN_DAYS[member.plan] || 30);
  const expiry = new Date(member.joinDate);
  expiry.setDate(expiry.getDate() + days);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function getMemberStatus(daysLeft) {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 5) return 'expiring';
  if (daysLeft <= 10) return 'expiring';
  return 'active';
}

function sendWhatsApp(member) {
  const days = getDaysLeft(member);
  const msg = days < 0
    ? `Hi ${member.name}! Your gym membership has *expired*. Please renew now! 💪`
    : `Hi ${member.name}! Your gym membership expires in *${days} days*. Renew now! 💪`;
  Linking.openURL(`https://wa.me/91${member.phone}?text=${encodeURIComponent(msg)}`);
}

export default function MembersScreen({ deviceId, onAddMember, onEditMember }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!deviceId) return;
    const membersRef = ref(db, `members/${deviceId}`);
    const unsubscribe = onValue(membersRef, (snap) => {
      const data = snap.val();
      setMembers(data ? Object.entries(data).map(([id, m]) => ({ ...m, id })) : []);
    });
    return () => unsubscribe();
  }, [deviceId]);

  const filtered = members.filter(m => {
    const daysLeft = getDaysLeft(m);
    const status = getMemberStatus(daysLeft);
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
    if (filter === 'active')   return matchSearch && status === 'active';
    if (filter === 'expiring') return matchSearch && status === 'expiring';
    if (filter === 'expired')  return matchSearch && status === 'expired';
    return matchSearch;
  });

  function handleDelete(member) {
    Alert.alert('Delete Member', `Remove ${member.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => remove(ref(db, `members/${deviceId}/${member.id}`)),
      },
    ]);
  }

  return (
    <StarBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>CREW MANIFEST</Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or phone..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {['all', 'active', 'expiring', 'expired'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && { color: Colors.neonBlue }]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.count}>{filtered.length} of {members.length} MEMBERS</Text>

        {/* Member Cards */}
        {filtered.map(m => {
          const daysLeft = getDaysLeft(m);
          const status = getMemberStatus(daysLeft);
          return (
            <GlowCard
              key={m.id}
              glowColor={status === 'expired' ? Colors.neonRed : status === 'expiring' ? Colors.neonYellow : Colors.neonBlue}
            >
              <View style={styles.memberHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberPhone}>📱 {m.phone}</Text>
                </View>
                <NeonBadge status={status} />
              </View>

              <View style={styles.planRow}>
                <Text style={styles.planLabel}>
                  {m.plan === 'custom' ? 'Custom Plan' : PLAN_LABELS[m.plan] || 'Plan'}
                </Text>
                <Text style={styles.planDays}>
                  {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <NeonButton
                  title="💬 WhatsApp"
                  variant="success"
                  onPress={() => sendWhatsApp(m)}
                  style={{ flex: 1, marginRight: 6 }}
                />
                <NeonButton
                  title="✏️ Edit"
                  onPress={() => onEditMember(m)}
                  style={{ flex: 1, marginRight: 6 }}
                />
                <NeonButton
                  title="🗑"
                  variant="danger"
                  onPress={() => handleDelete(m)}
                  style={{ paddingHorizontal: 12 }}
                />
              </View>
            </GlowCard>
          );
        })}

        {filtered.length === 0 && (
          <GlowCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛰️</Text>
            <Text style={styles.emptyText}>No members found</Text>
          </GlowCard>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onAddMember}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md },
  pageTitle: { ...Typography.heading, fontSize: 20, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,212,255,0.07)',
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, marginBottom: Spacing.sm,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, ...Typography.body, fontSize: 13, paddingVertical: 10, color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', marginBottom: Spacing.sm, gap: 6 },
  filterTab: {
    flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center', backgroundColor: 'rgba(0,10,30,0.5)',
  },
  filterTabActive: { borderColor: Colors.neonBlue, backgroundColor: 'rgba(0,212,255,0.1)' },
  filterTabText: { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1 },
  count: { ...Typography.caption, marginBottom: Spacing.sm },
  memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,212,255,0.15)', borderWidth: 1, borderColor: Colors.neonBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Orbitron_700Bold', fontSize: 16, color: Colors.neonBlue },
  memberName: { ...Typography.body, fontSize: 13, fontFamily: 'Orbitron_600SemiBold', color: Colors.textPrimary },
  memberPhone: { ...Typography.caption, marginTop: 2 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  planLabel: { ...Typography.caption, color: Colors.textMuted },
  planDays: { ...Typography.caption, color: Colors.neonPurple },
  actionRow: { flexDirection: 'row', marginTop: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { ...Typography.body, fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,212,255,0.15)',
    borderWidth: 2, borderColor: Colors.neonBlue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.neonBlue, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 15, elevation: 10,
  },
  fabText: { fontFamily: 'Orbitron_700Bold', fontSize: 28, color: Colors.neonBlue, marginTop: -2 },
});
