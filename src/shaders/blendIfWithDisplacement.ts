import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

let cachedEffect: SkRuntimeEffect | null = null;

export function getBlendIfWithDisplacementEffect(): SkRuntimeEffect {
  if (cachedEffect) return cachedEffect;
  const source = Skia.RuntimeEffect.Make(`
uniform shader body;    // undistorted underlying image
uniform shader sketch;  // tattoo image (will be sampled with displacement)
uniform shader normal;  // normal/displacement map in screen space

uniform float edge0; // low edge for light-side split [0..1]
uniform float edge1; // high edge for light-side split [0..1]
uniform float displacementScale; // pixel scale for displacement

// --- Utilities ---
vec3 toLinear(vec3 srgb) { return pow(srgb, vec3(2.2)); }
float lumaFromLinear(vec3 rgbLinear) { return dot(rgbLinear, vec3(0.299, 0.587, 0.114)); }

// --- Displacement step (uses global 'normal' child) ---
vec2 displacedPos(vec2 p, float scale) {
  if (scale <= 0.0) return p;
  vec4 n = normal.eval(p);
  // Center channels to [-0.5..0.5] and scale in pixels
  return p + (n.rg - vec2(0.5)) * scale;
}

// --- BlendIf (light side smooth split) ---
float computeBlendIfAlpha(float lum, float e0, float e1) {
  float low = min(e0, e1);
  float high = max(e0, e1);
  float denom = max(high - low, 1e-5);
  return clamp((high - lum) / denom, 0.0, 1.0);
}

vec4 main(vec2 xy) {
  // Luminance from undistorted body
  vec4 b = body.eval(xy);
  float lum = lumaFromLinear(toLinear(b.rgb));

  // Compute displaced coordinates for the sketch only
  vec2 displaced = displacedPos(xy, displacementScale);

  // Sample sketch at displaced coordinates
  vec4 s = sketch.eval(displaced);

  // Linear ramp (smooth split) on the light side
  float a = computeBlendIfAlpha(lum, edge0, edge1);

  // Premultiplied output so masking affects bright colors
  return vec4(s.rgb * a, s.a * a);
}
  `);
  if (!source)
    throw new Error('Failed to compile blendIfWithDisplacement shader');
  cachedEffect = source;
  return source;
}
