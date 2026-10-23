import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemeProvider } from './src/theme/themeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <AppNavigator />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
