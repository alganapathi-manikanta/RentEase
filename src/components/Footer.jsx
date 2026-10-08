import { Link } from 'react-router-dom';
import { FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';
import { useInfoModal } from '../context/InfoModalContext';
import BrandLogo from './BrandLogo';

export default function Footer() {
  const { openModal } = useInfoModal();

  return (
    <footer id="contact" className="mt-20" style={{ backgroundColor: 'var(--color-footer)', color: 'white' }}>
      <div className="section grid gap-8 sm:gap-10 py-12 sm:py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand & Socials */}
        <div>
          <BrandLogo tone="inverse" size="footer" />
          <p className="mt-4 text-sm text-white/80">
            The smart way to rent, list, and sell properties — built for landlords and tenants alike.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {/* Instagram - Official Rent Ease account */}
            <a
              href="https://www.instagram.com/rentease_015/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rent Ease on Instagram"
              title="Follow Rent Ease on Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-[var(--color-accent)] hover:text-[var(--color-primary)]"
            >
              <FiInstagram size={16} />
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/feed/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rent Ease on LinkedIn"
              title="LinkedIn"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-[var(--color-accent)] hover:text-[var(--color-primary)]"
            >
              <FiLinkedin size={16} />
            </a>

            {/* Twitter / X - Connected to official Rent Ease account */}
            <a
              href="https://x.com/RentEase_015"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rent Ease on X"
              title="Follow Rent Ease on X"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-[var(--color-accent)] hover:text-[var(--color-primary)]"
            >
              <FiTwitter size={16} />
            </a>
          </div>
        </div>

        {/* Explore Links */}
        <div>
          <h4 className="mb-4 font-semibold text-white">Explore</h4>
          <ul className="space-y-2 text-sm text-[var(--color-footer-muted)]">
            <li>
              <Link to="/search" className="transition-colors hover:text-[var(--color-accent)]">
                Search Properties
              </Link>
            </li>
            <li>
              <Link to="/register" className="transition-colors hover:text-[var(--color-accent)]">
                List a Property
              </Link>
            </li>
            <li>
              <Link to="/features" className="transition-colors hover:text-[var(--color-accent)]">
                Features
              </Link>
            </li>
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h4 className="mb-4 font-semibold text-white">Company</h4>
          <ul className="space-y-2 text-sm text-[var(--color-footer-muted)]">
            <li>
              <button
                type="button"
                onClick={() => openModal('about')}
                className="text-left text-sm text-[var(--color-footer-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                About Us
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => openModal('careers')}
                className="text-left text-sm text-[var(--color-footer-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                Careers
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => openModal('privacy')}
                className="text-left text-sm text-[var(--color-footer-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                Privacy Policy
              </button>
            </li>
          </ul>
        </div>

        {/* Contact Links */}
        <div>
          <h4 className="mb-4 font-semibold text-white">Contact</h4>
          <ul className="space-y-2 text-sm text-[var(--color-footer-muted)]">
            <li>
              <a
                href="mailto:projectplatform15@gmail.com"
                className="transition-colors hover:text-[var(--color-accent)] break-all"
              >
                projectplatform15@gmail.com
              </a>
            </li>
            <li>
              <a
                href="tel:8985211790"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                8985211790
              </a>
            </li>
            <li>Dhanekula, Gangur</li>
          </ul>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="py-6 text-center text-xs text-[rgba(255,255,255,0.65)]">
          © {new Date().getFullYear()} Rent Ease. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
