
import React, { useState } from 'react';
import {
    StyleSheet,
    ScrollView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FoodTopHeader from '../components/foodHeader';
import FoodSearchBar from '../components/foodSearchBar';
import ServiceTabs from '../components/serviceTabs';
import HeroBanner from '../components/GenZHeroBanner';
import CategoriesRow from '../components/CategoriesRow';
import TrendingRestaurants from '../components/trendingRestaurants';
import GenZPicks from '../components/GenZPicks';
import FoodBottomNav from '../components/FoodBottomNav';

export default function FoodMarketScreen({
    onNavigate,
    onSelectRestaurant,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeNavTab, setActiveNavTab] = useState('Home');

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

            {/* 3. Fixed Bottom Navigation */}
            <FoodBottomNav
                activeTab={activeNavTab}
                onTabPress={(tab) => {
                    setActiveNavTab(tab);

                    if (tab !== 'Home') {
                        onNavigate?.(tab);
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // container: {
    //     flex: 1,
    //     backgroundColor: '#FFFFFF',
    // },
    container: {
        flex: 1,
        backgroundColor: '#EEF9F1',
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingBottom: 12,
    },
});
