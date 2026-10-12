import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommuniyIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

//main page  -> supervisor
export default function MainHomeScreen({ onNavigate }) {
    const [activeTab, setActiveTab] = useState('Home');

    //central dispatcher
    const dispatchTo = (route, params = {}) => {
        if (onNavigate) {
            onNavigate(route, params);
        }
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={'dark-content'} backgroundColor="#F7FBF9">
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Main Screen */}
                    <View style={styles.header}>
                        <View style={styles.headerleft}>dropp</View>
                    </View>

                </ScrollView>
            </StatusBar>
        </SafeAreaView>
    )
};


const styles = StyleSheet.create({

})