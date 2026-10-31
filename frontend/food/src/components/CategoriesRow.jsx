// import React, { memo } from 'react';
// import {
//     View,
//     Text,
//     TouchableOpacity,
//     Image,
//     ScrollView,
//     StyleSheet,
//     Platform,
// } from 'react-native';

// const CATEGORIES = [
//     {
//         id: 'cafe',
//         label: 'Cafe',
//         bgColor: '#FFF0DF',
//         image: require("../../assets/coffee.png"),
//     },
//     {
//         id: 'bubble',
//         label: "Bubble tea",
//         bgColor: "#FFF1D6",
//         image: require("../../assets/bubble_tea.png"),
//     },
//     {
//         id: 'snacks',
//         label: 'Snacks',
//         bgColor: '#FFE8E2',
//         image: require("../../assets/snacks.png"),
//     },
//     {
//         id: 'desserts',
//         label: "Desserts",
//         bgColor: "#FCE7F3",
//         image: require("../../assets/dessert.png"),
//     },
//     // {
//     //     id: 'healthy',
//     //     label: "Healthy",
//     //     bgColor: "#E2F6E9",
//     //     image: require("../../assets/healty.png"),
//     // },
//     {
//         id: 'more',
//         label: 'More',
//         bgColor: "#E9EDFF",
//         image: require("../../assets/more.png")
//     }
// ];

// const CategoryItem = memo(({ item, onPress, active }) => (
//     <TouchableOpacity
//         style={styles.item}
//         onPress={() => onPress && onPress(item.id)}
//         activeOpacity={0.75}
//         accessibilityRole="button"
//         accessibilityLabel={`${item.label} category`}
//     >
//         <View style={[styles.circle, { backgroundColor: item.bgColor }, active && styles.circleActive]}>
//             <Image
//                 source={item.image}
//                 style={styles.img}
//                 resizeMode='contain'
//             />
//         </View>
//         <Text style={styles.label}>{item.label}</Text>
//     </TouchableOpacity>
// ));

// export default function CategoriesRow({ onSelectCategory, onMorePress, selected = null }) {
//     const handlePress = (id) => {
//         if (id === 'more') {
//             if (onMorePress) onMorePress();
//             else if (onSelectCategory) onSelectCategory(id);
//         } else {
//             if (onSelectCategory) onSelectCategory(id);
//         }
//     };

//     return (
//         <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={styles.row}
//             decelerationRate="fast"
//         >
//             {CATEGORIES.map((cat) => (
//                 <CategoryItem
//                     key={cat.id}
//                     item={cat}
//                     onPress={handlePress} // Fixed: Passed handlePress instead of onSelectCategory
//                 />
//             ))}
//         </ScrollView>
//     );
// }

// const styles = StyleSheet.create({
//     row: {
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//         gap: 16,
//     },
//     item: {
//         alignItems: 'center',
//         gap: 6,
//         width: 64,
//     },
//     circle: {
//         width: 56,
//         height: 56,
//         borderRadius: 31,
//         overflow: 'hidden',
//         justifyContent: 'center',
//         alignItems: 'center',
//         padding: 8,
//         ...Platform.select({
//             ios: {
//                 shadowColor: '#000',
//                 shadowOffset: { width: 0, height: 2 },
//                 shadowOpacity: 0.05,
//                 shadowRadius: 6,
//             },
//             android: {
//                 elevation: 2,
//             },
//         }),
//     },
//     img: {
//         width: '100%',
//         height: '100%',
//     },
//     label: {
//         fontFamily: Platform.select({
//             default: 'PlusJakartaSans_600SemiBold',
//             android: 'sans-serif-medium',
//         }),
//         fontSize: 11.5,
//         fontWeight: '600',
//         color: '#1E293B',
//         textAlign: 'center',
//     },
// });


import React, { memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Platform,
} from 'react-native';

const CATEGORIES = [
    {
        id: 'cafe',
        label: 'Cafe',
        bgColor: '#FFF0DF',
        image: require("../../assets/coffee.png"),
    },
    {
        id: 'bubble',
        label: "Bubble tea",
        bgColor: "#FFF1D6",
        image: require("../../assets/bubble_tea.png"),
    },
    {
        id: 'snacks',
        label: 'Snacks',
        bgColor: '#FFE8E2',
        image: require("../../assets/image.png"),
    },
    {
        id: 'desserts',
        label: "Desserts",
        bgColor: "#FCE7F3",
        image: require("../../assets/dessert.png"),
    },
    // {
    //     id: 'healthy',
    //     label: "Healthy",
    //     bgColor: "#E2F6E9",
    //     image: require("../../assets/healty.png"),
    // },
    {
        id: 'more',
        label: 'More',
        bgColor: "#E9EDFF",
        image: require("../../assets/more.png")
    }
];

const CategoryItem = memo(({ item, onPress, active }) => (
    <TouchableOpacity
        style={styles.item}
        onPress={() => onPress && onPress(item.id)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${item.label} category`}
    >
        <View style={[styles.circle, { backgroundColor: item.bgColor }, active && styles.circleActive]}>
            <Image
                source={item.image}
                style={styles.img}
                resizeMode='contain'
            />
        </View>
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{item.label}</Text>
    </TouchableOpacity>
));

export default function CategoriesRow({ onSelectCategory, onMorePress, selected = null }) {
    const handlePress = (id) => {
        if (id === 'more') {
            if (onMorePress) onMorePress();
            else if (onSelectCategory) onSelectCategory(id);
        } else {
            if (onSelectCategory) onSelectCategory(id);
        }
    };

    return (
        <View style={styles.row}>
            {CATEGORIES.map((cat) => (
                <CategoryItem
                    key={cat.id}
                    item={cat}
                    onPress={handlePress}
                    active={selected === cat.id}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Spreads the items evenly across the width
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 1,
        paddingBottom: 4,
        paddingVertical: 10,
    },
    item: {
        alignItems: 'center',
        gap: 4,
        width: 56, // Optimized width to fit all items evenly
    },
    circle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    img: {
        width: '100%',
        height: '100%',
    },
    circleActive: {
        borderWidth: 2,
        borderColor: '#00A859',
    },
    labelActive: {
        color: '#00A859',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 11,
        color: '#1E293B',
        textAlign: 'center',
    },
});