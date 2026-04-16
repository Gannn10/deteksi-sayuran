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
    const initServices = async () => {
      try {
        const detector = new DetectionService();
        const generator = new RootFactsService();
        const camera = new CameraService();

        actions.setModelStatus('Menunggu Model... 0%');
        await detector.loadModel();

        actions.setModelStatus('Menyiapkan Generator... 50%');
        await generator.loadModel();

        actions.setServices({ detector, camera, generator });
        actions.setModelStatus('Siap');
      } catch (err) {
        actions.setError(`Gagal inisialisasi: ${err.message}`);
      }
    };

    initServices();

    return () => {
      if (detectionCleanupRef.current) {
        cancelAnimationFrame(detectionCleanupRef.current);
      }
      if (state.services.camera) {
        state.services.camera.stopCamera();
      }
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
          actions.setAppState('detecting');

          actions.setAppState('generating');
          const fact = await state.services.generator.generateFacts(result.label);
          actions.setFunFactData(fact);
          actions.setAppState('idle');
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    detectionCleanupRef.current = requestAnimationFrame(runDetection);
  }, [state.services, actions]);

  const toggleCamera = async () => {
    if (state.isRunning) {
      isRunningRef.current = false;
      state.services.camera.stopCamera();
      actions.setRunning(false);
      actions.resetResults();
    } else {
      try {
        // Pastikan element video sudah terpasang di service sebelum start
        const videoElement = state.services.camera.getVideoElement();
        if (!videoElement) {
          throw new Error('Elemen video belum siap. Tunggu sebentar...');
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
    if (state.services.generator) {
      state.services.generator.setTone(tone);
    }
  };

  const handleCopyFact = async () => {
    if (state.funFactData) {
      try {
        await navigator.clipboard.writeText(state.funFactData);
        alert('Fakta berhasil disalin!');
      } catch (err) {
        actions.setError('Gagal menyalin teks.');
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
        <p>Powered by TensorFlow.js & Transformers.js</p>
      </footer>

      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000,
        }}>
          <strong>Error:</strong>
          {' '}
          {state.error}
          <button
            type="button"
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;