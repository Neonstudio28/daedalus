// Refractive glass-band renderer. The shader models a field of microscopic glass flutes
// and samples a compact weight texture for hue, lift and displacement.
const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
	vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`;
const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uWaveTime;
uniform float uHueTime;
uniform float uDrift;
uniform float uWave;
uniform float uWaveScale;
uniform float uHue;
uniform float uHueOffset;
uniform vec3 uRows;
uniform vec4 uWindow;
uniform vec2 uRise;
uniform float uTilt;
uniform float uSwell;
uniform float uFlare;
uniform float uHold;
uniform float uStripScale;
uniform float uFlute;
uniform sampler2D uWeights;

const vec2 ACROSS = vec2(0.9659258, 0.2588190);
const vec2 ALONG = vec2(-0.2588190, 0.9659258);
const vec2 ORIGIN = vec2(-20.866455, -632.0);
const vec2 FRAME = vec2(1440.0, 1024.0);
const float PITCH = 63.0;
const float MARGIN = 128.0;
const vec2 TEX = vec2(424.0, 642.0);
const float ROWS = 320.0;
const float GROUND = 0.9188235;
const vec3 ORANGE_LIGHT = vec3(1.0, 0.6976, 0.2112);
const vec3 ORANGE = vec3(1.0, 0.2118, 0.0863);
const vec3 BLUE = vec3(0.0, 0.1667, 1.0);

// Rotates a colour around the grey axis, shifting its hue by angle radians.
vec3 hue(vec3 c, float angle) {
	const vec3 k = vec3(0.57735);
	float co = cos(angle);
	return clamp(
		c * co + cross(k, c) * sin(angle) + k * dot(k, c) * (1.0 - co),
		0.0,
		1.0
	);
}

// Top edges (frame y) of the orange, blue and white rows, as quartics in
// x / 1440, fitted to the Figma shapes. Below ROWS_BASE nothing changes.
const vec3 ROW_C0 = vec3(1004.601, 1178.19, 1291.21);
const vec3 ROW_C1 = vec3(-788.121, -971.789, -1031.385);
const vec3 ROW_C2 = vec3(1462.781, 1637.102, 1326.045);
const vec3 ROW_C3 = vec3(-1464.748, -1439.505, -1016.889);
const vec3 ROW_C4 = vec3(364.895, 372.794, 353.727);
const float ROWS_BASE = 1400.0;

// Stretches the backdrop vertically so each colour row is uRows times its
// own height. Rows stay stacked and the image above them shifts with them.
float rowSource(vec2 q) {
	// Held at the frame's sides: past them the fitted curve runs away, and
	// a panel wider than the frame (the home hero) samples there.
	float t = clamp(q.x / FRAME.x, 0.0, 1.0);
	vec3 e = ROW_C0 + t * (ROW_C1 + t * (ROW_C2 + t * (ROW_C3 + t * ROW_C4)));
	e.z = min(e.z, ROWS_BASE - 1.0);
	e.y = min(e.y, e.z - 1.0);
	e.x = min(e.x, e.y - 1.0);
	// The flare widens every colour row towards the frame's right side.
	vec3 rows = uRows * (1.0 + uFlare * smoothstep(0.45, 1.0, t));
	float d2 = ROWS_BASE - (ROWS_BASE - e.z) * rows.z;
	float d1 = d2 - (e.z - e.y) * rows.y;
	float d0 = d1 - (e.y - e.x) * rows.x;
	if (q.y >= ROWS_BASE) return q.y;
	if (q.y >= d2) return e.z + (q.y - d2) / rows.z;
	if (q.y >= d1) return e.y + (q.y - d1) / rows.y;
	if (q.y >= d0) return e.x + (q.y - d0) / rows.x;
	return e.x - (d0 - q.y);
}

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
	vec2 visible = uWindow.zw;
	vec2 f = uWindow.xy + vUv * visible;

	vec2 drift = vec2(sin(uTime * 0.07), cos(uTime * 0.05) * 0.57) * uDrift;
	// A slow, gentle wave through the colour behind the glass.
	vec2 w = f * uWaveScale;
	drift += vec2(
		sin(w.y * 0.0042 + uWaveTime * 0.8) + 0.6 * sin(w.x * 0.0031 - uWaveTime * 0.6),
		sin(w.x * 0.0037 + uWaveTime * 0.7) + 0.6 * sin(w.y * 0.0029 + uWaveTime * 0.5)
	) * uWave;
	// Hue drifts a few degrees either way, a little differently across the frame.
	float shift = uHueOffset + uHue * sin(uHueTime * 0.35 + f.x * 0.0012 - f.y * 0.0008);
	vec3 orangeLight = hue(ORANGE_LIGHT, shift);
	vec3 orange = hue(ORANGE, shift);
	vec3 blue = hue(BLUE, shift);
	// Four taps across each pixel keep the sub-pixel edge highlight continuous.
	float footprint = visible.y / uRes.y;
	vec3 color = vec3(0.0);
	for (int i = 0; i < 4; i++) {
		vec2 g = f + ACROSS * (float(i) - 1.5) * 0.25 * footprint;
		float across = mod(dot(g * uStripScale - ORIGIN, ACROSS), PITCH);
		float bin = across * 4.0 / TEX.x;
		vec4 profile = texture2D(uWeights, vec2(bin, (2.0 * ROWS + 0.5) / TEX.y));
		float lift = texture2D(uWeights, vec2(bin, (2.0 * ROWS + 1.5) / TEX.y)).r;
		vec2 offset = (profile.rg - 0.5) * 128.0 * uFlute;
		vec2 q = g + ACROSS * offset.x + ALONG * offset.y + drift - uRise;
		// The tilt lifts the colour on the right, uTilt frame units at the
		// frame's right edge and nothing at its left.
		q.y += uTilt * clamp(q.x / FRAME.x, 0.0, 1.0);
		// The swell rolls the colour up and down across the frame, about one
		// and a third waves wide. It sways a little either way rather than
		// travelling, so its crests keep their places most of the time.
		q.y += uSwell * sin(q.x * 0.0057 + 0.45 * sin(uWaveTime * 0.25));
		q.y = rowSource(q);
		// A panel (the home hero) holds the colour from just inside the
		// frame's right side across everything past it, where the frame's
		// own edge would turn white and hide the strips.
		q.x = mix(q.x, min(q.x, FRAME.x - 160.0), uHold);
		vec2 t = (q + MARGIN) / 4.0 / TEX;
		t.y = clamp(t.y, 0.5 / TEX.y, (ROWS - 0.5) / TEX.y);
		vec3 abc = texture2D(uWeights, t).rgb;
		float white = texture2D(uWeights, t + vec2(0.0, ROWS / TEX.y)).r;
		float ground = max(0.0, 1.0 - abc.r - abc.g - abc.b - white);
		vec3 backdrop = GROUND * ground + white + orangeLight * abc.r + orange * abc.g + blue * abc.b;
		color += mix(backdrop, profile.b * backdrop + lift, uFlute) * 0.25;
	}

	color += (hash(floor(vUv * uRes)) - 0.5) / 255.0;
	gl_FragColor = vec4(color, 1.0);
}
`;

const FRAME_W = 1440;
const FRAME_H = 1024;
const RISE_MS = 2200;
const RISE_DIST = 640;
const RISE_X = -0.258819;
const RISE_Y = 0.9659258;
const PITCH = 63;
const MOTION = {
  speed: 1.6,
  drift: 18,
  wave: 20,
  waveScale: 1,
  waveSpeed: 1,
  hue: 9,
  hueSpeed: 0.95,
  hueOffset: 0,
  orange: 1,
  blue: 1,
  white: 1
};

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function loadTexture(gl, unit, url, format, ready, failed) {
  const texture = gl.createTexture();
  const image = new Image();
  image.onload = () => {
    if (failed()) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready();
  };
  image.onerror = () => {};
  image.src = url;
}

function viewportFor(canvas, view) {
  const rect = canvas.getBoundingClientRect();
  if (view === 'panel') {
    const span = Number(canvas.dataset.span || 1);
    const scale = FRAME_W / (rect.width * span);
    return [0, 0, rect.width * scale, rect.height * scale];
  }
  if (view === 'page') {
    const margin = 12;
    const width = window.innerWidth - margin * 2;
    const height = window.innerHeight - margin * 2;
    const scale = Math.max(FRAME_W / width, FRAME_H / height);
    const x = (FRAME_W - width * scale) / 2;
    const y = (FRAME_H - height * scale) * 0.75;
    return [x + (rect.left - margin) * scale, y + (rect.top - margin) * scale, rect.width * scale, rect.height * scale];
  }
  const aspect = rect.width / Math.max(1, rect.height);
  const [x, y, w] = view.split(',').map(Number);
  return [x - w / 2, y - w / aspect / 2, w, w / aspect];
}

export function createGlass(canvas, textureUrl = '/img/glass-weights.png') {
  let destroyed = false;
  const make = () => {
    const gl = canvas.getContext('webgl', { antialias: false });
    const program = gl && gl.createProgram();
    if (!gl || !program) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return undefined;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program));
      return undefined;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uniform = name => gl.getUniformLocation(program, name);
    gl.uniform1i(uniform('uWeights'), 0);

    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = reducedQuery.matches;
    let offscreen = false;
    let frame = 0;
    let loaded = false;
    let riseStart;
    let last = performance.now();
    let time = 0;
    let waveTime = 0;
    let hueTime = 0;

    const draw = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced && !offscreen) frame = requestAnimationFrame(draw);
      if (!reduced) {
        time += dt * MOTION.speed;
        waveTime += dt * MOTION.speed * MOTION.waveSpeed;
        hueTime += dt * MOTION.speed * MOTION.hueSpeed;
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniform('uRes'), width, height);
      gl.uniform1f(uniform('uTime'), time);
      gl.uniform1f(uniform('uWaveTime'), waveTime);
      gl.uniform1f(uniform('uHueTime'), hueTime);
      gl.uniform1f(uniform('uDrift'), MOTION.drift);
      gl.uniform1f(uniform('uWave'), MOTION.wave);
      gl.uniform1f(uniform('uWaveScale'), MOTION.waveScale);
      gl.uniform1f(uniform('uHue'), MOTION.hue * Math.PI / 180);
      gl.uniform1f(uniform('uHueOffset'), MOTION.hueOffset * Math.PI / 180);
      gl.uniform1f(uniform('uFlute'), Number(canvas.dataset.flute ?? 1));

      const view = viewportFor(canvas, canvas.dataset.view || 'panel');
      gl.uniform4f(uniform('uWindow'), ...view);
      gl.uniform3f(uniform('uRows'), MOTION.orange, MOTION.blue, MOTION.white);

      let rise = 0;
      if (canvas.dataset.rise !== undefined && !reduced) {
        riseStart ??= now;
        rise = RISE_DIST * (1 - Math.min(1, (now - riseStart) / RISE_MS)) ** 3;
      }
      gl.uniform2f(uniform('uRise'), RISE_X * rise, RISE_Y * rise);
      gl.uniform1f(uniform('uTilt'), Number(canvas.dataset.tilt || 0));
      gl.uniform1f(uniform('uSwell'), Number(canvas.dataset.swell || 0));
      gl.uniform1f(uniform('uFlare'), Number(canvas.dataset.flare || 0));
      gl.uniform1f(uniform('uHold'), canvas.dataset.view === 'panel' ? 1 : 0);

      const strip = Number(canvas.dataset.strip || 0);
      const scale = view[2] / Math.max(1, canvas.clientWidth);
      gl.uniform1f(uniform('uStripScale'), strip > 0 ? PITCH / (strip * scale) : 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.toggleAttribute('data-drawn', true);
    };

    const queue = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const resizeObserver = new ResizeObserver(queue);
    const visibilityObserver = new IntersectionObserver(entries => {
      offscreen = !entries[0]?.isIntersecting;
      if (offscreen) cancelAnimationFrame(frame);
      else if (loaded) {
        last = performance.now();
        queue();
      }
    });
    const motionChange = () => {
      reduced = reducedQuery.matches;
      if (loaded) queue();
    };

    loadTexture(gl, 0, textureUrl, gl.RGB, () => {
      if (destroyed) return;
      loaded = true;
      last = performance.now();
      queue();
      resizeObserver.observe(canvas);
      visibilityObserver.observe(canvas);
      window.addEventListener('resize', queue);
    }, () => destroyed);
    reducedQuery.addEventListener('change', motionChange);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('resize', queue);
      reducedQuery.removeEventListener('change', motionChange);
    };
  };

  let teardown = make();
  return () => {
    destroyed = true;
    teardown?.();
  };
}

export function mountGlass(selector = 'canvas[data-glass]') {
  const cleanups = [...document.querySelectorAll(selector)].map(canvas => createGlass(canvas));
  return () => cleanups.forEach(cleanup => cleanup?.());
}
