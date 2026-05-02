import React from 'react';
import {
  FaHeart,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaStore,
  FaCertificate,
} from 'react-icons/fa';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-100 py-12 mt-auto border-t-4 border-blue-600">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3 mb-4">
              {React.createElement(FaStore as any, {
                className: 'text-blue-400 text-3xl',
              })}
              <div>
                <h3 className="text-xl font-bold text-white">WALMART</h3>
                <p className="text-xs text-blue-300">POS System</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 text-center md:text-left">
              Enterprise-grade Point of Sale & Inventory Management Solution
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              {React.createElement(FaCertificate as any, { size: 16 })}
              Features
            </h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>✓ Real-time Inventory</li>
              <li>✓ Multi-user Support</li>
              <li>✓ Audit Trail</li>
              <li>✓ Advanced Reports</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <div className="text-sm text-gray-400 space-y-2">
              <div className="flex items-center gap-2">
                {React.createElement(FaPhone as any, { size: 14 })}
                <span>+92 (123) 456-7890</span>
              </div>
              <div className="flex items-center gap-2">
                {React.createElement(FaEnvelope as any, { size: 14 })}
                <span>support@walmart-pos.com</span>
              </div>
              <div className="flex items-center gap-2">
                {React.createElement(FaGlobe as any, { size: 14 })}
                <span>www.walmart-pos.com</span>
              </div>
            </div>
          </div>

          {/* Developer Info */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-semibold text-white mb-4">Developer</h4>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Ahsan
                </span>
                {React.createElement(FaHeart as any, {
                  className: 'text-red-500 animate-pulse',
                  size: 16,
                })}
              </div>
              <p className="text-xs text-gray-500">
                Professional POS Developer<br />
                Enterprise Solutions
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-6"></div>

        {/* Bottom Info */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-400">
            <p>
              <span className="font-semibold text-white">WALMART POS System</span>{' '}
              © {currentYear} | All Rights Reserved
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Version 1.0.0 | Enterprise Edition | Optimized for 10M+ Products
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <a href="#privacy" className="hover:text-blue-400 transition">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#terms" className="hover:text-blue-400 transition">
              Terms of Service
            </a>
            <span>•</span>
            <a href="#support" className="hover:text-blue-400 transition">
              Support
            </a>
          </div>
        </div>

        {/* Badge Section */}
        <div className="mt-6 flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full text-xs">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            ISO 27001 Certified
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full text-xs">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Enterprise Grade
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full text-xs">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            24/7 Support
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
