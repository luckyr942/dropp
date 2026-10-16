
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    ScrollView,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FoodTopHeader from '../components/foodHeader';
import FoodSearchBar from '../components/foodSearchBar';
import ServiceTabs from '../components/serviceTabs';
import HeroBanner from '../components/GenZHeroBanner';
import CategoriesRow from '../components/CategoriesRow';
import TrendingRestaurants from '../components/trendingRestaurants';
import GenZPicks from '../components/GenZPicks';
import BottomNavBar from '../../../shared/components/bottomNavBar';
import { getRestaurants } from '../api/foodApi';

export default function FoodMarketScreen({
    onNavigate,
    onSelectRestaurant,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeNavTab, setActiveNavTab] = useState('Home');
    const [restaurants, setRestaurants] = useState([]);
    const [loadingRestaurants, setLoadingRestaurants] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadRestaurants = async () => {
        try {
            const data = await getRestaurants();
            if (data && data.length > 0) {
                setRestaurants(data);
            }
        } catch (err) {
            console.warn('[FoodMarketScreen] Error loading restaurants:', err?.message);
        } finally {
            setLoadingRestaurants(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRestaurants();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadRestaurants();
    };

    return (
        <SafeAreaView
            style={styles.container}
            edges={['top', 'left', 'right']}
        >
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#EEF9F1"
            />

            {/* 1. Header */}
            <FoodTopHeader
                location="Gurugram, Sector 28"
                balance="₹450"
                onLocationPress={() => alert('Change Location')}
                onWalletPress={() => onNavigate?.('Wallet')}
                onProfilePress={() => onNavigate?.('Profile')}
                onNotificationPress={() => alert('Notifications')}
            />

            {/* 2. Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#00C26F']}
                        tintColor="#00C26F"
                    />
                }
            >
                <FoodSearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search cafés, snacks, drinks, desserts..."
                    onFilterPress={() => alert('Filter options')}
                />

                <ServiceTabs
                    activeTab="food"
                    onSelectTab={(tabId) => {
                        if (tabId === 'ride') {
                            onNavigate?.('Home');
                        } else if (tabId === 'delivery') {
                            onNavigate?.('PackageDetails');
                        } else if (tabId === 'shop') {
                            alert('Shop coming soon!');
                        }
                    }}
                />

                <HeroBanner
                    onOrderNow={() => alert('Ordering...')}
                />

                <CategoriesRow
                    onSelectCategory={setSelectedCategory}
                />

                <TrendingRestaurants
                    restaurants={restaurants}
                    loading={loadingRestaurants}
                    onSelect={(restaurant) => {
                        onSelectRestaurant?.(restaurant);
                    }}
                />

                <GenZPicks
                    onAddToCart={(item) => {
                        alert(`Added ${item.name} to cart!`);
                    }}
                />
            </ScrollView>

            {/* 3. Floating Bottom Navigation (Unified Universal Nav) */}
            <BottomNavBar
                preset="food"
                activeTab={activeNavTab}
                cartBadge={2}
                onTabPress={(tab) => {
                    setActiveNavTab(tab);
                    if (tab === 'Home') {
                        onNavigate?.('Home');
                    } else if (tab === 'Orders' || tab === 'Activity') {
                        onNavigate?.('Activity');
                    } else if (tab === 'Cart') {
                        onNavigate?.('Cart');
                    } else if (tab === 'Profile') {
                        onNavigate?.('Profile');
                    } else if (tab === 'Wallet') {
                        onNavigate?.('Wallet');
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EEF9F1',
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingBottom: 115,
    },
});
