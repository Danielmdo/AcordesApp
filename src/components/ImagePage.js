import React, { useRef } from 'react';
import { View, Image, ScrollView, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ImagePage({ uri }) {
  const scrollRef = useRef(null);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={3}
        minimumZoomScale={1}
        bouncesZoom={true}
        centerContent={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
        alwaysBounceHorizontal={false}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH - 16,
    height: SCREEN_HEIGHT - 180,
    borderRadius: 8,
    backgroundColor: 'white',
  },
});
