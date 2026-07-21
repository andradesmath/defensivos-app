import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onError, onClose }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('inativo');
  const [errorMsg, setErrorMsg] = useState('');
  const html5QrCodeRef = useRef(null);
  const [modo, setModo] = useState('camera');

  // Inicia a câmera com html5-qrcode (mais compatível com Safari)
  const iniciarCamera = async () => {
    setStatus('iniciando');
    setErrorMsg('');

    try {
      const element = videoRef.current;
      if (!element) {
        throw new Error('Elemento de vídeo não encontrado');
      }

      // Cria uma instância do leitor
      const html5QrCode = new Html5Qrcode('scanner-container');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 200 },
        aspectRatio: 1.0,
      };

      // Inicia a câmera (vai pedir permissão)
      await html5QrCode.start(
        { facingMode: 'environment' }, // câmera traseira
        config,
        (decodedText) => {
          // Sucesso: código lido
          if (decodedText && !html5QrCode._isScanning) return;
          html5QrCode.stop();
          onScan(decodedText);
          setStatus('pronto');
          setTimeout(() => {
            if (onClose) onClose();
          }, 500);
        },
        (errorMessage) => {
          // Ignora erros de "no barcode found"
        }
      );
      setStatus('pronto');
    } catch (err) {
      console.error('Erro ao iniciar câmera:', err);
      setStatus('erro');
      let msg = 'Falha ao acessar a câmera.';
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        msg = 'Permissão negada. Vá em Ajustes > Safari > Câmera e permita o acesso.';
      } else if (err.message?.includes('camera')) {
        msg = 'Não foi possível acessar a câmera. Verifique se ela está disponível.';
      } else {
        msg = err.message || 'Erro desconhecido.';
      }
      setErrorMsg(msg);
      if (onError) onError(err);
    }
  };

  // Para a câmera
  const pararCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.warn('Erro ao parar câmera:', err);
    }
  };

  // Upload de imagem (fallback)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatus('iniciando');
      const imageUrl = URL.createObjectURL(file);

      // Usa o Html5Qrcode para decodificar a imagem
      const html5QrCode = new Html5Qrcode('scanner-container');
      const result = await html5QrCode.scanFile(file, true);
      
      if (result) {
        setStatus('pronto');
        onScan(result);
        setTimeout(() => {
          if (onClose) onClose();
        }, 500);
      } else {
        setStatus('erro');
        setErrorMsg('Nenhum código de barras encontrado na imagem.');
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      setStatus('erro');
      setErrorMsg('Não foi possível ler o código na imagem. Tente outra foto.');
    }
  };

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {}
        html5QrCodeRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      {/* Container do scanner */}
      <div id="scanner-container" ref={videoRef} className="w-full h-full" />

      {/* Botão de fechar (sempre visível) */}
      <button
        onClick={() => {
          pararCamera();
          if (onClose) onClose();
        }}
        className="absolute top-4 right-4 bg-red-500/80 text-white p-2 rounded-full hover:bg-red-600 transition-colors z-20"
      >
        ✕
      </button>

      {/* Tela inicial: botão ativar câmera */}
      {status === 'inativo' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 z-10">
          <p className="text-white text-center mb-4">
            📷 Para ler o código de barras, ative a câmera.
          </p>
          <button
            onClick={iniciarCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Ativar câmera
          </button>
          <div className="flex items-center gap-2 mt-4">
            <hr className="w-12 border-gray-600" />
            <span className="text-gray-400 text-xs">ou</span>
            <hr className="w-12 border-gray-600" />
          </div>
          <button
            onClick={() => {
              setModo('upload');
              fileInputRef.current?.click();
            }}
            className="text-blue-400 text-sm hover:underline mt-2"
          >
            📤 Enviar foto do código
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <p className="text-gray-400 text-xs mt-4 text-center max-w-xs">
            No iPhone, vá em Ajustes &gt; Safari &gt; Câmera e permita o acesso.
          </p>
        </div>
      )}

      {/* Carregando */}
      {status === 'iniciando' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="text-white text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Lendo código...</p>
          </div>
        </div>
      )}

      {/* Erro */}
      {status === 'erro' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 z-10">
          <p className="text-red-400 text-sm font-semibold">⚠️ Erro</p>
          <p className="text-gray-300 text-xs mt-1 text-center max-w-xs">{errorMsg}</p>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            <button
              onClick={() => {
                setStatus('inativo');
                setErrorMsg('');
                pararCamera();
              }}
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              🔁 Tentar novamente
            </button>
            <button
              onClick={() => {
                // Abre as configurações do Safari (iOS)
                if (navigator.userAgent.includes('iPhone')) {
                  alert('Vá em Ajustes > Safari > Câmera e permita o acesso.');
                }
                pararCamera();
                if (onClose) onClose();
              }}
              className="px-4 py-2 bg-gray-600 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
          {errorMsg.includes('Permissão negada') && (
            <p className="text-gray-400 text-xs mt-4 text-center max-w-xs">
              No iPhone: Ajustes &gt; Safari &gt; Câmera &gt; Permitir
            </p>
          )}
          <button
            onClick={() => {
              setModo('upload');
              fileInputRef.current?.click();
            }}
            className="text-blue-400 text-sm hover:underline mt-4"
          >
            📤 Ou envie uma foto do código
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      {/* Pronto (câmera ativa) */}
      {status === 'pronto' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-blue-500 z-10" style={{ boxShadow: 'inset 0 0 0 2px rgba(59,130,246,0.3)' }}></div>
          <div className="absolute bottom-4 left-0 right-0 text-center z-10">
            <span className="bg-black/70 text-white text-xs font-medium py-2 px-4 rounded-full inline-block">
              📷 Aponte para o código de barras
            </span>
          </div>
        </div>
      )}
    </div>
  );
}