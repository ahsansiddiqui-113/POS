import React, { useEffect } from 'react';
import { FaTimes, FaExclamationCircle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getStyles = () => {
    const baseStyles = 'fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md text-white z-50';

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-600`;
      case 'error':
        return `${baseStyles} bg-red-600`;
      case 'warning':
        return `${baseStyles} bg-yellow-600`;
      case 'info':
        return `${baseStyles} bg-blue-600`;
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle size={20} />;
      case 'error':
        return <FaExclamationCircle size={20} />;
      case 'warning':
        return <FaExclamationCircle size={20} />;
      case 'info':
        return <FaInfoCircle size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className={getStyles()}>
      <div>{getIcon()}</div>
      <div className="flex-grow">{message}</div>
      <button
        onClick={onClose}
        className="hover:opacity-80 transition"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};

export default Toast;
