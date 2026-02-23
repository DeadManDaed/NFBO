//src/hooks/useCapacitor.js

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export function useCapacitor() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [networkStatus, setNetworkStatus] = useState({ connected: true, connectionType: 'unknown' });

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);
    setPlatform(Capacitor.getPlatform());

    if (native) {
      initializeNativeApp();
    }
  }, []);

  const initializeNativeApp = async () => {
    try {
      // Configurer la barre de statut
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#667eea' });

      // Masquer le splash screen
      await SplashScreen.hide();

      // Surveiller le statut réseau
      const status = await Network.getStatus();
      setNetworkStatus(status);

      Network.addListener('networkStatusChange', (status) => {
        setNetworkStatus(status);
        console.log('📶 Statut réseau:', status);
      });

      // Gérer le bouton retour Android
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });

      // Gérer le cycle de vie de l'app
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('🔄 App state:', isActive ? 'active' : 'background');
      });

      console.log('✅ Application native initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation native:', error);
    }
  };

  return {
    isNative,
    platform,
    networkStatus,
    isOnline: networkStatus.connected,
  };
}

// Hook pour la caméra
export function useCamera() {
  const takePhoto = async () => {
    try {
      const { Camera } = await import('@capacitor/camera');
      const { CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
      });

      return photo.dataUrl;
    } catch (error) {
      console.error('❌ Erreur caméra:', error);
      throw error;
    }
  };

  const pickImage = async () => {
    try {
      const { Camera } = await import('@capacitor/camera');
      const { CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 90,
      });

      return photo.dataUrl;
    } catch (error) {
      console.error('❌ Erreur sélection image:', error);
      throw error;
    }
  };

  return { takePhoto, pickImage };
}

// Hook pour les notifications push
export function usePushNotifications() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializePushNotifications();
    }
  }, []);

  const initializePushNotifications = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Demander la permission
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        await PushNotifications.register();

        // Écouter le token
        PushNotifications.addListener('registration', (token) => {
          console.log('📱 Push token:', token.value);
          setToken(token.value);
        });

        // Écouter les notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('🔔 Notification reçue:', notification);
        });

        // Écouter les clics sur notifications
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('👆 Notification cliquée:', action);
        });
      }
    } catch (error) {
      console.error('❌ Erreur push notifications:', error);
    }
  };

  return { token };
}

// Hook pour le stockage de fichiers
export function useFileSystem() {
  const saveFile = async (fileName, data) => {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      await Filesystem.writeFile({
        path: fileName,
        data: data,
        directory: Directory.Documents,
      });

      console.log('✅ Fichier sauvegardé:', fileName);
    } catch (error) {
      console.error('❌ Erreur sauvegarde fichier:', error);
      throw error;
    }
  };

  const readFile = async (fileName) => {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      const result = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents,
      });

      return result.data;
    } catch (error) {
      console.error('❌ Erreur lecture fichier:', error);
      throw error;
    }
  };

  return { saveFile, readFile };
}