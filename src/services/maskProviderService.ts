import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import Npyjs from 'npyjs';
import { encode } from 'fast-png';
import { fromByteArray, toByteArray } from 'base64-js';

export interface MaskProviderResult {
  maskPngDataUri: string;
}

// Cache for downloaded assets to prevent re-downloading
const assetCache = new Map<number, ArrayBuffer>();

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = toByteArray(base64);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  return buffer;
}

async function loadNpyAssetBytes(assetModule: number): Promise<ArrayBuffer> {
  // Check cache first
  if (assetCache.has(assetModule)) {
    return assetCache.get(assetModule)!;
  }

  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();

  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('Failed to resolve .npy asset URI');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  // Cache the result
  assetCache.set(assetModule, arrayBuffer);

  return arrayBuffer;
}

function buildMaskRgba(
  isValid: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < isValid.length; i++) {
    const j = i * 4;
    if (isValid[i]) {
      // Foreground/body: white
      rgba[j + 0] = 255;
      rgba[j + 1] = 255;
      rgba[j + 2] = 255;
      rgba[j + 3] = 255;
    } else {
      // Background: black
      rgba[j + 0] = 0;
      rgba[j + 1] = 0;
      rgba[j + 2] = 0;
      rgba[j + 3] = 255;
    }
  }
  return rgba;
}

async function npyDepthToMaskPngDataUri(
  npyBytes: ArrayBuffer
): Promise<string> {
  const npy = new Npyjs();
  const parsed = await npy.parse(npyBytes);
  const { data, shape } = parsed as {
    data: Float32Array | Float64Array | Uint8Array;
    shape: number[];
  };

  let height = 0;
  let width = 0;
  if (shape.length === 2) {
    height = shape[0];
    width = shape[1];
  } else if (shape.length === 3) {
    height = shape[1];
    width = shape[2];
  } else {
    throw new Error(
      `Unsupported depth array shape for mask: ${JSON.stringify(shape)}`
    );
  }

  const length = width * height;
  const isValid = new Uint8Array(length);
  const arr = data as Float32Array | Float64Array | Uint8Array;

  for (let i = 0; i < length; i++) {
    const v = Number(arr[i]);
    isValid[i] = Number.isFinite(v) ? 1 : 0;
  }

  const rgba = buildMaskRgba(isValid, width, height);

  const pngBytes = encode(
    { width, height, data: rgba },
    {
      zlib: {
        level: 1, // Fastest compression level
        strategy: 0,
      },
    }
  );

  const base64 = fromByteArray(pngBytes);
  return `data:image/png;base64,${base64}`;
}

export async function getMaskPreviewMock(): Promise<MaskProviderResult> {
  const npyBytes = await loadNpyAssetBytes(
    require('../../assets/sapiens_responses/sapiens_depth.npy')
  );
  const maskPngDataUri = await npyDepthToMaskPngDataUri(npyBytes);
  return { maskPngDataUri };
}
