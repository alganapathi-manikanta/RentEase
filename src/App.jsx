import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FiGrid, FiSearch, FiHeart, FiUser, FiPlus, FiList, FiBarChart2, FiSettings, FiMessageSquare } from 'react-icons/fi';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import PageTransition from './components/PageTransition';
import { InfoModalProvider } from './context/InfoModalContext';
import InfoModalOverlay from './components/InfoModalOverlay';
import WebsiteIntro from './components/WebsiteIntro';

// Eagerly loaded core routes for instantaneous initial render
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchProperties from './pages/SearchProperties';

// Code-split pages to optimize initial bundle and route performance
const Features = lazy(() => import('./pages/Features'));
const Help = lazy(() => import('./pages/Help'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'));
const ExpenseCalculator = lazy(() => import('./pages/ExpenseCalculator'));
const ChatInbox = lazy(() => import('./pages/ChatInbox'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Tenant pages
const Favorites = lazy(() => import('./pages/tenant/Favorites'));

// Landlord pages
const LandlordDashboard = lazy(() => import('./pages/landlord/LandlordDashboard'));
const AddProperty = lazy(() => import('./pages/landlord/AddProperty'));
const EditProperty = lazy(() => import('./pages/landlord/EditProperty'));
const ManageProperties = lazy(() => import('./pages/landlord/ManageProperties'));
const Reports = lazy(() => import('./pages/landlord/Reports'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

import { useAuth } from './context/AuthContext';

const tenantLinks = [
  { to: '/tenant/wishlist', label: 'Wishlist', icon: FiHeart },
  { to: '/search', label: 'Search Properties', icon: FiSearch },
  { to: '/tenant/messages', label: 'Messages', icon: FiMessageSquare },
  { to: '/tenant/profile', label: 'Profile', icon: FiUser },
  { to: '/tenant/settings', label: 'Settings', icon: FiSettings },
];

const landlordLinks = [
  { to: '/landlord/dashboard', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/landlord/add-property', label: 'Add Property', icon: FiPlus },
  { to: '/landlord/posted-properties', label: 'Posted Properties', icon: FiList },
  { to: '/landlord/messages', label: 'Messages', icon: FiMessageSquare },
  { to: '/landlord/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/landlord/profile', label: 'Profile', icon: FiUser },
  { to: '/landlord/settings', label: 'Settings', icon: FiSettings },
];

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8" role="status" aria-label="Loading page content">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-sm" />
        <span className="text-xs font-medium text-ink/60 dark:text-slate-400">Loading Rent Ease...</span>
      </div>
    </div>
  );
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <PageTransition className="min-h-[70vh] relative z-0 pt-[72px]">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </PageTransition>
      <Footer />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!['/about', '/about-us', '/careers', '/privacy-policy', '/privacy'].includes(pathname)) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

function SettingsRedirect() {
  const { user } = useAuth();
  if (user?.role === 'landlord') return <Navigate to="/landlord/settings" replace />;
  if (user?.role === 'tenant') return <Navigate to="/tenant/settings" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <InfoModalProvider>
      <ScrollToTop />
      <InfoModalOverlay />
      <WebsiteIntro />
      <Suspense fallback={<PageLoader />}>
        <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
      <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
      <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
      <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
      <Route path="/reset-password/:token" element={<PublicLayout><ResetPassword /></PublicLayout>} />
      <Route path="/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />
      <Route path="/features" element={<PublicLayout><Features /></PublicLayout>} />
      <Route path="/help" element={<PublicLayout><Help /></PublicLayout>} />
      <Route path="/search" element={<PublicLayout><SearchProperties /></PublicLayout>} />
      <Route path="/property/:id" element={<PublicLayout><PropertyDetails /></PublicLayout>} />
      <Route path="/property/:id/expenses" element={<PublicLayout><ExpenseCalculator /></PublicLayout>} />
      <Route path="/properties/:id/expenses" element={<PublicLayout><ExpenseCalculator /></PublicLayout>} />
      <Route path="/property/:id/calculator" element={<PublicLayout><ExpenseCalculator /></PublicLayout>} />
      <Route path="/about" element={<PublicLayout><Landing /></PublicLayout>} />
      <Route path="/about-us" element={<Navigate to="/about" replace />} />
      <Route path="/careers" element={<PublicLayout><Landing /></PublicLayout>} />
      <Route path="/privacy-policy" element={<PublicLayout><Landing /></PublicLayout>} />
      <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />

      {/* Tenant routes */}
      <Route
        element={
          <ProtectedRoute role="tenant">
            <DashboardLayout links={tenantLinks} title="Tenant Panel" />
          </ProtectedRoute>
        }
      >
        <Route path="/tenant" element={<Navigate to="/tenant/wishlist" replace />} />
        <Route path="/tenant/wishlist" element={<Favorites />} />
        <Route path="/tenant/favorites" element={<Navigate to="/tenant/wishlist" replace />} />
        <Route path="/tenant/messages" element={<ChatInbox />} />
        <Route path="/tenant/messages/:conversationId" element={<ChatInbox />} />
        <Route path="/tenant/profile" element={<Profile />} />
        <Route path="/tenant/settings" element={<Settings />} />
      </Route>

      {/* Landlord routes */}
      <Route
        element={
          <ProtectedRoute role="landlord">
            <DashboardLayout links={landlordLinks} title="Landlord Panel" />
          </ProtectedRoute>
        }
      >
        <Route path="/landlord/dashboard" element={<LandlordDashboard />} />
        <Route path="/landlord/add-property" element={<AddProperty />} />
        <Route path="/landlord/edit-property/:id" element={<EditProperty />} />
        <Route path="/landlord/posted-properties" element={<ManageProperties />} />
        <Route path="/landlord/manage-properties" element={<ManageProperties />} />
        <Route path="/landlord/messages" element={<ChatInbox />} />
        <Route path="/landlord/messages/:conversationId" element={<ChatInbox />} />
        <Route path="/landlord/reports" element={<Reports />} />
        <Route path="/landlord/profile" element={<Profile />} />
        <Route path="/landlord/settings" element={<Settings />} />
      </Route>

      <Route
        path="/edit-property/:id"
        element={
          <ProtectedRoute role="landlord">
            <DashboardLayout links={landlordLinks} title="Landlord Panel">
              <EditProperty />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-property"
        element={
          <ProtectedRoute role="landlord">
            <Navigate to="/landlord/add-property" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/list-property"
        element={
          <ProtectedRoute role="landlord">
            <Navigate to="/landlord/add-property" replace />
          </ProtectedRoute>
        }
      />

      {/* Admin back-office route (strictly protected) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* General Settings Redirect */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <PublicLayout>
              <ChatInbox />
            </PublicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages/:conversationId"
        element={
          <ProtectedRoute>
            <PublicLayout>
              <ChatInbox />
            </PublicLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/chat" element={<Navigate to="/messages" replace />} />
      <Route path="/chat/:conversationId" element={<Navigate to="/messages/:conversationId" replace />} />

      <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
    </Routes>
    </Suspense>
    </InfoModalProvider>
  );
}
