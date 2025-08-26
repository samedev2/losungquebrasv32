import { useState, useEffect, useRef } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { useNotificationSound } from '../components/NotificationSoundManager';

interface NotificationState {
  isVisible: boolean;
  record: LogisticsRecord | null;
  soundEnabled: boolean;
}

export function useBreakdownNotification(records: LogisticsRecord[]) {
  const [notification, setNotification] = useState<NotificationState>({
    isVisible: false,
    record: null,
    soundEnabled: true
  });
  
  const previousRecordsCount = useRef(records.length);
  const lastNotificationTime = useRef<number>(0);
  
  // Hook para som de notificação
  const { playCallFlightAttendantSound } = useNotificationSound(notification.soundEnabled);

  // Detectar novos registros
  useEffect(() => {
    const currentCount = records.length;
    const now = Date.now();
    
    // Verificar se houve aumento no número de registros
    if (currentCount > previousRecordsCount.current && previousRecordsCount.current > 0) {
      // Evitar múltiplas notificações muito próximas (menos de 2 segundos)
      if (now - lastNotificationTime.current > 2000) {
        const newestRecord = records.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        if (newestRecord) {
          showNotification(newestRecord);
          lastNotificationTime.current = now;
        }
      }
    }
    
    previousRecordsCount.current = currentCount;
  }, [records]);

  const showNotification = (record: LogisticsRecord) => {
    // Tocar som se habilitado
    if (notification.soundEnabled) {
      try {
        playCallFlightAttendantSound();
      } catch (error) {
        console.warn('Não foi possível reproduzir som de notificação:', error);
      }
    }

    // Mostrar animação
    setNotification({
      isVisible: true,
      record,
      soundEnabled: notification.soundEnabled
    });

    // Ocultar após 5 segundos
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 5000);

    // Limpar completamente após animação
    setTimeout(() => {
      setNotification(prev => ({ ...prev, record: null }));
    }, 6000);
  };

  const toggleSound = () => {
    setNotification(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const dismissNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  return {
    notification,
    toggleSound,
    dismissNotification
  };
}