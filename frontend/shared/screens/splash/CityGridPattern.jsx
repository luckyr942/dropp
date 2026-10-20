import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';

export default function CityGridPattern({ width, height }) {
    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <Defs>
                    <RadialGradient id="centerGlow" cx="50%" cy="45%" r="60%">
                        <Stop offset="0%" stopColor="#42F5A1" stopOpacity="0.16" />
                        <Stop offset="50%" stopColor="#0B211A" stopOpacity="0.08" />
                        <Stop offset="100%" stopColor="#07110F" stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Subtle Radial Glow in Center */}
                <Path
                    d={`M0 0 H${width} V${height} H0 Z`}
                    fill="url(#centerGlow)"
                />

                {/* Background Secondary Route Grid (The City Arteries) */}
                <Path
                    d={`
                        M -20 ${height * 0.25} Q ${width * 0.4} ${height * 0.28} ${width + 20} ${height * 0.2}
                        M -20 ${height * 0.42} Q ${width * 0.5} ${height * 0.39} ${width + 20} ${height * 0.46}
                        M -20 ${height * 0.62} Q ${width * 0.3} ${height * 0.65} ${width + 20} ${height * 0.6}
                        M -20 ${height * 0.78} Q ${width * 0.6} ${height * 0.75} ${width + 20} ${height * 0.82}
                        M ${width * 0.18} -20 Q ${width * 0.22} ${height * 0.5} ${width * 0.16} ${height + 20}
                        M ${width * 0.5} -20 Q ${width * 0.48} ${height * 0.5} ${width * 0.52} ${height + 20}
                        M ${width * 0.82} -20 Q ${width * 0.78} ${height * 0.5} ${width * 0.84} ${height + 20}
                    `}
                    stroke="rgba(66, 245, 161, 0.07)"
                    strokeWidth="1.2"
                    fill="none"
                    strokeDasharray="4, 6"
                />

                {/* Micro Node Dots on Map Intersections */}
                <Path
                    d={`
                        M ${width * 0.21} ${height * 0.26} m -2.5, 0 a 2.5,2.5 0 1,0 5,0 a 2.5,2.5 0 1,0 -5,0
                        M ${width * 0.81} ${height * 0.21} m -2, 0 a 2,2.5 0 1,0 4,0 a 2,2 0 1,0 -4,0
                        M ${width * 0.49} ${height * 0.41} m -3, 0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0
                        M ${width * 0.17} ${height * 0.63} m -2, 0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0
                        M ${width * 0.83} ${height * 0.81} m -2.5, 0 a 2.5,2.5 0 1,0 5,0 a 2.5,2.5 0 1,0 -5,0
                    `}
                    fill="rgba(66, 245, 161, 0.2)"
                />
            </Svg>
        </View>
    );
}
