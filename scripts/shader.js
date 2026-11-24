import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fluidShader = `
  precision highp float;
  uniform float uSoftReset;
  uniform float iTime;
  uniform vec2 iResolution;
  uniform vec4 iMouse;
  uniform int iFrame;
  uniform sampler2D iPreviousFrame;
  uniform float uBrushSize;
  uniform float uBrushStrength;
  uniform float uFluidDecay;
  uniform float uTrailLength;
  uniform float uStopDecay;
  uniform float uFlowSpeed;
  varying vec2 vUv;
  vec2 ur, U;
  float ln(vec2 p, vec2 a, vec2 b) {
    return length(p - a - (b - a) * clamp(dot(p - a, b - a) / dot(b - a, b - a), 0.0, 1.0));
  }
  vec4 t(vec2 v, int a, int b) {
    return texture2D(iPreviousFrame, fract((v + vec2(float(a), float(b))) / ur));
  }
  vec4 t(vec2 v) {
    return texture2D(iPreviousFrame, fract(v / ur));
  }
  float area(vec2 a, vec2 b, vec2 c) {
    float A = length(b - c), B = length(c - a), C = length(a - b), s = 0.5 * (A + B + C);
    return sqrt(max(0.0, s * (s - A) * (s - B) * (s - C)));
  }
  void main() {
    U = vUv * iResolution;
    ur = iResolution.xy;
    if (iFrame < 1) {
      float w = 0.5 + sin(0.2 * U.x) * 0.5;
      float q = length(U - 0.5 * ur);
      gl_FragColor = vec4(0.1 * exp(-0.001 * q * q), 0.0, 0.0, w);
    } else {
      vec2 v = U, A = v + vec2(1,1), B = v + vec2(1,-1), C = v + vec2(-1,1), D = v + vec2(-1,-1);
      for (int i = 0; i < 8; i++) {
        v -= uFlowSpeed * t(v).xy;
        A -= uFlowSpeed * t(A).xy;
        B -= uFlowSpeed * t(B).xy;
        C -= uFlowSpeed * t(C).xy;
        D -= uFlowSpeed * t(D).xy;
      }
      vec4 me = t(v);
      vec4 n = t(v, 0, 1), e = t(v, 1, 0), s = t(v, 0, -1), wv = t(v, -1, 0);
      vec4 ne = 0.25 * (n + e + s + wv);
      me = mix(t(v), ne, vec4(0.15, 0.15, 0.95, 0.0));
      me.z -= uFlowSpeed * 0.01 * ((area(A, B, C) + area(B, C, D)) - 4.0);
      vec4 pr = vec4(e.z, wv.z, n.z, s.z);
      me.xy = me.xy + (100.0 * uFlowSpeed) * vec2(pr.x - pr.y, pr.z - pr.w) / ur;
      float decay = pow(uFluidDecay, uFlowSpeed);
      me.xy *= decay;
      me.z  *= uTrailLength;
      if (iMouse.z > 0.0) {
        vec2 mousePos = iMouse.xy;
        vec2 mousePrev = iMouse.zw;
        float q = ln(U, mousePos, mousePrev);
        vec2 m = mousePos - mousePrev;
        float l = length(m);
        if (l > 0.0) m = min(l, 10.0) * m / l;
        float brushSizeFactor = 1e-4 / uBrushSize;
        float strengthFactor = 0.03 * uBrushStrength;
        float falloff = pow(exp(-brushSizeFactor * q * q * q), 0.5);
        me.xyw += (strengthFactor * uFlowSpeed) * falloff * vec3(m, 10.0);
        if (length(mousePos - mousePrev) < 2.0) {
          float influence = exp(-length(U - mousePos) * 0.01);
          float cursorDecay = mix(1.0, uStopDecay, influence);
          me.xy *= cursorDecay;
          me.z  *= cursorDecay;
        }
      }
      me = mix(me, vec4(0.0), uSoftReset);
      gl_FragColor = clamp(me, -0.4, 0.4);
    }
  }
`;

const displayShader = `
  precision highp float;
  precision highp int;
  uniform float iTime;
  uniform vec2 iResolution;
  uniform sampler2D iFluid;
  uniform float uDistortionAmount;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform float uColorIntensity;
  uniform float uSoftness;
  uniform float uIdleSpeed;
  varying vec2 vUv;

  mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec2 fragCoord = vUv * iResolution;
    vec4 fluid = texture2D(iFluid, vUv);
    vec2 fluidVel = fluid.xy;
    float fluidRipple = fluid.z;

    float mr = min(iResolution.x, iResolution.y);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;
    uv += fluidVel * (0.5 * uDistortionAmount);

    float t = iTime * uIdleSpeed;
    float soft = clamp(uSoftness * 0.1, 0.0, 0.85);

    // Elongate and tilt slightly so patterns read as rolling ocean swells
    vec2 q = rot(-0.22) * uv;
    q = vec2(q.x * 0.78, q.y * 1.45);

    float swell = 0.0;
    float caustic = 0.0;
    float amp = 1.0;
    float freq = 1.5;

    // Layered directional waves with soft domain warping
    for (float i = 0.0; i < 6.0; ++i) {
      float spread = sin(i * 1.7) * 0.45;
      vec2 dir = vec2(sin(spread), cos(spread));
      vec2 perp = vec2(-dir.y, dir.x);

      float phase = dot(q, dir) * freq - t * (0.55 + i * 0.12)
                  + sin(dot(q, perp) * freq * 0.45 + t * 0.25 + i) * 0.85;
      float w = sin(phase);

      // Curl coordinates gently with each octave for liquid motion
      q += dir * (w * 0.11 * amp) + perp * (cos(phase) * 0.16 * amp);

      swell += (w * 0.5 + 0.5) * amp;

      // Ridged intersections produce soft caustic webbing
      float ridge = 1.0 - abs(w);
      float r2 = ridge * ridge;
      caustic += (r2 * r2) * amp;

      freq *= 1.42;
      amp *= 0.62;
    }

    swell /= 2.48;
    caustic /= 2.48;

    // Slow deep-water undercurrent for broad tonal depth
    float undercurrent = sin(q.x * 0.85 - t * 0.2 + swell * 2.4) * 0.5 + 0.5;

    float mixer1 = mix(smoothstep(0.15, 0.85, swell), 0.5, soft);
    float mixer2 = mix(smoothstep(0.20, 0.90, undercurrent * 0.65 + swell * 0.35), 0.5, soft);

    // Caustic highlights + subtle wake shimmer when mouse disturbs the surface
    float wake = clamp(abs(fluidRipple) * 2.5 + length(fluidVel) * 1.2, 0.0, 1.0) * uDistortionAmount;
    float shimmer = smoothstep(0.22, 0.72, caustic) * (1.0 - soft * 0.6) + wake * 0.4;
    shimmer = clamp(shimmer, 0.0, 1.0);

    // Color mapping: deep abyss -> mid swell -> pelagic shadow -> caustic crest
    vec3 col = mix(uColor1, uColor2, mixer1);
    col = mix(col, uColor3, mixer2 * 0.75);
    col = mix(col, uColor4, shimmer * 0.48);

    // Subtle specular sheen along brightest wave peaks
    col += uColor4 * (shimmer * shimmer * shimmer) * 0.24;

    gl_FragColor = vec4(col * uColorIntensity, 1.0);
  }
`;

const asNumber = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const asBoolean = (v, d = false) => { if (v == null) return d; const s = String(v).toLowerCase().trim(); return s === '1' || s === 'true' || s === 'yes' || s === 'on'; };
const asColorLinear = (hexOrCss, fallbackHex = '#ffffff') => {
  let c; try { c = new THREE.Color(hexOrCss || fallbackHex); } catch { c = new THREE.Color(fallbackHex); }
  c.convertSRGBToLinear(); return [c.r, c.g, c.b];
};

const componentEl = document.querySelector('[fc-fluid-gradient="component"]') || document.body;
const attr = (name) => componentEl.getAttribute(name);
const config = {
  brushSize: asNumber(attr('fc-fluid-gradient-brush-size'), 15.0),
  brushStrength: asNumber(attr('fc-fluid-gradient-brush-strength'), 0.5),
  distortionAmount: asNumber(attr('fc-fluid-gradient-distortion-amount'), 0.3),
  fluidDecay: asNumber(attr('fc-fluid-gradient-fluid-decay'), 0.98),
  trailLength: asNumber(attr('fc-fluid-gradient-trail-length'), 0.5),
  stopDecay: asNumber(attr('fc-fluid-gradient-stop-decay'), 0.85),
  color1: attr('fc-fluid-gradient-color-1') || '#010814',
  color2: attr('fc-fluid-gradient-color-2') || '#0b4f6c',
  color3: attr('fc-fluid-gradient-color-3') || '#021b2b',
  color4: attr('fc-fluid-gradient-color-4') || '#7de2e6',
  colorIntensity: asNumber(attr('fc-fluid-gradient-color-intensity'), 0.5),
  softness: asNumber(attr('fc-fluid-gradient-softness'), 1.0),
  dprMax: asNumber(attr('fc-fluid-gradient-dpr-max'), 1.0),
  flowSpeed: asNumber(attr('fc-fluid-gradient-flow-speed'), 0),
  idleSpeed: asNumber(attr('fc-fluid-gradient-idle-speed'), 0.9),
};
const hoverEnabled = asBoolean(attr('fc-fluid-gradient-hover'), true);
const gradientCanvas = componentEl;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.dprMax));
renderer.domElement.setAttribute('aria-hidden', 'true');
gradientCanvas.appendChild(renderer.domElement);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function getCanvasSize() { const r = gradientCanvas.getBoundingClientRect(); return { width: Math.max(1, r.width), height: Math.max(1, r.height) }; }
const rtOptions = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
const fluidTarget1 = new THREE.WebGLRenderTarget(1, 1, rtOptions);
const fluidTarget2 = fluidTarget1.clone();
let currentFluidTarget = fluidTarget1, previousFluidTarget = fluidTarget2;
const fluidMaterial = new THREE.ShaderMaterial({
  uniforms: {
    iTime: { value: 0 }, iResolution: { value: new THREE.Vector2(1, 1) },
    iMouse: { value: new THREE.Vector4(0, 0, 0, 0) }, iFrame: { value: 0 },
    iPreviousFrame: { value: null }, uBrushSize: { value: config.brushSize },
    uBrushStrength: { value: config.brushStrength }, uFluidDecay: { value: config.fluidDecay },
    uTrailLength: { value: config.trailLength }, uStopDecay: { value: config.stopDecay },
    uSoftReset: { value: 0.0 }, uFlowSpeed: { value: config.flowSpeed },
  },
  vertexShader, fragmentShader: fluidShader,
});
const displayMaterial = new THREE.ShaderMaterial({
  uniforms: {
    iTime: { value: 0 }, iResolution: { value: new THREE.Vector2(1, 1) },
    iFluid: { value: null }, uDistortionAmount: { value: config.distortionAmount },
    uColor1: { value: new THREE.Vector3(...asColorLinear(config.color1)) },
    uColor2: { value: new THREE.Vector3(...asColorLinear(config.color2)) },
    uColor3: { value: new THREE.Vector3(...asColorLinear(config.color3)) },
    uColor4: { value: new THREE.Vector3(...asColorLinear(config.color4)) },
    uColorIntensity: { value: config.colorIntensity }, uSoftness: { value: config.softness },
    uIdleSpeed: { value: config.idleSpeed },
  },
  vertexShader, fragmentShader: displayShader,
});
function setRendererSize() {
  const { width, height } = getCanvasSize();
  renderer.setSize(width, height);
  fluidMaterial.uniforms.iResolution.value.set(width, height);
  displayMaterial.uniforms.iResolution.value.set(width, height);
  fluidTarget1.setSize(width, height);
  fluidTarget2.setSize(width, height);
}
setRendererSize();
const geometry = new THREE.PlaneGeometry(2, 2);
const fluidPlane = new THREE.Mesh(geometry, fluidMaterial);
const displayPlane = new THREE.Mesh(geometry, displayMaterial);
let mouseX = 0, mouseY = 0, lastMoveTime = 0;
if (hoverEnabled) {
  gradientCanvas.addEventListener('pointermove', (e) => {
    const r = gradientCanvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = r.height - (e.clientY - r.top);
    fluidMaterial.uniforms.iMouse.value.set(x, y, mouseX, mouseY);
    mouseX = x; mouseY = y; lastMoveTime = performance.now();
  });
}
let frameCount = 0;
function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() * 0.001;
  fluidMaterial.uniforms.iTime.value = displayMaterial.uniforms.iTime.value = time;
  fluidMaterial.uniforms.iFrame.value = frameCount;
  if (performance.now() - lastMoveTime > 120) fluidMaterial.uniforms.iMouse.value.set(0, 0, 0, 0);
  fluidMaterial.uniforms.iPreviousFrame.value = previousFluidTarget.texture;
  renderer.setRenderTarget(currentFluidTarget);
  renderer.render(fluidPlane, camera);
  displayMaterial.uniforms.iFluid.value = currentFluidTarget.texture;
  renderer.setRenderTarget(null);
  renderer.render(displayPlane, camera);
  [currentFluidTarget, previousFluidTarget] = [previousFluidTarget, currentFluidTarget];
  frameCount++;
}
window.addEventListener('resize', setRendererSize);

// Apply any theme colors queued before the shader loaded (e.g. from stream page art extraction)
if (window.__pendingShaderColors) {
  var pc = window.__pendingShaderColors;
  ['uColor1','uColor2','uColor3','uColor4'].forEach(function(u,i){ if(pc[i]) displayMaterial.uniforms[u].value.set(...asColorLinear(pc[i])); });
  window.__pendingShaderColors = null;
}
// Live color update hook for stream page theming
window.__setShaderColors = function(c1,c2,c3,c4){
  [c1,c2,c3,c4].forEach(function(c,i){ if(c) displayMaterial.uniforms['uColor'+(i+1)].value.set(...asColorLinear(c)); });
};

animate();