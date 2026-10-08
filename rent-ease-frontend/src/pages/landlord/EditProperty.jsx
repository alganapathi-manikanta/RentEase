import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiSave, FiX, FiPlus, FiTrash2, FiUploadCloud,
  FiFileText, FiImage, FiRefreshCw, FiCheck, FiLayers, FiDollarSign,
  FiHome, FiGrid, FiMaximize2, FiExternalLink, FiEye, FiEyeOff,
  FiMapPin, FiInfo, FiAlertCircle, FiBox, FiCheckCircle
} from 'react-icons/fi';
import { MdKitchen, MdWeekend, MdLocalParking, MdSquareFoot } from 'react-icons/md';
import { BiBed, BiBath } from 'react-icons/bi';
import MediaUpload from '../../components/MediaUpload';
import Room3D, { classifyRoomType } from '../../components/Room3D';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { AMENITIES_LIST, PROPERTY_TYPES } from '../../data/mockData';
import api from '../../utils/api';
import { validateFloorPlanFile, analyzeFloorPlanFile } from '../../utils/floorPlanAnalyzer';
import { buildCanonicalLayout } from '../../utils/canonicalLayout';
import { resolveMediaUrl } from '../../utils/media';
import { getListingTitlePlaceholder, getSizeLabel, isPlotOrLandType } from '../../utils/propertyFormHelpers';

const TRANSACTION_TYPES = [
  { value: 'Rent', label: 'For Rent', icon: FiHome, description: 'Offer this property on a monthly lease.' },
  { value: 'Sale', label: 'For Sale', icon: FiDollarSign, description: 'List this property for a one-time sale.' },
  { value: 'Both', label: 'Rent or Sale', icon: FiLayers, description: 'Offer both rental and sale options.' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'House', label: 'House / Villa' },
  { value: 'Flat', label: 'Flat / Apartment' },
  { value: 'Land', label: 'Land / Plot' },
  { value: 'Commercial', label: 'Commercial' },
];

const FURNISHED_OPTIONS = ['Furnished', 'Semi-furnished', 'Unfurnished'];

const ROOM_TYPE_OPTIONS = [
  { value: 'living', label: 'Living Room / Hall' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining', label: 'Dining Area' },
  { value: 'utility', label: 'Utility / Wash Area' },
  { value: 'balcony', label: 'Balcony / Terrace' },
  { value: 'garage', label: 'Parking / Garage' },
  { value: 'study', label: 'Study / Office' },
  { value: 'other', label: 'Other Room' },
];

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

const makeEmptyRoom = (index = 0) => ({
  id: `room-${Date.now()}-${index}`,
  name: `Room ${index + 1}`,
  type: 'bedroom',
  length: 12,
  width: 10,
  height: 10,
  count: 1,
  description: '',
  photos: [],
  unit: 'ft',
  floorNumber: 0,
});

export default function EditProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { properties, updateProperty } = useAppData();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [customAmenity, setCustomAmenity] = useState('');

  // Main Property Form State
  const [form, setForm] = useState(null);
  const [propertyPhotos, setPropertyPhotos] = useState([]);
  const [propertyVideos, setPropertyVideos] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [wallThickness, setWallThickness] = useState(0.15);

  // Floor Plan upload states
  const floorPlanInputRef = useRef(null);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [planUploadError, setPlanUploadError] = useState('');
  const [isDraggingPlan, setIsDraggingPlan] = useState(false);

  // Fetch / load property data from context or API
  useEffect(() => {
    let isMounted = true;

    async function loadProperty() {
      setLoading(true);
      setErrorMessage('');
      try {
        let prop = properties.find((p) => String(p.id) === String(id) || String(p._id) === String(id));
        if (!prop || !prop.rooms) {
          const res = await api.get(`/properties/${id}`);
          prop = res.data.data || res.data.property || res.data;
        }

        if (!prop && isMounted) {
          setErrorMessage('Property not found.');
          setLoading(false);
          return;
        }

        // Authorization check: only owner can edit
        const ownerId = prop.ownerId?._id || prop.ownerId;
        const currentUserId = user?.id || user?._id;
        if (ownerId && currentUserId && String(ownerId) !== String(currentUserId)) {
          setErrorMessage('Access denied. You can only edit properties that you own.');
          setLoading(false);
          return;
        }

        if (isMounted) {
          // Map MongoDB data cleanly to form fields
          const isSale = prop.status === 'Sale' || prop.listingType === 'Sale';
          const isBoth = prop.listingType === 'Both';
          const initialListingType = isBoth ? 'Both' : (isSale ? 'Sale' : 'Rent');

          setForm({
            title: prop.title || '',
            listingType: initialListingType,
            propertyType: prop.type || prop.propertyType || 'House',
            size: prop.sqft || prop.squareFeet || '',
            bedrooms: prop.bedrooms ?? '',
            bathrooms: prop.bathrooms ?? '',
            floorNumber: prop.floorNumber ?? 0,
            totalFloors: prop.totalFloors ?? prop.numberOfFloors ?? 1,
            furnished: prop.furnished || 'Furnished',
            parking: prop.parking ?? 0,
            balcony: prop.balcony || 'None',
            garden: prop.garden || 'No',
            address: prop.address || '',
            area: prop.area || '',
            city: prop.city || '',
            state: prop.state || '',
            pincode: prop.pincode || '',
            monthlyRent: prop.rentDetails?.monthlyRent || (prop.status === 'Rent' ? prop.price : '') || '',
            maintenanceCharges: prop.rentDetails?.maintenanceCharges || '',
            securityDeposit: prop.rentDetails?.securityDeposit || '',
            salePrice: prop.saleDetails?.salePrice || (prop.status === 'Sale' ? prop.price : '') || '',
            electricityBill: prop.electricityBill || prop.rentDetails?.electricityBill || 'Included in Rent',
            monthlyElectricityCharge: prop.monthlyElectricityCharge ?? prop.rentDetails?.monthlyElectricityCharge ?? '',
            waterCharges: prop.waterCharges || prop.rentDetails?.waterCharges || 'Included in Rent',
            monthlyWaterCharge: prop.monthlyWaterCharge ?? prop.rentDetails?.monthlyWaterCharge ?? '',
            description: prop.description || '',
            amenities: Array.isArray(prop.amenities) ? [...prop.amenities] : [],
            isPublished: prop.isPublished !== false,
            landUnit: prop.landDetails?.unit || 'sq. ft.',
            landUsage: prop.landDetails?.usage || '',
            roadAccess: prop.landDetails?.roadAccess || '',
            facing: prop.landDetails?.facing || '',
            boundary: prop.landDetails?.boundary || '',
            water: Boolean(prop.landDetails?.water),
            electricity: Boolean(prop.landDetails?.electricity),
          });

          // Media
          setPropertyPhotos(sanitizeMediaUrls(prop.photos || []));
          setPropertyVideos(sanitizeMediaUrls(prop.videos || []));

          // Floor plan
          setFloorPlan(prop.floorPlan || prop.threeDConfig?.floorPlan || null);

          // Wall thickness
          setWallThickness(Number(prop.threeDConfig?.wallThickness) || 0.15);

          // Rooms: authoritative MongoDB rooms
          if (Array.isArray(prop.rooms) && prop.rooms.length > 0) {
            setRooms(prop.rooms.map((r, idx) => ({
              id: r.id || `room-${Date.now()}-${idx}`,
              name: r.name || `Room ${idx + 1}`,
              type: r.type || classifyRoomType(r.name),
              length: Number(r.length) || 12,
              width: Number(r.width) || 10,
              height: Number(r.height) || 10,
              count: Math.max(1, Number(r.count) || 1),
              description: r.description || '',
              photos: sanitizeMediaUrls(r.photos || []),
              unit: r.unit || 'ft',
              floorNumber: Number(r.floorNumber) || 0,
            })));
          } else {
            setRooms([makeEmptyRoom(0)]);
          }

          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.response?.data?.message || err.message || 'Failed to load property.');
          setLoading(false);
        }
      }
    }

    loadProperty();

    return () => {
      isMounted = false;
    };
  }, [id, user, properties]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const isLand = isPlotOrLandType(form?.propertyType);

  // Amenities handlers
  const toggleAmenity = (amenity) => {
    setForm((prev) => {
      const current = prev.amenities || [];
      const updated = current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity];
      return { ...prev, amenities: updated };
    });
  };

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;
    if (!form.amenities.includes(trimmed)) {
      setForm((prev) => ({ ...prev, amenities: [...prev.amenities, trimmed] }));
    }
    setCustomAmenity('');
  };

  // Floor plan handlers
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

      // Generate fresh canonical layout immediately linking current rooms with the new floor plan
      const canonical = buildCanonicalLayout(rooms, planObject, {
        unit: 'ft',
        wallThickness: Number(wallThickness) || 0.15,
        wallHeight: 1.85,
        totalFloors: Math.max(1, Number(form.totalFloors) || 1),
        propertyId: id,
      });
      planObject.layout = canonical;
      if (canonical.status === 'failed') {
        planObject.status = 'failed';
        planObject.error = canonical.error || 'Floor plan could not be processed into rooms.';
      }

      setFloorPlan(planObject);
      setSuccessMessage('New 2D floor plan uploaded and architectural canonical layout generated.');
    } catch (err) {
      setPlanUploadError(err.response?.data?.message || err.message || 'Failed to upload floor plan.');
    } finally {
      setUploadingPlan(false);
    }
  };

  const handleRemoveFloorPlan = () => {
    setFloorPlan(null);
    setPlanUploadError('');
  };

  // Room management handlers
  const handleAddRoom = () => {
    setRooms((prev) => [...prev, makeEmptyRoom(prev.length)]);
  };

  const handleUpdateRoom = (index, updates) => {
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const handleDeleteRoom = (index) => {
    if (rooms.length <= 1) {
      alert('A property must have at least one room.');
      return;
    }
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRoomPhotosChange = (index, uploadedPhotos) => {
    const urls = sanitizeMediaUrls(uploadedPhotos);
    handleUpdateRoom(index, { photos: urls });
  };

  // Save changes handler
  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Client-side validations
    if (!form.title.trim()) {
      setErrorMessage('Listing title is required.');
      setSaving(false);
      return;
    }
    if (!form.address.trim() || !form.city.trim() || !form.area.trim()) {
      setErrorMessage('Address, Area, and City are required.');
      setSaving(false);
      return;
    }

    const isRent = form.listingType === 'Rent' || form.listingType === 'Both';
    const isSale = form.listingType === 'Sale' || form.listingType === 'Both';

    if (isRent && (!form.monthlyRent || Number(form.monthlyRent) <= 0)) {
      setErrorMessage('Please enter a valid Monthly Rent.');
      setSaving(false);
      return;
    }
    if (isSale && (!form.salePrice || Number(form.salePrice) <= 0)) {
      setErrorMessage('Please enter a valid Sale Price.');
      setSaving(false);
      return;
    }

    if (form.electricityBill === 'Fixed Monthly Amount') {
      const charge = Number(form.monthlyElectricityCharge);
      if (isNaN(charge) || charge < 0) {
        setErrorMessage('Monthly Electricity Charge must be 0 or a positive amount.');
        setSaving(false);
        return;
      }
    }

    if (form.waterCharges === 'Fixed Monthly Amount') {
      const charge = Number(form.monthlyWaterCharge);
      if (isNaN(charge) || charge < 0) {
        setErrorMessage('Monthly Water Charge must be 0 or a positive amount.');
        setSaving(false);
        return;
      }
    }

    // Validate rooms
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (!r.name.trim()) {
        setErrorMessage(`Room #${i + 1} must have a name.`);
        setSaving(false);
        return;
      }
      if (!r.length || Number(r.length) <= 0 || !r.width || Number(r.width) <= 0) {
        setErrorMessage(`Room "${r.name}" must have valid length and width.`);
        setSaving(false);
        return;
      }
    }

    try {
      const isSale = form.listingType === 'Sale';
      const isBoth = form.listingType === 'Both';
      const isRent = form.listingType === 'Rent';
      const rentPrice = Number(form.monthlyRent) || 0;
      const salePrice = Number(form.salePrice) || 0;
      const primaryPrice = isSale ? salePrice : (rentPrice || salePrice);

      const elecCharge = form.electricityBill === 'Fixed Monthly Amount' ? Math.max(0, parseFloat(form.monthlyElectricityCharge) || 0) : 0;
      const waterCharge = form.waterCharges === 'Fixed Monthly Amount' ? Math.max(0, parseFloat(form.monthlyWaterCharge) || 0) : 0;

      let finalElec = form.electricityBill || (isSale ? 'As per usage' : 'Included in Rent');
      if (isSale && finalElec === 'Included in Rent') finalElec = 'As per usage';
      let finalWater = form.waterCharges || (isSale ? 'As per usage' : 'Included in Rent');
      if (isSale && finalWater === 'Included in Rent') finalWater = 'As per usage';

      // Format authoritative rooms
      const formattedRooms = rooms.map((room, roomIdx) => ({
        id: room.id || `room-${Date.now()}-${roomIdx}`,
        name: room.name.trim(),
        type: room.type || classifyRoomType(room.name),
        length: Number(room.length) || 12,
        width: Number(room.width) || 10,
        height: Number(room.height) || 10,
        count: Math.max(1, Number(room.count) || 1),
        description: room.description || '',
        photos: sanitizeMediaUrls(room.photos),
        unit: room.unit || 'ft',
        floorNumber: Number(room.floorNumber) || 0,
        area: (Number(room.length) || 12) * (Number(room.width) || 10),
      }));

      // Generate canonical layout from formatted rooms and current floor plan
      const canonical = buildCanonicalLayout(formattedRooms, floorPlan, {
        unit: 'ft',
        wallThickness: Number(wallThickness) || 0.15,
        wallHeight: 1.85,
        totalFloors: Number(form.totalFloors) || 1,
        propertyId: id,
      });

      const updatedFloorPlan = floorPlan ? {
        ...floorPlan,
        layout: canonical,
      } : null;

      // Build 3D config
      const threeDConfig = {
        enabled: true,
        unit: 'ft',
        furnishing: form.furnished,
        wallThickness: Number(wallThickness) || 0.15,
        floorPlan: updatedFloorPlan,
        canonicalLayout: canonical,
        floors: [{
          floorNumber: 0,
          rooms: formattedRooms,
        }],
      };

      const payload = {
        title: form.title.trim(),
        type: form.propertyType,
        propertyType: form.propertyType.toLowerCase(),
        listingType: form.listingType,
        transactionType: isSale ? 'sale' : isBoth ? 'both' : 'rent',
        status: isSale ? 'Sale' : isBoth ? 'Both' : 'Rent',
        price: primaryPrice,
        address: form.address.trim(),
        area: form.area.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        sqft: Number(form.size) || 0,
        squareFeet: Number(form.size) || 0,
        bedrooms: isLand ? 0 : (Number(form.bedrooms) || 0),
        bathrooms: isLand ? 0 : (Number(form.bathrooms) || 0),
        floorNumber: isLand ? 0 : (Number(form.floorNumber) || 0),
        totalFloors: isLand ? 0 : (Number(form.totalFloors) || 1),
        numberOfFloors: isLand ? 0 : (Number(form.totalFloors) || 1),
        furnished: isLand ? '' : form.furnished,
        balcony: isLand ? '' : form.balcony,
        parking: isLand ? 0 : (form.parking === 'Yes' ? 1 : Number(form.parking) || 0),
        garden: isLand ? '' : form.garden,
        amenities: isLand ? [] : form.amenities,
        landDetails: {
          area: form.size,
          unit: form.landUnit || 'sq. ft.',
          usage: form.landUsage || '',
          roadAccess: form.roadAccess || '',
          facing: form.facing || '',
          boundary: form.boundary || '',
          water: Boolean(form.water),
          electricity: Boolean(form.electricity),
        },
        description: form.description,
        electricityBill: finalElec,
        monthlyElectricityCharge: elecCharge,
        waterCharges: finalWater,
        monthlyWaterCharge: waterCharge,
        rentDetails: isSale ? null : {
          monthlyRent: rentPrice,
          securityDeposit: form.securityDeposit,
          maintenanceCharges: form.maintenanceCharges,
          electricityBill: finalElec,
          monthlyElectricityCharge: elecCharge,
          waterCharges: finalWater,
          monthlyWaterCharge: waterCharge,
        },
        saleDetails: isRent ? null : {
          salePrice,
          maintenanceCharges: form.maintenanceCharges,
        },
        rooms: formattedRooms,
        photos: sanitizeMediaUrls(propertyPhotos),
        videos: sanitizeMediaUrls(propertyVideos),
        floorPlan: updatedFloorPlan,
        canonicalLayout: canonical,
        threeDConfig,
        roomLength: Number(formattedRooms[0]?.length) || 0,
        roomWidth: Number(formattedRooms[0]?.width) || 0,
        roomHeight: Number(formattedRooms[0]?.height) || 0,
      };

      // Call API via context updater
      await updateProperty(id, payload);

      // Reload fresh data from backend
      try {
        const { data: refreshed } = await api.get(`/properties/${id}`);
        const p = refreshed?.data || refreshed?.property || refreshed;
        if (p && p._id) {
          if (p.floorPlan) setFloorPlan(p.floorPlan);
          if (p.rooms?.length) setRooms(p.rooms);
        }
      } catch (refreshErr) {
        console.warn('Could not reload updated property silently:', refreshErr);
      }

      setSuccessMessage('Property updated successfully.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update property.');
    } finally {
      setSaving(false);
    }
  };

  // Computed summary values for 3D Configuration section
  const totalFloorCount = Math.max(1, Number(form?.totalFloors) || 1);
  const totalBedrooms = useMemo(() => {
    return rooms.reduce((acc, r) => {
      const type = classifyRoomType(r.name, r.type);
      return type === 'bedroom' ? acc + (Number(r.count) || 1) : acc;
    }, 0);
  }, [rooms]);

  const totalBathrooms = useMemo(() => {
    return rooms.reduce((acc, r) => {
      const type = classifyRoomType(r.name, r.type);
      return type === 'bathroom' ? acc + (Number(r.count) || 1) : acc;
    }, 0);
  }, [rooms]);

  const isPdfFloorPlan = useMemo(() => {
    if (!floorPlan?.url) return false;
    const url = String(floorPlan.url).toLowerCase();
    const type = String(floorPlan.type || '').toLowerCase();
    const name = String(floorPlan.name || '').toLowerCase();
    return url.endsWith('.pdf') || type.includes('pdf') || name.endsWith('.pdf');
  }, [floorPlan]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <FiRefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading property details...</p>
      </div>
    );
  }

  if (errorMessage && !form) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-900/50 dark:bg-red-950/40">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">Unable to Edit Property</h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          <Link to="/landlord/posted-properties" className="btn-primary mt-6 inline-flex">
            Back to Posted Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header Bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <Link
            to={`/property/${id}`}
            className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-accent transition"
          >
            <FiArrowLeft /> Back to Property
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
            Edit Property
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Update your property information, 2D floor plan, rooms, dimensions, and 3D configuration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/property/${id}`)}
            className="btn-ghost border border-slate-300 dark:border-slate-700 !px-5 !py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="btn-primary !px-6 !py-2.5 text-sm shadow-md flex items-center gap-2"
          >
            {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
            <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <FiCheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="font-medium text-sm">{successMessage}</p>
          </div>
          <Link
            to={`/property/${id}`}
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 whitespace-nowrap"
          >
            View Listing
          </Link>
        </div>
      )}

      {errorMessage && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm dark:border-red-800 dark:bg-red-950/70 dark:text-red-200">
          <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="font-medium text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSaveChanges} className="space-y-10">
        {/* SECTION 1: BASIC PROPERTY DETAILS */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              Basic Property Details
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Essential property classification, dimensions, and type
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Listing title <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="input font-medium"
                placeholder={getListingTitlePlaceholder(form.propertyType, form.listingType)}
              />
            </div>

            <div>
              <label className="label">Transaction Type</label>
              <select name="listingType" value={form.listingType} onChange={handleChange} className="input">
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Property Type</label>
              <select name="propertyType" value={form.propertyType} onChange={handleChange} className="input">
                {PROPERTY_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">{getSizeLabel(form.propertyType)}</label>
              <input
                type="number"
                name="size"
                value={form.size}
                onChange={handleChange}
                className="input"
                placeholder="e.g. 1850"
                min="1"
              />
            </div>

            {!isLand && (
              <>
                <div>
                  <label className="label">Total Floors</label>
                  <input
                    type="number"
                    name="totalFloors"
                    value={form.totalFloors}
                    onChange={handleChange}
                    className="input"
                    placeholder="1"
                    min="1"
                  />
                </div>

                <div>
                  <label className="label">Property Floor Number</label>
                  <input
                    type="number"
                    name="floorNumber"
                    value={form.floorNumber}
                    onChange={handleChange}
                    className="input"
                    placeholder="0 (Ground Floor)"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label">Furnished Status</label>
                  <select name="furnished" value={form.furnished} onChange={handleChange} className="input">
                    {FURNISHED_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Bedrooms</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={form.bedrooms}
                    onChange={handleChange}
                    className="input"
                    placeholder="Number of bedrooms"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label">Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={form.bathrooms}
                    onChange={handleChange}
                    className="input"
                    placeholder="Number of bathrooms"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label">Parking</label>
                  <input
                    type="text"
                    name="parking"
                    value={form.parking}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. 1 Covered, 2 Open"
                  />
                </div>

                <div>
                  <label className="label">Balcony</label>
                  <input
                    type="text"
                    name="balcony"
                    value={form.balcony}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. 2 Attached Balconies"
                  />
                </div>

                <div>
                  <label className="label">Garden / Yard</label>
                  <input
                    type="text"
                    name="garden"
                    value={form.garden}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. Private Landscaped Garden"
                  />
                </div>
              </>
            )}
          </div>

          {isLand && (
            <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800 space-y-4">
              <h3 className="font-display font-semibold text-base">Plot & Land details</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Land Unit</label>
                  <select name="landUnit" value={form.landUnit || 'sq. ft.'} onChange={handleChange} className="input">
                    <option>sq. ft.</option>
                    <option>sq. yards</option>
                    <option>acres</option>
                    <option>sq. meters</option>
                  </select>
                </div>
                <div>
                  <label className="label">Land type / usage</label>
                  <input
                    type="text"
                    name="landUsage"
                    value={form.landUsage || ''}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. Residential, Commercial, Agricultural"
                  />
                </div>
                <div>
                  <label className="label">Road Access</label>
                  <input
                    type="text"
                    name="roadAccess"
                    value={form.roadAccess || ''}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. 40 ft wide road"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Facing Direction</label>
                  <input
                    type="text"
                    name="facing"
                    value={form.facing || ''}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. East facing"
                  />
                </div>
                <div>
                  <label className="label">Boundary Details</label>
                  <input
                    type="text"
                    name="boundary"
                    value={form.boundary || ''}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. Fenced with boundary wall"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-sm font-medium">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="water"
                    checked={Boolean(form.water)}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>Water available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="electricity"
                    checked={Boolean(form.electricity)}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>Electricity available</span>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: LOCATION */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              Location Details
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Complete physical address, city, and locality
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Street Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                className="input"
                placeholder="House / Flat No., Building, Street Name"
              />
            </div>

            <div>
              <label className="label">Area / Locality <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g. Indiranagar or Jubilee Hills"
              />
            </div>

            <div>
              <label className="label">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g. Bengaluru"
              />
            </div>

            <div>
              <label className="label">State <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g. Karnataka"
              />
            </div>

            <div>
              <label className="label">Pincode <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g. 560038"
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: PRICING */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              Pricing & Deposits
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Rent, maintenance, security deposit, or sale price
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(form.listingType === 'Rent' || form.listingType === 'Both') && (
              <div>
                <label className="label">Monthly Rent (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="monthlyRent"
                  value={form.monthlyRent}
                  onChange={handleChange}
                  required
                  min="0"
                  className="input font-semibold text-primary dark:text-accent"
                  placeholder="e.g. 25000"
                />
              </div>
            )}

            {(form.listingType === 'Sale' || form.listingType === 'Both') && (
              <div>
                <label className="label">Total Sale Price (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="salePrice"
                  value={form.salePrice}
                  onChange={handleChange}
                  required
                  min="0"
                  className="input font-semibold text-primary dark:text-accent"
                  placeholder="e.g. 8500000"
                />
              </div>
            )}

            <div>
              <label className="label">Security Deposit (₹)</label>
              <input
                type="number"
                name="securityDeposit"
                value={form.securityDeposit}
                onChange={handleChange}
                min="0"
                className="input"
                placeholder="e.g. 50000"
              />
            </div>

            <div>
              <label className="label">Monthly Maintenance Charges (₹)</label>
              <input
                type="number"
                name="maintenanceCharges"
                value={form.maintenanceCharges}
                onChange={handleChange}
                min="0"
                className="input"
                placeholder="e.g. 2500"
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: UTILITY CHARGES */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              Utility Charges
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Specify how electricity and water charges are billed
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Electricity Bill Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Electricity Bill
              </h3>
              <div className="space-y-2.5">
                {['Included in Rent', 'Paid Separately', 'Fixed Monthly Amount'].map((mode) => (
                  <label key={mode} className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="electricityBill"
                      value={mode}
                      checked={form.electricityBill === mode}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>

              {form.electricityBill === 'Fixed Monthly Amount' && (
                <div className="pt-2">
                  <label className="label">Monthly Electricity Charge (₹)</label>
                  <input
                    type="number"
                    name="monthlyElectricityCharge"
                    value={form.monthlyElectricityCharge}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="input bg-white dark:bg-slate-800"
                    placeholder="e.g. 1500"
                  />
                </div>
              )}
            </div>

            {/* Water Charges Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-sky-300">
                Water Charges
              </h3>
              <div className="space-y-2.5">
                {['Included in Rent', 'Paid Separately', 'Fixed Monthly Amount'].map((mode) => (
                  <label key={mode} className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="waterCharges"
                      value={mode}
                      checked={form.waterCharges === mode}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>

              {form.waterCharges === 'Fixed Monthly Amount' && (
                <div className="pt-2">
                  <label className="label">Monthly Water Charge (₹)</label>
                  <input
                    type="number"
                    name="monthlyWaterCharge"
                    value={form.monthlyWaterCharge}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="input bg-white dark:bg-slate-800"
                    placeholder="e.g. 500"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 5: DESCRIPTION */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
              Property Description
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide an accurate, detailed overview of the property
            </p>
          </div>

          <div>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              className="input leading-relaxed"
              placeholder="Detailed description of features, location advantages, surroundings, etc."
            />
          </div>
        </section>

        {/* SECTION 6: AMENITIES */}
        {!isLand && (
          <section className="card p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">6</span>
                Amenities & Facilities
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select or add custom amenities available at this property
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {AMENITIES_LIST.map((amenity) => {
                const selected = form.amenities?.includes(amenity);
                return (
                  <button
                    type="button"
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                      selected
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {selected && '✓ '}
                    {amenity}
                  </button>
                );
              })}
            </div>

            {/* Add custom amenity */}
            <div className="flex items-center gap-2 pt-2 max-w-md">
              <input
                type="text"
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAmenity();
                  }
                }}
                placeholder="Add custom amenity..."
                className="input !py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                className="btn-outline !py-1.5 !px-3 text-xs shrink-0"
              >
                <FiPlus /> Add
              </button>
            </div>
          </section>
        )}

        {/* SECTION 7: PROPERTY MEDIA */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">7</span>
              Property Media
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage exterior, interior, and showcase photos
            </p>
          </div>

          {/* Existing Photos Grid */}
          {propertyPhotos.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Photos ({propertyPhotos.length})
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                {propertyPhotos.map((url, idx) => (
                  <div key={idx} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <img src={resolveMediaUrl(url)} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPropertyPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      title="Remove Photo"
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white shadow-md opacity-0 group-hover:opacity-100 transition"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <MediaUpload
              label="Add More Property Photos"
              accept="image/*"
              files={[]}
              onChange={(newUrls) => setPropertyPhotos((prev) => [...prev, ...sanitizeMediaUrls(newUrls)])}
              type="image"
            />
          </div>
        </section>

        {/* SECTION 8: 2D FLOOR PLAN */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">8</span>
              2D Floor Plan
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Upload or update architectural 2D floor plans (PDF, PNG, JPG, WEBP, SVG)
            </p>
          </div>

          {floorPlan ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Preview Thumbnail */}
                <div className="relative max-h-64 max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800 shrink-0">
                  {isPdfFloorPlan ? (
                    <div className="flex h-48 w-64 flex-col items-center justify-center gap-3 bg-red-50 text-red-600 dark:bg-red-950/40">
                      <FiFileText size={48} />
                      <span className="text-xs font-bold uppercase tracking-wider">PDF Document</span>
                    </div>
                  ) : (
                    <img
                      src={resolveMediaUrl(floorPlan.url)}
                      alt="Floor Plan Preview"
                      className="max-h-56 w-auto object-contain rounded-lg"
                    />
                  )}
                </div>

                {/* Details & Actions */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {floorPlan.name || 'Floor Plan'}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(floorPlan.size)} {floorPlan.type ? `· ${floorPlan.type}` : ''}
                    </p>
                  </div>

                  {floorPlan.layout?.summary && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ {floorPlan.layout.summary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <input
                      ref={floorPlanInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.svg"
                      onChange={(e) => handleFloorPlanSelect(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => floorPlanInputRef.current?.click()}
                      disabled={uploadingPlan}
                      className="btn-outline !py-2 !px-4 text-xs font-semibold flex items-center gap-2"
                    >
                      <FiRefreshCw className={uploadingPlan ? 'animate-spin' : ''} />
                      <span>{uploadingPlan ? 'Processing...' : 'Replace Floor Plan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFloorPlan}
                      className="btn-ghost !py-2 !px-4 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <FiTrash2 /> Remove Plan
                    </button>
                    {floorPlan.url && (
                      <a
                        href={resolveMediaUrl(floorPlan.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost !py-2 !px-3 text-xs"
                      >
                        <FiExternalLink /> View Original
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingPlan(true); }}
              onDragLeave={() => setIsDraggingPlan(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingPlan(false);
                handleFloorPlanSelect(e.dataTransfer.files);
              }}
              onClick={() => floorPlanInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                isDraggingPlan
                  ? 'border-primary bg-primary/10'
                  : 'border-slate-300 bg-slate-50/50 hover:border-primary/60 dark:border-slate-700 dark:bg-slate-900/30'
              }`}
            >
              <input
                ref={floorPlanInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.svg"
                onChange={(e) => handleFloorPlanSelect(e.target.files)}
                className="hidden"
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {uploadingPlan ? <FiRefreshCw className="animate-spin" size={24} /> : <FiUploadCloud size={28} />}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  {uploadingPlan ? 'Uploading & Analyzing...' : 'Click or drag 2D floor plan here'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Supported: PDF, PNG, JPG, WEBP, SVG (Max 20MB)
                </p>
              </div>
            </div>
          )}

          {planUploadError && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{planUploadError}</p>
          )}
        </section>

        {/* SECTION 9: ROOMS & DIMENSIONS */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">9</span>
                Rooms & Dimensions ({rooms.length})
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Authoritative dimensions for every room saved in MongoDB
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRoom}
              className="btn-outline !py-2 !px-4 text-xs font-semibold flex items-center gap-2"
            >
              <FiPlus /> Add Room
            </button>
          </div>

          <div className="space-y-6">
            {rooms.map((room, index) => (
              <div
                key={room.id || index}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/50 space-y-5"
              >
                <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {room.name || `Room ${index + 1}`}
                    </h3>
                  </div>
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(index)}
                      className="btn-ghost !p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete Room"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <label className="label">Room Name</label>
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => handleUpdateRoom(index, { name: e.target.value })}
                      required
                      className="input bg-white dark:bg-slate-800"
                      placeholder="e.g. Master Bedroom, Kitchen, Living Room"
                    />
                  </div>

                  <div>
                    <label className="label">Room Type</label>
                    <select
                      value={room.type}
                      onChange={(e) => handleUpdateRoom(index, { type: e.target.value })}
                      className="input bg-white dark:bg-slate-800"
                    >
                      {ROOM_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Number of Identical Rooms</label>
                    <input
                      type="number"
                      min="1"
                      value={room.count}
                      onChange={(e) => handleUpdateRoom(index, { count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="input bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="label">Length ({room.unit || 'ft'})</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={room.length}
                      onChange={(e) => handleUpdateRoom(index, { length: parseFloat(e.target.value) || 0 })}
                      required
                      className="input bg-white dark:bg-slate-800"
                      placeholder="Length"
                    />
                  </div>

                  <div>
                    <label className="label">Width ({room.unit || 'ft'})</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={room.width}
                      onChange={(e) => handleUpdateRoom(index, { width: parseFloat(e.target.value) || 0 })}
                      required
                      className="input bg-white dark:bg-slate-800"
                      placeholder="Width"
                    />
                  </div>

                  <div>
                    <label className="label">Height ({room.unit || 'ft'}, optional)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={room.height || ''}
                      onChange={(e) => handleUpdateRoom(index, { height: parseFloat(e.target.value) || 0 })}
                      className="input bg-white dark:bg-slate-800"
                      placeholder="Height"
                    />
                  </div>

                  <div>
                    <label className="label">Calculated Area</label>
                    <div className="flex h-[42px] items-center rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {(Number(room.length) || 0) * (Number(room.width) || 0)} sq. ft.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Room Description (optional)</label>
                  <input
                    type="text"
                    value={room.description || ''}
                    onChange={(e) => handleUpdateRoom(index, { description: e.target.value })}
                    className="input bg-white dark:bg-slate-800"
                    placeholder="e.g. Spacious with attached bath, wooden flooring, and large bay windows."
                  />
                </div>

                {/* Room Photos */}
                <div>
                  <label className="label">Room Photos</label>
                  {room.photos?.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-3">
                      {room.photos.map((photoUrl, pIdx) => (
                        <div key={pIdx} className="group relative h-16 w-20 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                          <img src={resolveMediaUrl(photoUrl)} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = room.photos.filter((_, i) => i !== pIdx);
                              handleUpdateRoom(index, { photos: updated });
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <MediaUpload
                    label={`Upload Photos for ${room.name}`}
                    accept="image/*"
                    files={[]}
                    onChange={(newPhotos) => handleRoomPhotosChange(index, [...(room.photos || []), ...newPhotos])}
                    type="image"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 10: 3D CONFIGURATION */}
        <section className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">10</span>
              3D House Configuration & Live Model
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Data-driven 3D architectural model dynamically compiled from saved rooms and 2D floor plan
            </p>
          </div>

          {/* Configuration Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">Floors Configured</span>
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                {totalFloorCount} {totalFloorCount === 1 ? 'Floor' : 'Floors'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">Configured Bedrooms</span>
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                {totalBedrooms}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">Configured Bathrooms</span>
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                {totalBathrooms}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <label className="text-xs text-slate-500 dark:text-slate-400">Wall Thickness (m)</label>
              <input
                type="number"
                min="0.05"
                step="0.01"
                value={wallThickness}
                onChange={(e) => setWallThickness(parseFloat(e.target.value) || 0.15)}
                className="input !py-1 text-sm mt-1"
              />
            </div>
          </div>

          {/* Interactive 3D Model View */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Interactive 3D Preview (Left drag: rotate · Right drag: pan · Wheel: zoom)
            </p>
            <div className="card relative h-[26rem] sm:h-[32rem] overflow-hidden p-2 shadow-card">
              <Room3D
                config={{
                  enabled: true,
                  unit: 'ft',
                  furnishing: form.furnished,
                  wallThickness,
                  floorPlan: floorPlan || null,
                  floors: [{ floorNumber: 0, rooms }],
                  isLand: isPlotOrLandType(form.propertyType),
                  propertyType: form.propertyType,
                }}
                floorPlan={floorPlan}
                rooms={rooms}
                furnishing={form.furnished}
                propertyType={form.propertyType}
                type={form.propertyType}
                listingType={form.listingType}
                transactionType={form.listingType}
                isLand={isPlotOrLandType(form.propertyType)}
                length={rooms[0]?.length || 12}
                width={rooms[0]?.width || 10}
                height={rooms[0]?.height || 10}
                bedrooms={totalBedrooms}
                bathrooms={totalBathrooms}
                kitchen={rooms.filter((r) => classifyRoomType(r.name, r.type) === 'kitchen').length}
                hall={rooms.filter((r) => classifyRoomType(r.name, r.type) === 'living').length}
                floors={totalFloorCount}
              />
            </div>
          </div>
        </section>

        {/* BOTTOM ACTION BAR */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <Link
            to={`/property/${id}`}
            className="btn-ghost !px-5 !py-2.5 text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary !px-8 !py-3 text-sm shadow-lg flex items-center gap-2"
          >
            {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
            <span className="font-bold">{saving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
