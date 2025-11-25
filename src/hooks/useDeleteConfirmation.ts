import { useState } from 'react';

interface DeleteTarget {
  type: string;
  id: number;
}

export function useDeleteConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<DeleteTarget | null>(null);

  const confirm = (type: string, id: number) => {
    setTarget({ type, id });
    setIsOpen(true);
  };

  const cancel = () => {
    setIsOpen(false);
    setTarget(null);
  };

  return {
    isOpen,
    target,
    confirm,
    cancel,
  };
}
