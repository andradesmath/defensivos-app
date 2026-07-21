
import { useState } from 'react';
import { Scanner } from 'react-qr-barcode-scanner';

export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState('');

  const handleScan = (data) => {
    if (data) {
      onScan(data);
      onClose(); // fecha o scanner após a leitura
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError('Erro ao acessar a câmera. Verifique as permissões.');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Leia o código de barras</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-3">
            {error}
          </div>
        )}
        <div className="aspect-square w-full max-h-80 mx-auto">
          <Scanner
            onScan={handleScan}
            onError={handleError}
            constraints={{ facingMode: 'environment' }}
          />
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Aponte a câmera para o código de barras
        </p>
      </div>
    </div>
  );
}
