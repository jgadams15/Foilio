# ml/export

Exported recognition model, ready to be bundled into `apps/app`.

- `mobile/` — mobile-friendly exports (TFLite for Android, Core ML for iOS, and/or a
  shared ONNX export) for on-device inference without a native re-implementation of the
  model.
- `web/` — a web-friendly export (ONNX Runtime Web or TensorFlow.js) for running inference
  in the browser.
