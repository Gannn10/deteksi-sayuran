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

  // [Basic] Mendapatkan daftar perangkat input video
  async loadCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (error) {
      console.error('Gagal memuat daftar kamera:', error);
      return [];
    }
  }

  // [Basic] Memulai kamera dengan pengecekan elemen video yang lebih ketat
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

      // Memastikan this.video adalah elemen HTMLVideoElement yang valid sebelum memanggil play()
      if (this.video && this.video instanceof HTMLVideoElement) {
        this.video.srcObject = this.stream;

        // Menggunakan Promise untuk memastikan video siap diputar
        return new Promise((resolve, reject) => {
          this.video.onloadedmetadata = () => {
            this.video.play()
              .then(() => resolve(this.stream))
              .catch((err) => {
                console.error('Autoplay gagal:', err);
                reject(err);
              });
          };
        });
      }
      return this.stream;
    } catch (error) {
      console.error('Gagal memulai kamera:', error);
      throw error;
    }
  }

  // [Basic] Menghentikan siaran kamera dan membersihkan sumber daya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  // [Skilled] Mengatur FPS kamera
  setFPS(fps) {
    this.fps = fps;
  }

  // [Basic] Periksa apakah kamera sedang aktif
  isActive() {
    return !!this.stream && this.stream.active;
  }

  // [Basic] Periksa apakah elemen video siap untuk digunakan (readyState 4 = HAVE_ENOUGH_DATA)
  isReady() {
    return !!this.video && this.video.readyState === 4;
  }

  getVideoElement() {
    return this.video;
  }
}