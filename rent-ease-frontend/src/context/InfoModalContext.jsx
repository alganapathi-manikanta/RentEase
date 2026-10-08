import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const InfoModalContext = createContext({
  activeModal: null, // 'about' | 'careers' | 'privacy' | null
  openModal: () => {},
  closeModal: () => {},
});

export function InfoModalProvider({ children }) {
  const [activeModal, setActiveModal] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Open modal handler
  const openModal = useCallback((type) => {
    setActiveModal(type);
  }, []);

  // Close modal handler: resets modal state and adjusts direct URL if needed
  const closeModal = useCallback(() => {
    setActiveModal(null);
    if (['/about', '/about-us', '/careers', '/privacy-policy', '/privacy'].includes(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Support direct URL access or browser refresh on /about, /careers, /privacy-policy
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path === '/about' || path === '/about-us') {
      setActiveModal('about');
    } else if (path === '/careers') {
      setActiveModal('careers');
    } else if (path === '/privacy-policy' || path === '/privacy') {
      setActiveModal('privacy');
    }
  }, [location.pathname]);

  // Lock background page scroll when modal is active
  useEffect(() => {
    if (activeModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeModal]);

  // Listen for Escape key press to close modal
  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeModal]);

  return (
    <InfoModalContext.Provider value={{ activeModal, openModal, closeModal }}>
      {children}
    </InfoModalContext.Provider>
  );
}

export function useInfoModal() {
  const context = useContext(InfoModalContext);
  if (!context) {
    throw new Error('useInfoModal must be used within an InfoModalProvider');
  }
  return context;
}
