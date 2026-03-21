import React, { useState, useEffect, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Orbitron_400Regular, Orbitron_600SemiBold, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ref, onValue } from 'firebase/database';
import * as Crypto from 'expo-crypto';
import { db } from './firebaseConfig';
import { Colors, Typography } from './theme/SpaceTheme';
import AuthorizationScreen from './screens/AuthorizationScreen';
import DashboardScreen from './screens/DashboardScreen';
import MembersScreen from './screens/MembersScreen';
import AddMemberScreen from './screens/AddMemberScreen';

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

function MainTabs({ deviceId, onAddMember, onEditMember }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#070720',
          borderTopColor: 'rgba(0,212,255,0.2)',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: Colors.neonBlue,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontFamily: 'Orbitron_700Bold', fontSize: 8, letterSpacing: 1 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{ tabBarIcon: () => null, tabBarLabel: '📊 DASHBOARD' }}
      >
        {() => <DashboardScreen deviceId={deviceId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Members"
        options={{ tabBarIcon: () => null, tabBarLabel: '👥 MEMBERS' }}
      >
        {() => <MembersScreen deviceId={deviceId} onAddMember={onAddMember} onEditMember={onEditMember} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Orbitron_400Regular, Orbitron_600SemiBold, Orbitron_700Bold });
  const [deviceId, setDeviceId] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [addMemberMode, setAddMemberMode] = useState(false);
  const [editMember, setEditMember] = useState(null);

  // Load or generate device ID
  useEffect(() => {
    (async () => {
      let id = await AsyncStorage.getItem('device_id');
      if (!id) {
        id = await Crypto.randomUUID();
        await AsyncStorage.setItem('device_id', id);
      }
      setDeviceId(id);

      // Check if already approved
      const cached = await AsyncStorage.getItem('is_approved');
      if (cached === 'true') setIsApproved(true);
    })();
  }, []);

  // Listen for approval status
  useEffect(() => {
    if (!deviceId) return;
    const statusRef = ref(db, `devices/${deviceId}/status`);
    const unsubscribe = onValue(statusRef, async (snap) => {
      const val = snap.val();
      if (val === 'approved') {
        await AsyncStorage.setItem('is_approved', 'true');
        setIsApproved(true);
      } else if (val === 'rejected') {
        await AsyncStorage.removeItem('is_approved');
        setIsApproved(false);
      }
    });
    return () => unsubscribe();
  }, [deviceId]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded || !deviceId) return null;

  if (addMemberMode || editMember) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AddMemberScreen
          deviceId={deviceId}
          editMember={editMember}
          onDone={() => { setAddMemberMode(false); setEditMember(null); }}
        />
      </View>
    );
  }

  if (!isApproved) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AuthorizationScreen
          deviceId={deviceId}
          onApproved={() => setIsApproved(true)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <MainTabs
          deviceId={deviceId}
          onAddMember={() => setAddMemberMode(true)}
          onEditMember={(m) => setEditMember(m)}
        />
      </NavigationContainer>
    </View>
  );
}
