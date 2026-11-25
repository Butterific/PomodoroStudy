(function (global) {
    'use strict';

    let instance = null;
    let sharedAudioContext = null;
    const elementSources = new WeakMap();

    function spawnVisualizer(options = {}) {
        if (instance) {
            instance.show();
            return instance;
        }

        const root = document.createElement('div');
        root.className = 'combat-audio-visualizer';
        root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;width:100vw;height:100vh;overflow:hidden;background:transparent;pointer-events:none';

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
        root.appendChild(canvas);

        (document.body || document.documentElement).appendChild(root);

        const ctx = canvas.getContext('2d');
        const bufferLength = 128;
        const dataArray = new Uint8Array(bufferLength);
        let analyser = null;
        let activeSource = null;
        let activeStream = null;
        let hookedElement = null;
        let animationFrame = null;
        let colorSampleTimer = null;
        let lastFrameTime = performance.now();

        // Offscreen 1x1 canvas for sampling same-origin images/videos/canvases
        let sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 1;
        sampleCanvas.height = 1;
        let sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

        // Dynamic page color state (smoothly fades currentColor -> targetColor)
        const initialRgb = parseHexColor(options.color) || { r: 255, g: 117, b: 0 };
        const currentColor = { ...initialRgb };
        const targetColor = { ...initialRgb };

        function parseHexColor(hex) {
            if (!hex || typeof hex !== 'string') return null;
            const clean = hex.trim().replace('#', '');
            if (clean.length === 3) {
                return {
                    r: parseInt(clean[0] + clean[0], 16),
                    g: parseInt(clean[1] + clean[1], 16),
                    b: parseInt(clean[2] + clean[2], 16)
                };
            }
            if (clean.length === 6) {
                return {
                    r: parseInt(clean.slice(0, 2), 16),
                    g: parseInt(clean.slice(2, 4), 16),
                    b: parseInt(clean.slice(4, 6), 16)
                };
            }
            return null;
        }

        function parseCssColor(cssColor) {
            if (!cssColor || cssColor === 'transparent') return null;
            const match = cssColor.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/i);
            if (!match) return null;
            const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
            if (a <= 0.01) return null;
            return {
                r: parseFloat(match[1]),
                g: parseFloat(match[2]),
                b: parseFloat(match[3]),
                a
            };
        }

        function sampleMediaPixel(el, clientX, clientY) {
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return null;

            const normX = Math.min(0.999, Math.max(0, (clientX - rect.left) / rect.width));
            const normY = Math.min(0.999, Math.max(0, (clientY - rect.top) / rect.height));
            let srcW = 0;
            let srcH = 0;

            if (el.tagName === 'IMG' && el.complete && el.naturalWidth > 0) {
                srcW = el.naturalWidth;
                srcH = el.naturalHeight;
            } else if (el.tagName === 'VIDEO' && el.readyState >= 2 && el.videoWidth > 0) {
                srcW = el.videoWidth;
                srcH = el.videoHeight;
            } else if (el.tagName === 'CANVAS' && el.width > 0 && el.height > 0) {
                srcW = el.width;
                srcH = el.height;
            } else {
                return null;
            }

            try {
                sampleCtx.clearRect(0, 0, 1, 1);
                sampleCtx.drawImage(el, Math.floor(normX * srcW), Math.floor(normY * srcH), 1, 1, 0, 0, 1, 1);
                const data = sampleCtx.getImageData(0, 0, 1, 1).data;
                if (data[3] <= 10) return null;
                return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
            } catch (_) {
                // Recreate canvas if cross-origin media tainted the context
                sampleCanvas = document.createElement('canvas');
                sampleCanvas.width = 1;
                sampleCanvas.height = 1;
                sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
                return null;
            }
        }

        function samplePointColor(x, y) {
            const stack = document.elementsFromPoint(x, y);
            const layers = [];

            for (let i = 0; i < stack.length; i++) {
                const el = stack[i];
                if (el === root || root.contains(el)) continue;

                const style = window.getComputedStyle(el);
                if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) <= 0.05) {
                    continue;
                }

                if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS') {
                    const mediaColor = sampleMediaPixel(el, x, y);
                    if (mediaColor) {
                        layers.push(mediaColor);
                        if (mediaColor.a >= 0.98) break;
                    }
                }

                const bg = parseCssColor(style.backgroundColor);
                if (bg) {
                    layers.push(bg);
                    if (bg.a >= 0.98) break;
                }
            }

            // Composite from back to front over default white browser canvas
            let r = 255;
            let g = 255;
            let b = 255;
            for (let i = layers.length - 1; i >= 0; i--) {
                const layer = layers[i];
                const alpha = layer.a;
                r = layer.r * alpha + r * (1 - alpha);
                g = layer.g * alpha + g * (1 - alpha);
                b = layer.b * alpha + b * (1 - alpha);
            }

            return { r, g, b };
        }

        function updateAveragePageColor() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            if (!width || !height) return;

            const grid = 7;
            let totalR = 0;
            let totalG = 0;
            let totalB = 0;
            let totalWeight = 0;

            for (let gx = 0; gx < grid; gx++) {
                for (let gy = 0; gy < grid; gy++) {
                    const x = Math.round(((gx + 0.5) / grid) * width);
                    const y = Math.round(((gy + 0.5) / grid) * height);
                    const c = samplePointColor(x, y);

                    const max = Math.max(c.r, c.g, c.b);
                    const min = Math.min(c.r, c.g, c.b);
                    const saturation = max === 0 ? 0 : (max - min) / max;

                    // Weight slightly toward chromatic page colors so main theme colors stand out
                    const weight = 1 + saturation * 2.5;
                    totalR += c.r * weight;
                    totalG += c.g * weight;
                    totalB += c.b * weight;
                    totalWeight += weight;
                }
            }

            if (totalWeight > 0) {
                let r = totalR / totalWeight;
                let g = totalG / totalWeight;
                let b = totalB / totalWeight;

                // Keep glow subtly visible even on pure black or pure white pages
                const brightness = (r + g + b) / 3;
                if (brightness < 24) {
                    const lift = 36 - brightness;
                    r = Math.min(255, r + lift);
                    g = Math.min(255, g + lift);
                    b = Math.min(255, b + lift);
                } else if (brightness > 242) {
                    const drop = brightness - 222;
                    r = Math.max(0, r - drop);
                    g = Math.max(0, g - drop);
                    b = Math.max(0, b - drop);
                }

                targetColor.r = r;
                targetColor.g = g;
                targetColor.b = b;
            }
        }

        function ensureAudioGraph() {
            if (!sharedAudioContext) {
                sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (sharedAudioContext.state === 'suspended') {
                sharedAudioContext.resume();
            }
            if (!analyser) {
                analyser = sharedAudioContext.createAnalyser();
                analyser.fftSize = 256;
            }
        }

        function cleanupCurrentSource() {
            if (activeSource) {
                try { activeSource.disconnect(); } catch (_) {}
                activeSource = null;
            }
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
                activeStream = null;
            }
            hookedElement = null;
        }

        function hookPageMedia(preferredElement = null) {
            const mediaElements = Array.from(document.querySelectorAll('audio, video'));
            const target = preferredElement
                || mediaElements.find(el => !el.paused && !el.ended && el.readyState > 2)
                || mediaElements[0];

            if (!target) return false;
            if (target === hookedElement && activeSource) return true;

            try {
                ensureAudioGraph();
                cleanupCurrentSource();

                let source = elementSources.get(target);
                if (!source) {
                    source = sharedAudioContext.createMediaElementSource(target);
                    elementSources.set(target, source);
                }

                source.connect(analyser);
                source.connect(sharedAudioContext.destination);

                activeSource = source;
                hookedElement = target;
                return true;
            } catch (_) {
                return false;
            }
        }

        async function captureTabAudio() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return false;
            try {
                ensureAudioGraph();
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true,
                    preferCurrentTab: true
                });

                const audioTracks = stream.getAudioTracks();
                if (!audioTracks.length) {
                    stream.getTracks().forEach(track => track.stop());
                    return false;
                }

                stream.getVideoTracks().forEach(track => track.stop());
                cleanupCurrentSource();

                activeStream = new MediaStream(audioTracks);
                const source = sharedAudioContext.createMediaStreamSource(activeStream);
                source.connect(analyser);
                activeSource = source;

                audioTracks[0].addEventListener('ended', cleanupCurrentSource);
                return true;
            } catch (_) {
                return false;
            }
        }

        function onMediaPlay(event) {
            const target = event.target;
            if (target && (target.tagName === 'AUDIO' || target.tagName === 'VIDEO')) {
                hookPageMedia(target);
            }
        }

        function resumeOnInteraction() {
            if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
                sharedAudioContext.resume();
            }
            if (!activeSource) {
                hookPageMedia();
            }
        }

        function resize() {
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(root.clientWidth * pixelRatio);
            canvas.height = Math.round(root.clientHeight * pixelRatio);
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        }

        function pointOnFrame(distance, inset, width, height, radius) {
            const straightWidth = width - radius * 2;
            const straightHeight = height - radius * 2;
            const perimeter = straightWidth * 2 + straightHeight * 2 + Math.PI * radius * 2;
            let remaining = distance % perimeter;
            const quarterArc = Math.PI * radius / 2;

            if (remaining <= straightWidth) return { x: inset + radius + remaining, y: inset };
            remaining -= straightWidth;
            if (remaining <= quarterArc) {
                const angle = -Math.PI / 2 + remaining / radius;
                return { x: inset + width - radius + Math.cos(angle) * radius, y: inset + radius + Math.sin(angle) * radius };
            }
            remaining -= quarterArc;
            if (remaining <= straightHeight) return { x: inset + width, y: inset + radius + remaining };
            remaining -= straightHeight;
            if (remaining <= quarterArc) {
                const angle = remaining / radius;
                return { x: inset + width - radius + Math.cos(angle) * radius, y: inset + height - radius + Math.sin(angle) * radius };
            }
            remaining -= quarterArc;
            if (remaining <= straightWidth) return { x: inset + width - radius - remaining, y: inset + height };
            remaining -= straightWidth;
            if (remaining <= quarterArc) {
                const angle = Math.PI / 2 + remaining / radius;
                return { x: inset + radius + Math.cos(angle) * radius, y: inset + height - radius + Math.sin(angle) * radius };
            }
            remaining -= quarterArc;
            if (remaining <= straightHeight) return { x: inset, y: inset + height - radius - remaining };
            const angle = Math.PI + remaining / radius;
            return { x: inset + radius + Math.cos(angle) * radius, y: inset + radius + Math.sin(angle) * radius };
        }

        function draw(now = performance.now()) {
            const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
            lastFrameTime = now;

            // Smooth exponential fade toward the current target page color
            const fadeFactor = 1 - Math.exp(-dt * 3.0);
            currentColor.r += (targetColor.r - currentColor.r) * fadeFactor;
            currentColor.g += (targetColor.g - currentColor.g) * fadeFactor;
            currentColor.b += (targetColor.b - currentColor.b) * fadeFactor;

            const activeFill = `rgb(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)})`;

            const width = root.clientWidth;
            const height = root.clientHeight;
            ctx.clearRect(0, 0, width, height);

            if (analyser && activeSource) {
                analyser.getByteFrequencyData(dataArray);
            } else {
                dataArray.fill(0);
            }

            const inset = 0;
            const radius = Math.min(18, width / 4, height / 4);
            const frameWidth = width - inset * 2;
            const frameHeight = height - inset * 2;
            const straightWidth = frameWidth - radius * 2;
            const straightHeight = frameHeight - radius * 2;
            const perimeter = straightWidth * 2 + straightHeight * 2 + Math.PI * radius * 2;
            const barDepth = Math.min(width, height) * 0.12;
            const barCount = 128;
            const barsPerSide = barCount / 4;

            ctx.beginPath();
            for (let i = 0; i < barCount; i++) {
                const start = pointOnFrame(i * perimeter / barCount, inset, frameWidth, frameHeight, radius);
                const end = pointOnFrame((i + 1) * perimeter / barCount, inset, frameWidth, frameHeight, radius);
                const patternIndex = i % barsPerSide;
                const signal = activeSource
                    ? (dataArray[patternIndex] + dataArray[patternIndex + barsPerSide] + dataArray[patternIndex + barsPerSide * 2] + dataArray[patternIndex + barsPerSide * 3]) / 4
                    : 0;
                const depth = 10 + signal / 255 * barDepth;
                const centerX = width / 2;
                const centerY = height / 2;
                const startLength = Math.hypot(start.x - centerX, start.y - centerY) || 1;
                const endLength = Math.hypot(end.x - centerX, end.y - centerY) || 1;
                const startInner = { x: start.x + (centerX - start.x) / startLength * depth, y: start.y + (centerY - start.y) / startLength * depth };
                const endInner = { x: end.x + (centerX - end.x) / endLength * depth, y: end.y + (centerY - end.y) / endLength * depth };

                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.lineTo(endInner.x, endInner.y);
                ctx.lineTo(startInner.x, startInner.y);
                ctx.closePath();
            }

            ctx.fillStyle = activeFill;
            ctx.shadowBlur = 18;
            ctx.shadowColor = activeFill;
            ctx.fill();
            ctx.shadowBlur = 0;
            animationFrame = requestAnimationFrame(draw);
        }

        const api = {
            element: root,
            hookPageMedia,
            captureTabAudio,
            updateColor: updateAveragePageColor,
            show() {
                root.style.display = 'block';
                resize();
            },
            hide() {
                root.style.display = 'none';
            },
            destroy() {
                cancelAnimationFrame(animationFrame);
                clearInterval(colorSampleTimer);
                document.removeEventListener('play', onMediaPlay, true);
                window.removeEventListener('resize', resize);
                window.removeEventListener('mousedown', resumeOnInteraction);
                window.removeEventListener('touchstart', resumeOnInteraction);
                cleanupCurrentSource();
                if (sharedAudioContext && sharedAudioContext.state === 'running') {
                    sharedAudioContext.suspend();
                }
                root.remove();
                instance = null;
            }
        };

        document.addEventListener('play', onMediaPlay, true);
        window.addEventListener('mousedown', resumeOnInteraction);
        window.addEventListener('touchstart', resumeOnInteraction, { passive: true });
        window.addEventListener('resize', resize);

        resize();
        updateAveragePageColor();
        // Snap initial color immediately on spawn so it starts in the page's color
        Object.assign(currentColor, targetColor);
        colorSampleTimer = setInterval(updateAveragePageColor, 500);

        hookPageMedia();
        if (options.captureTab) {
            captureTabAudio();
        }
        draw();

        instance = api;
        return api;
    }

    global.spawnVisualizer = spawnVisualizer;
})(typeof window !== 'undefined' ? window : globalThis);