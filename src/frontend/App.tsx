import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Purchase from './pages/Purchase';
import PurchaseHistory from './pages/PurchaseHistory';
import Suppliers from './pages/Suppliers';
import Returns from './pages/Returns';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
import Users from './pages/Users';
import AuditLog from './pages/AuditLog';
import Categories from './pages/Categories';
import Rental from './pages/Rental';
import BulkPricing from './pages/BulkPricing';
import ExpenseTracking from './pages/ExpenseTracking';
import EmployeeManagement from './pages/EmployeeManagement';
import BarcodeManagement from './pages/BarcodeManagement';
import StockAlerts from './pages/StockAlerts';
import InvoiceSettings from './pages/InvoiceSettings';
import SalesAnalytics from './pages/SalesAnalytics';
import StoreSettings from './pages/StoreSettings';

const PrivateRoute: React.FC<{ element: React.ReactElement; allowedRoles?: string[] }> = ({
  element,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isInitialized } = useAuth();

  // Show loading while auth is being initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return element;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={<PrivateRoute element={<Dashboard />} />}
      />
      <Route
        path="/pos"
        element={<PrivateRoute element={<POS />} />}
      />
      <Route
        path="/inventory"
        element={<PrivateRoute element={<Inventory />} />}
      />
      <Route
        path="/purchase"
        element={<PrivateRoute element={<Purchase />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/purchase-history"
        element={<PrivateRoute element={<PurchaseHistory />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/suppliers"
        element={<PrivateRoute element={<Suppliers />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/returns"
        element={<PrivateRoute element={<Returns />} />}
      />
      <Route
        path="/reports"
        element={<PrivateRoute element={<Reports />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/settings"
        element={<PrivateRoute element={<Settings />} />}
      />
      <Route
        path="/backup"
        element={<PrivateRoute element={<Backup />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/users"
        element={<PrivateRoute element={<Users />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/audit-log"
        element={<PrivateRoute element={<AuditLog />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/categories"
        element={<PrivateRoute element={<Categories />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/rental"
        element={<PrivateRoute element={<Rental />} />}
      />
      <Route
        path="/bulk-pricing"
        element={<PrivateRoute element={<BulkPricing />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/expenses"
        element={<PrivateRoute element={<ExpenseTracking />} />}
      />
      <Route
        path="/employees"
        element={<PrivateRoute element={<EmployeeManagement />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/barcodes"
        element={<PrivateRoute element={<BarcodeManagement />} />}
      />
      <Route
        path="/stock-alerts"
        element={<PrivateRoute element={<StockAlerts />} />}
      />
      <Route
        path="/invoice-settings"
        element={<PrivateRoute element={<InvoiceSettings />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/sales-analytics"
        element={<PrivateRoute element={<SalesAnalytics />} />}
      />
      <Route
        path="/store-settings"
        element={<PrivateRoute element={<StoreSettings />} allowedRoles={['Admin']} />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
      />
    </Routes>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
