import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/theme/themeContext';
import HomeScreen from './src/screens/HomeScreen.jsx';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');

  return (
    <ThemeProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        {currentScreen === 'Home' && (
          <HomeScreen onNavigate={(screen) => setCurrentScreen(screen)} />
        )}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
});
