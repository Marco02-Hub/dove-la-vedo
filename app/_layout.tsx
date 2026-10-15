import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Bell, CalendarDays, Tv } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedProvider } from '@/feed';
import { registerBackgroundUpdate } from '@/background';
import { PrefsProvider } from '@/prefs';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
registerBackgroundUpdate().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    BarlowCondensed_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <FeedProvider>
          <StatusBar style="light" />
          <Tabs
            screenOptions={{
              headerShown: false,
              sceneStyle: { backgroundColor: colors.bg },
              tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.muted,
              tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{ title: 'Settimana', tabBarIcon: ({ color, size }) => <Tv color={color} size={size} /> }}
            />
            <Tabs.Screen
              name="calendario"
              options={{
                title: 'Calendario',
                tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
              }}
            />
            <Tabs.Screen
              name="avvisi"
              options={{ title: 'Avvisi', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }}
            />
            <Tabs.Screen name="partita/[id]" options={{ href: null }} />
          </Tabs>
        </FeedProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}
