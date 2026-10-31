// frontend/shared/voice/components/AuraBottomBar.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuraBottomBar({
  inputText,
  onChangeText,
  onSubmit,
  isListening,
  onMicPress,
  onSuggestionPress,
}) {
  const suggestions = [
    { id: '1', icon: 'flash', text: 'Demo Combo (Cab + Coffee)', color: '#8B5CF6', query: 'Cyber Hub se Airport cab book kar do aur 2 cold coffee order kar do' },
    { id: '2', icon: 'cafe', text: '2 Cold Coffee', color: '#D97706', query: '2 cold coffee order kar do' },
    { id: '3', icon: 'car-sport', text: 'Cab to Airport', color: '#00A859', query: 'Cyber Hub se Airport cab book kar do' },
    { id: '4', icon: 'basket', text: 'Fresh Groceries', color: '#10B981', query: 'FreshMart se Amul Butter aur bread order kar do' },
  ];

  return (
    <View style={styles.container}>
      {/* ── Suggested Actions Horizontal Carousel ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsScroll}
      >
        {suggestions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.pill}
            activeOpacity={0.8}
            onPress={() => onSuggestionPress?.(item.query)}
          >
            <Ionicons name={item.icon} size={15} color={item.color} />
            <Text style={styles.pillText}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Search & Voice Input Row ── */}
      <View style={styles.inputRow}>
        {/* Plus Button */}
        <TouchableOpacity style={styles.plusBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color="#64748B" />
        </TouchableOpacity>

        {/* Text Input Pill */}
        <View style={[styles.textInputWrapper, isListening && styles.textInputListening]}>
          <TextInput
            style={styles.textInput}
            placeholder={
              isListening
                ? '🎙️ Listening... (Speak now)'
                : 'Ask Aura or type destination...'
            }
            placeholderTextColor={isListening ? '#00A859' : '#94A3B8'}
            value={inputText}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            returnKeyType="send"
          />
          {inputText?.trim()?.length > 0 && (
            <TouchableOpacity style={styles.sendBtn} onPress={onSubmit} activeOpacity={0.8}>
              <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Circular Green Mic Button */}
        <TouchableOpacity
          style={[styles.micBtn, isListening && styles.micBtnListening]}
          onPress={onMicPress}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isListening ? ['#FF4D4D', '#E11D48'] : ['#00E575', '#00A859']}
            style={styles.micGradient}
          >
            <Ionicons name={isListening ? 'stop' : 'mic'} size={22} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputWrapper: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  textInputListening: {
    borderColor: '#00A859',
    backgroundColor: '#F3FAF6',
    borderWidth: 1.5,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  micGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnListening: {
    shadowColor: '#EF4444',
  },
});
