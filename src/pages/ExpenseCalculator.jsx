import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  FiArrowLeft,
  FiHome,
  FiCreditCard,
  FiTrendingUp,
  FiInfo,
  FiAlertCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import { useAppData } from '../context/AppDataContext';
import api from '../utils/api';
import {
  getPropertyPricing,
  formatCurrency,
  formatINR,
  calculateHomeLoanEmi,
  calculateRentVsBuyProjection,
} from '../utils/propertyPricing';

const RENTAL_FIELDS = [
  { key: 'rent', label: 'Monthly Rent' },
  { key: 'water', label: 'Water Bill' },
  { key: 'electricity', label: 'Electricity Bill' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'parking', label: 'Parking Fee' },
  { key: 'other', label: 'Other Recurring Charges' },
];

const PIE_COLORS = ['var(--color-primary)', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

const getNumericValue = (val) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

export default function ExpenseCalculator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties, propertiesLoading, expenses, saveExpenses } = useAppData();

  const [directProperty, setDirectProperty] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'not_found' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const inFlightIdRef = useRef(null);
  const idRef = useRef(id);
  idRef.current = id;

  const isValidId = Boolean(id && id !== 'undefined' && id !== 'null' && String(id).trim() !== '');

  const propertyFromList = useMemo(() => {
    if (!isValidId || !properties || !properties.length) return null;
    return (
      properties.find(
        (p) => String(p.id) === String(id) || String(p._id) === String(id)
      ) || null
    );
  }, [properties, id, isValidId]);

  const fetchProperty = useCallback(async (targetId) => {
    if (!targetId || targetId === 'undefined' || targetId === 'null') {
      setFetchStatus('not_found');
      setErrorMessage('Invalid property ID.');
      return;
    }

    const strId = String(targetId);
    inFlightIdRef.current = strId;
    setDirectLoading(true);
    setFetchStatus('loading');
    setErrorMessage('');

    try {
      const res = await api.get(`/properties/${strId}`);
      if (String(idRef.current) !== strId) return;

      const payload = res.data?.data || res.data?.property || res.data;
      if (payload && (payload._id || payload.id)) {
        const normalized = {
          ...payload,
          id: payload.id || payload._id,
          _id: payload._id || payload.id,
        };
        setDirectProperty(normalized);
        setFetchStatus('success');
      } else {
        setFetchStatus('not_found');
        setErrorMessage('Property not found.');
      }
    } catch (err) {
      if (String(idRef.current) !== strId) return;
      console.error('Failed to load property for Expense Calculator:', err);
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || '';
      if (status === 404 || (status === 400 && msg.toLowerCase().includes('invalid'))) {
        setFetchStatus('not_found');
        setErrorMessage('Property not found.');
      } else {
        setFetchStatus('error');
        setErrorMessage(
          status === 503 || err.code === 'ECONNABORTED'
            ? 'Cloud server is waking up. Please retry in a few moments.'
            : 'Unable to load property details. Please check your connection and retry.'
        );
      }
    } finally {
      if (inFlightIdRef.current === strId) {
        inFlightIdRef.current = null;
        setDirectLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isValidId) {
      setFetchStatus('not_found');
      return;
    }

    const strId = String(id);
    const directMatches = directProperty && String(directProperty.id || directProperty._id) === strId;

    if (directMatches) return;
    if (inFlightIdRef.current === strId) return;

    fetchProperty(strId);
  }, [id, isValidId, fetchProperty, directProperty]);

  const directPropertyMatches = directProperty && String(directProperty.id || directProperty._id) === String(id);
  const property = directPropertyMatches ? directProperty : propertyFromList;
  const pricing = useMemo(() => (property ? getPropertyPricing(property) : null), [property]);

  // Active mode tab: 'rental' | 'emi' | 'rentVsBuy'
  const [activeTab, setActiveTab] = useState('rental');

  // --- RENTAL STATE ---
  const [rentalValues, setRentalValues] = useState({
    rent: '',
    deposit: '',
    water: '',
    electricity: '',
    maintenance: '',
    parking: '',
    other: '',
  });

  // --- EMI / LOAN STATE ---
  const [emiInputs, setEmiInputs] = useState({
    purchasePrice: '',
    downPayment: '',
    annualInterestRate: '8.5',
    tenureYears: '20',
  });

  // --- RENT VS BUY STATE ---
  const [rentVsBuyInputs, setRentVsBuyInputs] = useState({
    comparisonYears: 10,
    annualRentHike: 5,
    annualMaintenanceHike: 3,
  });

  // Initialize values when property or expenses load
  useEffect(() => {
    if (!property) return;

    const pPrice = pricing?.isSale || pricing?.isBoth
      ? (pricing.salePrice || property.price || 0)
      : (property.price || 0);

    const pRent = pricing?.isRent || pricing?.isBoth
      ? (pricing.monthlyRent || (pricing.isRent ? property.price : 0))
      : 0;

    const pDeposit = Number(property.rentDetails?.securityDeposit) || 0;
    const pMaintenance = Number(property.rentDetails?.maintenanceCharges || property.maintenanceCharges) || 0;
    const pElec = Number(property.rentDetails?.monthlyElectricityCharge || property.monthlyElectricityCharge) || 0;
    const pWater = Number(property.rentDetails?.monthlyWaterCharge || property.monthlyWaterCharge) || 0;

    // Set default tab based on transaction type
    if (pricing?.isSaleOnly) {
      setActiveTab('emi');
    } else {
      setActiveTab('rental');
    }

    // Initialize rental values from saved expenses or property record
    const targetKey = String(property.id || property._id || id);
    const saved = expenses?.[targetKey] || expenses?.[property.id] || expenses?.[property._id] || expenses?.[id];
    if (saved) {
      const initial = {};
      RENTAL_FIELDS.forEach((f) => {
        const val = saved[f.key];
        initial[f.key] = val !== undefined && val !== null ? String(val) : '';
      });
      initial.deposit = saved.deposit !== undefined && saved.deposit !== null
        ? String(saved.deposit)
        : (pDeposit ? String(pDeposit) : '');
      setRentalValues(initial);
    } else {
      setRentalValues({
        rent: pRent ? String(pRent) : '',
        deposit: pDeposit ? String(pDeposit) : '',
        water: pWater ? String(pWater) : '',
        electricity: pElec ? String(pElec) : '',
        maintenance: pMaintenance ? String(pMaintenance) : '',
        parking: '',
        other: '',
      });
    }

    // Initialize EMI values
    const defaultPrice = pPrice > 0 ? pPrice : (pRent * 120); // reasonable estimate if sale price unlisted
    const defaultDownPayment = Math.round(defaultPrice * 0.2); // 20% down payment
    setEmiInputs((prev) => ({
      ...prev,
      purchasePrice: defaultPrice ? String(defaultPrice) : '',
      downPayment: defaultDownPayment ? String(defaultDownPayment) : '',
    }));
  }, [id, property, pricing]);

  // Clean numerical input helper
  const sanitizeNumber = (rawVal) => {
    if (rawVal === '') return '';
    if (rawVal.includes('-')) return null;
    const sanitized = rawVal.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
  };

  const handleRentalChange = (key, rawVal) => {
    const clean = sanitizeNumber(rawVal);
    if (clean === null) return;
    const next = { ...rentalValues, [key]: clean };
    setRentalValues(next);
    const targetKey = property ? String(property.id || property._id) : String(id);
    if (targetKey && targetKey !== 'undefined') {
      saveExpenses(targetKey, next);
    }
  };

  const handleEmiChange = (key, rawVal) => {
    const clean = sanitizeNumber(rawVal);
    if (clean === null) return;
    setEmiInputs((prev) => ({ ...prev, [key]: clean }));
  };

  const handleDownPaymentPercent = (percent) => {
    const price = getNumericValue(emiInputs.purchasePrice);
    if (price <= 0) return;
    const dp = Math.round((price * percent) / 100);
    setEmiInputs((prev) => ({ ...prev, downPayment: String(dp) }));
  };

  // --- RENTAL CALCULATIONS ---
  const monthlyTotal = useMemo(() => {
    const sum = RENTAL_FIELDS.reduce(
      (total, f) => total + getNumericValue(rentalValues[f.key]),
      0
    );
    return Number.isFinite(sum) ? Math.round(sum * 100) / 100 : 0;
  }, [rentalValues]);

  const yearlyTotal = useMemo(() => {
    const sum = monthlyTotal * 12;
    return Number.isFinite(sum) ? Math.round(sum * 100) / 100 : 0;
  }, [monthlyTotal]);

  const moveInUpfront = useMemo(() => {
    const rent = getNumericValue(rentalValues.rent);
    const deposit = getNumericValue(rentalValues.deposit);
    return rent + deposit;
  }, [rentalValues]);

  const rentalChartData = useMemo(
    () =>
      RENTAL_FIELDS.map((f) => ({
        name: f.label,
        value: getNumericValue(rentalValues[f.key]),
      })).filter((d) => d.value > 0),
    [rentalValues]
  );

  const rentalBarData = useMemo(
    () =>
      RENTAL_FIELDS.map((f) => ({
        name: f.label,
        amount: getNumericValue(rentalValues[f.key]),
      })),
    [rentalValues]
  );

  // --- EMI CALCULATIONS ---
  const emiResult = useMemo(() => {
    const price = getNumericValue(emiInputs.purchasePrice);
    const dp = getNumericValue(emiInputs.downPayment);
    const rate = Number(emiInputs.annualInterestRate) || 0;
    const tenure = Number(emiInputs.tenureYears) || 1;

    return calculateHomeLoanEmi({
      purchasePrice: price,
      downPayment: dp,
      annualInterestRate: rate,
      tenureYears: tenure,
    });
  }, [emiInputs]);

  const emiPieData = useMemo(() => {
    if (emiResult.principal <= 0) return [];
    return [
      { name: 'Principal Loan Amount', value: emiResult.principal, color: '#3B82F6' },
      { name: 'Total Interest Payable', value: emiResult.totalInterest, color: '#F59E0B' },
    ];
  }, [emiResult]);

  const emiCostBreakdownData = useMemo(() => {
    return [
      { name: 'Down Payment', amount: emiResult.downPayment },
      { name: 'Principal Loan', amount: emiResult.principal },
      { name: 'Interest Cost', amount: emiResult.totalInterest },
    ];
  }, [emiResult]);

  // --- RENT VS BUY CALCULATIONS ---
  const rentVsBuyResult = useMemo(() => {
    return calculateRentVsBuyProjection({
      monthlyRent: monthlyTotal > 0 ? monthlyTotal : getNumericValue(rentalValues.rent),
      monthlyUtilities: 0, // already included in monthlyTotal
      annualRentHike: rentVsBuyInputs.annualRentHike,
      purchasePrice: getNumericValue(emiInputs.purchasePrice),
      downPayment: getNumericValue(emiInputs.downPayment),
      annualInterestRate: Number(emiInputs.annualInterestRate) || 0,
      loanTenureYears: Number(emiInputs.tenureYears) || 20,
      monthlyMaintenance: getNumericValue(rentalValues.maintenance),
      annualMaintenanceHike: rentVsBuyInputs.annualMaintenanceHike,
      comparisonYears: rentVsBuyInputs.comparisonYears,
    });
  }, [monthlyTotal, rentalValues, emiInputs, rentVsBuyInputs]);

  // Room area calculation if 3D config exists
  const roomAreas = useMemo(() => {
    const rooms = property?.threeDConfig?.floors?.flatMap((floor) => floor.rooms || []) || [];
    return rooms.map((room) => ({
      ...room,
      area: (Number(room.length) || 0) * (Number(room.width) || 0),
    }));
  }, [property]);

  const totalFloorArea = useMemo(() => {
    return roomAreas.reduce((total, room) => total + (room.area || 0), 0);
  }, [roomAreas]);

  // Loading state
  const isInitialLoading = (directLoading || (propertiesLoading && !propertyFromList)) && !property;
  if (isInitialLoading) {
    return (
      <div className="section flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-ink/60 dark:text-slate-400">Loading property financial details...</p>
      </div>
    );
  }

  // Not found or error state
  if (!property) {
    if (fetchStatus === 'error') {
      return (
        <div className="section flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5">
            <FiAlertCircle className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-bold">Unable to load property</h2>
          <p className="max-w-md text-sm text-ink/60 dark:text-slate-400">
            {errorMessage || 'There was a problem communicating with the server. Please check your connection and retry.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fetchProperty(id)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <FiRefreshCw className="h-4 w-4" /> Retry
            </button>
            <Link to="/search" className="btn-secondary">
              Back to Search
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="section flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Property not found</h2>
        <p className="text-sm text-ink/60 dark:text-slate-400">
          The requested property could not be loaded for expense calculation.
        </p>
        <Link to="/search" className="btn-primary mt-2">
          Back to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="section py-8">
      {/* Header & Back Button */}
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 !px-3">
        <FiArrowLeft /> Back
      </button>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Smart Real Estate Calculator</h1>
          <p className="mt-1 text-ink/60 dark:text-slate-400">
            {property.title} — {property.area}, {property.city}
          </p>
        </div>

        {pricing && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${pricing.badgeColor}`}>
              {pricing.badgeText}
            </span>
            <span className="text-lg font-bold text-primary">
              {pricing.cardPriceDisplay}
            </span>
          </div>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-surface-border/20 pb-4 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('rental')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'rental'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-surface hover:bg-surface/80 text-ink/70 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <FiHome className="text-base" /> Rental Expenses
        </button>

        <button
          onClick={() => setActiveTab('emi')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'emi'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-surface hover:bg-surface/80 text-ink/70 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <FiCreditCard className="text-base" /> Home Loan & EMI
        </button>

        <button
          onClick={() => setActiveTab('rentVsBuy')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'rentVsBuy'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-surface hover:bg-surface/80 text-ink/70 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <FiTrendingUp className="text-base" /> Rent vs. Buy Analysis
        </button>
      </div>

      {/* 3D House Area Card (Preserved & rendered when room areas exist) */}
      {roomAreas.length > 0 && totalFloorArea > 0 && (
        <div className="card mt-6 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold">3D Architectural Area</h3>
              <p className="text-xs text-ink/50 dark:text-slate-400">
                Calculated directly from verified room coordinates
              </p>
            </div>
            <p className="font-display text-xl font-bold text-primary">
              {totalFloorArea.toFixed(1)} sq. {property.threeDConfig?.unit || 'ft'}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roomAreas.map((room) => (
              <div
                key={room.id}
                className="rounded-lg bg-surface px-3 py-2 text-sm dark:bg-slate-800"
              >
                <span className="font-medium">{room.name}</span>
                <span className="float-right text-ink/60 dark:text-slate-400">
                  {room.area.toFixed(1)} sq.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: RENTAL EXPENSES */}
      {activeTab === 'rental' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Input Panel */}
          <div className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Rental Outlay Configuration</h3>
              <span className="text-xs text-ink/50 dark:text-slate-400">Monthly recurring</span>
            </div>

            {RENTAL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label} (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="^[0-9]*\.?[0-9]*$"
                  placeholder="0"
                  value={rentalValues[f.key] ?? ''}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => handleRentalChange(f.key, e.target.value)}
                  className="input"
                />
              </div>
            ))}

            <div className="border-t border-surface-border/20 pt-4 dark:border-slate-800">
              <label className="label">
                Security Deposit (₹){' '}
                <span className="text-xs font-normal text-ink/50 dark:text-slate-400">
                  (Refundable move-in deposit)
                </span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*\.?[0-9]*$"
                placeholder="0"
                value={rentalValues.deposit ?? ''}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => handleRentalChange('deposit', e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Results & Visuals */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="card p-5 text-center">
                <p className="text-xs text-ink/50 dark:text-slate-400">Total Monthly</p>
                <p className="mt-2 font-display text-xl font-bold text-primary">
                  {formatINR(monthlyTotal)}
                </p>
                <span className="text-[10px] text-ink/40">recurring/mo</span>
              </div>

              <div className="card p-5 text-center">
                <p className="text-xs text-ink/50 dark:text-slate-400">Annual Outlay</p>
                <p className="mt-2 font-display text-xl font-bold text-secondary">
                  {formatINR(yearlyTotal)}
                </p>
                <span className="text-[10px] text-ink/40">12 months recurring</span>
              </div>

              <div className="card p-5 text-center">
                <p className="text-xs text-ink/50 dark:text-slate-400">Upfront Move-In</p>
                <p className="mt-2 font-display text-xl font-bold text-amber-500">
                  {formatINR(moveInUpfront)}
                </p>
                <span className="text-[10px] text-ink/40">Rent + Deposit</span>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="mb-4 font-display font-semibold">Expense Breakdown</h3>
              {rentalChartData.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink/40">
                  Enter monthly expense amounts on the left to view breakdown.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={rentalChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => `${entry.name}: ${formatINR(entry.value)}`}
                    >
                      {rentalChartData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-6">
              <h3 className="mb-4 font-display font-semibold">Category Comparison</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rentalBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v) => formatINR(v)} />
                  <Legend />
                  <Bar
                    dataKey="amount"
                    name="Monthly (₹)"
                    fill="var(--color-primary)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOME LOAN & EMI */}
      {activeTab === 'emi' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* EMI Inputs */}
          <div className="card space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Loan Parameters</h3>
              <span className="text-xs text-ink/50 dark:text-slate-400">Zero-interest supported</span>
            </div>

            {/* Property Price */}
            <div>
              <div className="flex justify-between">
                <label className="label">Purchase Price (₹)</label>
                <span className="text-xs text-primary font-medium">
                  {formatINR(getNumericValue(emiInputs.purchasePrice))}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*\.?[0-9]*$"
                placeholder="0"
                value={emiInputs.purchasePrice}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                }}
                onChange={(e) => handleEmiChange('purchasePrice', e.target.value)}
                className="input"
              />
            </div>

            {/* Down Payment */}
            <div>
              <div className="flex justify-between">
                <label className="label">
                  Down Payment (₹)
                  <span className="ml-1 text-xs text-ink/50 dark:text-slate-400">
                    ({emiResult.downPaymentPercent}%)
                  </span>
                </label>
                <span className="text-xs text-primary font-medium">
                  {formatINR(emiResult.downPayment)}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*\.?[0-9]*$"
                placeholder="0"
                value={emiInputs.downPayment}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                }}
                onChange={(e) => handleEmiChange('downPayment', e.target.value)}
                className="input"
              />

              {/* Quick % Pills */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-ink/50 dark:text-slate-400">Quick set:</span>
                {[10, 20, 25, 30, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleDownPaymentPercent(pct)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      emiResult.downPaymentPercent === pct
                        ? 'bg-primary text-white'
                        : 'bg-surface hover:bg-surface/80 dark:bg-slate-800 text-ink/70 dark:text-slate-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Principal display */}
            <div className="rounded-xl bg-surface/80 p-3.5 dark:bg-slate-800/80">
              <div className="flex justify-between text-xs text-ink/60 dark:text-slate-400">
                <span>Principal Loan Amount:</span>
                <span className="font-semibold text-ink dark:text-slate-200">
                  {formatINR(emiResult.principal)}
                </span>
              </div>
            </div>

            {/* Annual Interest Rate */}
            <div>
              <div className="flex justify-between items-center">
                <label className="label">
                  Annual Interest Rate (% p.a.)
                  {emiResult.annualInterestRate === 0 && (
                    <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Zero Interest
                    </span>
                  )}
                </label>
                <span className="text-xs font-semibold text-primary">
                  {emiInputs.annualInterestRate}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.1"
                  value={emiInputs.annualInterestRate}
                  onChange={(e) => handleEmiChange('annualInterestRate', e.target.value)}
                  className="w-full accent-primary"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={emiInputs.annualInterestRate}
                  onChange={(e) => handleEmiChange('annualInterestRate', e.target.value)}
                  className="input !w-20 !py-1 text-center text-sm"
                />
              </div>
            </div>

            {/* Loan Tenure */}
            <div>
              <div className="flex justify-between items-center">
                <label className="label">
                  Loan Tenure (Years / {emiResult.tenureMonths} Months)
                </label>
                <span className="text-xs font-semibold text-primary">
                  {emiInputs.tenureYears} Years
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="1"
                  value={emiInputs.tenureYears}
                  onChange={(e) => handleEmiChange('tenureYears', e.target.value)}
                  className="w-full accent-primary"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={emiInputs.tenureYears}
                  onChange={(e) => handleEmiChange('tenureYears', e.target.value)}
                  className="input !w-20 !py-1 text-center text-sm"
                />
              </div>

              {/* Quick Tenure Pills */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-ink/50 dark:text-slate-400">Tenure:</span>
                {[5, 10, 15, 20, 25, 30].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setEmiInputs((prev) => ({ ...prev, tenureYears: String(yr) }))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      Number(emiInputs.tenureYears) === yr
                        ? 'bg-primary text-white'
                        : 'bg-surface hover:bg-surface/80 dark:bg-slate-800 text-ink/70 dark:text-slate-300'
                    }`}
                  >
                    {yr}y
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* EMI Results & Charts */}
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-6 text-center border-l-4 border-l-primary">
                <p className="text-xs text-ink/50 dark:text-slate-400">Monthly Loan EMI</p>
                <p className="mt-2 font-display text-2xl font-bold text-primary">
                  {formatINR(emiResult.monthlyEmi)}
                </p>
                <span className="text-[11px] text-ink/40">per month</span>
              </div>

              <div className="card p-6 text-center border-l-4 border-l-amber-500">
                <p className="text-xs text-ink/50 dark:text-slate-400">Total Interest</p>
                <p className="mt-2 font-display text-2xl font-bold text-amber-500">
                  {formatINR(emiResult.totalInterest)}
                </p>
                <span className="text-[11px] text-ink/40">over {emiResult.tenureYears} years</span>
              </div>
            </div>

            {/* Outflow Breakdown Details */}
            <div className="card p-5 space-y-3">
              <h4 className="font-display font-semibold text-sm">Payment Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-ink/70 dark:text-slate-300">
                  <span>Down Payment:</span>
                  <span className="font-semibold text-ink dark:text-white">
                    {formatINR(emiResult.downPayment)}
                  </span>
                </div>
                <div className="flex justify-between text-ink/70 dark:text-slate-300">
                  <span>Principal Loan Amount:</span>
                  <span className="font-semibold text-ink dark:text-white">
                    {formatINR(emiResult.principal)}
                  </span>
                </div>
                <div className="flex justify-between text-ink/70 dark:text-slate-300">
                  <span>Total Interest Payable:</span>
                  <span className="font-semibold text-amber-500">
                    {formatINR(emiResult.totalInterest)}
                  </span>
                </div>
                <div className="border-t border-surface-border/20 pt-2 flex justify-between font-bold text-ink dark:text-white">
                  <span>Total Amount Payable (Principal + Interest):</span>
                  <span className="text-primary">{formatINR(emiResult.totalRepayment)}</span>
                </div>
                <div className="flex justify-between text-xs text-ink/50 dark:text-slate-400">
                  <span>Overall Acquisition Outflow (Down Payment + Repayment):</span>
                  <span className="font-semibold">{formatINR(emiResult.totalCost)}</span>
                </div>
              </div>
            </div>

            {/* Pie Chart: Principal vs Interest */}
            <div className="card p-6">
              <h3 className="mb-4 font-display font-semibold">Principal vs. Interest Distribution</h3>
              {emiPieData.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink/40">
                  Enter loan details to view distribution.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={emiPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={(entry) => `${entry.name}: ${formatINR(entry.value)}`}
                    >
                      {emiPieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bar Chart: Outflow Components */}
            <div className="card p-6">
              <h3 className="mb-4 font-display font-semibold">Acquisition Capital Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={emiCostBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} interval={0} />
                  <YAxis fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v) => formatINR(v)} />
                  <Bar dataKey="amount" name="Amount (₹)" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RENT VS. BUY ANALYSIS */}
      {activeTab === 'rentVsBuy' && (
        <div className="mt-8 space-y-6">
          {/* Honest Disclaimer Banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <FiInfo className="mt-0.5 shrink-0 text-base" />
            <div>
              <p className="font-semibold">Indicative Mathematical Projection</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                This analysis simulates cumulative cash outflow over time using solely the assumptions you provide below.
                It does not predict future real-estate appreciation, rental inflation shocks, tax deductions, or equity market returns.
                All figures are deterministic estimates for planning purposes.
              </p>
            </div>
          </div>

          {/* User Parameters Control Bar */}
          <div className="card p-6">
            <h3 className="font-display font-semibold mb-4">Comparison Assumptions</h3>
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Horizon */}
              <div>
                <label className="label">
                  Comparison Horizon ({rentVsBuyInputs.comparisonYears} Years)
                </label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={rentVsBuyInputs.comparisonYears}
                  onChange={(e) =>
                    setRentVsBuyInputs((prev) => ({
                      ...prev,
                      comparisonYears: Number(e.target.value) || 1,
                    }))
                  }
                  className="w-full accent-primary"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink/50 dark:text-slate-400">
                  <span>3 yrs</span>
                  <span>15 yrs</span>
                  <span>30 yrs</span>
                </div>
              </div>

              {/* Annual Rent Hike */}
              <div>
                <label className="label">
                  Annual Rent Escalation ({rentVsBuyInputs.annualRentHike}% p.a.)
                </label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={rentVsBuyInputs.annualRentHike}
                  onChange={(e) =>
                    setRentVsBuyInputs((prev) => ({
                      ...prev,
                      annualRentHike: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full accent-primary"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink/50 dark:text-slate-400">
                  <span>0% (flat)</span>
                  <span>5% (std)</span>
                  <span>15%</span>
                </div>
              </div>

              {/* Annual Maintenance Hike */}
              <div>
                <label className="label">
                  Annual Maintenance Hike ({rentVsBuyInputs.annualMaintenanceHike}% p.a.)
                </label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={rentVsBuyInputs.annualMaintenanceHike}
                  onChange={(e) =>
                    setRentVsBuyInputs((prev) => ({
                      ...prev,
                      annualMaintenanceHike: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full accent-primary"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink/50 dark:text-slate-400">
                  <span>0%</span>
                  <span>3% (std)</span>
                  <span>15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-6 text-center border-t-4 border-t-sky-500">
              <p className="text-xs text-ink/50 dark:text-slate-400">Cumulative Rent Outflow</p>
              <p className="mt-2 font-display text-2xl font-bold text-sky-500">
                {formatINR(rentVsBuyResult.totalRentOutflow)}
              </p>
              <span className="text-[11px] text-ink/40">over {rentVsBuyInputs.comparisonYears} years</span>
            </div>

            <div className="card p-6 text-center border-t-4 border-t-amber-500">
              <p className="text-xs text-ink/50 dark:text-slate-400">Cumulative Purchase Outflow</p>
              <p className="mt-2 font-display text-2xl font-bold text-amber-500">
                {formatINR(rentVsBuyResult.totalBuyOutflow)}
              </p>
              <span className="text-[11px] text-ink/40">Down Payment + EMIs + Maint</span>
            </div>

            <div className="card p-6 text-center border-t-4 border-t-primary">
              <p className="text-xs text-ink/50 dark:text-slate-400">Outflow Difference</p>
              <p className="mt-2 font-display text-2xl font-bold text-primary">
                {formatINR(Math.abs(rentVsBuyResult.difference))}
              </p>
              <span className="text-[11px] text-ink/40">
                {rentVsBuyResult.difference > 0 ? 'Buy outlay higher' : 'Rent outlay higher'}
              </span>
            </div>
          </div>

          {/* Progression Chart */}
          <div className="card p-6">
            <h3 className="mb-2 font-display font-semibold">Cumulative Outflow Progression</h3>
            <p className="mb-6 text-xs text-ink/50 dark:text-slate-400">
              Year-by-year cumulative capital committed (Rent + Utilities vs. Down Payment + Loan EMIs + Maintenance)
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={rentVsBuyResult.projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="yearLabel" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `₹${formatCurrency(v).replace('₹', '')}`} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Legend />
                <Bar dataKey="cumulativeRent" name="Cumulative Rent (₹)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cumulativeBuy" name="Cumulative Buy Outflow (₹)" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}