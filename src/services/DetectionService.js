import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import '@tensorflow/tfjs-backend-webgl';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
  }

  async loadModel() {
    try {
      // Gunakan WebGL jika WebGPU bermasalah di lokal
      if (navigator.gpu) {
        await tf.setBackend('webgpu');
      } else {
        await tf.setBackend('webgl');
      }
      await tf.ready();
    } catch (e) {
      await tf.setBackend('cpu');
    }

    const [model, metadata] = await Promise.all([
      tf.loadGraphModel('/model/model.json'),
      fetch('/model/metadata.json').then((res) => res.json()),
    ]);

    this.model = model;
    this.labels = metadata.labels;
  }

  async predict(imageElement) {
    if (!this.model) return null;

    return tf.tidy(() => {
      const tensor = tf.browser.fromPixels(imageElement)
        .resizeNearestNeighbor([224, 224])
        .expandDims(0)
        .toFloat()
        .div(255.0);

      const predictions = this.model.predict(tensor);
      const data = predictions.dataSync();
      const maxIndex = predictions.argMax(1).dataSync()[0];

      return {
        label: this.labels[maxIndex],
        confidence: data[maxIndex],
      };
    });
  }

  isLoaded() {
    return !!this.model;
  }
}