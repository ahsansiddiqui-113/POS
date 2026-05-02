import React from 'react';
import { FaStore, FaUser, FaSignOutAlt } from 'react-icons/fa';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
  userInfo?: {
    username: string;
    role: string;
  };
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onLogout,
  userInfo,
}) => {
  return (
    <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 shadow-lg border-b-4 border-blue-800">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          {/* Left Side - Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-full p-2 shadow-lg">
              {React.createElement(FaStore as any, {
                className: 'text-blue-600 text-2xl',
              })}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-white">{title}</h1>
              </div>
              {subtitle && (
                <p className="text-blue-100 text-sm">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Side - User Info and Logout */}
          <div className="flex items-center gap-6">
            {userInfo && (
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 text-white font-semibold">
                  {React.createElement(FaUser as any, { size: 18 })}
                  <span>{userInfo.username}</span>
                </div>
                <div className="text-blue-100 text-xs">
                  {userInfo.role}
                </div>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-all hover:shadow-lg"
              >
                {React.createElement(FaSignOutAlt as any, { size: 18 })}
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-blue-800 bg-opacity-50 px-4 py-2 text-xs text-blue-100 flex justify-between">
        <span>🟢 System Status: Online</span>
        <span>Version 1.0.0 Enterprise Edition</span>
      </div>
    </header>
  );
};

export default Header;
