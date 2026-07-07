import React, { useRef, useMemo, useCallback } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated, PanResponder } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

export default function ImagePage({ uri }) {
  const scaleRef = useRef(new Animated.Value(1));
  const translateXRef = useRef(new Animated.Value(0));
  const translateYRef = useRef(new Animated.Value(0));

  const lastTapRef = useRef(0);
  const baseScaleRef = useRef(1);
  const baseDistRef = useRef(0);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  const scale = scaleRef.current;
  const translateX = translateXRef.current;
  const translateY = translateYRef.current;

  const getDist = useCallback((touches) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const animateTo = useCallback((toScale, toX = 0, toY = 0) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, friction: 7 }),
      Animated.spring(translateX, { toValue: toX, useNativeDriver: true, friction: 7 }),
      Animated.spring(translateY, { toValue: toY, useNativeDriver: true, friction: 7 }),
    ]).start(() => {
      baseScaleRef.current = toScale;
      panXRef.current = toX;
      panYRef.current = toY;
    });
  }, [scale, translateX, translateY]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => {
      if (gs.numberActiveTouches === 2) return true;
      if (baseScaleRef.current > 1) return true;
      return false;
    },
    onPanResponderGrant: (e) => {
      if (e.nativeEvent.touches.length === 2) {
        baseDistRef.current = getDist(e.nativeEvent.touches);
        baseScaleRef.current = scale.__getValue();
      }
    },
    onPanResponderMove: (e, gs) => {
      if (e.nativeEvent.touches.length === 2) {
        const dist = getDist(e.nativeEvent.touches);
        const newScale = baseScaleRef.current * (dist / baseDistRef.current);
        scale.setValue(Math.min(Math.max(newScale, 1), 3));
      } else if (baseScaleRef.current > 1) {
        translateX.setValue(panXRef.current + gs.dx / baseScaleRef.current);
        translateY.setValue(panYRef.current + gs.dy / baseScaleRef.current);
      }
    },
    onPanResponderRelease: () => {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        const s = scale.__getValue();
        if (s > 1.2) {
          animateTo(1, 0, 0);
        } else {
          animateTo(2.5);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      panXRef.current = translateX.__getValue();
      panYRef.current = translateY.__getValue();
      baseScaleRef.current = scale.__getValue();
    },
  }), [animateTo, getDist, scale, translateX, translateY]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={[styles.animatedContainer, {
        transform: [{ translateX }, { translateY }, { scale }],
      }]}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  animatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W - 16,
    height: SCREEN_H - 180,
    borderRadius: 8,
    backgroundColor: 'white',
  },
});