import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PICKS = [
    {
        id: '1',
        name: 'Iced Caramel\nCold Brew',
        price: '₹179',
        image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=200&q=80',
    },
    {
        id: '2',
        name: 'Matcha Latte',
        price: '₹219',
        image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=200&q=80',
    },
    {
        id: '3',
        name: 'Korean Corn\nCheese',
        price: '₹199',
        image: 'https://images.unsplash.com/photo-1634467524884-897d0af5e104?auto=format&fit=crop&w=200&q=80',
    },
    {
        id: '4',
        name: 'Blueberry\nCheesecake',
        price: '₹249',
        image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=200&q=80',
    },
];

export default function GenZPicks({ onAddToCart }) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Gen Z Picks 🌟</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {PICKS.map((item) => (
                    <View key={item.id} style={styles.card}>
                        {/* Product image */}
                        <View style={styles.imgBox}>
                            <Image source={{ uri: item.image }} style={styles.img} />
                            <TouchableOpacity style={styles.heartBtn} activeOpacity={0.8}>
                                <Ionicons name="heart-outline" size={14} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        {/* Info + Add button */}
                        <View style={styles.footer}>
                            <View style={styles.textCol}>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.price}>{item.price}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => onAddToCart && onAddToCart(item)}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="add" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: 20,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 17,
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    row: {
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 4,
    },
    card: {
        width: 130,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    imgBox: {
        height: 110,
        position: 'relative',
    },
    img: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heartBtn: {
        position: 'absolute',
        top: 7,
        right: 7,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: 10,
    },
    textCol: {
        flex: 1,
        paddingRight: 6,
    },
    name: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11.5,
        color: '#0F172A',
        lineHeight: 15,
        marginBottom: 3,
    },
    price: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#0F172A',
    },
    addBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#00C26F',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
