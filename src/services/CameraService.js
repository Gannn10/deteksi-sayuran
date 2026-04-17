export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.fps = 30;
  }

  setVideoElement(videoElement) {
    console.log('Service: Menerima elemen video', videoElement);
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  async loadCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (error) {
      return [];
    }
  }

  async startCamera(selectedCameraId) {
    this.stopCamera();

    // JURUS TERAKHIR: Kalau this.video kosong, cari paksa pakai ID
    if (!this.video) {
      console.warn('Service: videoElement kosong, mencoba ambil dari ID...');
      this.video = document.getElementById('media-video');
    }

    const constraints = {
      video: {
        deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
        frameRate: { ideal: this.fps },
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Cek apakah play ada. Kalau tidak ada, berarti ini bukan elemen video asli.
      if (this.video && typeof this.video.play === 'function') {
        this.video.srcObject = this.stream;

        return new Promise((resolve, reject) => {
          this.video.onloadedmetadata = () => {
            this.video.play()
              .then(() => resolve(this.stream))
              .catch(reject);
          };
        });
      }
      throw new Error('Objek video tidak valid atau tidak memiliki fungsi .play()');
    } catch (error) {
      console.error('Kamera Error:', error);
      throw error;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  setFPS(fps) { this.fps = fps; }
  isActive() { return !!this.stream && this.stream.active; }
  isReady() { return !!this.video && this.video.readyState === 4; }
  getVideoElement() { return this.video; }
}