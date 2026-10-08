import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FiMapPin,
  FiHeart,
  FiPhone,
  FiUser,
  FiBox,
  FiPieChart,
  FiArrowLeft,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiMaximize2,
  FiLayers,
  FiZap,
  FiDroplet,
  FiFileText,
  FiDownload,
  FiExternalLink,
  FiEdit2,
} from 'react-icons/fi';
import { BiBed, BiBath } from 'react-icons/bi';
import { MdKitchen, MdWeekend, MdLocalParking, MdSquareFoot } from 'react-icons/md';
import MediaPlaceholder from '../components/MediaPlaceholder';
import Room3D from '../components/Room3D';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl, getRoomIcon, computePropertyStats } from '../utils/media';
import { isPlotOrLandType } from '../utils/propertyFormHelpers';
import { getPropertyPricing, getPropertyUtilities, formatCurrency, formatPrice } from '../utils/propertyPricing';

function formatPhoneNumber(phone) {
  if (!phone) return '';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return str.startsWith('+') ? str : `+91 ${str}`;
}

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties, favorites, toggleFavorite, incrementViews } = useAppData();
  const { user } = useAuth();
  const property = properties.find((p) => String(p.id) === String(id) || String(p._id) === String(id));
  const landlordName = property?.landlord?.name || property?.ownerId?.name || property?.ownerName || 'Property Owner';
  const rawLandlordPhone = property?.landlord?.phone || property?.ownerId?.phone || property?.ownerPhone || '';
  const displayLandlordPhone = formatPhoneNumber(rawLandlordPhone);
  const callPhone = rawLandlordPhone ? String(rawLandlordPhone).replace(/[^\d+]/g, '') : '';
  const viewedIdsRef = useRef(new Set());
  const shouldReduceMotion = useReducedMotion();

  const [show3D, setShow3D] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  const toggleDescription = (roomKey) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [roomKey]: !prev[roomKey],
    }));
  };

  // Lightbox Modal state
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    currentUrl: '',
    title: '',
    photos: [],
    index: 0,
  });

  const openLightbox = (url, title, photos = [], index = 0) => {
    setLightbox({
      isOpen: true,
      currentUrl: url,
      title: title || property?.title || 'Photo',
      photos: photos.length ? photos : [url],
      index: index >= 0 ? index : 0,
    });
  };

  const closeLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  };

  const nextLightboxPhoto = (e) => {
    e?.stopPropagation();
    if (!lightbox.photos.length) return;
    const nextIdx = (lightbox.index + 1) % lightbox.photos.length;
    setLightbox((prev) => ({
      ...prev,
      index: nextIdx,
      currentUrl: prev.photos[nextIdx],
    }));
  };

  const prevLightboxPhoto = (e) => {
    e?.stopPropagation();
    if (!lightbox.photos.length) return;
    const prevIdx = (lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length;
    setLightbox((prev) => ({
      ...prev,
      index: prevIdx,
      currentUrl: prev.photos[prevIdx],
    }));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox.isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightboxPhoto();
      if (e.key === 'ArrowLeft') prevLightboxPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, lightbox.index, lightbox.photos]);

  // Increment property views ONCE when user opens this property's details page
  useEffect(() => {
    if (!id) return;
    const sessionKey = `rentease_viewed_${id}`;
    if (viewedIdsRef.current.has(id) || sessionStorage.getItem(sessionKey)) {
      return;
    }
    viewedIdsRef.current.add(id);
    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // ignore storage access errors if in restricted mode
    }
    incrementViews(id);
  }, [id, incrementViews]);

  // Set show3D when property with valid dimensions loads
  useEffect(() => {
    if (property) {
      const hasValidRoomDimensions =
        property.threeDConfig?.floors?.some((floor) => floor.rooms?.length) ||
        (Array.isArray(property.rooms) && property.rooms.length > 0) ||
        (Number(property.roomLength) > 0 && Number(property.roomWidth) > 0);
      if (hasValidRoomDimensions) setShow3D(true);
    }
  }, [property]);

  // Dynamically compute property room stats directly from property.rooms
  const stats = useMemo(() => computePropertyStats(property), [property]);

  // Extract and resolve property-level photos
  const propertyPhotos = useMemo(() => {
    if (!property?.photos || !Array.isArray(property.photos)) return [];
    return property.photos
      .map((p) => (typeof p === 'object' && p ? p.url || p.path : p))
      .filter((p) => typeof p === 'string' && p.trim().length > 0)
      .map(resolveMediaUrl);
  }, [property]);

  const isPdfFloorPlan = useMemo(() => {
    if (!property?.floorPlan?.url) return false;
    const url = String(property.floorPlan.url).toLowerCase();
    const type = String(property.floorPlan.type || '').toLowerCase();
    const name = String(property.floorPlan.name || '').toLowerCase();
    return url.endsWith('.pdf') || type.includes('pdf') || name.endsWith('.pdf');
  }, [property?.floorPlan]);

  // Extract all room photos as fallback if property has no photos
  const allRoomPhotos = useMemo(() => {
    if (!property?.rooms || !Array.isArray(property.rooms)) return [];
    return property.rooms.flatMap((r) => {
      if (!Array.isArray(r.photos)) return [];
      return r.photos
        .map((p) => (typeof p === 'object' && p ? p.url || p.path : p))
        .filter((p) => typeof p === 'string' && p.trim().length > 0)
        .map((url) => ({
          url: resolveMediaUrl(url),
          roomName: r.name || 'Room',
        }));
    });
  }, [property]);

  // Display photos for gallery: property photos, or fallback to room photos
  const displayPhotos = propertyPhotos.length > 0
    ? propertyPhotos
    : allRoomPhotos.map((item) => item.url);

  if (!property) {
    return (
      <div className="section flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Property not found</h2>
        <Link to="/search" className="btn-primary">Back to Search</Link>
      </div>
    );
  }

  const isFav = favorites?.includes(String(property.id || property._id));
  const isOwner = user && (String(property.ownerId?._id || property.ownerId) === String(user.id || user._id));
  const propertyAddress = `${property.address}, ${property.area}, ${property.city}, ${property.state} ${property.pincode}`;
  const mapQuery = encodeURIComponent(propertyAddress);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const isLand = isPlotOrLandType(property.propertyType || property.type || property.category);
  const pricing = getPropertyPricing(property);
  const utilities = getPropertyUtilities(property);

  const specs = isLand
    ? [
        { icon: MdSquareFoot, label: 'Plot Area', value: `${stats.sqft || property.squareFeet || property.size || 0} sqft` },
        { icon: MdSquareFoot, label: 'Dimensions', value: property.dimensions || (property.rooms?.[0]?.length && property.rooms?.[0]?.width ? `${property.rooms[0].length} × ${property.rooms[0].width} ft` : '30 × 40 ft') },
        ...(property.landUsage ? [{ icon: FiLayers, label: 'Usage', value: property.landUsage }] : []),
        ...(property.facing ? [{ icon: FiMapPin, label: 'Facing', value: property.facing }] : []),
        ...(property.roadAccess ? [{ icon: FiBox, label: 'Road Access', value: property.roadAccess }] : []),
        ...(property.boundary ? [{ icon: FiLayers, label: 'Boundary', value: property.boundary }] : []),
      ]
    : [
        { icon: BiBed, label: 'Bedrooms', value: stats.bedrooms },
        { icon: BiBath, label: 'Bathrooms', value: stats.bathrooms },
        { icon: MdKitchen, label: 'Kitchen', value: stats.kitchen },
        { icon: MdWeekend, label: 'Hall / Living Room', value: stats.hall },
        { icon: MdLocalParking, label: 'Parking', value: stats.parking },
        { icon: MdSquareFoot, label: 'Area', value: `${stats.sqft} sqft` },
      ];

  const mainPhoto = displayPhotos[activePhotoIdx] || displayPhotos[0];

  return (
    <div className="section py-8">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 !px-3">
        <FiArrowLeft /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {/* Main Image Gallery */}
          {mainPhoto ? (
            <motion.div
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                onClick={() => openLightbox(mainPhoto, property.title, displayPhotos, activePhotoIdx)}
                className="group relative cursor-pointer overflow-hidden rounded-16 bg-slate-100 shadow-md dark:bg-slate-800"
              >
                <img
                  src={mainPhoto}
                  alt={property.title}
                  className="h-72 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 md:h-96"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm shadow-lg">
                    <FiMaximize2 size={16} /> Click to Enlarge
                  </span>
                </div>
                {displayPhotos.length > 1 && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    Photo {activePhotoIdx + 1} of {displayPhotos.length}
                  </span>
                )}
              </div>

              {displayPhotos.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {displayPhotos.map((photo, index) => (
                    <motion.button
                      key={index}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActivePhotoIdx(index)}
                      className={`relative overflow-hidden rounded-12 transition focus:outline-none ${
                        activePhotoIdx === index
                          ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`${property.title} thumbnail ${index + 1}`}
                        className="h-16 w-full object-cover md:h-20"
                      />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <MediaPlaceholder icon="image" label="Property Gallery Placeholder" className="h-72 w-full md:h-96" />
          )}

          {/* Video Tour */}
          {property.videos?.length ? (
            <div className="mt-8">
              <h3 className="mb-3 font-display text-lg font-semibold">Video Tour</h3>
              <div className="overflow-hidden rounded-16 shadow-md">
                <video controls src={resolveMediaUrl(property.videos[0])} className="h-56 w-full object-cover" />
              </div>
            </div>
          ) : null}

          {/* Property Header */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-start justify-between gap-4"
          >
            <div>
              <span className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white shadow-xs ${pricing.badgeColor}`}>
                {pricing.badgeText}
              </span>
              <h1 className="font-display text-2xl font-bold md:text-3xl">{property.title}</h1>
              <p className="mt-2 flex items-center gap-1 text-ink/60 dark:text-slate-400">
                <FiMapPin size={16} /> {property.address}, {property.area}, {property.city}, {property.state} - {property.pincode}
              </p>
            </div>
            <div className="text-right">
              {pricing.isBoth ? (
                <div>
                  <p className="font-display text-2xl font-bold text-primary">{pricing.salePriceFormatted}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rent: {pricing.monthlyRentFormatted}</p>
                </div>
              ) : pricing.isSale ? (
                <div>
                  <p className="font-display text-3xl font-bold text-primary">{pricing.salePriceFormatted}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sale Price</p>
                </div>
              ) : (
                <div>
                  <p className="font-display text-3xl font-bold text-primary">{pricing.monthlyRentFormatted}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Rent</p>
                </div>
              )}
              {user?.role === 'tenant' && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  onClick={() => toggleFavorite(property.id || property._id)}
                  aria-label={isFav ? 'Remove from wishlist' : 'Save to wishlist'}
                  className={`mt-2.5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors duration-200 border ${
                    isFav
                      ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/25 hover:bg-rose-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-rose-400 hover:text-rose-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:border-rose-400 dark:hover:text-rose-400 dark:hover:bg-slate-750'
                  }`}
                >
                  <FiHeart className={`text-sm ${isFav ? 'fill-current text-white' : 'stroke-[2.2]'}`} />
                  <span>{isFav ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Property Key Specs Card */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="card mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 p-4 sm:p-6 border border-slate-200 dark:border-slate-800"
          >
            {specs.map((s) => (
              <motion.div key={s.label} whileHover={{ y: -2 }} className="text-center">
                <s.icon className="mx-auto mb-1 text-primary dark:text-accent" size={24} />
                <p className="text-sm font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Rent & Utility Charges Breakdown - High-Contrast in Light and Dark Themes */}
          {!(isLand && pricing.isSale) && (
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="card mt-6 p-5 border border-slate-200 dark:border-slate-800"
            >
              <h3 className="mb-4 font-display text-base font-bold text-slate-900 dark:text-white">
                {utilities.sectionTitle}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-12 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                    {pricing.isSale ? 'Sale Price' : pricing.isBoth ? 'Sale / Rent' : 'Monthly Rent'}
                  </p>
                  <p className="font-bold text-primary dark:text-accent text-lg mt-1">
                    {pricing.isSale
                      ? pricing.salePriceFormatted
                      : pricing.isBoth
                      ? `${pricing.salePriceFormatted} · ${pricing.monthlyRentFormatted}`
                      : pricing.monthlyRentFormatted}
                  </p>
                </div>

                <div className="rounded-12 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <FiZap className="text-amber-500 dark:text-amber-400 shrink-0" size={16} />
                    <span>Electricity Bill</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white text-base mt-1">
                    {utilities.electricity}
                  </p>
                </div>

                <div className="rounded-12 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-sky-300">
                    <FiDroplet className="text-blue-500 dark:text-sky-400 shrink-0" size={16} />
                    <span>Water Charges</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white text-base mt-1">
                    {utilities.water}
                  </p>
                </div>

                <div className="rounded-12 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Maintenance Charges</p>
                  <p className="font-bold text-slate-900 dark:text-white text-base mt-1">
                    {utilities.maintenance}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Description */}
          <div className="mt-8">
            <h3 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">Description</h3>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">{property.description}</p>
          </div>

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary dark:bg-primary/20 dark:text-champagne">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-24 h-fit">
          <div className="card p-6">
            <h3 className="mb-4 font-display font-semibold">Landlord Contact</h3>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FiUser size={20} />
              </div>
              <div>
                <p className="font-semibold">{landlordName}</p>
                <p className="text-xs text-ink/50 dark:text-slate-400">Property Owner</p>
              </div>
            </div>

            {displayLandlordPhone ? (
              <div className="mb-4 rounded-xl bg-surface/80 p-3.5 border border-ink/5 dark:border-white/5 dark:bg-slate-800/60">
                <p className="text-xs font-medium text-ink/50 dark:text-slate-400 mb-1">Phone Number</p>
                <p className="flex items-center gap-2 font-mono text-sm font-semibold text-ink dark:text-white">
                  <FiPhone className="text-primary text-base shrink-0" />
                  <span>{displayLandlordPhone}</span>
                </p>
              </div>
            ) : (
              <p className="mb-4 text-xs text-ink/50 dark:text-slate-400">Phone number not provided</p>
            )}

            {callPhone && (
              <a
                href={`tel:${callPhone}`}
                className="btn-primary w-full flex items-center justify-center gap-2 shadow-sm"
              >
                <FiPhone /> Call Landlord
              </a>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="card space-y-3 p-6"
          >
            {isOwner && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to={`/landlord/edit-property/${property.id}`}
                  className="btn-primary w-full flex items-center justify-center gap-2 shadow-sm font-semibold"
                >
                  <FiEdit2 /> Edit Property
                </Link>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button
                onClick={() => {
                  setShow3D((s) => {
                    const next = !s;
                    if (!s) {
                      setTimeout(() => {
                        document.getElementById('property-3d-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                    return next;
                  });
                }}
                className="btn-outline w-full"
              >
                <FiBox /> {show3D ? 'Hide' : 'View'} {isLand ? '3D Plot' : '3D House'}
              </button>
            </motion.div>
            {property.floorPlan?.url && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button
                  onClick={() => {
                    document.getElementById('property-floorplan-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-outline w-full"
                >
                  <FiFileText /> View 2D Floor Plan
                </button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button onClick={() => navigate(`/property/${property.id}/expenses`)} className="btn-secondary w-full">
                <FiPieChart /> Expense Calculator
              </button>
            </motion.div>
          </motion.div>

          <div className="card p-6 text-sm text-ink/60 dark:text-slate-400">
            <p className="mb-2 flex justify-between"><span>Views</span><span className="font-semibold text-ink dark:text-white">{property.views}</span></p>
            <p className="flex justify-between"><span>Interested Tenants</span><span className="font-semibold text-ink dark:text-white">{property.interested}</span></p>
          </div>
        </div>
      </div>

      {/* Rooms & Spaces Section - FULL WIDTH of Property Details content area */}
      {property.rooms && property.rooms.length > 0 && (
        <section id="rooms-spaces-section" className="mt-12 scroll-mt-28 w-full max-w-none relative">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Rooms & Spaces</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Detailed room layout, dimensions, and interior photos
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary dark:text-accent dark:bg-primary/20">
              <FiLayers size={14} /> {property.rooms.length} Room Categories
            </span>
          </div>

          {/* Responsive Grid: 3 cards per row on desktop, 2 on tablet, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch w-full">
            {property.rooms.map((room, idx) => {
              const roomPhotos = (room.photos || [])
                .map((p) => (typeof p === 'object' && p ? p.url || p.path : p))
                .filter((p) => typeof p === 'string' && p.trim().length > 0)
                .map(resolveMediaUrl);

              const icon = getRoomIcon(room.name, room.type);
              const roomL = Number(room.length) || 0;
              const roomW = Number(room.width) || 0;
              const areaSqft = Number(room.area) || (roomL > 0 && roomW > 0 ? roomL * roomW : null);
              const count = Number(room.count) || 1;
              const rawName = (room.name || '').trim();
              const isBedroom2 = rawName.toLowerCase() === 'bedroom' && property.rooms.some(r => r.id !== room.id && (r.name || '').toLowerCase().includes('master'));
              const displayName = isBedroom2 ? 'Bedroom 2' : (rawName.toLowerCase() === 'living room' || rawName.toLowerCase() === 'living' ? 'Living Room' : (rawName || 'Room'));

              return (
                <div
                  key={room.id || idx}
                  className="card flex flex-col justify-between overflow-hidden p-5 sm:p-6 transition hover:border-primary/40 shadow-sm border border-slate-200 dark:border-slate-800"
                >
                  <div>
                    {/* Room Header & Details */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-12 bg-primary/10 text-2xl">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                              {displayName}
                            </h4>
                            {count > 1 && (
                              <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-bold text-secondary dark:bg-secondary/30 dark:text-champagne">
                                {count} {count === 1 ? 'Room' : 'Rooms'}
                              </span>
                            )}
                          </div>
                          {room.description && (() => {
                            const descKey = room.id || `room-desc-${idx}`;
                            const isLong = room.description.length > 85;
                            const isExpanded = !!expandedDescriptions[descKey];

                            return (
                              <div className="mt-1.5">
                                <p className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                                  {room.description}
                                </p>
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() => toggleDescription(descKey)}
                                    className="mt-1 text-xs font-semibold text-primary dark:text-accent hover:underline inline-flex items-center gap-0.5 cursor-pointer focus:outline-none"
                                  >
                                    {isExpanded ? 'See Less' : 'See More'}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Room Dimensions & Specs Badges */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {roomL > 0 && roomW > 0 && (
                          <span className="flex items-center gap-1.5 rounded-8 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <MdSquareFoot className="text-primary dark:text-accent" size={16} />
                            {roomL} × {roomW} {room.unit || 'ft'}
                          </span>
                        )}
                        {areaSqft > 0 && (
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {areaSqft} sq. ft.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Room Photos with Consistent Fixed Height Area */}
                    {roomPhotos.length > 0 ? (
                      <div className="mt-4">
                        <div
                          onClick={() => openLightbox(roomPhotos[0], `${displayName} (Photo 1 of ${roomPhotos.length})`, roomPhotos, 0)}
                          className="group relative h-52 sm:h-56 w-full cursor-pointer overflow-hidden rounded-12 bg-slate-100 dark:bg-slate-800 shadow-sm"
                        >
                          <img
                            src={roomPhotos[0]}
                            alt={`${displayName}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <span className="flex items-center gap-1.5 rounded-full bg-black/75 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm shadow">
                              <FiMaximize2 size={14} /> View Photo
                            </span>
                          </div>
                          {roomPhotos.length > 1 && (
                            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                              +{roomPhotos.length - 1} more
                            </span>
                          )}
                        </div>
                        {roomPhotos.length > 1 && (
                          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                            {roomPhotos.slice(1).map((photoUrl, pIdx) => (
                              <button
                                key={pIdx + 1}
                                type="button"
                                onClick={() => openLightbox(photoUrl, `${displayName} (Photo ${pIdx + 2} of ${roomPhotos.length})`, roomPhotos, pIdx + 1)}
                                className="relative h-14 w-20 flex-none overflow-hidden rounded-8 border border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100 transition"
                              >
                                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2D Floor Plan Section - Only rendered if a valid floorPlan exists */}
      {property.floorPlan?.url && (
        <section id="property-floorplan-section" className="mt-12 scroll-mt-28 w-full">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                2D Floor Plan
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Architectural layout and spatial room arrangement reference
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPdfFloorPlan ? (
                <a
                  href={resolveMediaUrl(property.floorPlan.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline !py-2 !px-4 text-xs font-semibold"
                >
                  <FiExternalLink /> Open PDF Plan
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => openLightbox(resolveMediaUrl(property.floorPlan.url), `${property.title} — 2D Floor Plan`, [resolveMediaUrl(property.floorPlan.url)], 0)}
                  className="btn-outline !py-2 !px-4 text-xs font-semibold"
                >
                  <FiMaximize2 /> Expand Full View
                </button>
              )}
            </div>
          </div>

          <div className="card overflow-hidden border border-slate-200 p-4 sm:p-6 dark:border-slate-800 shadow-sm">
            {isPdfFloorPlan ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:bg-red-500/20">
                  <FiFileText size={36} />
                </div>
                <div>
                  <h4 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {property.floorPlan.name || 'Architectural Floor Plan.pdf'}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    PDF Document {property.floorPlan.size ? `· ${(property.floorPlan.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={resolveMediaUrl(property.floorPlan.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary !py-2.5 !px-5 text-sm"
                  >
                    <FiExternalLink /> View PDF Document
                  </a>
                  <a
                    href={resolveMediaUrl(property.floorPlan.url)}
                    download
                    className="btn-outline !py-2.5 !px-5 text-sm"
                  >
                    <FiDownload /> Download Plan
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div
                  onClick={() => openLightbox(resolveMediaUrl(property.floorPlan.url), `${property.title} — 2D Floor Plan`, [resolveMediaUrl(property.floorPlan.url)], 0)}
                  className="group relative max-h-[550px] w-full cursor-pointer overflow-hidden rounded-12 bg-slate-50 dark:bg-slate-900/70 p-2 flex items-center justify-center"
                >
                  <img
                    src={resolveMediaUrl(property.floorPlan.url)}
                    alt={`${property.title} Floor Plan`}
                    className="max-h-[500px] w-auto max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100 rounded-12">
                    <span className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm shadow-lg">
                      <FiMaximize2 size={15} /> Click to Expand & Zoom
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    {property.floorPlan.name || 'Architectural Floor Plan'}
                    {property.floorPlan.size ? ` · ${(property.floorPlan.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                  </span>
                  {property.floorPlan.layout?.summary && (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ {property.floorPlan.layout.summary}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3D House/Plot View - FULL WIDTH */}
      {show3D && (
        <motion.div
          id="property-3d-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 scroll-mt-28 w-full"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold">{isLand ? '3D Plot View' : '3D House View'}</h3>
              <p className="text-xs text-ink/50 dark:text-slate-400">
                {isLand
                  ? 'Boundary dimensions and land area visualization · Left drag: rotate · Right drag: pan · Scroll: zoom'
                  : 'Generated from landlord room dimensions · Left drag: rotate · Right drag: pan · Scroll: zoom'}
              </p>
            </div>
          </div>
          <div className="card relative isolate z-0 h-[28rem] sm:h-[34rem] lg:h-[38rem] max-h-[75vh] min-h-[420px] overflow-hidden p-2 shadow-card">
            <Room3D
              config={property.threeDConfig}
              floorPlan={property.floorPlan || property.threeDConfig?.floorPlan}
              canonicalLayout={property.canonicalLayout || property.floorPlan?.layout || property.threeDConfig?.canonicalLayout}
              rooms={property.rooms}
              furnishing={property.furnished || property.threeDConfig?.furnishing}
              propertyType={property.propertyType || property.type}
              type={property.type}
              listingType={property.listingType || property.status}
              transactionType={property.transactionType || property.status}
              isLand={isLand}
              length={property.roomLength}
              width={property.roomWidth}
              height={property.roomHeight}
              bedrooms={stats.bedrooms}
              bathrooms={stats.bathrooms}
              kitchen={stats.kitchen}
              hall={stats.hall}
              sqft={stats.sqft}
              parking={stats.parking}
              floors={property.floors || property.totalFloors || property.numberOfFloors || 1}
            />
          </div>
        </motion.div>
      )}

      {/* Location Map - FULL WIDTH */}
      <div className="mt-12 w-full">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">Location</h3>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
            Open in Google Maps
          </a>
        </div>
        <div className="card overflow-hidden p-2">
          <iframe
            title={`Map showing ${property.title}`}
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            className="h-72 w-full rounded-12 border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      {/* Lightbox Photo Viewer Modal */}
      <AnimatePresence>
        {lightbox.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Bar with Title and Close Button */}
            <div className="absolute left-6 top-5 z-20 text-white" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-base font-semibold drop-shadow">{lightbox.title}</h4>
              {lightbox.photos.length > 1 && (
                <p className="text-xs text-slate-300">
                  Photo {lightbox.index + 1} of {lightbox.photos.length}
                </p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.12, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={closeLightbox}
              className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 focus:outline-none"
              aria-label="Close photo viewer"
            >
              <FiX size={24} />
            </motion.button>

            {/* Prev Photo Button */}
            {lightbox.photos.length > 1 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={prevLightboxPhoto}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 focus:outline-none"
                aria-label="Previous photo"
              >
                <FiChevronLeft size={28} />
              </motion.button>
            )}

            {/* Next Photo Button */}
            {lightbox.photos.length > 1 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={nextLightboxPhoto}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 focus:outline-none"
                aria-label="Next photo"
              >
                <FiChevronRight size={28} />
              </motion.button>
            )}

            {/* Centered Image with Smooth Animation */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-h-[85vh] max-w-[92vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.currentUrl}
                alt={lightbox.title}
                className="max-h-[85vh] max-w-[92vw] select-none rounded-12 object-contain shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
