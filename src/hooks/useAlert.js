//src/hooks/useAlert.js

import { useState, useCallback } from 'react';

export function useAlert() {
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return { alert, showAlert, hideAlert };
}