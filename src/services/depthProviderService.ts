import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import Npyjs from 'npyjs';
import { encode } from 'fast-png';
import { fromByteArray, toByteArray } from 'base64-js';

export interface DepthProviderResult {
  // PNG image as data URI (data:image/png;base64,...) suitable for <Image source={{ uri }} />
  depthPngDataUri: string;
}

const assetCache = new Map<number, ArrayBuffer>();

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = toByteArray(base64);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function normalizeToGrayscaleBytes(
  values: Float32Array | Float64Array | Uint8Array | Int16Array | Int32Array,
  width: number,
  height: number
): Uint8Array {
  const length = width * height;
  const grayscale = new Uint8Array(length);

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < length; i++) {
    const v = Number(values[i]);
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min || 1;

  for (let i = 0; i < length; i++) {
    const v = Number(values[i]);
    const norm = (v - min) / range; // 0..1
    grayscale[i] = Math.max(0, Math.min(255, Math.round(norm * 255)));
  }

  return grayscale;
}

function grayscaleToRgba(
  grayscale: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < grayscale.length; i++) {
    const g = grayscale[i];
    const j = i * 4;
    rgba[j + 0] = g;
    rgba[j + 1] = g;
    rgba[j + 2] = g;
    rgba[j + 3] = 255;
  }

  return rgba;
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

// Type for NPY parsed data
interface NpyParsedData {
  data: Float32Array | Float64Array | Uint8Array | Int16Array | Int32Array;
  shape: number[];
}

async function npyDepthToPngDataUri(npyBytes: ArrayBuffer): Promise<string> {
  const npy = new Npyjs();
  const parsed = await npy.parse(npyBytes);
  const { data, shape } = parsed as NpyParsedData;

  // Expecting shape [height, width] or [1, height, width]
  let height = 0;
  let width = 0;
  if (shape.length === 2) {
    height = shape[0];
    width = shape[1];
  } else if (shape.length === 3) {
    height = shape[1];
    width = shape[2];
  } else {
    throw new Error(`Unsupported depth array shape: ${JSON.stringify(shape)}`);
  }

  const grayscale = normalizeToGrayscaleBytes(
    data as Float32Array,
    width,
    height
  );
  const rgba = grayscaleToRgba(grayscale, width, height);

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

export async function getDepthPreviewMock(): Promise<DepthProviderResult> {
  const npyBytes = await loadNpyAssetBytes(
    require('../../assets/sapiens_responses/sapiens_depth.npy')
  );
  const depthPngDataUri = await npyDepthToPngDataUri(npyBytes);
  return { depthPngDataUri };
}
