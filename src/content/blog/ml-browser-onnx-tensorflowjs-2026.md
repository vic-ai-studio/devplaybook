---
title: "Machine Learning in the Browser with ONNX Runtime and TensorFlow.js 2026"
description: "A practical guide to running machine learning models directly in the browser using ONNX Runtime Web and TensorFlow.js — covering inference performance, use cases, WebGPU acceleration, and when to choose each approach in 2026."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: [machine-learning, javascript, onnx, tensorflow, webgpu, ai, browser]
readingTime: "9 min read"
---

Running machine learning models in the browser is no longer a novelty — it's a legitimate architecture choice. With WebGPU landing in all major browsers, ONNX Runtime Web supporting hardware acceleration, and TensorFlow.js hitting maturity, client-side inference has gone from impressive demo to production-viable. This guide covers what actually works in 2026, where the performance limits are, and how to pick the right tool for your use case.

## Why Run ML in the Browser?

The obvious question: why not just call a server API? Three reasons matter in practice.

**Privacy.** When inference runs on-device, user data never leaves the browser. This is critical for health apps, document processing, on-device speech recognition, and anything involving personal data where you want to avoid server-side storage.

**Latency.** Round trips to a backend add 50–300ms minimum, plus network variability. For real-time use cases — live video effects, interactive search, gesture recognition — client-side inference at under 20ms feels instant where server calls feel sluggish.

**Offline capability.** Once the model is cached via a service worker, your inference pipeline works without connectivity. Useful for field tools, kiosk apps, and Progressive Web Apps.

The trade-offs are real too: model file size, first-load cost, and memory constraints on mobile devices. We'll get to those.

## ONNX Runtime Web

ONNX Runtime Web (ORT Web) is Microsoft's browser port of the ONNX Runtime inference engine. ONNX (Open Neural Network Exchange) is a format that frameworks like PyTorch, TensorFlow, and scikit-learn can all export to — which means ORT Web can run models from essentially any training framework.

### Setting Up ONNX Runtime Web

```bash
npm install onnxruntime-web
```

Basic inference looks like this:

```javascript
import * as ort from 'onnxruntime-web';

async function runInference(inputData) {
  // Load the model (caches after first load)
  const session = await ort.InferenceSession.create('/models/my-model.onnx', {
    executionProviders: ['webgpu', 'wasm'],
  });

  // Create input tensor — Float32Array with correct shape
  const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 224, 224]);

  // Run inference
  const feeds = { input: inputTensor };
  const results = await session.run(feeds);

  return results.output.data;
}
```

### Execution Providers

The `executionProviders` array controls how ORT Web runs the model:

- **`webgpu`** — Uses the WebGPU API to run computations on the GPU. Fastest option when available (Chrome 113+, Edge 113+, Firefox behind a flag). Can be 5–20x faster than WASM for large models.
- **`wasm`** — WebAssembly with SIMD instructions. CPU-based, works everywhere, good baseline performance.
- **`cpu`** — Pure JavaScript fallback. Avoid unless you have a specific reason.

Always list them in preference order. ORT Web will fall back automatically if WebGPU isn't available:

```javascript
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: ['webgpu', 'wasm'],
  graphOptimizationLevel: 'all',
});
```

### Converting Models to ONNX Format

If you're training in PyTorch:

```python
import torch
import torch.onnx

model = YourModel()
model.load_state_dict(torch.load('model.pth'))
model.eval()

dummy_input = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy_input,
    'model.onnx',
    opset_version=17,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}}
)
```

For quantization (reduces model size by 4x with minimal accuracy loss):

```python
from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    'model.onnx',
    'model_quantized.onnx',
    weight_type=QuantType.QUInt8
)
```

### Real-World Performance Numbers (2026)

On a modern MacBook with Chrome WebGPU enabled:

| Model | Size | WASM Inference | WebGPU Inference |
|-------|------|----------------|-----------------|
| MobileNetV3-Small | 5.8 MB | 45ms | 8ms |
| ResNet-50 | 98 MB | 380ms | 28ms |
| BERT-base (ONNX) | 110 MB | 850ms | 120ms |
| Whisper-tiny | 39 MB | 280ms | 40ms |

WebGPU acceleration makes the difference between "barely usable" and "fast" for medium-sized models.

## TensorFlow.js

TensorFlow.js takes a different approach: it's a full ML framework for JavaScript, not just an inference runtime. You can train models directly in the browser (though that's rarely practical), convert TensorFlow/Keras models, or use the growing library of pre-trained models.

### Getting Started

```bash
# Core library
npm install @tensorflow/tfjs

# For Node.js backend (faster for server-side)
npm install @tensorflow/tfjs-node

# WebGL backend (GPU acceleration)
npm install @tensorflow/tfjs-backend-webgl

# WebGPU backend (newer, faster)
npm install @tensorflow/tfjs-backend-webgpu
```

```javascript
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

// Load a pre-trained model
const model = await tf.loadLayersModel('/models/model.json');

// Run prediction
const input = tf.tensor2d([[1.0, 2.0, 3.0, 4.0]]);
const prediction = model.predict(input);
prediction.print();

// Always dispose tensors to avoid memory leaks
input.dispose();
prediction.dispose();
```

### Using Pre-built Models

TensorFlow.js ships with production-ready models you can use directly:

```bash
npm install @tensorflow-models/mobilenet
npm install @tensorflow-models/blazeface
npm install @tensorflow-models/pose-detection
```

Image classification example:

```javascript
import * as mobilenet from '@tensorflow-models/mobilenet';

const model = await mobilenet.load({
  version: 2,
  alpha: 1.0, // Model size multiplier: 0.25, 0.5, 0.75, or 1.0
});

const imgElement = document.getElementById('my-image');
const predictions = await model.classify(imgElement);

// Returns: [{className: "tabby cat", probability: 0.847}, ...]
console.log(predictions);
```

Real-time webcam inference:

```javascript
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

const detector = await poseDetection.createDetector(
  poseDetection.SupportedModels.MoveNet,
  { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
);

async function detectPose(videoElement) {
  const poses = await detector.estimatePoses(videoElement);
  return poses; // Array of keypoints with x, y, score
}

// Call at 30fps
async function loop() {
  await detectPose(video);
  requestAnimationFrame(loop);
}
```

### Memory Management

TensorFlow.js doesn't have automatic garbage collection for tensors. You must dispose them manually:

```javascript
// Option 1: Manual dispose
const result = model.predict(input);
const data = await result.data();
input.dispose();
result.dispose();

// Option 2: tf.tidy() — automatically disposes everything created inside
const data = tf.tidy(() => {
  const preprocessed = tf.div(tf.cast(rawInput, 'float32'), 255.0);
  return model.predict(preprocessed);
});
```

Forgetting to dispose tensors is the #1 source of memory leaks in TF.js apps. Use `tf.memory()` during development to track tensor counts.

## ONNX Runtime Web vs TensorFlow.js: When to Use Each

| Consideration | ONNX Runtime Web | TensorFlow.js |
|--------------|-----------------|---------------|
| Primary strength | Cross-framework compatibility | Ecosystem + pre-built models |
| PyTorch models | ✅ Direct export | ❌ Requires conversion |
| Model zoo | Any ONNX-compatible | @tensorflow-models/* packages |
| WebGPU support | ✅ Production-ready | ✅ Available (webgpu backend) |
| WebGL support | ✅ WASM + WebGPU only | ✅ Mature WebGL backend |
| Bundle size | ~5–8 MB (WASM) | ~1.4 MB core + backend |
| API style | Session-based (run/feed) | Tensor operations + model.predict |
| Training in browser | ❌ Inference only | ✅ Supported |

**Choose ONNX Runtime Web when:**
- Your model was trained in PyTorch, scikit-learn, or any non-TensorFlow framework
- You need maximum inference performance via WebGPU
- You want to run a model from Hugging Face (most are ONNX-exportable)

**Choose TensorFlow.js when:**
- You want drop-in pre-built models (pose detection, face detection, object classification)
- Your training pipeline is already TensorFlow/Keras
- You want the option to fine-tune in the browser

## Practical Tips for Production

**Model loading strategy.** Large models (>20 MB) should be served via CDN with proper cache headers and loaded asynchronously after the main page renders. Use a loading indicator and handle the case where the model isn't yet available.

```javascript
let modelPromise = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = ort.InferenceSession.create('/models/model.onnx', {
      executionProviders: ['webgpu', 'wasm'],
    });
  }
  return modelPromise;
}
```

**Cache models with a service worker.** Serving a 50 MB model on every page load is unacceptable. Use workbox or a custom service worker to cache model files:

```javascript
// In service-worker.js (using Workbox)
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

registerRoute(
  ({ request }) => request.url.includes('/models/'),
  new CacheFirst({
    cacheName: 'ml-models',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
    ],
  })
);
```

**Use Web Workers for inference.** Running inference on the main thread will freeze your UI. Move it to a Web Worker:

```javascript
// worker.js
import * as ort from 'onnxruntime-web';

let session;

self.onmessage = async ({ data: { type, payload } }) => {
  if (type === 'load') {
    session = await ort.InferenceSession.create(payload.modelPath, {
      executionProviders: ['webgpu', 'wasm'],
    });
    self.postMessage({ type: 'ready' });
  }

  if (type === 'infer') {
    const tensor = new ort.Tensor('float32', payload.data, payload.shape);
    const results = await session.run({ input: tensor });
    self.postMessage({ type: 'result', data: Array.from(results.output.data) });
  }
};
```

**Quantize your models.** INT8 quantization typically reduces model size by 3–4x with under 1% accuracy drop on most tasks. Always ship quantized models for browser deployment unless you have a specific accuracy requirement that prevents it.

## Use Cases That Work Well in 2026

- **Real-time image classification and object detection** — MobileNet and YOLO-nano variants run at 30+ fps with WebGPU
- **On-device OCR** — Tesseract.js or ONNX-exported text recognition models
- **Sentiment analysis on short text** — DistilBERT quantized to ONNX runs under 100ms
- **Keyword spotting / wake word detection** — Small audio models under 5 MB work well
- **Face detection and landmark tracking** — MediaPipe via WASM runs smoothly
- **Code autocompletion in browser IDEs** — Small fine-tuned code models under 50 MB

## Conclusion

Browser-based machine learning in 2026 is genuinely practical for the right use cases. WebGPU has closed the performance gap enough that models which previously required a server now run acceptably on modern hardware client-side. The choice between ONNX Runtime Web and TensorFlow.js comes down to your training framework and whether you need the pre-built model ecosystem. Either way, keep models small, load them asynchronously, cache aggressively, and always run inference in a Web Worker.
