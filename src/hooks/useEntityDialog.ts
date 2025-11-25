import { useState } from 'react';

export function useEntityDialog<T>() {
  const [isOpen, setIsOpen] = useState(false);
  const [entity, setEntity] = useState<T | null>(null);

  const open = (entityToEdit?: T) => {
    if (entityToEdit) {
      setEntity(entityToEdit);
    }
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setEntity(null);
  };

  return {
    isOpen,
    entity,
    open,
    close,
    isEditing: entity !== null,
  };
}
