import React from 'react';
import { getDepthPreviewMock } from '../services/depthProviderService';
import { getNormalPreviewMock } from '../services/normalProviderService';
import { getMaskPreviewMock } from '../services/maskProviderService';

export type MapKind = 'depth' | 'normal' | 'mask' | 'displacement';

export interface MapsCacheContextValue {
  // eslint-disable-next-line no-unused-vars
  getCachedMapUri: (bodyImageUri: string, kind: MapKind) => string | undefined;
  // eslint-disable-next-line no-unused-vars
  ensureMapUri: (bodyImageUri: string, kind: MapKind) => Promise<string>;
}

const MapsCacheContext = React.createContext<MapsCacheContextValue | undefined>(
  undefined
);

export function useMapsCache(): MapsCacheContextValue {
  const ctx = React.useContext(MapsCacheContext);
  if (!ctx)
    throw new Error('useMapsCache must be used within MapsCacheProvider');
  return ctx;
}

export function MapsCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = React.useState<Record<string, string>>({});

  const keyOf = React.useCallback(
    (uri: string, kind: MapKind) => `${uri}|${kind}`,
    []
  );

  const getCachedMapUri = React.useCallback(
    (bodyImageUri: string, kind: MapKind) => {
      return cache[keyOf(bodyImageUri, kind)];
    },
    [cache, keyOf]
  );
  const ensureMapUri = React.useCallback(
    async (bodyImageUri: string, kind: MapKind) => {
      const k = keyOf(bodyImageUri, kind);
      const existing = cache[k];
      if (existing) return existing;
      let uri: string;
      if (kind === 'depth') {
        const result = await getDepthPreviewMock();
        uri = result.depthPngDataUri;
      } else if (kind === 'normal') {
        const result = await getNormalPreviewMock();
        uri = result.normalPngDataUri;
      } else if (kind === 'mask') {
        const result = await getMaskPreviewMock();
        uri = result.maskPngDataUri;
      } else {
        throw new Error(`Unsupported map kind: ${kind}`);
      }
      setCache((prev) => ({ ...prev, [k]: uri }));
      return uri;
    },
    [cache, keyOf]
  );
  const value = React.useMemo<MapsCacheContextValue>(
    () => ({ getCachedMapUri, ensureMapUri }),
    [getCachedMapUri, ensureMapUri]
  );

  return (
    <MapsCacheContext.Provider value={value}>
      {children}
    </MapsCacheContext.Provider>
  );
}
