import './src/polyfills/text-decoder';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import ImageUploader from './src/components/ImageUploader';
import EditorScreen from './src/screens/EditorScreen';

import { MapsCacheProvider } from './src/state/MapsCacheContext';

// Color constants
const COLORS = {
  white: '#fff',
  blue: '#2563eb',
} as const;

export default function App() {
  const [bodyImageUri, setBodyImageUri] = React.useState<string | null>(null);
  const [sketchImageUri, setSketchImageUri] = React.useState<string | null>(
    null
  );
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);

  return (
    <GestureHandlerRootView style={styles.root}>
      <MapsCacheProvider>
        {isEditorOpen && bodyImageUri && sketchImageUri ? (
          <EditorScreen
            bodyUri={bodyImageUri}
            sketchUri={sketchImageUri}
            onBack={() => setIsEditorOpen(false)}
            onDone={() => {
              setIsEditorOpen(false);
            }}
          />
        ) : (
          <View style={styles.container}>
            <Text style={styles.title}>Upload images</Text>
            <View style={styles.section}>
              <ImageUploader
                label="Body part image"
                valueUri={bodyImageUri}
                onPick={setBodyImageUri}
              />
            </View>
            <View style={styles.section}>
              <ImageUploader
                label="Tattoo sketch"
                valueUri={sketchImageUri}
                onPick={setSketchImageUri}
              />
            </View>
            <Pressable
              style={[
                styles.uploadButton,
                (!bodyImageUri || !sketchImageUri) &&
                  styles.uploadButtonDisabled,
              ]}
              onPress={() => setIsEditorOpen(true)}
              disabled={!bodyImageUri || !sketchImageUri}
            >
              <Text style={styles.uploadButtonText}>Open Editor</Text>
            </Pressable>

            <StatusBar style="auto" />
          </View>
        )}
      </MapsCacheProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 20,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    gap: 8,
  },
  uploadButton: {
    backgroundColor: COLORS.blue,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
});
