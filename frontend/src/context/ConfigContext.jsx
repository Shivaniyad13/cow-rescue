import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    emergency_number: '1962',
    emergency_label: 'Govt. Animal Ambulance',
    loaded: false,
  });

  useEffect(() => {
    api
      .get('/config/public')
      .then((res) => setConfig({ ...res.data.data, loaded: true }))
      .catch(() => setConfig((prev) => ({ ...prev, loaded: true })));
  }, []);

  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be inside ConfigProvider');
  return ctx;
}