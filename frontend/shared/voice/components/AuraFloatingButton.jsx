// frontend/shared/voice/components/AuraFloatingButton.jsx
// Floating Aura bubble that sits over every customer screen. Tap to open Aura; drag to move it,
// and it snaps to the nearest side so it never blocks content.
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuraContext } from '../AuraContext';

const SIZE = 60;
const EDGE = 14;
const TAP_SLOP = 6;

export default function AuraFloatingButton({ hidden = false }) {
  const { isOpen, openAura, isThinking } = useAuraContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const minY = insets.top + EDGE;
  const maxY = height - insets.bottom - SIZE - 110; // stay above the bottom nav bar
  const rightX = width - SIZE - EDGE;

  const position = useRef(new Animated.ValueXY({ x: rightX, y: maxY })).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const start = useRef({ x: rightX, y: maxY });

  // Gentle breathing pulse so the bubble reads as "alive"; faster while Aura is working
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: isThinking ? 400 : 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: isThinking ? 400 : 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isThinking, pulse]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP,
      onPanResponderGrant: () => {
        start.current = { x: position.x._value, y: position.y._value };
      },
      onPanResponderMove: (_, g) => {
        position.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy });
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) {
          position.setValue(start.current);
          openAura();
          return;
        }
        const releasedX = start.current.x + g.dx;
        const releasedY = start.current.y + g.dy;
        Animated.spring(position, {
          toValue: {
            x: releasedX + SIZE / 2 < width / 2 ? EDGE : rightX,
            y: Math.min(Math.max(releasedY, minY), maxY),
          },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    })
  ).current;

  if (hidden || isOpen) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.wrap, { transform: position.getTranslateTransform() }]}
      accessibilityRole="button"
      accessibilityLabel="Open Aura assistant"
    >
      {/* Pulse lives on an inner view: native-driven scale can't share a transform with the JS-driven drag */}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <View style={styles.halo} />
        <LinearGradient colors={['#00C26E', '#00A859', '#00874A']} style={styles.bubble}>
          <Ionicons name={isThinking ? 'ellipsis-horizontal' : 'sparkles'} size={26} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    zIndex: 999,
    elevation: 12,
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(0, 168, 89, 0.25)',
    transform: [{ scale: 1.25 }],
  },
  bubble: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A859',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
