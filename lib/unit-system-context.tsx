"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { UnitSystem } from "./units";

const STORAGE_KEY = "gymOsUnitSystem";

interface UnitSystemContextValue {
  system: UnitSystem;
  setSystem: (s: UnitSystem) => void;
}

const UnitSystemContext = createContext<UnitSystemContextValue>({
  system: "imperial",
  setSystem: () => {},
});

export function UnitSystemProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystemState] = useState<UnitSystem>("imperial");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "metric" || stored === "imperial") {
      setSystemState(stored);
    }
  }, []);

  function setSystem(s: UnitSystem) {
    setSystemState(s);
    localStorage.setItem(STORAGE_KEY, s);
  }

  return (
    <UnitSystemContext.Provider value={{ system, setSystem }}>
      {children}
    </UnitSystemContext.Provider>
  );
}

export function useUnitSystem() {
  return useContext(UnitSystemContext);
}
