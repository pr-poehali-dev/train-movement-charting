import { useState } from 'react';

export function useEntityForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const setValue = <K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const setAll = (newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
  };

  const reset = () => {
    setValues(initialValues);
  };

  return {
    values,
    setValue,
    setAll,
    reset,
  };
}
