import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  FiArrowLeft, FiArrowRight, FiCheck, FiDollarSign, FiGrid, FiHome,
  FiLayers, FiPlus, FiSave, FiTrash2, FiUploadCloud, FiFileText,
  FiImage, FiRefreshCw, FiExternalLink, FiMaximize2, FiX, FiInfo,
} from 'react-icons/fi';
import MediaUpload from '../../components/MediaUpload';
import Room3D, { classifyRoomType } from '../../components/Room3D';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { AMENITIES_LIST } from '../../data/mockData';
import api from '../../utils/api';
import { validateFloorPlanFile, analyzeFloorPlanFile } from '../../utils/floorPlanAnalyzer';
import { buildCanonicalLayout } from '../../utils/canonicalLayout';
import { resolveMediaUrl } from '../../utils/media';
import { getListingTitlePlaceholder, getSizeLabel, isPlotOrLandType } from '../../utils/propertyFormHelpers';

const DRAFT_KEY = 'rentease_property_draft';
const STEPS = ['Listing type', 'Property type', 'Property details', 'Rent / Sale', 'Room details', '2D Floor Plan', 'Preview'];
const LISTING_TYPES = [
  { value: 'Rent', label: 'For Rent', icon: FiHome, description: 'Offer this property on a monthly lease.' },
  { value: 'Sale', label: 'For Sale', icon: FiDollarSign, description: 'List this property for a one-time sale.' },
  { value: 'Both', label: 'Rent or Sale', icon: FiLayers, description: 'Let people choose between both options.' },
];
const PROPERTY_TYPES = [
  { value: 'Flat', label: 'Flat / Apartment', icon: FiGrid },
  { value: 'House', label: 'House', icon: FiHome },
  { value: 'Land', label: 'Land / Plot', icon: FiLayers },
];
const FURNISHED_OPTIONS = ['Furnished', 'Semi-furnished', 'Unfurnished'];

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const sanitizeMediaUrls = (list) => {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof item.url === 'string') return item.url.trim();
      return '';
    })
    .filter(Boolean);
};

const makeRoom = (index = 0) => ({
  id: `room-${Date.now()}-${index}`,
  name: index === 0 ? 'Living room' : '',
  length: '', width: '', height: '', count: 1, description: '', photos: [],
});

const generateDefaultHouseRooms = (numBedrooms = 2, numBathrooms = 1) => {
  const beds = Math.max(1, Number(numBedrooms) || 1);
  const baths = Math.max(1, Number(numBathrooms) || 1);
  const generated = [
    { id: `room-${Date.now()}-living`, name: 'Living Room', type: 'living', length: 18, width: 14, height: 10, count: 1, description: '', photos: [] },
    { id: `room-${Date.now()}-kitchen`, name: 'Kitchen', type: 'kitchen', length: 12, width: 10, height: 10, count: 1, description: '', photos: [] },
  ];
  if (beds > 0) {
    generated.push({ id: `room-${Date.now()}-bed-1`, name: beds > 1 ? 'Master Bedroom' : 'Bedroom', type: 'bedroom', length: 14, width: 12, height: 10, count: 1, description: '', photos: [] });
    for (let i = 2; i <= beds; i++) {
      generated.push({ id: `room-${Date.now()}-bed-${i}`, name: `Bedroom ${i}`, type: 'bedroom', length: 12, width: 10, height: 10, count: 1, description: '', photos: [] });
    }
  }
  for (let b = 1; b <= baths; b++) {
    generated.push({ id: `room-${Date.now()}-bath-${b}`, name: baths > 1 ? `Bathroom ${b}` : 'Bathroom', type: 'bathroom', length: 8, width: 6, height: 9, count: 1, description: '', photos: [] });
  }
  return generated;
};

const generateDefaultPlotEntity = (areaSqFt = 1200, customLength = '', customWidth = '') => {
  const sqft = Number(areaSqFt) || 1200;
  let w = Number(customWidth) || Math.round(Math.sqrt(sqft / 1.33));
  let l = Number(customLength) || Math.round(sqft / Math.max(1, w));
  return [{
    id: `plot-boundary-${Date.now()}`,
    name: 'Plot Area',
    type: 'land',
    length: customLength || l,
    width: customWidth || w,
    height: 0,
    area: sqft,
    count: 1,
    description: '',
    photos: [],
    unit: 'ft',
  }];
};

const initialForm = {
  listingType: '', propertyType: '', title: '', description: '', address: '', city: '', area: '', state: '', pincode: '', size: '',
  bedrooms: '', bathrooms: '', floorNumber: '', totalFloors: '', furnished: '', balcony: '', parking: '', garden: '', amenities: [],
  landArea: '', landUnit: 'sq. ft.', landUsage: '', roadAccess: '', facing: '', boundary: '', dimensions: '', water: false, electricity: false,
  monthlyRent: '', securityDeposit: '', maintenanceCharges: '', availableFrom: '', leaseDuration: '',
  electricityBill: 'Included in Rent', monthlyElectricityCharge: '',
  waterCharges: 'Included in Rent', monthlyWaterCharge: '',
  salePrice: '', pricePerSqft: '', negotiable: 'No',
  rooms: [makeRoom()], use3D: true,
  floorPlan: null,
};

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder = '', children, min, step }) {
  return <div><label className="label">{label}{required && <span className="text-accent"> *</span>}</label>{children || <input name={name} value={value ?? ''} onChange={onChange} className="input" required={required} placeholder={placeholder} min={min} step={step} type={type} />}</div>;
}

function ChoiceCard({ choice, selected, onSelect }) {
  const Icon = choice.icon;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(choice.value)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={selected ? { scale: [1, 1.025, 1] } : { scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex min-h-32 flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all duration-200 ${
        selected
          ? 'border-accent bg-accent/15 shadow-md ring-2 ring-accent/30'
          : 'border-black/10 bg-surface hover:border-accent/60 dark:border-white/10 dark:bg-slate-800/50 hover:shadow-sm'
      }`}
    >
      <motion.span
        animate={selected ? { rotate: [0, -8, 8, 0], scale: 1.08 } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          selected ? 'bg-accent text-primary shadow-xs' : 'bg-primary/10 text-primary'
        }`}
      >
        <Icon size={20} />
      </motion.span>
      <span>
        <span className="block font-semibold">{choice.label}</span>
        {choice.description && (
          <span className="mt-1 block text-sm text-ink/60 dark:text-slate-400">{choice.description}</span>
        )}
      </span>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="absolute right-4 top-4 text-accent"
        >
          <FiCheck aria-label="Selected" size={18} />
        </motion.div>
      )}
    </motion.button>
  );
}

function RoomEditor({ room, index, onChange, onRemove, canRemove }) {
  const change = (event) => onChange({ ...room, [event.target.name]: event.target.value });
  const handleRoomPhotosChange = (uploadedPhotos) => {
    const urls = sanitizeMediaUrls(uploadedPhotos);
    onChange({ ...room, photos: urls });
  };
  return (
    <div className="card space-y-4 border border-black/5 p-5 dark:border-white/5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display font-semibold">Room {index + 1}</h3>{canRemove && <button type="button" onClick={onRemove} className="btn-ghost !px-2 text-red-600" aria-label="Remove room"><FiTrash2 /></button>}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Room name" name="name" value={room.name} onChange={change} required placeholder="Bedroom, Hall, Kitchen..." />
        <Field label="Number of rooms" name="count" value={room.count} onChange={change} type="number" min="1" required />
        <Field label="Room length" name="length" value={room.length} onChange={change} type="number" min="0.1" step="0.1" required />
        <Field label="Room width" name="width" value={room.width} onChange={change} type="number" min="0.1" step="0.1" required />
        <Field label="Room height (optional)" name="height" value={room.height} onChange={change} type="number" min="0.1" step="0.1" />
      </div>
      <Field label="Room description" name="description" value={room.description} onChange={change} placeholder="Add any useful room-specific details." />
      <MediaUpload label="Room photos (optional)" accept="image/*" files={room.photos || []} onChange={handleRoomPhotosChange} type="image" />
    </div>
  );
}

function PlotBoundaryEditor({ room, onChange, landDetails = {} }) {
  const change = (event) => onChange({ ...room, [event.target.name]: event.target.value });
  const l = Number(room?.length) || 0;
  const w = Number(room?.width) || 0;
  const calcArea = l * w;

  return (
    <div className="card space-y-4 border border-black/5 p-5 dark:border-white/5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-semibold">Plot Boundary Dimensions</h3>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Land / Plot Terrain
        </span>
      </div>
      <p className="text-xs text-ink/60 dark:text-slate-400">
        Specify boundary length and frontage width (in feet) to render the 3D terrain and property boundary markings.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plot Length (ft)" name="length" value={room.length} onChange={change} type="number" min="1" step="0.5" required placeholder="e.g. 40" />
        <Field label="Plot Width / Frontage (ft)" name="width" value={room.width} onChange={change} type="number" min="1" step="0.5" required placeholder="e.g. 30" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3 text-xs text-ink/70 dark:text-slate-300 bg-black/5 dark:bg-white/5 p-3 rounded-xl">
        <div><span className="font-semibold">Facing:</span> {landDetails.facing || 'East'}</div>
        <div><span className="font-semibold">Road Access:</span> {landDetails.roadAccess || 'Direct'}</div>
        <div><span className="font-semibold">Boundary Area:</span> {calcArea > 0 ? `${calcArea} sq. ft.` : 'Auto-calculated'}</div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  if (value === '' || value === undefined || value === null || (Array.isArray(value) && !value.length)) return null;
  return <div className="flex flex-wrap justify-between gap-3 border-b border-black/5 py-2 text-sm last:border-0 dark:border-white/5"><span className="text-ink/60 dark:text-slate-400">{label}</span><span className="text-right font-medium">{Array.isArray(value) ? value.join(', ') : String(value)}</span></div>;
}

export default function AddProperty() {
  const { user } = useAuth();
  const { addProperty } = useAppData();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState('');
  const draftKey = `${DRAFT_KEY}:${user?.id || 'anonymous'}`;

  const floorPlanInputRef = useRef(null);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [planUploadError, setPlanUploadError] = useState('');
  const [isDraggingPlan, setIsDraggingPlan] = useState(false);
  const [floorPlanModal, setFloorPlanModal] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'landlord') {
      navigate('/tenant/wishlist', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (!draft) return;
    try {
      const saved = JSON.parse(draft);
      const restoredRooms = (saved.form?.rooms?.length ? saved.form.rooms : [makeRoom()]).map((r) => ({
        ...r,
        photos: sanitizeMediaUrls(r.photos),
      }));
      setForm({ ...initialForm, ...saved.form, rooms: restoredRooms, floorPlan: saved.form?.floorPlan || null });
      setPhotos(sanitizeMediaUrls(saved.photos || []));
      setVideos(sanitizeMediaUrls(saved.videos || []));
      setMessage('Saved draft restored.');
    } catch { localStorage.removeItem(draftKey); }
  }, [draftKey]);

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const isLand = isPlotOrLandType(form.propertyType);
  const isHome = form.propertyType === 'Flat' || form.propertyType === 'House';

  const handleSizeChange = (e) => {
    const val = e.target.value;
    setForm((current) => ({
      ...current,
      size: val,
      ...(isPlotOrLandType(current.propertyType) && !current.landArea ? { landArea: val } : {}),
    }));
  };

  const handlePropertyTypeSelect = (value) => {
    const isNowLand = isPlotOrLandType(value);
    setForm((current) => {
      let updatedRooms = current.rooms;
      if (isNowLand) {
        updatedRooms = generateDefaultPlotEntity(current.landArea || current.size || 1200);
      } else if (!current.rooms || current.rooms.length <= 1 || current.rooms[0]?.type === 'land') {
        updatedRooms = generateDefaultHouseRooms(current.bedrooms || 2, current.bathrooms || 1);
      }
      return {
        ...current,
        propertyType: value,
        rooms: updatedRooms,
      };
    });
  };

  const handleBedroomsChange = (e) => {
    const val = e.target.value;
    setForm((current) => {
      const isHomeType = current.propertyType === 'House' || current.propertyType === 'Flat';
      const roomsCustomized = current.rooms && current.rooms.length > 1 && current.rooms.some((r) => Number(r.length) > 0);
      let nextRooms = current.rooms;
      if (isHomeType && !roomsCustomized) {
        nextRooms = generateDefaultHouseRooms(val, current.bathrooms || 1);
      }
      return { ...current, bedrooms: val, rooms: nextRooms };
    });
  };

  const handleBathroomsChange = (e) => {
    const val = e.target.value;
    setForm((current) => {
      const isHomeType = current.propertyType === 'House' || current.propertyType === 'Flat';
      const roomsCustomized = current.rooms && current.rooms.length > 1 && current.rooms.some((r) => Number(r.length) > 0);
      let nextRooms = current.rooms;
      if (isHomeType && !roomsCustomized) {
        nextRooms = generateDefaultHouseRooms(current.bedrooms || 2, val);
      }
      return { ...current, bathrooms: val, rooms: nextRooms };
    });
  };

  const validateStep = (currentStep) => {
    if (currentStep === 0 && !form.listingType) return 'Choose whether the property is for rent, sale, or both.';
    if (currentStep === 1 && !form.propertyType) return 'Choose a property type to continue.';
    if (currentStep === 2) {
      if (['title', 'description', 'address', 'city', 'area', 'state', 'pincode', 'size'].some((key) => !String(form[key]).trim())) return 'Complete all required property and location details.';
      if (isLand && (!form.landArea || !form.landUsage)) return 'Add the land area and intended land usage.';
      if (isHome && (!form.bedrooms || !form.bathrooms)) return 'Add the number of bedrooms and bathrooms.';
    }
    if (currentStep === 3) {
      if ((form.listingType === 'Rent' || form.listingType === 'Both')) {
        if (!form.monthlyRent || !form.availableFrom) return 'Add monthly rent and an available-from date.';
        if (form.electricityBill === 'Fixed Monthly Amount' && (form.monthlyElectricityCharge === '' || Number(form.monthlyElectricityCharge) < 0 || isNaN(Number(form.monthlyElectricityCharge)))) {
          return 'Enter a valid monthly electricity charge (0 or greater).';
        }
        if (form.waterCharges === 'Fixed Monthly Amount' && (form.monthlyWaterCharge === '' || Number(form.monthlyWaterCharge) < 0 || isNaN(Number(form.monthlyWaterCharge)))) {
          return 'Enter a valid monthly water charge (0 or greater).';
        }
      }
      if ((form.listingType === 'Sale' || form.listingType === 'Both') && !form.salePrice) return 'Add the total sale price.';
    }
    if (currentStep === 4 && !isLand && form.rooms.some((room) => !room.name.trim() || !room.length || !room.width)) return 'Complete each room name, length, and width.';
    return '';
  };

  const goNext = () => {
    const error = validateStep(step);
    if (error) { setErrors(error); return; }
    setErrors('');
    setDirection(1);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors('');
    setDirection(-1);
    setStep((current) => Math.max(current - 1, 0));
  };

  const stepVariants = {
    enter: (dir) => ({
      x: shouldReduceMotion ? 0 : (dir > 0 ? 36 : -36),
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.985,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: (dir) => ({
      x: shouldReduceMotion ? 0 : (dir > 0 ? -36 : 36),
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.985,
      transition: {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  const saveDraft = () => {
    localStorage.setItem(draftKey, JSON.stringify({ form, photos, videos, savedAt: new Date().toISOString() }));
    setMessage('Draft saved on this device.');
    setErrors('');
  };

  const createThreeDConfig = () => {
    if (isLand) {
      const plotAreaSqFt = Number(form.landArea) || Number(form.size) || 1200;
      let plotL = Number(form.rooms?.[0]?.length) || 0;
      let plotW = Number(form.rooms?.[0]?.width) || 0;
      if (!plotL || !plotW) {
        plotW = Math.round(Math.sqrt(plotAreaSqFt / 1.33));
        plotL = Math.round(plotAreaSqFt / Math.max(1, plotW));
      }
      const plotRoom = {
        id: 'plot-boundary-0',
        name: 'Plot Area',
        type: 'land',
        length: plotL,
        width: plotW,
        height: 0,
        area: plotL * plotW,
        count: 1,
        description: '',
        photos: [],
        unit: 'ft',
        floorNumber: 0,
      };

      const canonical = buildCanonicalLayout([plotRoom], form.floorPlan || null, {
        unit: 'ft',
        wallThickness: 0.12,
        wallHeight: 0.40,
        totalFloors: 1,
        propertyType: 'Land',
        isLand: true,
      });

      return {
        enabled: form.use3D,
        unit: 'ft',
        isLand: true,
        propertyType: 'Land',
        type: 'land',
        wallThickness: 0.12,
        floorPlan: form.floorPlan ? { ...form.floorPlan, layout: canonical } : null,
        canonicalLayout: canonical,
        floors: [{
          floorNumber: 0,
          rooms: canonical.rooms && canonical.rooms.length > 0 ? canonical.rooms : [plotRoom],
        }],
      };
    }

    // Residential House / Flat
    const sourceRooms = (form.rooms && form.rooms.length > 0)
      ? form.rooms
      : generateDefaultHouseRooms(form.bedrooms || 2, form.bathrooms || 1);

    const formattedRooms = sourceRooms.map((room, roomIdx) => {
      const parsedLen = Number(room.length);
      const parsedWid = Number(room.width);
      const defaultLen = room.type === 'living' ? 18 : room.type === 'bathroom' ? 8 : room.type === 'kitchen' ? 12 : 14;
      const defaultWid = room.type === 'living' ? 14 : room.type === 'bathroom' ? 6 : room.type === 'kitchen' ? 10 : 12;
      const len = parsedLen > 0 ? parsedLen : defaultLen;
      const wid = parsedWid > 0 ? parsedWid : defaultWid;
      return {
        id: room.id || `room-${roomIdx}`,
        name: (room.name || `Room ${roomIdx + 1}`).trim(),
        type: room.type || classifyRoomType(room.name || 'other'),
        length: len,
        width: wid,
        height: Number(room.height) || 10,
        count: Math.max(1, Number(room.count) || 1),
        description: room.description || '',
        photos: sanitizeMediaUrls(room.photos),
        unit: room.unit || 'ft',
        floorNumber: Number(room.floorNumber) || 0,
      };
    });

    const canonical = buildCanonicalLayout(formattedRooms, form.floorPlan || null, {
      unit: 'ft',
      wallThickness: 0.16,
      wallHeight: 1.85,
      totalFloors: Math.max(1, Number(form.totalFloors) || 1),
      propertyType: form.propertyType || 'House',
      isLand: false,
    });

    const sanitizedRooms = (canonical.rooms && canonical.rooms.length > 0 ? canonical.rooms : formattedRooms).map((r, idx) => {
      const defaultLen = r.type === 'living' ? 18 : r.type === 'bathroom' ? 8 : r.type === 'kitchen' ? 12 : 14;
      const defaultWid = r.type === 'living' ? 14 : r.type === 'bathroom' ? 6 : r.type === 'kitchen' ? 10 : 12;
      const len = Number(r.length || r.lFt) || defaultLen;
      const wid = Number(r.width || r.wFt) || defaultWid;
      return {
        id: r.id || `room-${idx}`,
        name: (r.name || `Room ${idx + 1}`).trim(),
        type: r.type || 'other',
        length: len,
        width: wid,
        height: Number(r.height || r.hFt) || 10,
        area: Number(r.area) || (len * wid),
        count: Math.max(1, Number(r.count) || 1),
        description: r.description || '',
        photos: Array.isArray(r.photos) ? r.photos : [],
        unit: r.unit || 'ft',
        floorNumber: Number(r.floorNumber) || 0,
        position: r.position || { x: r.x || 0, y: 0, z: r.z || 0 },
        lFt: Number(r.lFt || len),
        wFt: Number(r.wFt || wid),
        hFt: Number(r.hFt || r.height) || 9,
        lM: r.lM,
        wM: r.wM,
        hM: r.hM,
        x: r.x,
        z: r.z,
        minX: r.minX,
        maxX: r.maxX,
        minZ: r.minZ,
        maxZ: r.maxZ,
        adjacentRoomIds: r.adjacentRoomIds || [],
      };
    });

    return {
      enabled: form.use3D,
      unit: 'ft',
      isLand: false,
      propertyType: form.propertyType || 'House',
      furnishing: form.furnished,
      wallThickness: 0.16,
      floorPlan: form.floorPlan ? { ...form.floorPlan, layout: canonical } : null,
      canonicalLayout: canonical,
      floors: [{
        floorNumber: 0,
        rooms: sanitizedRooms,
      }],
    };
  };

  const handleFloorPlanSelect = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setPlanUploadError('');
    setUploadingPlan(true);

    try {
      const validation = await validateFloorPlanFile(file);
      if (!validation.valid) {
        setPlanUploadError(validation.error);
        setUploadingPlan(false);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const layout = await analyzeFloorPlanFile(file, previewUrl);

      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/uploads/floorPlan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploaded = data.data;
      const planObject = {
        url: uploaded?.url || previewUrl,
        name: file.name,
        type: file.type || validation.extension,
        size: file.size,
        aspectRatio: layout?.aspectRatio || 1.25,
        status: layout?.status || (layout?.compartments?.length ? 'processed' : 'failed'),
        error: layout?.error || '',
        layout: layout || null,
        roomPlacements: layout?.roomPlacements || [],
        processedAt: new Date(),
      };

      const canonical = buildCanonicalLayout(form.rooms || [], planObject, {
        unit: 'ft',
        wallThickness: 0.16,
        wallHeight: 1.85,
        totalFloors: Math.max(1, Number(form.totalFloors) || 1),
      });
      planObject.layout = canonical;
      if (canonical.status === 'failed') {
        planObject.status = 'failed';
        planObject.error = canonical.error || 'Floor plan could not be processed into rooms.';
      }

      setValue('floorPlan', planObject);
      setMessage('2D floor plan uploaded and architectural canonical layout generated.');
    } catch (err) {
      setPlanUploadError(err.response?.data?.message || err.message || 'Failed to upload floor plan.');
    } finally {
      setUploadingPlan(false);
    }
  };

  const handleRemoveFloorPlan = () => {
    setValue('floorPlan', null);
    setPlanUploadError('');
  };

  const publish = async () => {
    const invalidStep = [0, 1, 2, 3, 4].find((index) => validateStep(index));
    if (invalidStep !== undefined) { setErrors(validateStep(invalidStep)); setStep(invalidStep); return; }
    const rentPrice = Number(form.monthlyRent) || 0;
    const salePrice = Number(form.salePrice) || 0;

    const defaultLen = isLand ? (Number(form.size) ? Math.round(Math.sqrt(Number(form.size) * 1.33)) : 30) : 12;
    const defaultWid = isLand ? (Number(form.size) ? Math.round(Number(form.size) / Math.max(1, defaultLen)) : 40) : 10;

    const formattedRooms = (form.rooms || []).map((room, roomIdx) => {
      const parsedLen = Number(room.length);
      const parsedWid = Number(room.width);
      const len = parsedLen > 0 ? parsedLen : (isLand ? defaultLen : 0);
      const wid = parsedWid > 0 ? parsedWid : (isLand ? defaultWid : 0);
      return {
        id: room.id || `room-${Date.now()}-${roomIdx}`,
        name: (room.name || (isLand ? 'Plot Area' : `Room ${roomIdx + 1}`)).trim(),
        type: classifyRoomType(room.name),
        length: len,
        width: wid,
        height: Number(room.height) || 0,
        area: Number(room.area) || (len * wid),
        count: Math.max(1, parseInt(room.count, 10) || 1),
        description: room.description || '',
        photos: sanitizeMediaUrls(room.photos),
        unit: 'ft',
        floorNumber: 0,
        position: room.position || { x: 0, y: 0, z: 0 },
      };
    });

    const propertyPhotos = sanitizeMediaUrls(photos);
    const propertyVideos = sanitizeMediaUrls(videos);
    const threeD = createThreeDConfig();

    try {
      const isSale = form.listingType === 'Sale';
      const isBoth = form.listingType === 'Both';
      const isRent = form.listingType === 'Rent';
      const txType = isSale ? 'sale' : isBoth ? 'both' : 'rent';
      const primaryPrice = isSale ? salePrice : (rentPrice || salePrice);

      const elecCharge = form.electricityBill === 'Fixed Monthly Amount' ? Math.max(0, parseFloat(form.monthlyElectricityCharge) || 0) : 0;
      const waterCharge = form.waterCharges === 'Fixed Monthly Amount' ? Math.max(0, parseFloat(form.monthlyWaterCharge) || 0) : 0;

      let finalElec = form.electricityBill || (isSale ? 'As per usage' : 'Included in Rent');
      if (isSale && finalElec === 'Included in Rent') finalElec = 'As per usage';
      let finalWater = form.waterCharges || (isSale ? 'As per usage' : 'Included in Rent');
      if (isSale && finalWater === 'Included in Rent') finalWater = 'As per usage';

      await addProperty({
        title: form.title, description: form.description, type: form.propertyType, listingType: form.listingType,
        transactionType: txType,
        status: isSale ? 'Sale' : isBoth ? 'Both' : 'Rent', price: primaryPrice,
        address: form.address, city: form.city, area: form.area, state: form.state, pincode: form.pincode,
        sqft: Number(form.size) || Number(form.landArea) || 0, bedrooms: Number(form.bedrooms) || 0, bathrooms: Number(form.bathrooms) || 0,
        floorNumber: Number(form.floorNumber) || 0, totalFloors: Number(form.totalFloors) || 0, numberOfFloors: Number(form.totalFloors) || 0,
        parking: form.parking === 'Yes' ? 1 : Number(form.parking) || 0, furnished: form.furnished, balcony: form.balcony, garden: form.garden, amenities: form.amenities,
        landDetails: {
          area: form.landArea || form.size,
          unit: form.landUnit,
          usage: form.landUsage,
          roadAccess: form.roadAccess,
          facing: form.facing,
          boundary: form.boundary,
          dimensions: form.dimensions || (formattedRooms[0]?.length && formattedRooms[0]?.width ? `${formattedRooms[0].length} × ${formattedRooms[0].width} ft` : ''),
          water: form.water,
          electricity: form.electricity,
        },
        electricityBill: finalElec,
        monthlyElectricityCharge: elecCharge,
        waterCharges: finalWater,
        monthlyWaterCharge: waterCharge,
        rentDetails: isSale ? null : {
          monthlyRent: rentPrice,
          securityDeposit: form.securityDeposit,
          maintenanceCharges: form.maintenanceCharges,
          availableFrom: form.availableFrom,
          leaseDuration: form.leaseDuration,
          electricityBill: finalElec,
          monthlyElectricityCharge: elecCharge,
          waterCharges: finalWater,
          monthlyWaterCharge: waterCharge,
        },
        saleDetails: isRent ? null : { salePrice, pricePerSqft: form.pricePerSqft, negotiable: form.negotiable, maintenanceCharges: form.maintenanceCharges },
        rooms: formattedRooms,
        photos: propertyPhotos,
        videos: propertyVideos,
        floorPlan: form.floorPlan || null,
        canonicalLayout: threeD.canonicalLayout || null,
        threeDConfig: threeD,
        roomLength: Number(formattedRooms[0]?.length) || 0,
        roomWidth: Number(formattedRooms[0]?.width) || 0,
        roomHeight: Number(formattedRooms[0]?.height) || 0,
      }, user.id, user.name, user.phone);
      localStorage.removeItem(draftKey);
      setMessage('Property published successfully.');
      setTimeout(() => navigate('/landlord/dashboard'), 900);
    } catch (error) {
      setErrors(error.response?.data?.message || error.message || 'Unable to publish property.');
    }
  };

  const title = useMemo(() => STEPS[step], [step]);
  const updateRoom = (index, room) => setValue('rooms', form.rooms.map((item, roomIndex) => roomIndex === index ? room : item));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><button type="button" onClick={() => navigate('/landlord/dashboard')} className="btn-ghost mb-2 !px-0"><FiArrowLeft /> Dashboard</button><h1 className="font-display text-3xl font-bold">Add Property</h1><p className="mt-1 text-sm text-ink/60 dark:text-slate-400">Create a complete listing in a few simple steps.</p></div>
        <button type="button" onClick={saveDraft} className="btn-outline !px-4 !py-2"><FiSave /> Save Draft</button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {STEPS.map((label, index) => {
          const isActive = index === step;
          const isDone = index < step;
          return (
            <motion.button
              key={label}
              type="button"
              whileHover={index <= step ? { scale: 1.05 } : {}}
              whileTap={index <= step ? { scale: 0.95 } : {}}
              onClick={() => {
                if (index <= step) {
                  setDirection(index > step ? 1 : -1);
                  setStep(index);
                }
              }}
              className={`flex items-center gap-2 text-left text-xs font-semibold sm:text-sm transition-colors duration-200 ${
                isActive ? 'text-primary' : isDone ? 'text-accent' : 'text-ink/40 dark:text-slate-500'
              }`}
            >
              <motion.span
                animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border transition-all duration-300 ${
                  isActive
                    ? 'border-primary bg-primary text-white shadow-sm ring-2 ring-primary/30 ring-offset-2 dark:ring-offset-slate-900'
                    : isDone
                    ? 'border-accent bg-accent text-primary'
                    : 'border-current'
                }`}
              >
                {isDone ? <FiCheck /> : index + 1}
              </motion.span>
              <span className="hidden xl:inline">{label}</span>
            </motion.button>
          );
        })}
      </div>

      {message && <p className="rounded-lg bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary dark:text-slate-200">{message}</p>}
      {errors && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">{errors}</p>}

      <section className="card space-y-6 p-5 sm:p-8 overflow-hidden">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Step {step + 1} of {STEPS.length}</p><h2 className="mt-1 font-display text-2xl font-bold">{title}</h2></div>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
        {step === 0 && <div className="grid gap-4 md:grid-cols-3">{LISTING_TYPES.map((choice) => <ChoiceCard key={choice.value} choice={choice} selected={form.listingType === choice.value} onSelect={(value) => setValue('listingType', value)} />)}</div>}
        {step === 1 && <div className="grid gap-4 md:grid-cols-3">{PROPERTY_TYPES.map((choice) => <ChoiceCard key={choice.value} choice={choice} selected={form.propertyType === choice.value} onSelect={handlePropertyTypeSelect} />)}</div>}

        {step === 2 && <div className="space-y-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Listing title"
              name="title"
              value={form.title}
              onChange={(e) => setValue('title', e.target.value)}
              required
              placeholder={getListingTitlePlaceholder(form.propertyType, form.listingType)}
            />
            <Field
              label={getSizeLabel(form.propertyType)}
              name="size"
              value={form.size}
              onChange={handleSizeChange}
              type="number"
              min="1"
              required
            />
          </div>
          <Field label="Description" name="description" value={form.description} onChange={(e) => setValue('description', e.target.value)} required placeholder="Describe the property, its condition, and highlights." />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Location / Address" name="address" value={form.address} onChange={(e) => setValue('address', e.target.value)} required /><Field label="City" name="city" value={form.city} onChange={(e) => setValue('city', e.target.value)} required /><Field label="Area / Locality" name="area" value={form.area} onChange={(e) => setValue('area', e.target.value)} required /><Field label="State" name="state" value={form.state} onChange={(e) => setValue('state', e.target.value)} required /><Field label="Pincode" name="pincode" value={form.pincode} onChange={(e) => setValue('pincode', e.target.value)} required /></div>
          {isHome && <div className="space-y-4"><h3 className="font-display font-semibold">Home details</h3><div className="grid gap-4 sm:grid-cols-3"><Field label="Bedrooms" name="bedrooms" value={form.bedrooms} onChange={handleBedroomsChange} type="number" min="0" required /><Field label="Bathrooms" name="bathrooms" value={form.bathrooms} onChange={handleBathroomsChange} type="number" min="0" required />{form.propertyType === 'Flat' ? <><Field label="Floor number" name="floorNumber" value={form.floorNumber} onChange={(e) => setValue('floorNumber', e.target.value)} type="number" min="0" /><Field label="Total floors" name="totalFloors" value={form.totalFloors} onChange={(e) => setValue('totalFloors', e.target.value)} type="number" min="0" /></> : <Field label="Number of floors" name="totalFloors" value={form.totalFloors} onChange={(e) => setValue('totalFloors', e.target.value)} type="number" min="0" />}</div><div className="grid gap-4 sm:grid-cols-3"><Field label="Furnished status" name="furnished" value={form.furnished} onChange={(e) => setValue('furnished', e.target.value)}><select name="furnished" value={form.furnished} onChange={(e) => setValue('furnished', e.target.value)} className="input"><option value="">Choose status</option>{FURNISHED_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="Parking availability" name="parking" value={form.parking} onChange={(e) => setValue('parking', e.target.value)}><select name="parking" value={form.parking} onChange={(e) => setValue('parking', e.target.value)} className="input"><option value="">Choose</option><option>Yes</option><option>No</option></select></Field><Field label={form.propertyType === 'Flat' ? 'Balcony availability' : 'Garden availability'} name={form.propertyType === 'Flat' ? 'balcony' : 'garden'} value={form[form.propertyType === 'Flat' ? 'balcony' : 'garden']} onChange={(e) => setValue(form.propertyType === 'Flat' ? 'balcony' : 'garden', e.target.value)}><select name={form.propertyType === 'Flat' ? 'balcony' : 'garden'} value={form[form.propertyType === 'Flat' ? 'balcony' : 'garden']} onChange={(e) => setValue(form.propertyType === 'Flat' ? 'balcony' : 'garden', e.target.value)} className="input"><option value="">Choose</option><option>Yes</option><option>No</option></select></Field></div></div>}
          {isLand && <div className="space-y-4"><h3 className="font-display font-semibold">Land details</h3><div className="grid gap-4 sm:grid-cols-3"><Field label="Land area" name="landArea" value={form.landArea} onChange={(e) => setValue('landArea', e.target.value)} type="number" min="1" required /><Field label="Land unit" name="landUnit" value={form.landUnit} onChange={(e) => setValue('landUnit', e.target.value)}><select name="landUnit" value={form.landUnit} onChange={(e) => setValue('landUnit', e.target.value)} className="input"><option>sq. ft.</option><option>sq. yards</option><option>acres</option><option>sq. meters</option></select></Field><Field label="Land type / usage" name="landUsage" value={form.landUsage} onChange={(e) => setValue('landUsage', e.target.value)} placeholder="e.g. Residential, Commercial" required /></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Dimensions (e.g. 30 × 40 ft)" name="dimensions" value={form.dimensions || ''} onChange={(e) => { const val = e.target.value; const match = val.match(/(\d+(?:\.\d+)?)\s*(?:[xX×*]|by)\s*(\d+(?:\.\d+)?)/); if (match) { setForm((curr) => ({ ...curr, dimensions: val, rooms: (curr.rooms || []).map((rm, idx) => idx === 0 ? { ...rm, name: rm.name && rm.name !== 'Living room' ? rm.name : 'Plot Boundary', length: match[1], width: match[2] } : rm) })); } else { setValue('dimensions', val); } }} placeholder="e.g. 30 × 40 ft" /><Field label="Road access" name="roadAccess" value={form.roadAccess} onChange={(e) => setValue('roadAccess', e.target.value)} placeholder="e.g. 30 ft road" /><Field label="Facing direction" name="facing" value={form.facing} onChange={(e) => setValue('facing', e.target.value)} placeholder="e.g. East" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Boundary details" name="boundary" value={form.boundary} onChange={(e) => setValue('boundary', e.target.value)} placeholder="e.g. Fenced, Compound wall" /></div><div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.water} onChange={(e) => setValue('water', e.target.checked)} /> Water available</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.electricity} onChange={(e) => setValue('electricity', e.target.checked)} /> Electricity available</label></div></div>}
          {isHome && <div><label className="label">Amenities</label><div className="flex flex-wrap gap-2">{AMENITIES_LIST.map((amenity) => <button type="button" key={amenity} onClick={() => setValue('amenities', form.amenities.includes(amenity) ? form.amenities.filter((item) => item !== amenity) : [...form.amenities, amenity])} className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${form.amenities.includes(amenity) ? 'border-primary bg-primary text-white' : 'border-black/10 text-ink/60 hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-400'}`}>{amenity}</button>)}</div></div>}
          <div className="grid gap-6 md:grid-cols-2">
            <MediaUpload label="Photos" accept="image/*" files={photos} onChange={(newFiles) => setPhotos(sanitizeMediaUrls(newFiles))} type="image" />
            <MediaUpload label="Video (optional)" accept="video/*" files={videos} onChange={(newFiles) => setVideos(sanitizeMediaUrls(newFiles))} type="video" />
          </div>
        </div>}

        {step === 3 && <div className="space-y-6">{(form.listingType === 'Rent' || form.listingType === 'Both') && <div className="space-y-4"><h3 className="font-display text-lg font-semibold">Rent details</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Monthly rent" name="monthlyRent" value={form.monthlyRent} onChange={(e) => setValue('monthlyRent', e.target.value)} type="number" min="1" required /><Field label="Security deposit" name="securityDeposit" value={form.securityDeposit} onChange={(e) => setValue('securityDeposit', e.target.value)} type="number" min="0" /><Field label="Maintenance charges" name="maintenanceCharges" value={form.maintenanceCharges} onChange={(e) => setValue('maintenanceCharges', e.target.value)} type="number" min="0" /><Field label="Available from" name="availableFrom" value={form.availableFrom} onChange={(e) => setValue('availableFrom', e.target.value)} type="date" required /><Field label="Lease duration" name="leaseDuration" value={form.leaseDuration} onChange={(e) => setValue('leaseDuration', e.target.value)} placeholder="e.g. 11 months" /></div><div className="pt-2"><h4 className="font-display font-semibold text-base mb-3">Utilities & Charges</h4><div className="grid gap-4 sm:grid-cols-2"><Field label="Electricity Bill" name="electricityBill"><select name="electricityBill" value={form.electricityBill || 'Included in Rent'} onChange={(e) => setValue('electricityBill', e.target.value)} className="input"><option value="Included in Rent">Included in Rent</option><option value="Paid Separately">Paid Separately</option><option value="Fixed Monthly Amount">Fixed Monthly Amount</option></select></Field>{form.electricityBill === 'Fixed Monthly Amount' && <Field label="Monthly Electricity Charge (₹)" name="monthlyElectricityCharge" value={form.monthlyElectricityCharge} onChange={(e) => { const val = e.target.value; if (val === '') setValue('monthlyElectricityCharge', ''); else { const num = parseFloat(val); if (!isNaN(num) && num >= 0) setValue('monthlyElectricityCharge', val); } }} type="number" min="0" step="0.01" placeholder="0.00" required />}<Field label="Water Charges" name="waterCharges"><select name="waterCharges" value={form.waterCharges || 'Included in Rent'} onChange={(e) => setValue('waterCharges', e.target.value)} className="input"><option value="Included in Rent">Included in Rent</option><option value="Paid Separately">Paid Separately</option><option value="Fixed Monthly Amount">Fixed Monthly Amount</option></select></Field>{form.waterCharges === 'Fixed Monthly Amount' && <Field label="Monthly Water Charge (₹)" name="monthlyWaterCharge" value={form.monthlyWaterCharge} onChange={(e) => { const val = e.target.value; if (val === '') setValue('monthlyWaterCharge', ''); else { const num = parseFloat(val); if (!isNaN(num) && num >= 0) setValue('monthlyWaterCharge', val); } }} type="number" min="0" step="0.01" placeholder="0.00" required />}</div></div></div>}{(form.listingType === 'Sale' || form.listingType === 'Both') && <div className="space-y-4"><h3 className="font-display text-lg font-semibold">Sale details</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Total sale price" name="salePrice" value={form.salePrice} onChange={(e) => setValue('salePrice', e.target.value)} type="number" min="1" required /><Field label="Price per sq. ft. (optional)" name="pricePerSqft" value={form.pricePerSqft} onChange={(e) => setValue('pricePerSqft', e.target.value)} type="number" min="0" /><Field label="Negotiable" name="negotiable" value={form.negotiable} onChange={(e) => setValue('negotiable', e.target.value)}><select name="negotiable" value={form.negotiable} onChange={(e) => setValue('negotiable', e.target.value)} className="input"><option>Yes</option><option>No</option></select></Field></div></div>}</div>}

        {step === 4 && <div className="space-y-5">
          <div><h3 className="font-display text-lg font-semibold">{isLand ? 'Plot / Boundary Dimensions' : 'Room Details'}</h3><p className="mt-1 text-sm text-ink/60 dark:text-slate-400">{isLand ? 'Define the plot boundaries to generate the realistic 3D terrain and property boundary view.' : 'Add dimensions now so the rooms can power the 3D property visualization later.'}</p></div>
          {isLand ? (
            <PlotBoundaryEditor
              room={form.rooms[0] || { id: 'plot-0', name: 'Plot Area', type: 'land', length: 40, width: 30 }}
              landDetails={{ facing: form.facing, roadAccess: form.roadAccess }}
              onChange={(updatedPlot) => {
                setValue('rooms', [{
                  ...updatedPlot,
                  name: 'Plot Area',
                  type: 'land',
                  area: (Number(updatedPlot.length) || 0) * (Number(updatedPlot.width) || 0),
                }]);
                if (updatedPlot.length && updatedPlot.width) {
                  setValue('dimensions', `${updatedPlot.length} × ${updatedPlot.width} ft`);
                }
              }}
            />
          ) : (
            <>
              {form.rooms.map((room, index) => <RoomEditor key={room.id} room={room} index={index} canRemove={form.rooms.length > 1} onChange={(nextRoom) => updateRoom(index, nextRoom)} onRemove={() => setValue('rooms', form.rooms.filter((_, roomIndex) => roomIndex !== index))} />)}
              <button type="button" onClick={() => setValue('rooms', [...form.rooms, makeRoom(form.rooms.length)])} className="btn-outline"><FiPlus /> Add Another Room</button>
            </>
          )}
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.use3D} onChange={(e) => setValue('use3D', e.target.checked)} /> Use these dimensions for 3D property visualization</label>
          {form.use3D && form.rooms.some((r) => Number(r.length) > 0 && Number(r.width) > 0) && (
            <div className="mt-4 rounded-2xl border border-black/10 p-4 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-display text-base font-semibold">{isLand ? 'Interactive 3D Plot Preview' : 'Interactive 3D House Preview'}</h4>
                <span className="text-xs text-ink/50 dark:text-slate-400">Live preview generated from your dimensions</span>
              </div>
              <div className="card h-96 overflow-hidden p-2">
                <Room3D
                  config={createThreeDConfig()}
                  floorPlan={form.floorPlan}
                  rooms={form.rooms}
                  furnishing={form.furnished}
                  propertyType={form.propertyType}
                  type={form.propertyType}
                  listingType={form.listingType}
                  transactionType={form.listingType}
                  isLand={isLand}
                  sqft={Number(form.landArea) || Number(form.size) || 1200}
                />
              </div>
            </div>
          )}
        </div>}

        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FiFileText size={20} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold">2D Architectural Floor Plan (Optional)</h3>
                  <p className="mt-1 text-sm text-ink/70 dark:text-slate-300">
                    Upload an architectural floor plan to align the dynamic 3D generation with your real layout and showcase the plan to tenants.
                    Supported formats: PDF, PNG, JPG, WEBP, and SVG (up to 20MB). You can skip this step at any time.
                  </p>
                </div>
              </div>
            </div>

            {planUploadError && (
              <div className="rounded-lg bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">
                {planUploadError}
              </div>
            )}

            {!form.floorPlan ? (
              <div>
                <input
                  ref={floorPlanInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,image/*,application/pdf"
                  onChange={(e) => handleFloorPlanSelect(e.target.files)}
                  className="sr-only"
                />
                <div
                  onClick={() => !uploadingPlan && floorPlanInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPlan(true); }}
                  onDragLeave={() => setIsDraggingPlan(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPlan(false);
                    if (!uploadingPlan) handleFloorPlanSelect(e.dataTransfer.files);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
                    isDraggingPlan
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-black/15 bg-surface hover:border-primary hover:bg-primary-50/50 dark:border-white/15 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                  } ${uploadingPlan ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {uploadingPlan ? <FiRefreshCw className="animate-spin" size={32} /> : <FiUploadCloud size={32} />}
                  </div>
                  <div>
                    <p className="font-display text-base font-semibold">
                      {uploadingPlan ? 'Uploading & Analyzing Floor Plan…' : 'Drag & drop your 2D floor plan here, or click to browse'}
                    </p>
                    <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
                      Supports PDF, PNG, JPG, JPEG, WEBP, and SVG · Max file size: 20 MB
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60 dark:bg-white/10 dark:text-slate-300">
                      📄 PDF Document
                    </span>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60 dark:bg-white/10 dark:text-slate-300">
                      🖼️ PNG / JPG / WEBP
                    </span>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60 dark:bg-white/10 dark:text-slate-300">
                      📐 Vector SVG
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-surface p-4 text-xs text-ink/60 dark:bg-slate-800/40 dark:text-slate-400">
                  <span className="flex items-center gap-2">
                    <FiInfo className="text-primary" size={15} />
                    Floor plan upload is completely optional. If skipped, a procedural 3D model is generated from your room dimensions.
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(6)}
                    className="font-semibold text-primary hover:underline ml-4 whitespace-nowrap"
                  >
                    Skip this step →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <input
                  ref={floorPlanInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,image/*,application/pdf"
                  onChange={(e) => handleFloorPlanSelect(e.target.files)}
                  className="sr-only"
                />

                {/* Uploaded File Info Card */}
                <div className="card flex flex-col sm:flex-row items-center justify-between gap-5 border border-primary/20 p-5 shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Thumbnail or Doc Icon */}
                    {form.floorPlan.type?.includes('pdf') || form.floorPlan.name?.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex h-20 w-20 flex-none items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-500/20">
                        <FiFileText size={36} />
                      </div>
                    ) : (
                      <div
                        onClick={() => setFloorPlanModal(true)}
                        className="group relative h-20 w-24 flex-none cursor-pointer overflow-hidden rounded-xl border border-black/10 bg-slate-100 shadow-inner dark:border-white/10 dark:bg-slate-900"
                        title="Click to zoom preview"
                      >
                        <img
                          src={resolveMediaUrl(form.floorPlan.url)}
                          alt="Uploaded floor plan"
                          className="h-full w-full object-contain p-1 transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                          <FiMaximize2 className="text-white drop-shadow" size={18} />
                        </div>
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-display font-semibold text-base" title={form.floorPlan.name}>
                          {form.floorPlan.name || 'Floor Plan'}
                        </h4>
                        <span className="flex-none rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                          {form.floorPlan.name?.split('.').pop() || 'Plan'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink/50 dark:text-slate-400">
                        {formatFileSize(form.floorPlan.size)} · Uploaded
                      </p>
                      {form.floorPlan.layout?.summary && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <FiCheck size={14} /> {form.floorPlan.layout.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 justify-end">
                    {form.floorPlan.type?.includes('pdf') || form.floorPlan.name?.toLowerCase().endsWith('.pdf') ? (
                      <a
                        href={resolveMediaUrl(form.floorPlan.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline !py-2 !px-3 text-xs"
                      >
                        <FiExternalLink /> Open PDF
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFloorPlanModal(true)}
                        className="btn-outline !py-2 !px-3 text-xs"
                      >
                        <FiMaximize2 /> View Full Size
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => floorPlanInputRef.current?.click()}
                      className="btn-outline !py-2 !px-3 text-xs"
                    >
                      <FiRefreshCw /> Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFloorPlan}
                      className="btn-ghost !py-2 !px-3 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <FiTrash2 /> Remove
                    </button>
                  </div>
                </div>

                {/* Live 3D House / Plot Preview */}
                {form.use3D && form.rooms.some((r) => Number(r.length) > 0 && Number(r.width) > 0) && (
                  <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-display text-base font-bold">{isLand ? 'Dynamic 3D Plot Preview' : 'Dynamic 3D House Preview'}</h4>
                        <p className="text-xs text-ink/50 dark:text-slate-400">
                          {isLand ? 'Plot boundary and terrain visualization' : 'Rooms arranged dynamically adhering to your 2D floor plan reference'}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {form.floorPlan ? 'Aligned with 2D Floor Plan' : '3D Spatial Preview'}
                      </span>
                    </div>
                    <div className="card h-96 overflow-hidden p-2">
                      <Room3D
                        config={createThreeDConfig()}
                        floorPlan={form.floorPlan}
                        furnishing={form.furnished}
                        propertyType={form.propertyType}
                        type={form.propertyType}
                        listingType={form.listingType}
                        transactionType={form.listingType}
                        isLand={isLand}
                        sqft={Number(form.landArea) || Number(form.size) || 1200}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <div className="rounded-xl bg-primary/5 p-4">
              <h3 className="font-display text-lg font-semibold">Ready to publish?</h3>
              <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">Review your listing below, or edit any completed step before publishing.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold">Property</h3>
                  <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-primary">Edit</button>
                </div>
                <ReviewRow label="Listing" value={`${form.listingType} · ${form.propertyType}`} />
                <ReviewRow label="Listing title" value={form.title} />
                <ReviewRow label="Location" value={`${form.area}, ${form.city}`} />
                <ReviewRow label={isLand ? "Plot area" : "Size"} value={`${form.size || form.landArea} ${isLand ? (form.landUnit || 'sq. ft.') : 'sq. ft.'}`} />
                <ReviewRow label="Amenities" value={form.amenities} />
              </div>
              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold">Pricing</h3>
                  <button type="button" onClick={() => setStep(3)} className="text-sm font-semibold text-primary">Edit</button>
                </div>
                {form.listingType === 'Sale' ? (
                  <ReviewRow label="Sale price" value={form.salePrice ? `₹${Number(form.salePrice).toLocaleString('en-IN')}` : ''} />
                ) : form.listingType === 'Both' ? (
                  <>
                    <ReviewRow label="Sale price" value={form.salePrice ? `₹${Number(form.salePrice).toLocaleString('en-IN')}` : ''} />
                    <ReviewRow label="Monthly rent" value={form.monthlyRent ? `₹${Number(form.monthlyRent).toLocaleString('en-IN')}` : ''} />
                    <ReviewRow label="Electricity Bill" value={form.electricityBill === 'Fixed Monthly Amount' ? `Fixed Monthly Amount (₹${Number(form.monthlyElectricityCharge) || 0})` : (form.electricityBill || 'Included in Rent')} />
                    <ReviewRow label="Water Charges" value={form.waterCharges === 'Fixed Monthly Amount' ? `Fixed Monthly Amount (₹${Number(form.monthlyWaterCharge) || 0})` : (form.waterCharges || 'Included in Rent')} />
                    <ReviewRow label="Available from" value={form.availableFrom} />
                    <ReviewRow label="Lease duration" value={form.leaseDuration} />
                  </>
                ) : (
                  <>
                    <ReviewRow label="Monthly rent" value={form.monthlyRent ? `₹${Number(form.monthlyRent).toLocaleString('en-IN')}` : ''} />
                    <ReviewRow label="Electricity Bill" value={form.electricityBill === 'Fixed Monthly Amount' ? `Fixed Monthly Amount (₹${Number(form.monthlyElectricityCharge) || 0})` : (form.electricityBill || 'Included in Rent')} />
                    <ReviewRow label="Water Charges" value={form.waterCharges === 'Fixed Monthly Amount' ? `Fixed Monthly Amount (₹${Number(form.monthlyWaterCharge) || 0})` : (form.waterCharges || 'Included in Rent')} />
                    <ReviewRow label="Available from" value={form.availableFrom} />
                    <ReviewRow label="Lease duration" value={form.leaseDuration} />
                  </>
                )}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold">{isLand ? 'Plot Boundary' : `Rooms (${form.rooms.length})`}</h3>
                  <button type="button" onClick={() => setStep(4)} className="text-sm font-semibold text-primary">Edit</button>
                </div>
                {isLand ? (
                  <>
                    <ReviewRow label="Boundary Length" value={`${form.rooms[0]?.length || 0} ft`} />
                    <ReviewRow label="Boundary Width" value={`${form.rooms[0]?.width || 0} ft`} />
                    <ReviewRow label="Calculated Boundary Area" value={`${(Number(form.rooms[0]?.length) || 0) * (Number(form.rooms[0]?.width) || 0)} sq. ft.`} />
                    <ReviewRow label="Plot Facing" value={form.facing || 'East'} />
                    <ReviewRow label="Road Access" value={form.roadAccess || 'Direct'} />
                  </>
                ) : (
                  form.rooms.map((room) => (
                    <ReviewRow key={room.id} label={room.name} value={`${room.length} × ${room.width}${room.height ? ` × ${room.height}` : ''} ft`} />
                  ))
                )}
              </div>
              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold">2D Floor Plan</h3>
                  <button type="button" onClick={() => setStep(5)} className="text-sm font-semibold text-primary">Edit</button>
                </div>
                {form.floorPlan ? (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                      <FiFileText className="text-primary" /> {form.floorPlan.name}
                    </p>
                    <p className="text-xs text-ink/50 dark:text-slate-400">
                      {formatFileSize(form.floorPlan.size)} · 3D alignment active
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-ink/50 dark:text-slate-400">None uploaded (procedural 3D model active)</p>
                )}
              </div>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-5 dark:border-white/5">
          <motion.button
            type="button"
            whileHover={step === 0 ? {} : { scale: 1.03, x: -2 }}
            whileTap={step === 0 ? {} : { scale: 0.97 }}
            onClick={goBack}
            className="btn-ghost"
            disabled={step === 0}
          >
            <FiArrowLeft /> Back
          </motion.button>
          <div className="flex gap-3">
            {step < STEPS.length - 1 ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03, x: 2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={goNext}
                className="btn-primary"
              >
                Next <FiArrowRight />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={publish}
                className="btn-primary"
              >
                <FiUploadCloud /> Publish Property
              </motion.button>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox / Full view modal for uploaded floor plan */}
      <AnimatePresence>
      {floorPlanModal && form.floorPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setFloorPlanModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white p-4 dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-sm truncate">{form.floorPlan.name}</h4>
              <button
                type="button"
                onClick={() => setFloorPlanModal(false)}
                className="btn-ghost !p-1.5"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>
            <img
              src={resolveMediaUrl(form.floorPlan.url)}
              alt="Floor Plan Full Preview"
              className="max-h-[80vh] max-w-[85vw] object-contain rounded-lg"
            />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
