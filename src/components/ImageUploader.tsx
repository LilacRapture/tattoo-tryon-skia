import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface ImageUploaderProps {
  label: string;
  valueUri?: string | null;
  // eslint-disable-next-line no-unused-vars
  onPick: (uri: string) => void;
}

// Color constants
const COLORS = {
  white: '#fff',
  gray: {
    dark: '#111827',
    medium: '#6b7280',
    light: '#e5e7eb',
  },
  green: '#059669',
} as const;

export function ImageUploader({ label, valueUri, onPick }: ImageUploaderProps) {
  const [isPicking, setIsPicking] = React.useState(false);

  const requestPermissions = React.useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library is required.');
    }
  }, []);

  const handlePick = React.useCallback(async () => {
    try {
      setIsPicking(true);
      await requestPermissions();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset?.uri) {
          onPick(selectedAsset.uri);
        }
      }
    } catch {
      // Error handling - could log or handle specific errors here
    } finally {
      setIsPicking(false);
    }
  }, [onPick, requestPermissions]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={handlePick}
        style={styles.button}
        disabled={isPicking}
      >
        {isPicking ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>
            {valueUri ? 'Change image' : 'Pick image'}
          </Text>
        )}
      </Pressable>
      {valueUri ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: valueUri }}
            style={styles.preview}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={[styles.preview, styles.previewPlaceholder]}>
          <Text style={styles.previewPlaceholderText}>No image selected</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.gray.dark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.gray.light,
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    color: COLORS.gray.medium,
  },
  previewContainer: {
    position: 'relative',
  },
});

export default ImageUploader;
