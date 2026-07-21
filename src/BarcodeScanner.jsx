import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, onError, onClose }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('inativo');
  const [errorMsg, setErrorMsg] = useState('');
  const scanDoneRef = useRef(false);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  let readerInstance = null;

  // ========== INICIAR CÂMERA ==========
  const iniciarCamera = async () => {
    setStatus('iniciando');
    setErrorMsg('');
    scanDoneRef.current = false;

    try {
      // Solicita acesso à câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 } }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        setStatus('pronto');
        
        // Tenta usar BarcodeDetector (nativo) primeiro
        if ('BarcodeDetector' in window) {
          intervalRef.current = setInterval(() => {
            if (scanDoneRef.current) return;
            capturarComBarcodeDetector(video);
          }, 200);
        } else {
          // Fallback para @zxing/browser
          try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            const reader = new BrowserMultiFormatReader();
            readerInstance = reader;
            await reader.decodeFromVideoDevice(
              { facingMode: 'environment' },
              video,
              (result, err) => {
                if (scanDoneRef.current) return;
                if (result) {
                  const code = result.getText();
                  if (code) {
                    scanDoneRef.current = true;
                    onScan(code);
                    pararScanner();
                  }
                }
              }
            );
          } catch (zxingErr) {
            console.warn('Erro ao carregar @zxing/browser:', zxingErr);
            setStatus('erro');
            setErrorMsg('Seu navegador não suporta leitura de código de barras. Use Chrome ou Edge.');
          }
        }
      }
    } catch (err) {
      console.error('Erro ao iniciar câmera:', err);
      setStatus('erro');
      let msg = 'Falha ao acessar a câmera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permissão negada. Clique no cadeado na barra de endereços e permita o acesso à câmera.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera encontrada.';
      } else if (err.name === 'NotReadableError') {
        msg = 'A câmera está sendo usada por outro aplicativo.';
      } else {
        msg = err.message || 'Erro desconhecido.';
      }
      setErrorMsg(msg);
      if (onError) onError(err);
    }
  };

  // ========== CAPTURA COM BarcodeDetector (nativo) ==========
  const capturarComBarcodeDetector = async (video) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const detector = new BarcodeDetector({
        formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_93', 'itf', 'pdf417', 'aztec', 'data_matrix']
      });
      const detections = await detector.detect(imageData);
      if (detections.length > 0 && !scanDoneRef.current) {
        const code = detections[0].rawValue;
        if (code) {
          scanDoneRef.current = true;
          onScan(code);
          pararScanner();
        }
      }
    } catch (err) {
      // Silencia erros
    }
  };

  // ========== PARAR SCANNER ==========
  const pararScanner = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (readerInstance) {
      try { readerInstance.reset(); } catch(e) {}
      readerInstance = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // ========== CLEANUP ==========
  useEffect(() => {
    return () => {
      pararScanner();
    };
  }, []);

  // ========== RENDER ==========
  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} className="w-full h-full object-cover" />

      {status === 'inativo' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
          <p className="text-white text-center mb-4">
            Para ler o código de barras, precisamos acessar sua câmera.
          </p>
          <button
            onClick={iniciarCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            📷 Ativar câmera
          </button>
          <p className="text-gray-400 text-xs mt-4">
            O acesso à câmera é necessário apenas para esta leitura.
          </p>
        </div>
      )}

      {status === 'iniciando' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-white text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Iniciando câmera...</p>
          </div>
        </div>
      )}

      {status === 'erro' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
          <p className="text-red-400 text-sm font-semibold">⚠️ Erro</p>
          <p className="text-gray-300 text-xs mt-1 text-center max-w-xs">{errorMsg}</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setStatus('inativo');
                setErrorMsg('');
                pararScanner();
              }}
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              🔄 Tentar novamente
            </button>
            <button
              onClick={() => {
                pararScanner();
                if (onClose) onClose();
              }}
              className="px-4 py-2 bg-gray-600 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {status === 'pronto' && (
        <>
          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(59,130,246,0.3)' }}></div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="bg-black/70 text-white text-xs font-medium py-2 px-4 rounded-full inline-block">
              📷 Aponte para o código de barras
            </span>
          </div>
          <button
            onClick={() => {
              pararScanner();
              if (onClose) onClose();
            }}
            className="absolute top-4 right-4 bg-red-500/80 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}