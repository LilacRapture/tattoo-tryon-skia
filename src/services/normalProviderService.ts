import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import Npyjs from 'npyjs';
import { encode } from 'fast-png';
import { fromByteArray, toByteArray } from 'base64-js';

export interface NormalProviderResult {
  normalPngDataUri: string;
}

// Cache for downloaded assets to prevent re-downloading
const assetCache = new Map<number, ArrayBuffer>();

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = toByteArray(base64);
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
  // Ensure we return a plain ArrayBuffer (not SharedArrayBuffer)
  return ab instanceof ArrayBuffer
    ? ab
    : (new Uint8Array(ab as ArrayBufferLike).buffer as ArrayBuffer);
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

function rgbaFromNormalArray(
  normalsArr: Float32Array | Float64Array,
  shape: number[]
): Uint8Array {
  // Supports shapes: [H, W, 3] or [3, H, W]
  let height = 0;
  let width = 0;
  let hwc = false;
  if (shape.length === 3 && shape[2] === 3) {
    height = shape[0];
    width = shape[1];
    hwc = true;
  } else if (shape.length === 3 && shape[0] === 3) {
    height = shape[1];
    width = shape[2];
    hwc = false;
  } else {
    throw new Error(`Unsupported normal array shape: ${JSON.stringify(shape)}`);
  }

  // Detect range: if values already in [0,1], use that; otherwise assume [-1,1]
  let min = Infinity;
  let max = -Infinity;
  const total = normalsArr.length;

  for (let i = 0; i < total; i++) {
    const v = normalsArr[i];
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const isZeroOne = min >= 0 && max <= 1.00001;

  const rgba = new Uint8Array(width * height * 4);
  const hw = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let nx: number, ny: number, nz: number;
      if (hwc) {
        const base = i * 3;
        nx = normalsArr[base + 0];
        ny = normalsArr[base + 1];
        nz = normalsArr[base + 2];
      } else {
        nx = normalsArr[0 * hw + i];
        ny = normalsArr[1 * hw + i];
        nz = normalsArr[2 * hw + i];
      }

      const j = i * 4;
      if (
        !Number.isFinite(nx) ||
        !Number.isFinite(ny) ||
        !Number.isFinite(nz)
      ) {
        rgba[j + 0] = 0;
        rgba[j + 1] = 0;
        rgba[j + 2] = 0;
        rgba[j + 3] = 255;
        continue;
      }

      // Map to 0..255
      const map = (v: number) => {
        const vv = isZeroOne ? v : v * 0.5 + 0.5;
        return Math.max(0, Math.min(255, Math.round(vv * 255)));
      };
      rgba[j + 0] = map(nx);
      rgba[j + 1] = map(ny);
      rgba[j + 2] = map(nz);
      rgba[j + 3] = 255;
    }
  }
  return rgba;
}

async function npyNormalToPngDataUri(npyBytes: ArrayBuffer): Promise<string> {
  const npy = new Npyjs();
  const parsed = await npy.parse(npyBytes);
  const { data, shape } = parsed as {
    data: Float32Array | Float64Array;
    shape: number[];
  };
  const rgba = rgbaFromNormalArray(data as Float32Array, shape);

  // derive width/height from shape
  const width = shape.length === 3 && shape[2] === 3 ? shape[1] : shape[2];
  const height = shape.length === 3 && shape[2] === 3 ? shape[0] : shape[1];

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

export async function getNormalPreviewMock(): Promise<NormalProviderResult> {
  // Load normals directly from precomputed normals npy
  const npyBytes = await loadNpyAssetBytes(
    require('../../assets/sapiens_responses/sapiens_normal.npy')
  );
  const normalPngDataUri = await npyNormalToPngDataUri(npyBytes);
  return { normalPngDataUri };
}
