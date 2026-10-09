import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { ThemeProvider } from '../shared/theme/themeContext';
import FoodMarketScreen from './src/screens/FoodMarketScreen';
import RestaurantDetailScreen from './src/screens/RestaurantDetailScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Market');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          {currentScreen === 'Market' ? (
            <FoodMarketScreen
              onSelectRestaurant={(rest) => {
                setSelectedRestaurant(rest);
                setCurrentScreen('Detail');
              }}
            />
          ) : (
            <RestaurantDetailScreen
              restaurant={selectedRestaurant}
              onBack={() => setCurrentScreen('Market')}
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
    backgroundColor: '#0B0F17',
  },
});
