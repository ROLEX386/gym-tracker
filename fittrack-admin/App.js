import React, { useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Orbitron_400Regular, Orbitron_600SemiBold, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from './theme/SpaceTheme';
import RequestsScreen from './screens/RequestsScreen';
import ApprovedScreen from './screens/ApprovedScreen';

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({ Orbitron_400Regular, Orbitron_600SemiBold, Orbitron_700Bold });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#060618',
              borderTopColor: 'rgba(155, 93, 229, 0.3)',
              borderTopWidth: 1,
              height: 70,
              paddingBottom: 10,
            },
            tabBarActiveTintColor: Colors.neonPurple,
            tabBarInactiveTintColor: Colors.textMuted,
            tabBarLabelStyle: {
              fontFamily: 'Orbitron_700Bold',
              fontSize: 8,
              letterSpacing: 1,
            },
          }}
        >
          <Tab.Screen
            name="Requests"
            component={RequestsScreen}
            options={{ tabBarLabel: '📡 REQUESTS' }}
          />
          <Tab.Screen
            name="Approved"
            component={ApprovedScreen}
            options={{ tabBarLabel: '✅ APPROVED' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}
