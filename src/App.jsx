import { useRef, useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { DetectionService } from './services/DetectionService';
import { RootFactsService } from './services/RootFactsService';
import { CameraService } from './services/CameraService';

function App() {
  const { state, actions } = useAppState();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  // Flag tambahan: mencegah deteksi jalan ganda saat async sedang berjalan
  const isDetectingRef = useRef(false);
  const [currentTone, setCurrentTone] = useState('normal');
  const servicesRef = useRef(null);

  useEffect(() => {
    const detector = new DetectionService();
    const generator = new RootFactsService();
    const camera = new CameraService();

    actions.setModelStatus('Menyiapkan AI...');

    generator.loadModel()
      .then(() => {
        actions.setModelStatus('Memuat Detektor...');
        return detector.loadModel();
      })
      .then(() => {
        const services = { detector, camera, generator };
        servicesRef.current = services;
        actions.setServices(services);
        actions.setModelStatus('Siap');
      })
      .catch((err) => {
        console.error(err);
        actions.setError(`Gagal inisialisasi: ${err.message}`);
      });

    return () => {
      if (detectionCleanupRef.current) cancelAnimationFrame(detectionCleanupRef.current);
      if (servicesRef.current?.camera) servicesRef.current.camera.stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (detectionCleanupRef.current) {
      cancelAnimationFrame(detectionCleanupRef.current);
      detectionCleanupRef.current = null;
    }
    const camera = servicesRef.current?.camera;
    if (camera) camera.stopCamera();
    actions.setRunning(false);
  }, [actions]);

  // Loop deteksi yang benar: async-safe, tidak race condition
  const runDetectionLoop = useCallback(() => {
    // Berhenti jika kamera sudah dimatikan
    if (!isRunningRef.current) return;

    // Skip frame ini jika predict sebelumnya belum selesai
    if (isDetectingRef.current) {
      detectionCleanupRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const services = servicesRef.current;
    if (!services?.detector) {
      detectionCleanupRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const videoElement = document.getElementById('media-video');

    // Pastikan video benar-benar punya data frame yang valid
    // readyState 4 = HAVE_ENOUGH_DATA, videoWidth > 0 = frame sudah ada
    if (
      !videoElement ||
      videoElement.readyState < 4 ||
      videoElement.videoWidth === 0 ||
      videoElement.paused
    ) {
      // Video belum siap, tunggu frame berikutnya
      detectionCleanupRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // Tandai sedang mendeteksi agar tidak dobel
    isDetectingRef.current = true;

    services.detector.predict(videoElement)
      .then((result) => {
        // Cek lagi apakah kamera masih aktif (user mungkin sudah stop)
        if (!isRunningRef.current) return;

        if (result && result.confidence > 0.6) {
          // Deteksi berhasil: stop kamera SEKARANG sebelum generate
          actions.setDetectionResult(result);
          actions.setAppState('generating');
          stopCamera(); // Kamera mati, hemat resource

          // Generate fun fact dari label hasil deteksi
          return services.generator.generateFacts(result.label);
        }
      })
      .then((fact) => {
        if (fact) {
          actions.setFunFactData(fact);
          actions.setAppState('idle');
        }
      })
      .catch(err => console.error('Detection error:', err))
      .finally(() => {
        isDetectingRef.current = false;

        // Lanjutkan loop HANYA jika kamera masih aktif (belum ada deteksi berhasil)
        if (isRunningRef.current) {
          detectionCleanupRef.current = requestAnimationFrame(runDetectionLoop);
        }
      });
  }, [actions, stopCamera]);

  const toggleCamera = useCallback(() => {
    if (state.isRunning) {
      stopCamera();
      actions.resetResults();
    } else {
      const el = document.getElementById('media-video');
      const camera = servicesRef.current?.camera;

      if (!el || !camera) return;

      camera.setVideoElement(el);
      camera.startCamera()
        .then(() => {
          isRunningRef.current = true;
          isDetectingRef.current = false;
          actions.setRunning(true);
          actions.resetResults();

          // Tunggu 500ms dulu agar stream sempat warm-up sebelum mulai loop deteksi
          setTimeout(() => {
            if (isRunningRef.current) {
              runDetectionLoop();
            }
          }, 500);
        })
        .catch((err) => actions.setError(`Kamera gagal: ${err.message}`));
    }
  }, [state.isRunning, actions, stopCamera, runDetectionLoop]);

  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} />
      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
          onToggleCamera={toggleCamera}
          onToneChange={(t) => setCurrentTone(t)}
        />
        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={() => {}}
        />
      </main>
      <footer className="footer">
        <p>Powered by Muhammad Gani Ramadhani</p>
      </footer>
    </div>
  );
}

export default App;
