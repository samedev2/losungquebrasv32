import React, { useEffect, useRef } from 'react';

interface NotificationSoundManagerProps {
  enabled: boolean;
  onSoundPlay?: () => void;
}

export function NotificationSoundManager({ enabled, onSoundPlay }: NotificationSoundManagerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Inicializar AudioContext apenas quando necessário
    if (enabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext não suportado:', error);
      }
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [enabled]);

  const playCallFlightAttendantSound = () => {
    if (!enabled || !audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      
      // Reativar contexto se suspenso
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Criar som similar ao de chamada de comissário de bordo
      const createTone = (frequency: number, startTime: number, duration: number, volume: number = 0.3) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      
      // Sequência de tons que simula chamada de emergência/comissário
      // Tom 1: Ding alto
      createTone(1000, now, 0.2, 0.4);
      
      // Tom 2: Dong baixo
      createTone(600, now + 0.25, 0.2, 0.4);
      
      // Pausa
      
      // Tom 3: Ding alto novamente
      createTone(1000, now + 0.7, 0.2, 0.4);
      
      // Tom 4: Dong baixo novamente
      createTone(600, now + 0.95, 0.2, 0.4);
      
      // Tom de alerta contínuo baixo
      createTone(400, now + 1.4, 0.8, 0.2);

      if (onSoundPlay) {
        onSoundPlay();
      }
    } catch (error) {
      console.warn('Erro ao reproduzir som de notificação:', error);
    }
  };

  // Expor função para uso externo
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    playCallFlightAttendantSound
  }));

  // Componente invisível - apenas gerencia o som
  return null;
}

// Hook para usar o som de notificação
export function useNotificationSound(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playCallFlightAttendantSound = React.useCallback(() => {
    if (!enabled) return;

    try {
      // Inicializar AudioContext se necessário
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Reativar contexto se suspenso
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Criar som de chamada de comissário de bordo
      const createTone = (frequency: number, startTime: number, duration: number, volume: number = 0.3) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      
      // Sequência de tons de emergência
      createTone(1000, now, 0.2, 0.4);        // Ding
      createTone(600, now + 0.25, 0.2, 0.4);  // Dong
      createTone(1000, now + 0.7, 0.2, 0.4);  // Ding
      createTone(600, now + 0.95, 0.2, 0.4);  // Dong
      createTone(400, now + 1.4, 0.8, 0.2);   // Tom de alerta

    } catch (error) {
      console.warn('Erro ao reproduzir som de notificação:', error);
    }
  }, [enabled]);

  return { playCallFlightAttendantSound };
}