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
  const [activeOrder, setActiveOrder] = useState(null);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  // Never mix restaurants: an item from another kitchen starts a new cart
  const handleAddToCart = (item, { replaceCart = false } = {}) => {
    setCart((prev) => {
      const other = Object.values(prev).some(
        (i) => i.restaurantId && item.restaurantId && i.restaurantId !== item.restaurantId
      );
      const base = replaceCart || other ? {} : prev;
      const existing = base[item.id];
      return {
        ...base,
        [item.id]: { ...(existing || item), quantity: (existing?.quantity || 0) + 1 },
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
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const handleUpdateQuantity = (itemId, delta) => {
    if (delta < 0) return handleRemoveFromCart(itemId);
    setCart((prev) => {
      const item = prev[itemId];
      if (!item) return prev;
      return { ...prev, [itemId]: { ...item, quantity: item.quantity + delta } };
    });
  };

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
              restaurant={selectedRestaurant}
              onBack={() => setCurrentScreen(selectedRestaurant ? 'Detail' : 'Market')}
              onUpdateQuantity={handleUpdateQuantity}
              onBrowse={() => setCurrentScreen('Market')}
              onPlaceOrder={(order) => {
                setActiveOrder(order);
                setCart({});
                setCurrentScreen('Tracking');
              }}
            />
          )}

          {currentScreen === 'Tracking' && (
            <OrderTrackingScreen
              orderId={activeOrder?._id || null}
              initialOrder={activeOrder}
              onBack={() => {
                setActiveOrder(null);
                setCurrentScreen('Market');
              }}
              onBrowse={() => setCurrentScreen('Market')}
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
