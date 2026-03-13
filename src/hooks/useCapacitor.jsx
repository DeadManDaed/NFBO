//src/hooks/useCapacitor.jsx
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

    // Variables pour stocker les références des listeners
    let networkListener;
    let backButtonListener;
    let appStateListener;

    const initializeNativeApp = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#667eea' });
        await SplashScreen.hide();

        const status = await Network.getStatus();
        setNetworkStatus(status);

        networkListener = await Network.addListener('networkStatusChange', (status) => {
          setNetworkStatus(status);
          console.log('📶 Statut réseau:', status);
        });

        backButtonListener = await App.addListener('backButton', () => {
          const path = window.location.pathname;

          if (path !== '/dashboard' && path !== '/') {
            window.location.href = '/dashboard';
            return;
          }

          window.dispatchEvent(new CustomEvent('nfbo:back-home'));

          if (window.__nfbo_back_confirm) {
            App.exitApp();
          } else {
            window.__nfbo_back_confirm = true;
            window.dispatchEvent(new CustomEvent('nfbo:back-toast'));
            setTimeout(() => { window.__nfbo_back_confirm = false; }, 2000);
          }
        });

        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          console.log('🔄 App state:', isActive ? 'active' : 'background');
        });

        console.log('✅ Application native initialisée');
      } catch (error) {
        console.error('❌ Erreur initialisation native:', error);
      }
    };

    if (native) {
      initializeNativeApp();
    }

    // Fonction de nettoyage exécutée au démontage
    return () => {
      if (networkListener) networkListener.remove();
      if (backButtonListener) backButtonListener.remove();
      if (appStateListener) appStateListener.remove();
    };
  }, []);

  return { isNative, platform, networkStatus, isOnline: networkStatus.connected };
}

export function useCamera() {
  const takePhoto = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

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
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

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

export function usePushNotifications() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    let registrationListener;
    let pushReceivedListener;
    let pushActionPerformedListener;

    const initializePushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permission = await PushNotifications.requestPermissions();

        if (permission.receive === 'granted') {
          await PushNotifications.register();

          registrationListener = await PushNotifications.addListener('registration', (token) => {
            console.log('📱 Push token:', token.value);
            setToken(token.value);
          });

          pushReceivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('🔔 Notification reçue:', notification);
          });

          pushActionPerformedListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('👆 Notification cliquée:', action);
          });
        }
      } catch (error) {
        console.error('❌ Erreur push notifications:', error);
      }
    };

    if (Capacitor.isNativePlatform()) {
      initializePushNotifications();
    }

    // Nettoyage des listeners push
    return () => {
      if (registrationListener) registrationListener.remove();
      if (pushReceivedListener) pushReceivedListener.remove();
      if (pushActionPerformedListener) pushActionPerformedListener.remove();
    };
  }, []);

  return { token };
}

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
