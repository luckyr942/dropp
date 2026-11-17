# Dropp UI Polish Guide
*Make the whole app look premium and feel buttery smooth, and type every line yourself.*

Stack: Expo SDK 50 · React Native 0.73 · plain JavaScript. The code here works in **Expo Go**, so no custom native build is needed.

**How to use this guide:** do the parts in order. Each part says which file to create, gives the full code to type, and tells you how to check it worked. Don't skip Part 0 or Part 1; everything else builds on them.

---

## The 10 rules of a "smooth" app
These are what make Uber, Swiggy and Zepto feel premium. Keep them next to you while you build.

1. **Every tap responds within 100 ms.** It should scale down, change colour or vibrate. Nothing should ever feel dead.
2. **Animate on the UI thread** (Reanimated / `useNativeDriver: true`), never with `setState` on every frame.
3. **Springs, not linear timing,** for anything the user touches.
4. **Skeletons instead of spinners** for any content that loads.
5. **Lists enter with a stagger** (each row 40–60 ms after the previous one), not all at once.
6. **One spacing scale, one type scale, one radius scale.** No random `13px` or `margin: 17`.
7. **Haptics for important moments:** confirm, accept ride, order placed, errors.
8. **Every screen has four states:** loading, empty, error (with Retry) and content.
9. **Bottom sheets instead of full-screen modals** for choices (vehicle, address, cart).
10. **Never block the JS thread.** Use `FlatList` tuning, `memo`, `expo-image` caching, and do heavy work after animations finish.

---

## Part 0 — Setup (15 min)

### 0.1 Install the motion libraries
Run these in `frontend/`, and again in `frontend/driver/` and `frontend/seller/`:
```bash
npx expo install react-native-reanimated react-native-gesture-handler expo-haptics expo-blur expo-image @gorhom/bottom-sheet
```
> `npx expo install` picks the versions that match SDK 50 (Reanimated 3.6.x). Don't use plain `npm install` for these.

### 0.2 Enable Reanimated in Babel
Edit `frontend/babel.config.js`, and do the same in `driver/` and `seller/`. The Reanimated plugin **must be the last** plugin in the list.
```js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-reanimated/plugin'],
    };
};
```

### 0.3 Wrap the app root
At the very top of `frontend/App.js` (the first import):
```js
import 'react-native-gesture-handler';
```
Then wrap everything inside `return (...)`:
```js
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// ...inside App's return:
<GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
        {/* existing <SafeAreaProvider> ... </SafeAreaProvider> */}
    </BottomSheetModalProvider>
</GestureHandlerRootView>
```

**Check:** restart Metro with `npx expo start -c` (clears the cache). The app should open exactly as before.

---

## Part 1 — Design tokens (the foundation)

Create **`frontend/shared/ui/tokens.js`**. Every colour, size and duration in the app will come from here.
```js
// One source of truth for how Dropp looks and moves.
export const colors = {
    brand: '#00A859',
    brandDark: '#00874A',
    brandSoft: '#E6F7EF',
    brandGlow: 'rgba(0,168,89,0.25)',

    ink: '#0F172A',          // main text
    inkSoft: '#475569',      // secondary text
    inkMuted: '#94A3B8',     // hints, placeholders

    bg: '#F6F8FA',           // screen background
    surface: '#FFFFFF',      // cards
    surfaceAlt: '#F1F5F9',   // chips, inputs
    line: '#E2E8F0',         // borders, dividers

    food: '#F97316',
    parcel: '#3B82F6',
    shop: '#A855F7',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };

export const type = {
    display: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6 },
    h1: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
    h2: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
    h3: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
    body: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
    small: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
    caption: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
};

export const shadow = {
    sm: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    md: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    lg: { shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
};

// Motion: use these everywhere so the whole app moves with one personality
export const motion = {
    fast: 150,
    base: 240,
    slow: 400,
    stagger: 50,
    spring: { damping: 18, stiffness: 220, mass: 0.9 },        // general UI
    springSoft: { damping: 22, stiffness: 140 },               // sheets, big cards
    springBouncy: { damping: 12, stiffness: 260 },             // success moments
    pressScale: 0.96,
};
```

**Rule from now on:** no screen writes `'#22C55E'` or `fontSize: 14` directly. Import from `tokens.js`.

---

## Part 2 — Core building blocks

Create the folder `frontend/shared/ui/`. Each file below is one component.

### 2.1 `Text.jsx`: typography that follows the scale
```jsx
import React from 'react';
import { Text as RNText } from 'react-native';
import { colors, type } from './tokens';

export default function Text({ variant = 'body', color = colors.ink, style, ...rest }) {
    return <RNText style={[type[variant], { color }, style]} {...rest} />;
}
```
Use it like `<Text variant="h2">Ride Options</Text>` or `<Text variant="small" color={colors.inkSoft}>5 min away</Text>`.

### 2.2 `haptics.js`: one place for vibration
```js
import * as Haptics from 'expo-haptics';

export const haptic = {
    tap: () => Haptics.selectionAsync().catch(() => {}),
    soft: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
    firm: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
```

### 2.3 `PressableScale.jsx`: the secret to a premium feel
Every tappable card, button and chip should use this instead of `TouchableOpacity`.
```jsx
import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from './tokens';
import { haptic } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableScale({ children, onPress, style, scaleTo = motion.pressScale, hapticType = 'tap', disabled, ...rest }) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <AnimatedPressable
            {...rest}
            disabled={disabled}
            onPressIn={() => { scale.value = withSpring(scaleTo, motion.spring); }}
            onPressOut={() => { scale.value = withSpring(1, motion.spring); }}
            onPress={(e) => {
                if (hapticType) haptic[hapticType]?.();
                onPress?.(e);
            }}
            style={[style, animatedStyle, disabled && { opacity: 0.5 }]}
        >
            {children}
        </AnimatedPressable>
    );
}
```
**Why it works:** the scale runs on the UI thread through a spring, so it responds instantly even while JavaScript is busy.

### 2.4 `Button.jsx`
```jsx
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, radius, space, shadow } from './tokens';

const VARIANTS = {
    primary: { bg: colors.brand, fg: '#FFFFFF', shadow: shadow.md },
    secondary: { bg: colors.surfaceAlt, fg: colors.ink },
    danger: { bg: colors.danger, fg: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: colors.brand },
};

export default function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }) {
    const v = VARIANTS[variant];
    return (
        <PressableScale
            onPress={onPress}
            disabled={disabled || loading}
            hapticType={variant === 'primary' ? 'soft' : 'tap'}
            style={[styles.base, { backgroundColor: v.bg }, v.shadow, style]}
        >
            {loading ? (
                <ActivityIndicator color={v.fg} />
            ) : (
                <View style={styles.row}>
                    {icon && <Ionicons name={icon} size={18} color={v.fg} />}
                    <Text variant="h3" color={v.fg}>{title}</Text>
                </View>
            )}
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    base: { height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
```

### 2.5 `Card.jsx`
```jsx
import React from 'react';
import { View } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radius, space, shadow } from './tokens';

export default function Card({ children, onPress, style, padded = true }) {
    const base = [{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: padded ? space.lg : 0 }, shadow.sm, style];
    return onPress ? <PressableScale onPress={onPress} style={base}>{children}</PressableScale> : <View style={base}>{children}</View>;
}
```

### 2.6 `Skeleton.jsx`: shimmer placeholders (replaces spinners)
```jsx
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from './tokens';

export default function Skeleton({ width = '100%', height = 16, r = radius.sm, style }) {
    const progress = useSharedValue(0);
    useEffect(() => {
        progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    }, [progress]);

    const shimmer = useAnimatedStyle(() => ({
        transform: [{ translateX: interpolate(progress.value, [0, 1], [-250, 250]) }],
    }));

    return (
        <View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, style]}>
            <Animated.View style={[StyleSheet.absoluteFill, shimmer]}>
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

// Ready-made skeleton for a restaurant / product row
export function SkeletonRow() {
    return (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <Skeleton width={72} height={72} r={radius.lg} />
            <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="45%" height={12} />
                <Skeleton width="30%" height={12} />
            </View>
        </View>
    );
}
```
Use it like this: `{loading ? [1,2,3,4].map(i => <SkeletonRow key={i} />) : <List />}`.

### 2.7 `StateView.jsx`: the empty and error states every screen needs
```jsx
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Text from './Text';
import Button from './Button';
import { colors, space } from './tokens';

export default function StateView({ icon = 'file-tray-outline', title, message, actionLabel, onAction, tone = 'neutral' }) {
    const tint = tone === 'error' ? colors.danger : colors.brand;
    return (
        <Animated.View entering={FadeInDown.springify().damping(18)} style={{ alignItems: 'center', padding: space.xxxl, gap: space.md }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: tone === 'error' ? '#FEF2F2' : colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={32} color={tint} />
            </View>
            <Text variant="h2" style={{ textAlign: 'center' }}>{title}</Text>
            {!!message && <Text variant="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>{message}</Text>}
            {!!actionLabel && <Button title={actionLabel} onPress={onAction} variant={tone === 'error' ? 'secondary' : 'primary'} style={{ marginTop: space.sm, alignSelf: 'stretch' }} />}
        </Animated.View>
    );
}
```
Examples:
- `<StateView icon="cloud-offline-outline" tone="error" title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />`
- `<StateView icon="bag-outline" title="No orders yet" message="Your orders will show up here." />`

### 2.8 `Toast.jsx`: friendly pop-up messages
```jsx
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { haptic } from './haptics';
import { colors, radius, space, shadow } from './tokens';

const ToastContext = createContext({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState(null);
    const timer = useRef(null);

    const show = useCallback((message, kind = 'success') => {
        clearTimeout(timer.current);
        kind === 'error' ? haptic.error() : haptic.success();
        setToast({ message, kind, id: Date.now() });
        timer.current = setTimeout(() => setToast(null), 2600);
    }, []);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            {toast && (
                <Animated.View
                    key={toast.id}
                    entering={FadeInUp.springify().damping(16)}
                    exiting={FadeOutUp.duration(200)}
                    style={[styles.toast, { top: insets.top + 8, backgroundColor: toast.kind === 'error' ? colors.danger : colors.ink }]}
                >
                    <Ionicons name={toast.kind === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color="#FFFFFF" />
                    <Text variant="body" color="#FFFFFF" style={{ flex: 1 }}>{toast.message}</Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    toast: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, borderRadius: radius.lg, ...shadow.lg, zIndex: 9999 },
});
```
Wrap your app with `<ToastProvider>` (inside `SafeAreaProvider`), then call `useToast().show('Order placed!')` anywhere.

### 2.9 `index.js`: import everything from one place
```js
export * from './tokens';
export { haptic } from './haptics';
export { default as Text } from './Text';
export { default as PressableScale } from './PressableScale';
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Skeleton, SkeletonRow } from './Skeleton';
export { default as StateView } from './StateView';
export { ToastProvider, useToast } from './Toast';
```
Now any screen can do: `import { Button, Card, Text, colors, space } from '../../../shared/ui';`

---

## Part 3 — Motion patterns (where "smooth" comes from)

### 3.1 Staggered list entrance
Rows slide in one after another. Add this to every list: restaurants, products, orders and ride options.
```jsx
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { motion } from '../../../shared/ui';

// inside FlatList renderItem:
renderItem={({ item, index }) => (
    <Animated.View
        entering={FadeInDown.delay(Math.min(index, 8) * motion.stagger).springify().damping(18)}
        layout={Layout.springify()}
    >
        <RestaurantCard item={item} />
    </Animated.View>
)}
```
> Cap the delay with `Math.min(index, 8)` so row 40 doesn't wait 2 seconds.
> `layout={Layout.springify()}` makes rows glide smoothly when an item is added or removed (for example in the cart or the seller's order list).

### 3.2 Smooth screen transitions
The app uses its own `currentScreen` navigation, so screens currently swap instantly. Wrap each screen to make it slide in.

Create **`frontend/shared/ui/ScreenTransition.jsx`**:
```jsx
import React from 'react';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';

export default function ScreenTransition({ children, variant = 'slide' }) {
    const entering = variant === 'fade' ? FadeIn.duration(220) : SlideInRight.springify().damping(22).stiffness(180);
    return (
        <Animated.View style={{ flex: 1 }} entering={entering} exiting={FadeOut.duration(140)}>
            {children}
        </Animated.View>
    );
}
```
In `App.js`, wrap each screen:
```jsx
{currentScreen === 'TripTracking' && (
    <ScreenTransition key="TripTracking"><TripTrackingScreen onNavigate={navigate} /></ScreenTransition>
)}
```
The `key` matters: it makes React remount the screen so the entrance animation plays. Use `variant="fade"` for the tab screens (Home, Activity, Wallet, Profile), and the slide for screens you go *into* (Restaurant, Cart, Trip).

### 3.3 Bottom sheets (vehicle picker, cart, address)
Use this for every list of choices instead of a full-screen modal.
```jsx
import React, { useCallback, useMemo, useRef } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, radius } from '../../../shared/ui';

export function useSheet() {
    const ref = useRef(null);
    return { ref, open: () => ref.current?.present(), close: () => ref.current?.dismiss() };
}

export function Sheet({ sheetRef, children, snap = ['50%'] }) {
    const snapPoints = useMemo(() => snap, [snap]);
    const backdrop = useCallback((p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />, []);
    return (
        <BottomSheetModal
            ref={sheetRef}
            snapPoints={snapPoints}
            backdropComponent={backdrop}
            backgroundStyle={{ backgroundColor: colors.surface, borderRadius: radius.xxl }}
            handleIndicatorStyle={{ backgroundColor: colors.line, width: 44 }}
        >
            <BottomSheetView style={{ padding: 20 }}>{children}</BottomSheetView>
        </BottomSheetModal>
    );
}
```
Usage:
```jsx
const vehicleSheet = useSheet();
<Button title="Choose vehicle" onPress={vehicleSheet.open} />
<Sheet sheetRef={vehicleSheet.ref} snap={['45%']}>{/* tier options */}</Sheet>
```

### 3.4 Animated numbers (fares, earnings, stock)
When ₹196 changes to ₹286, it should count up rather than jump.
```jsx
import React, { useEffect, useState } from 'react';
import { useSharedValue, withTiming, useAnimatedReaction, runOnJS, Easing } from 'react-native-reanimated';
import Text from './Text';

export default function AnimatedNumber({ value, prefix = '', variant = 'h1', color, duration = 600 }) {
    const n = useSharedValue(value);
    const [shown, setShown] = useState(value);
    useEffect(() => {
        n.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
    }, [value]);
    useAnimatedReaction(() => Math.round(n.value), (v, prev) => { if (v !== prev) runOnJS(setShown)(v); });
    return <Text variant={variant} color={color}>{prefix}{shown.toLocaleString('en-IN')}</Text>;
}
```
Use it for the driver's "Earned Today", the seller's revenue and stock counts, and fares on the vehicle cards.

### 3.5 Success moment (order placed / ride booked)
```jsx
import Animated, { ZoomIn } from 'react-native-reanimated';
import { haptic } from '../../../shared/ui';

useEffect(() => { haptic.success(); }, []);

<Animated.View entering={ZoomIn.springify().damping(10).stiffness(200)} style={styles.checkCircle}>
    <Ionicons name="checkmark" size={40} color="#fff" />
</Animated.View>
```

### 3.6 Pulsing "live" dot (tracking, driver online)
```jsx
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export function LiveDot({ color = '#00A859' }) {
    const p = useSharedValue(0);
    useEffect(() => { p.value = withRepeat(withTiming(1, { duration: 1400 }), -1); }, []);
    const ring = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 1 + p.value * 1.8 }] }));
    return (
        <View style={{ width: 10, height: 10 }}>
            <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color }, ring]} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        </View>
    );
}
```

### 3.7 Swipe-to-accept (driver)
Accepting a ride with a slide feels great and prevents accidental taps.
```jsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { haptic } from './haptics';
import { colors } from './tokens';

const KNOB = 56;

export default function SwipeToConfirm({ label = 'Swipe to accept', width = 320, onConfirm }) {
    const x = useSharedValue(0);
    const max = width - KNOB - 8;

    const pan = Gesture.Pan()
        .onUpdate((e) => { x.value = Math.max(0, Math.min(max, e.translationX)); })
        .onEnd(() => {
            if (x.value > max * 0.85) {
                x.value = withSpring(max);
                runOnJS(haptic.success)();
                runOnJS(onConfirm)();
            } else {
                x.value = withSpring(0);
            }
        });

    const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
    const fill = useAnimatedStyle(() => ({ width: x.value + KNOB + 4 }));
    const hint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.5], [1, 0]) }));

    return (
        <View style={[styles.track, { width }]}>
            <Animated.View style={[styles.fill, fill]} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, hint]}>
                <Text variant="h3" color="#FFFFFF">{label}</Text>
            </Animated.View>
            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.knob, knob]}>
                    <Ionicons name="chevron-forward" size={26} color={colors.brand} />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    track: { height: KNOB + 8, borderRadius: 999, backgroundColor: colors.ink, padding: 4, justifyContent: 'center' },
    fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, backgroundColor: colors.brand },
    center: { alignItems: 'center', justifyContent: 'center' },
    knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
```

---

## Part 4 — Screen-by-screen checklist

Work through these one screen at a time. Tick each item off as you finish it.

### Customer app
| Screen | What to build |
|---|---|
| **Home** | Header greeting by time of day ("Good evening, Lucky"). Service tiles as `Card` + `PressableScale`, staggered in. A pull-to-refresh location. An "Active trip" pill at the top if a ride is running. |
| **Location search** | Results animate in as you type (debounce input 300 ms). Recent places as chips. Skeleton rows while searching. |
| **Choose ride** | The vehicle picker in a bottom sheet. Selected tier lifts (scale 1.03 + shadow). Fares use `AnimatedNumber`. The "Book" button shows the selected fare. |
| **Finding driver** | A radar ripple on the map (3 `LiveDot`-style rings). A rotating status text every 2.5 s ("Contacting nearby drivers…"). A cancel button in the sheet. |
| **Trip tracking** | A smooth car marker (animate between GPS points, see 5.4). Collapsible bottom sheet (25% / 60%). OTP in a big, copyable pill. A "LIVE" `LiveDot`. |
| **Food home** | Sticky search bar that shrinks on scroll (5.3). Category chips with an animated underline. Restaurant cards with `expo-image` and a fade-in. Skeletons while loading. |
| **Restaurant** | Parallax header image (5.3). Menu sections with a sticky category bar. "Add" morphs into a `− 1 +` stepper. A floating cart bar slides up when the cart has items. |
| **Cart / checkout** | A bill that animates totals. A swipe-to-pay or big confirm button. A success screen with a `ZoomIn` check and haptic. |
| **Order tracking** | A step timeline that fills as status changes (animated line height). Live map card. Driver card slides in when assigned. |
| **Aura overlay** | Blur backdrop (`expo-blur`). Chat bubbles enter with `FadeInUp`. A typing indicator (3 bouncing dots). The mic button pulses with the voice level. |
| **Profile / Wallet** | Clean list rows with icons. Settings as switches with haptics. |

### Driver app
| Screen | What to build |
|---|---|
| **Home** | A large animated Online/Offline toggle (colour + glow transition). Earnings with `AnimatedNumber`. A pulsing "Live dispatch" dot. |
| **Ride offer** | Slides up as a sheet with a spring. A circular countdown ring. `SwipeToConfirm` to accept. A strong haptic + sound on arrival. |
| **Navigation** | A big next-step banner. Step progress dots that fill. The OTP input as 4 separate boxes that auto-advance. A confetti or check animation on completion. |
| **Earnings** | A bar chart where bars grow in (animated height). Trip list with stagger. |

### Seller app
| Screen | What to build |
|---|---|
| **Dashboard** | Stat cards with `AnimatedNumber`. A new-order banner that slides in from the top with a sound + haptic. |
| **Orders** | Swipe actions on order cards (swipe right = accept, left = reject). Status chip colour transitions. `Layout` animation when an order moves between tabs. |
| **Products** | Stock stepper with a number tick animation. Long-press for quick actions. Skeleton loading. |
| **Voice (Aura)** | A mic orb that scales with voice level (use the `metering` from the recording status). Transcript bubbles with a typewriter effect. |

---

## Part 5 — Performance (smoothness under load)

### 5.1 Faster lists
Apply this to every `FlatList`:
```jsx
<FlatList
    data={items}
    keyExtractor={(i) => String(i._id)}
    renderItem={renderItem}                 // defined with useCallback, not inline
    initialNumToRender={8}
    maxToRenderPerBatch={8}
    windowSize={7}
    removeClippedSubviews
    getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}  // only if rows have a fixed height
/>
```
Wrap the row component in `React.memo`:
```jsx
const RestaurantCard = React.memo(function RestaurantCard({ item, onPress }) { ... });
```

### 5.2 Faster images
Replace `<Image>` from react-native with `expo-image`. It caches to disk and fades in:
```jsx
import { Image } from 'expo-image';
<Image source={{ uri: item.image }} style={{ width: 72, height: 72, borderRadius: 16 }} contentFit="cover" transition={250} cachePolicy="memory-disk" />
```

### 5.3 Collapsing header with parallax
```jsx
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';

const y = useSharedValue(0);
const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });

const headerImage = useAnimatedStyle(() => ({
    transform: [
        { translateY: interpolate(y.value, [-100, 0, 200], [-50, 0, 100], Extrapolation.CLAMP) },
        { scale: interpolate(y.value, [-100, 0], [1.3, 1], Extrapolation.CLAMP) },
    ],
}));
const stickyBar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [140, 200], [0, 1], Extrapolation.CLAMP) }));

<Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
    <Animated.Image source={...} style={[{ height: 240 }, headerImage]} />
    ...
</Animated.ScrollView>
<Animated.View style={[styles.stickyTitleBar, stickyBar]}>...</Animated.View>
```

### 5.4 Smooth car movement on the map
GPS arrives every 3–4 seconds, so without this the car jumps. Animate between points:
```jsx
import { AnimatedRegion, Marker } from 'react-native-maps';

const carPos = useRef(new AnimatedRegion({ latitude: 28.49, longitude: 77.08, latitudeDelta: 0, longitudeDelta: 0 })).current;

useEffect(() => {
    if (!livePos) return;
    carPos.timing({ latitude: livePos.lat, longitude: livePos.lng, duration: 3000, useNativeDriver: false }).start();
}, [livePos?.lat, livePos?.lng]);

<Marker.Animated coordinate={carPos} rotation={livePos?.bearing || 0} flat anchor={{ x: 0.5, y: 0.5 }}>
    <CarIcon />
</Marker.Animated>
```

### 5.5 Heavy work after animations
```jsx
import { InteractionManager } from 'react-native';
useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => loadMenu());
    return () => task.cancel();
}, []);
```

### 5.6 Remove noise
- Delete `console.log` calls inside render code and WebSocket handlers; they slow down JavaScript in dev.
- Never create objects or functions inline in props on large lists (`style={{...}}`, `onPress={() => ...}` on 100 rows). Use `StyleSheet.create` and `useCallback`.
- Keep the Zustand store selectors narrow: `useRideStore((s) => s.driver)`, not `useRideStore()`.

---

## Part 6 — Order to build (about 2 weeks at a steady pace)

| Day | Build | Done when |
|---|---|---|
| 1 | Part 0 setup + Part 1 tokens | App runs with Reanimated installed |
| 2 | Part 2: Text, haptics, PressableScale, Button, Card | Home tiles use `Card` + press animation |
| 3 | Skeleton, StateView, Toast | Food home shows skeletons, then content; errors show Retry |
| 4 | 3.1 stagger + 3.2 screen transitions | Every list staggers; screens slide in |
| 5 | 3.3 bottom sheet: vehicle picker + cart | Choosing a vehicle happens in a sheet |
| 6 | 3.4 AnimatedNumber + 3.5 success + 3.6 LiveDot | Fares, earnings and stock count up; booking shows a success animation |
| 7 | Customer: Trip tracking (5.4 smooth car, OTP pill, sheet) | Car glides on the map |
| 8 | Customer: Restaurant (5.3 parallax, stepper, floating cart bar) | Scrolling the menu feels native |
| 9 | Driver: offer sheet + 3.7 SwipeToConfirm + countdown ring | Accepting a ride is a swipe |
| 10 | Driver: OTP boxes, navigation banner, earnings chart | — |
| 11 | Seller: new-order banner, swipe actions, stock tick | — |
| 12 | Aura: blur backdrop, typing dots, mic orb reacting to voice | — |
| 13 | Part 5 performance pass on every list and image | No dropped frames when scrolling (check the Perf Monitor in the dev menu) |
| 14 | Dark mode pass + accessibility labels + final QA on a real phone | — |

**How to check smoothness:** shake the simulator (or press ⌘D) → **Show Perf Monitor**. Both the UI and JS numbers should stay near **60** while scrolling and animating. If JS drops, something is running on the JS thread; move it to Reanimated or after interactions.

---

### Stuck on something?
Paste the file you're working on and tell me which part you're on, for example "Part 3.3, the sheet won't open". I'll explain what's wrong and you fix it yourself.
