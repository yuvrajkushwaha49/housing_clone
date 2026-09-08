import { createContext, useContext } from 'react';
import { useHomeLocations } from '../hooks/useHomeLocations';

const HomeLocationsContext = createContext(null);

export function HomeLocationsProvider({ children }) {
  const value = useHomeLocations();
  return (
    <HomeLocationsContext.Provider value={value}>
      {children}
    </HomeLocationsContext.Provider>
  );
}

export function useHomeLocationsContext() {
  const context = useContext(HomeLocationsContext);
  if (!context) {
    throw new Error('useHomeLocationsContext must be used within HomeLocationsProvider');
  }
  return context;
}
