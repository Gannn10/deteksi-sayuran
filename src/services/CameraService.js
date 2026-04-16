export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
    this.fps = 30;
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  // TODO [Basic] Tambahkan konfigurasi kamera untuk mendapatkan daftar perangkat input video
  async loadCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (error) {
      console.error('Gagal memuat daftar kamera:', error);
      return [];
    }
  }

  // TODO [Basic] Memulai kamera dengan perangkat yang dipilih dan menampilkan pada elemen video
  async startCamera(selectedCameraId) {
    this.stopCamera();

    const constraints = {
      video: {
        deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
        frameRate: { ideal: this.fps },
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }
      return this.stream;
    } catch (error) {
      console.error('Gagal memulai kamera:', error);
      throw error;
    }
  }

  // TODO [Basic] Menghentikan siaran kamera dan membersihkan sumber daya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  // TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
  setFPS(fps) {
    this.fps = fps;
  }

  // TODO [Basic] Periksa apakah kamera sedang aktif
  isActive() {
    return !!this.stream && this.stream.active;
  }

  // TODO [Basic] Periksa apakah elemen video siap untuk digunakan
  isReady() {
    return !!this.video && this.video.readyState === 4;
  }

  getVideoElement() {
    return this.video;
  }
}