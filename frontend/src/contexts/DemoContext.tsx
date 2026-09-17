import { createContext, useContext, useState, useEffect } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('demoMode');
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    localStorage.setItem('demoMode', JSON.stringify(isDemoMode));
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
