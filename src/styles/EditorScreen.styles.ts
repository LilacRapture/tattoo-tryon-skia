import { StyleSheet, Dimensions } from 'react-native';

// Color constants
const COLORS = {
  white: '#fff',
  black: '#000',
  blue: '#2563eb',
  gray: '#374151',
  transparent: 'transparent',
  blueTransparent: 'rgba(70, 150, 255, 0.6)',
  blackTransparent: 'rgba(0, 0, 0, 0.7)',
} as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const editorStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  canvasContainer: {
    flex: 1,
  },
  toolbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btn: {
    backgroundColor: COLORS.blue,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  secondary: {
    backgroundColor: COLORS.gray,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  boundingBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    pointerEvents: 'none',
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 4,
    borderColor: COLORS.blueTransparent,
    borderStyle: 'solid',
    borderRadius: 8,
    pointerEvents: 'none',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.blackTransparent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  spinner: {
    marginBottom: 12,
  },
});
