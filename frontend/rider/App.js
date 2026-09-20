import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/theme/themeContext';
import HomeScreen from './src/screens/HomeScreen.jsx';
import LocationSearchScreen from './src/screens/LocationScreen.jsx';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');

  return (
    <SafeAreaProvider>
      <ThemeProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Always render home screen */}
        {currentScreen === 'Home' && (
          <HomeScreen onNavigate={(screen) => setCurrentScreen(screen)} />
        )}

        {/* Render Location Screen conditionally */}
        {(currentScreen === 'Location' || currentScreen === 'Location Search' || currentScreen === 'LocationSearch') && (
          <LocationSearchScreen
            onBack={() => setCurrentScreen('Home')}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}
      </View>
    </ThemeProvider>
    </SafeAreaProvider>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
});
