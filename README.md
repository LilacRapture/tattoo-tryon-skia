# Tattoo Try-On Prototype (Skia + Sapiens Normal Maps)

A React Native prototype exploring real-time tattoo placement and blending on
photos of a human body, using [Shopify React Native Skia](https://shopify.github.io/react-native-skia/)
for rendering and [Sapiens](https://huggingface.co/facebook/sapiens) (Hugging Face)
for body normal/depth maps.

This was extracted as a standalone exploration from a larger commercial
project — it focuses purely on the placement/blending mechanism, without any
product-specific code or assets.

## What it does

- Lets the user pinch/pan/rotate a tattoo sketch over a body photo
- Masks the tattoo to the body silhouette using a generated mask map
- Blends the tattoo onto skin using a custom SkSL shader, combining:
  - a **blend-if**-style luminance split (so the tattoo darkens light skin
    areas rather than sitting as a flat overlay)
  - **displacement** based on a body **normal map**, so the tattoo appears to
    follow the contours of the body rather than sitting on a flat plane

## How it works

- `src/shaders/blendIfWithDisplacement.ts` — custom Skia runtime effect (SkSL)
  that takes three inputs (body, sketch, normal map) and outputs the blended,
  displaced, masked tattoo layer
- `src/screens/EditorScreen.tsx` — gesture handling (pan/pinch/rotate via
  `react-native-gesture-handler` + `react-native-reanimated`) and Skia canvas
  composition (mask + shader + blend)
- `src/services/*ProviderService.ts` — load precomputed Sapiens depth/normal
  `.npy` outputs and convert them into PNGs usable by Skia (mask from depth,
  normal map visualization, etc.)

## Known limitations / prototype status

- This is an **earlier snapshot**, prior to memory-management fixes that were
  made in the production version — repeatedly mounting/unmounting the editor
  or swapping images may leak memory (Skia images/shaders aren't explicitly
  disposed here)
- The mask-from-depth heuristic is simplistic (treats all finite depth values
  as foreground) — works for the bundled sample data but isn't a real
  segmentation
- Screen dimensions are read once at module load (`Dimensions.get('window')`)
  and won't react to rotation/resizing
- The canvas includes a couple of **debug markers** (origin/translate points
  for the sketch) used during development — see comment in
  `EditorScreen.tsx`
- Depth/normal maps used here come from precomputed `.npy` files (Sapiens
  output for a sample image), not a live model — no on-device inference

## Stack

- React Native (Expo) + TypeScript
- `@shopify/react-native-skia` — canvas rendering, custom SkSL shaders
- `react-native-gesture-handler` + `react-native-reanimated` — gestures
- `npyjs` + `fast-png` — loading `.npy` arrays and encoding them as PNGs
- [Sapiens](https://huggingface.co/facebook/sapiens) (Hugging Face) — source
  of body normal/depth maps used as inputs

## Demo

A screen recording of the try-on mechanism running in the iOS simulator:
[link]
