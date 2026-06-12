import React from 'react';
import {
  View,
  Dimensions,
  Pressable,
  Text,
  ActivityIndicator,
} from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import {
  Canvas,
  Fill,
  Group,
  Image as SkImage,
  useImage,
  Mask,
  Paint,
  ImageShader,
  Shader,
  Circle,
} from '@shopify/react-native-skia';

import { getBlendIfWithDisplacementEffect } from '../shaders/blendIfWithDisplacement';
import { useMapsCache } from '../state/MapsCacheContext';
import { editorStyles } from '../styles/EditorScreen.styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OPTIMAL_DISPLACEMENT_SCALE = 44;

// Full screen rectangle for consistent sizing across the canvas
const fullScreenRect = {
  x: 0,
  y: 0,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

export interface EditorScreenProps {
  bodyUri: string;
  sketchUri: string;
  // eslint-disable-next-line no-unused-vars
  onDone?: (transform: {
    translateX: number;
    translateY: number;
    scale: number;
    rotation: number;
  }) => void;
  onBack?: () => void;
}

export default function EditorScreen({
  bodyUri,
  sketchUri,
  onDone,
  onBack,
}: EditorScreenProps) {
  const { ensureMapUri, getCachedMapUri } = useMapsCache();
  const [maskUri, setMaskUri] = React.useState<string | null>(null);
  const [normalUri, setNormalUri] = React.useState<string | null>(null);
  const [isLoadingMaps, setIsLoadingMaps] = React.useState(false);

  // Load body image for loading state
  const body = useImage(bodyUri);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cached = getCachedMapUri(bodyUri, 'mask');
        if (cached) {
          if (!cancelled) setMaskUri(cached);
        } else {
          setIsLoadingMaps(true);
          const uri = await ensureMapUri(bodyUri, 'mask');
          if (!cancelled) {
            setMaskUri(uri);
            setIsLoadingMaps(false);
          }
        }
      } catch {
        if (!cancelled) setIsLoadingMaps(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [bodyUri, ensureMapUri, getCachedMapUri]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cached = getCachedMapUri(bodyUri, 'normal');
        if (cached) {
          if (!cancelled) setNormalUri(cached);
        } else {
          setIsLoadingMaps(true);
          const uri = await ensureMapUri(bodyUri, 'normal');
          if (!cancelled) {
            setNormalUri(uri);
            setIsLoadingMaps(false);
          }
        }
      } catch {
        if (!cancelled) setIsLoadingMaps(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [bodyUri, ensureMapUri, getCachedMapUri]);

  // No normal map loading here; displacement is tested in a separate screen

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Frame opacity for fade in/out effect
  const frameOpacity = useSharedValue(1);
  const shouldRestartTimer = useSharedValue(0);
  const fadeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Function to restart fade out timer
  const restartFadeOutTimer = React.useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    fadeTimeoutRef.current = setTimeout(() => {
      frameOpacity.value = withTiming(0, { duration: 500 });
    }, 2000);
  }, [frameOpacity]);

  // Local state to sync with Skia - this ensures context synchronization
  const [skiaState, setSkiaState] = React.useState({
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotation: 0,
  });

  // Sync shared values with React state for re-renders
  useAnimatedReaction(
    () => ({
      translateX: translateX.value,
      translateY: translateY.value,
      scale: scale.value,
      rotation: rotation.value,
    }),
    (newState) => {
      'worklet';
      // Use runOnJS to call setState from the UI thread
      runOnJS(setSkiaState)(newState);
    }
  );

  const pan = Gesture.Pan().onChange((event) => {
    translateX.value += event.changeX;
    translateY.value += event.changeY;

    // Fade in frame and trigger timer restart
    frameOpacity.value = withTiming(1, { duration: 300 });
    shouldRestartTimer.value += 1;
  });

  const pinch = Gesture.Pinch().onChange((event) => {
    const next = scale.value * event.scaleChange;
    scale.value = Math.min(6, Math.max(0.2, next));

    // Fade in frame and trigger timer restart
    frameOpacity.value = withTiming(1, { duration: 300 });
    shouldRestartTimer.value += 1;
  });

  const rotate = Gesture.Rotation().onChange((event) => {
    rotation.value += event.rotationChange;

    // Fade in frame and trigger timer restart
    frameOpacity.value = withTiming(1, { duration: 300 });
    shouldRestartTimer.value += 1;
  });

  const reset = () => {
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    scale.value = withTiming(1);
    rotation.value = withTiming(0);

    // Fade in frame and trigger timer restart
    frameOpacity.value = withTiming(1, { duration: 300 });
    shouldRestartTimer.value += 1;
  };

  // Watch for timer restart triggers
  React.useEffect(() => {
    const checkTimer = () => {
      if (shouldRestartTimer.value > 0) {
        restartFadeOutTimer();
        shouldRestartTimer.value = 0;
      }
    };

    // Check periodically instead of watching the shared value
    const interval = setInterval(checkTimer, 100);
    return () => clearInterval(interval);
  }, [restartFadeOutTimer, shouldRestartTimer]);

  const doubleTap = Gesture.Tap().numberOfTaps(2).onStart(reset);
  const gestures = Gesture.Simultaneous(pan, pinch, rotate, doubleTap);

  const handleDone = () => {
    onDone?.(skiaState);
  };

  return (
    <View style={editorStyles.root}>
      <GestureDetector gesture={gestures}>
        <View style={editorStyles.canvasContainer}>
          {isLoadingMaps && (
            <View style={editorStyles.loadingOverlay}>
              <ActivityIndicator style={editorStyles.spinner} />
              <Text style={editorStyles.loadingText}>Generating maps...</Text>
            </View>
          )}
          {isLoadingMaps ? (
            // Show just the body image during loading
            <Canvas style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
              <SkImage image={body} {...fullScreenRect} fit="cover" />
            </Canvas>
          ) : (
            // Show full editor when not loading
            <SkiaEditor
              bodyUri={bodyUri}
              sketchUri={sketchUri}
              maskUri={maskUri ?? undefined}
              normalUri={normalUri ?? undefined}
              displacementScale={OPTIMAL_DISPLACEMENT_SCALE}
              translateX={skiaState.translateX}
              translateY={skiaState.translateY}
              scale={skiaState.scale}
              rotation={skiaState.rotation}
            />
          )}
        </View>
      </GestureDetector>

      {/* Bounding box that moves with the sketch */}
      {!isLoadingMaps && (
        <Animated.View
          style={[
            editorStyles.boundingBox,
            {
              transform: [
                { translateX: SCREEN_WIDTH * 0.25 + skiaState.translateX },
                { translateY: SCREEN_HEIGHT * 0.25 + skiaState.translateY },
                { rotate: `${skiaState.rotation}rad` },
              ],
            },
          ]}
          pointerEvents="none"
        >
          {/* Frame with consistent stroke width - scaled dimensions without transform */}
          <Animated.View
            style={[
              editorStyles.frame,
              {
                width: SCREEN_WIDTH * 0.5 * skiaState.scale,
                height: SCREEN_WIDTH * 0.5 * skiaState.scale,
                left:
                  -(SCREEN_WIDTH * 0.5 * skiaState.scale - SCREEN_WIDTH * 0.5) /
                  2,
                top:
                  -(SCREEN_WIDTH * 0.5 * skiaState.scale - SCREEN_WIDTH * 0.5) /
                  2,
                opacity: frameOpacity,
              },
            ]}
          />
        </Animated.View>
      )}

      <View style={editorStyles.toolbar}>
        <Pressable
          style={[editorStyles.btn, editorStyles.secondary]}
          onPress={onBack}
        >
          <Text style={editorStyles.btnText}>Back</Text>
        </Pressable>

        <Pressable style={editorStyles.btn} onPress={handleDone}>
          <Text style={editorStyles.btnText}>Done</Text>
        </Pressable>

        <Pressable
          style={[editorStyles.btn, editorStyles.secondary]}
          onPress={reset}
        >
          <Text style={editorStyles.btnText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Separate Skia component for better memory management
function SkiaEditor({
  bodyUri,
  sketchUri,
  maskUri,
  normalUri,
  displacementScale,
  translateX,
  translateY,
  scale,
  rotation,
}: {
  bodyUri: string;
  sketchUri: string;
  maskUri?: string;
  normalUri?: string;
  displacementScale: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
}) {
  const body = useImage(bodyUri);
  const sketch = useImage(sketchUri);
  const mask = useImage(maskUri);
  const normal = useImage(normalUri);

  // Essential images must be available
  if (!body || !sketch) return null;

  // Calculate positions
  const sketchWidth = SCREEN_WIDTH * 0.5;
  const sketchHeight = SCREEN_WIDTH * 0.5;
  const centerX = SCREEN_WIDTH * 0.25;
  const centerY = SCREEN_HEIGHT * 0.25;

  // Calculate the center of the sketch for pivot point
  const sketchCenterX = sketchWidth / 2;
  const sketchCenterY = sketchHeight / 2;

  const finalTranslateX = centerX + translateX;
  const finalTranslateY = centerY + translateY;

  const originX = finalTranslateX + sketchCenterX + sketchWidth / 2;
  const originY = finalTranslateY + sketchCenterY + sketchHeight / 2;

  const blendIfSource = getBlendIfWithDisplacementEffect();

  return (
    <Canvas style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      {/* Background body image */}
      <SkImage image={body} {...fullScreenRect} fit="cover" />

      {/* Tattoo sketch with blend-if and multiply blend */}
      <Group layer={<Paint blendMode="multiply" />}>
        <Mask
          mode="luminance"
          mask={<SkImage image={mask} {...fullScreenRect} fit="cover" />}
        >
          {/* Apply displacement only to the tattoo - not to the mask */}

          <Fill>
            <Shader
              source={blendIfSource}
              uniforms={{
                edge0: 0.48,
                edge1: 0.72,
                displacementScale: normal ? displacementScale : 0,
              }}
            >
              <ImageShader image={body} rect={fullScreenRect} fit="cover" />
              <ImageShader
                image={sketch}
                fit="contain"
                rect={{
                  x: finalTranslateX,
                  y: finalTranslateY,
                  width: sketchWidth,
                  height: sketchHeight,
                }}
                origin={{
                  x: originX,
                  y: originY,
                }}
                transform={[{ rotate: rotation }, { scale: scale }]}
              />
              {normal ? (
                <ImageShader image={normal} rect={fullScreenRect} />
              ) : (
                <ImageShader image={body} rect={fullScreenRect} />
              )}
            </Shader>
          </Fill>
        </Mask>
      </Group>
      {/* DEBUG VISUALIZATION — remove for production: shows origin (red) and translate (green) points used for sketch placement */}
      <Circle cx={originX} cy={originY} r={4} color="#ff2d20" />
      <Circle
        cx={finalTranslateX + sketchCenterX}
        cy={finalTranslateY + sketchCenterY}
        r={4}
        color="#2dff20"
      />
    </Canvas>
  );
}
