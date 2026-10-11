import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';

import { ThemeProvider } from '../shared/theme/themeContext';
import FoodMarketScreen from './src/screens/FoodMarketScreen';
import RestaurantDetailsScreen from './src/screens/restaurantDetailsScreen';
import CartScreen from './src/screens/CartScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Caveat_600SemiBold,
  });

  const [currentScreen, setCurrentScreen] = useState('Market');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState({});

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  const handleAddToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          ...item,
          quantity: (existing?.quantity || 0) + 1,
        },
      };
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const handleUpdateQuantity = (itemId, delta) => {
    if (delta > 0) {
      setCart((prev) => {
        const item = prev[itemId];
        if (!item) return prev;
        return {
          ...prev,
          [itemId]: { ...item, quantity: item.quantity + 1 },
        };
      });
    } else {
      handleRemoveFromCart(itemId);
    }
  };

  const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={styles.container}>
          <StatusBar style="dark" />

          {currentScreen === 'Market' && (
            <FoodMarketScreen
              onSelectRestaurant={(restaurant) => {
                setSelectedRestaurant(restaurant);
                setCurrentScreen('Detail');
              }}
              onNavigate={(screen) => {
                if (screen === 'Cart') {
                  setCurrentScreen('Cart');
                }
              }}
            />
          )}

          {currentScreen === 'Detail' && (
            <RestaurantDetailsScreen
              restaurant={selectedRestaurant}
              cart={cart}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={handleRemoveFromCart}
              onBack={() => setCurrentScreen('Market')}
              onViewCart={() => setCurrentScreen('Cart')}
            />
          )}

          {currentScreen === 'Cart' && (
            <CartScreen
              cart={cart}
              onBack={() => setCurrentScreen(selectedRestaurant ? 'Detail' : 'Market')}
              onUpdateQuantity={handleUpdateQuantity}
              onPlaceOrder={() => {
                setCurrentScreen('Tracking');
              }}
            />
          )}

          {currentScreen === 'Tracking' && (
            <OrderTrackingScreen
              order={{
                id: '#DRP-84920',
                restaurantName: selectedRestaurant?.name || 'The Daily Grind',
                etaMinutes: 18,
                etaTime: '6:25 PM',
                items: Object.values(cart),
                totalAmount: Math.max(0, cartTotal + 24 - 50),
                deliveryAddress: 'Flat 402, Tower B, Sector 28, Gurugram',
              }}
              onBack={() => {
                setCart({});
                setCurrentScreen('Market');
              }}
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
    backgroundColor: '#EEF9F1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF9F1',
  },
});
