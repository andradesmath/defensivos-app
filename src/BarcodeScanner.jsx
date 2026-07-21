import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onScan, onError, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startScanner = async () => {
      try {
        const videoInput = videoRef.current;
        if (!videoInput) return;
        await reader.decodeFromVideoDevice(null, videoInput, (result, err) => {
          if (result) {
            const code = result.getText();
            if (code) onScan(code);
          }
          // Ignora erros de "no barcode found"
        });
      } catch (error) {
        if (onError) onError(error);
      }
    };

    startScanner();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, [onScan, onError]);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} className="w-full h-full object-cover" />
      <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(59,130,246,0.3)' }}></div>
      <div className="absolute bottom-4 left-0 right-0 text-center text-white bg-black/50 py-1 px-2 text-xs rounded mx-4">
        Posicione o código de barras no centro
      </div>
    </div>
  );
}