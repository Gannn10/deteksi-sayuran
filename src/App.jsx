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
  const servicesRef = useRef(null); // FIX: ref untuk hindari stale closure di cleanup
  const [currentTone, setCurrentTone] = useState('normal');

  useEffect(() => {
    const initServices = async () => {
      try {
        const detector = new DetectionService();
        const generator = new RootFactsService();
        const camera = new CameraService();

        actions.setModelStatus('Menunggu Model... 0%');
        await detector.loadModel();
        actions.setModelStatus('Menyiapkan Generator... 50%');
        await generator.loadModel();

        const services = { detector, camera, generator };
        actions.setServices(services);
        servicesRef.current = services; // FIX: simpan ke ref agar cleanup tidak stale
        actions.setModelStatus('Siap');
      } catch (err) {
        actions.setError(`Gagal inisialisasi: ${err.message}`);
      }
    };
    initServices();

    return () => {
      if (detectionCleanupRef.current) cancelAnimationFrame(detectionCleanupRef.current);
      // FIX: pakai servicesRef bukan state (state di sini adalah stale closure)
      if (servicesRef.current?.camera) servicesRef.current.camera.stopCamera();
    };
  }, []);

  const runDetection = useCallback(async () => {
    if (!isRunningRef.current || !state.services.detector) return;
    try {
      const videoElement = state.services.camera.getVideoElement();
      if (videoElement && videoElement.readyState === 4) {
        const result = await state.services.detector.predict(videoElement);
        if (result && result.confidence > 0.6) {
          actions.setDetectionResult(result);
          actions.setAppState('generating');
          const fact = await state.services.generator.generateFacts(result.label);
          actions.setFunFactData(fact);
          actions.setAppState('idle');
        }
      }
    } catch (err) {
      console.error(err);
    }
    detectionCleanupRef.current = requestAnimationFrame(runDetection);
  }, [state.services, actions]);

  const toggleCamera = async () => {
    // FIX: guard — jangan jalankan apapun jika services belum siap
    if (!state.services.camera || !state.services.detector || !state.services.generator) {
      actions.setError('Model belum siap, tunggu hingga status "Siap".');
      return;
    }

    if (state.isRunning) {
      isRunningRef.current = false;
      state.services.camera.stopCamera();
      actions.setRunning(false);
      actions.resetResults();
    } else {
      try {
        // Ambil elemen langsung sesuai tips Dicoding
        const el = document.getElementById('media-video');
        if (el) {
          state.services.camera.setVideoElement(el);
        }

        await state.services.camera.startCamera();
        isRunningRef.current = true;
        actions.setRunning(true);
        runDetection();
      } catch (err) {
        actions.setError(`Kamera gagal: ${err.message}`);
      }
    }
  };

  const handleToneChange = (tone) => {
    setCurrentTone(tone);
    if (state.services.generator) state.services.generator.setTone(tone);
  };

  const handleCopyFact = async () => {
    if (state.funFactData) {
      try {
        await navigator.clipboard.writeText(state.funFactData);
        alert('Fakta berhasil disalin!');
      } catch (err) {
        actions.setError('Gagal menyalin.');
      }
    }
  };

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
          onToneChange={handleToneChange}
        />
        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>
      <footer className="footer">
        <p>Powered by TensorFlow.js &amp; Transformers.js</p>
      </footer>
      {state.error && (
        <div className="error-toast">
          <strong>Error:</strong> {state.error}
          <button type="button" onClick={() => actions.setError(null)}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;
