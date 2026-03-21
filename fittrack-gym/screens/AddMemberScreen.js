import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity,
} from 'react-native';
import { ref, set, push } from 'firebase/database';
import { db } from '../firebaseConfig';
import StarBackground from '../components/StarBackground';
import GlowCard from '../components/GlowCard';
import NeonButton from '../components/NeonButton';
import { Colors, Typography, Spacing } from '../theme/SpaceTheme';

const PLANS = [
  { id: 'plan1', label: '1 Month',  days: 30,  price: 800 },
  { id: 'plan2', label: '3 Months', days: 90,  price: 2100 },
  { id: 'plan3', label: '6 Months', days: 180, price: 3800 },
  { id: 'plan4', label: '1 Year',   days: 365, price: 6500 },
];

function today() { return new Date().toISOString().split('T')[0]; }

export default function AddMemberScreen({ deviceId, editMember, onDone }) {
  const [form, setForm] = useState({
    name: editMember?.name || '',
    phone: editMember?.phone || '',
    plan: editMember?.plan || 'plan1',
    joinDate: editMember?.joinDate || today(),
    customPrice: editMember?.customPrice || '',
    customDays: editMember?.customDays || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) return Alert.alert('Error', 'Name is required');
    if (form.phone.replace(/\D/g, '').length < 10) return Alert.alert('Error', 'Enter a valid 10-digit phone number');

    setSaving(true);
    try {
      if (editMember?.id) {
        await set(ref(db, `members/${deviceId}/${editMember.id}`), { ...form, id: editMember.id });
      } else {
        const newRef = push(ref(db, `members/${deviceId}`));
        await set(newRef, { ...form, id: newRef.key });
      }
      onDone();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  return (
    <StarBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>{editMember ? 'EDIT CREW' : 'ADD CREW'}</Text>

        <GlowCard>
          {/* Name */}
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor={Colors.textMuted}
            value={form.name}
            onChangeText={v => setForm(p => ({ ...p, name: v }))}
          />

          {/* Phone */}
          <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 9876543210"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={v => setForm(p => ({ ...p, phone: v }))}
          />

          {/* Plan */}
          <Text style={styles.fieldLabel}>MEMBERSHIP PLAN</Text>
          <View style={styles.planGrid}>
            {PLANS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.planOption, form.plan === p.id && styles.planOptionActive]}
                onPress={() => setForm(prev => ({ ...prev, plan: p.id }))}
              >
                <Text style={[styles.planName, form.plan === p.id && { color: Colors.neonBlue }]}>{p.label}</Text>
                <Text style={styles.planPrice}>₹{p.price}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.planOption, form.plan === 'custom' && styles.planOptionActive]}
              onPress={() => setForm(prev => ({ ...prev, plan: 'custom' }))}
            >
              <Text style={[styles.planName, form.plan === 'custom' && { color: Colors.neonBlue }]}>Custom</Text>
              <Text style={styles.planPrice}>Set price</Text>
            </TouchableOpacity>
          </View>

          {form.plan === 'custom' && (
            <View style={styles.customRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>PRICE (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="1500"
                  placeholderTextColor={Colors.textMuted}
                  value={String(form.customPrice)}
                  onChangeText={v => setForm(p => ({ ...p, customPrice: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>DAYS</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor={Colors.textMuted}
                  value={String(form.customDays)}
                  onChangeText={v => setForm(p => ({ ...p, customDays: v }))}
                />
              </View>
            </View>
          )}

          {/* Join Date */}
          <Text style={styles.fieldLabel}>JOIN DATE</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            value={form.joinDate}
            onChangeText={v => setForm(p => ({ ...p, joinDate: v }))}
          />

          <View style={styles.buttonRow}>
            <NeonButton title="CANCEL" variant="danger" onPress={onDone} style={{ flex: 1, marginRight: 8 }} />
            <NeonButton title="SAVE" variant="success" onPress={handleSave} loading={saving} style={{ flex: 2 }} />
          </View>
        </GlowCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md },
  pageTitle: { ...Typography.heading, fontSize: 20, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  fieldLabel: { ...Typography.caption, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    ...Typography.body,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(0,212,255,0.04)',
    marginBottom: 4,
  },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  planOption: {
    width: '47%', borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 10, backgroundColor: 'rgba(0,10,30,0.5)', alignItems: 'center',
  },
  planOptionActive: { borderColor: Colors.neonBlue, backgroundColor: 'rgba(0,212,255,0.08)' },
  planName: { ...Typography.body, fontSize: 11, color: Colors.textSecondary },
  planPrice: { ...Typography.caption, marginTop: 2, color: Colors.textMuted },
  customRow: { flexDirection: 'row', marginBottom: 4 },
  buttonRow: { flexDirection: 'row', marginTop: Spacing.lg },
});
