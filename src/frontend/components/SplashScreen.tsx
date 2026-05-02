import React, { useEffect, useState } from 'react';
import { FaStore } from 'react-icons/fa';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show splash for 3 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Wait for fade out animation to complete
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo and Title */}
      <div className="text-center">
        <div className="inline-block mb-8 animate-bounce">
          {React.createElement(FaStore as any, {
            className: 'text-white text-8xl',
          })}
        </div>
        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider">
          WALMART
        </h1>
        <p className="text-xl text-blue-100 mb-12">
          Point of Sale & Inventory System
        </p>

        {/* Loading Bar */}
        <div className="w-48 h-1 bg-blue-400 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-pulse" />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-blue-100 text-sm">
        <p>Developed by Ahsan</p>
      </div>
    </div>
  );
};

export default SplashScreen;
