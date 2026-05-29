import React, { useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, View, type ViewStyle, Dimensions } from 'react-native';

interface ZoomableImageProps {
  uri: string;
  /** Width:Height aspect ratio (defaults to 1 = square) */
  aspectRatio?: number;
  /** Optional overlay rendered on top of the image (e.g. AI findings boxes). Scales with the image. */
  overlay?: React.ReactNode;
  containerStyle?: ViewStyle;
}

/**
 * Pinch-zoom + pan via ScrollView's built-in zoom (iOS native + Android via maximumZoomScale).
 * Tap once to keep zoom; pinch to scale; pan to look around once zoomed.
 * Double-tap toggles between 1x and 2.5x via a manual scroll.
 */
export function ZoomableImage({ uri, aspectRatio = 1, overlay, containerStyle }: ZoomableImageProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [containerSize, setContainerSize] = useState({ width: Dimensions.get('window').width - 32, height: (Dimensions.get('window').width - 32) / aspectRatio });
  const lastTap = useRef<number>(0);
  const [zoomed, setZoomed] = useState(false);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Toggle zoom
      if (zoomed) {
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        setZoomed(false);
      } else {
        scrollRef.current?.scrollTo({
          x: containerSize.width * 0.75,
          y: containerSize.height * 0.5,
          animated: true,
        });
        setZoomed(true);
      }
    }
    lastTap.current = now;
  };

  return (
    <View
      style={[{ aspectRatio, overflow: 'hidden' }, containerStyle]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
    >
      <ScrollView
        ref={scrollRef}
        maximumZoomScale={4}
        minimumZoomScale={1}
        bouncesZoom
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: containerSize.width, height: containerSize.height }}
        // Allow panning when zoomed
        scrollEnabled
        onTouchEnd={handleDoubleTap}
        onScrollEndDrag={(e) => {
          const zoom = (e.nativeEvent as unknown as { zoomScale?: number }).zoomScale ?? 1;
          setZoomed(zoom > 1.1);
        }}
      >
        <Animated.View style={styles.imgWrap}>
          <Image source={{ uri }} style={styles.img} resizeMode="contain" />
          {overlay}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  imgWrap: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
});
