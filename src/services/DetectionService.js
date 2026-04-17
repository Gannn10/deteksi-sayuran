import * as tmImage from '@teachablemachine/image';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
  }

  loadModel() {
    // Path ke folder model kamu di public/model/
    const modelURL = '/model/model.json';
    const metadataURL = '/model/metadata.json';

    return tmImage.load(modelURL, metadataURL)
      .then((model) => {
        this.model = model;
        this.labels = model.getClassLabels();
        console.log('TM Image: Model Berhasil Dimuat!');
      })
      .catch((err) => {
        console.error('TM Image Error:', err.message);
        throw new Error('File model rusak, coba export ulang dari Teachable Machine');
      });
  }

  predict(imageElement) {
    if (!this.model) return Promise.resolve(null);
    
    // tmImage.predict otomatis melakukan resize dan tensor management
    return this.model.predict(imageElement)
      .then((predictions) => {
        // Cari prediksi dengan probability tertinggi
        const topPrediction = predictions.reduce((prev, current) => 
          (prev.probability > current.probability) ? prev : current
        );

        return {
          label: topPrediction.className,
          confidence: topPrediction.probability,
        };
      });
  }

  isLoaded() {
    return !!this.model;
  }
}