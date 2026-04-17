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
  const [currentTone, setCurrentTone] = useState('normal');

  useEffect(() => {
    const detector = new DetectionService();
    const generator = new RootFactsService();
    const camera = new CameraService();

    actions.setModelStatus('Menyiapkan AI... 30%');
    
    // Gunakan chain .then() agar lebih aman dari regenerator error
    generator.loadModel()
      .then(() => {
        actions.setModelStatus('Memuat Detektor... 70%');
        return detector.loadModel();
      })
      .then(() => {
        actions.setServices({ detector, camera, generator });
        actions.setModelStatus('Siap');
      })
      .catch((err) => {
        console.error(err);
        actions.setError(`Gagal inisialisasi: ${err.message}`);
      });

    return () => {
      if (detectionCleanupRef.current) cancelAnimationFrame(detectionCleanupRef.current);
      if (state.services.camera) state.services.camera.stopCamera();
    };
  }, []);

  const runDetection = useCallback(() => {
    if (!isRunningRef.current || !state.services.detector) return;
    
    const videoElement = document.getElementById('media-video');
    if (videoElement && videoElement.readyState === 4) {
      state.services.detector.predict(videoElement)
        .then((result) => {
          if (result && result.confidence > 0.6) {
            actions.setDetectionResult(result);
            actions.setAppState('generating');
            return state.services.generator.generateFacts(result.label);
          }
        })
        .then((fact) => {
          if (fact) {
            actions.setFunFactData(fact);
            actions.setAppState('idle');
          }
        })
        .catch(err => console.error(err));
    }
    detectionCleanupRef.current = requestAnimationFrame(runDetection);
  }, [state.services, actions]);

  const toggleCamera = () => {
    if (state.isRunning) {
      isRunningRef.current = false;
      state.services.camera.stopCamera();
      actions.setRunning(false);
      actions.resetResults();
    } else {
      const el = document.getElementById('media-video');
      if (el) state.services.camera.setVideoElement(el);

      state.services.camera.startCamera()
        .then(() => {
          isRunningRef.current = true;
          actions.setRunning(true);
          runDetection();
        })
        .catch((err) => actions.setError(`Kamera gagal: ${err.message}`));
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