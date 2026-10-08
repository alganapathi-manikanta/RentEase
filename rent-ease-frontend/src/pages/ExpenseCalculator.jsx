import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { FiArrowLeft } from 'react-icons/fi';
import { useAppData } from '../context/AppDataContext';
import { getPropertyPricing } from '../utils/propertyPricing';

const FIELDS = [
  { key: 'rent', label: 'Rent' },
  { key: 'water', label: 'Water Bill' },
  { key: 'electricity', label: 'Electricity Bill' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'parking', label: 'Parking Fee' },
  { key: 'other', label: 'Other Charges' },
];

const COLORS = ['var(--color-primary)', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

const getNumericValue = (val) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export default function ExpenseCalculator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties, expenses, saveExpenses } = useAppData();
  const property = properties.find((p) => p.id === id);

  const [values, setValues] = useState({
    rent: '',
    water: '',
    electricity: '',
    maintenance: '',
    parking: '',
    other: '',
  });

  useEffect(() => {
    if (expenses?.[id]) {
      const initial = {};
      FIELDS.forEach((f) => {
        const val = expenses[id][f.key];
        initial[f.key] = val !== undefined && val !== null ? String(val) : '';
      });
      setValues(initial);
    } else if (property) {
      const pricing = getPropertyPricing(property);
      const defaultRent = pricing.isRent || pricing.isBoth ? (pricing.monthlyRent || (pricing.isRent ? property.price : '')) : '';
      setValues({
        rent: defaultRent ? String(defaultRent) : '',
        water: '',
        electricity: '',
        maintenance: '',
        parking: '',
        other: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, property]);

  const handleChange = (key, rawVal) => {
    if (rawVal === '') {
      const next = { ...values, [key]: '' };
      setValues(next);
      saveExpenses(id, next);
      return;
    }

    // Disallow negative values
    if (rawVal.includes('-')) return;

    // Only allow digits and decimal point
    const sanitized = rawVal.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;

    const num = Number(cleanVal);
    if (cleanVal === '.' || (!isNaN(num) && num >= 0)) {
      const next = { ...values, [key]: cleanVal };
      setValues(next);
      saveExpenses(id, next);
    }
  };

  const chartData = useMemo(
    () =>
      FIELDS.map((f) => ({
        name: f.label,
        value: getNumericValue(values[f.key]),
      })).filter((d) => d.value > 0),
    [values]
  );

  const barChartData = useMemo(
    () =>
      FIELDS.map((f) => ({
        name: f.label,
        amount: getNumericValue(values[f.key]),
      })),
    [values]
  );

  const monthlyTotal = useMemo(() => {
    const sum = FIELDS.reduce((total, f) => total + getNumericValue(values[f.key]), 0);
    return Number.isFinite(sum) ? Math.round(sum * 100) / 100 : 0;
  }, [values]);

  const yearlyTotal = useMemo(() => {
    const sum = monthlyTotal * 12;
    return Number.isFinite(sum) ? Math.round(sum * 100) / 100 : 0;
  }, [monthlyTotal]);

  const roomAreas = useMemo(() => {
    const rooms = property?.threeDConfig?.floors?.flatMap((floor) => floor.rooms || []) || [];
    return rooms.map((room) => ({ ...room, area: (Number(room.length) || 0) * (Number(room.width) || 0) }));
  }, [property]);

  const totalFloorArea = useMemo(() => {
    return roomAreas.reduce((total, room) => total + (room.area || 0), 0);
  }, [roomAreas]);

  if (!property) {
    return (
      <div className="section flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Property not found</h2>
        <Link to="/search" className="btn-primary">Back to Search</Link>
      </div>
    );
  }

  return (
    <div className="section py-8">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 !px-3">
        <FiArrowLeft /> Back
      </button>

      <h1 className="font-display text-3xl font-bold">Smart Expense Calculator</h1>
      <p className="mt-1 text-ink/60 dark:text-slate-400">{property.title} — {property.area}, {property.city}</p>

      {roomAreas.length > 0 && totalFloorArea > 0 && (
        <div className="card mt-6 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div><h3 className="font-display font-semibold">3D House Area</h3><p className="text-xs text-ink/50 dark:text-slate-400">Calculated from saved room dimensions</p></div>
            <p className="font-display text-xl font-bold text-primary">{totalFloorArea.toFixed(1)} sq. {property.threeDConfig?.unit || 'ft'}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{roomAreas.map((room) => <div key={room.id} className="rounded-lg bg-surface px-3 py-2 text-sm dark:bg-slate-800"><span className="font-medium">{room.name}</span><span className="float-right text-ink/60 dark:text-slate-400">{room.area.toFixed(1)} sq.</span></div>)}</div>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h3 className="font-display font-semibold">Monthly Expenses</h3>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label} (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*\.?[0-9]*$"
                placeholder="0"
                value={values[f.key] ?? ''}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="input"
              />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6 text-center">
              <p className="text-sm text-ink/50 dark:text-slate-400">Total Monthly Expense</p>
              <p className="mt-2 font-display text-2xl font-bold text-primary">₹{formatCurrency(monthlyTotal)}</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-sm text-ink/50 dark:text-slate-400">Total Yearly Expense</p>
              <p className="mt-2 font-display text-2xl font-bold text-secondary">₹{formatCurrency(yearlyTotal)}</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="mb-4 font-display font-semibold">Expense Breakdown</h3>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink/40">Enter expense values above to view the chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(entry) => `${entry.name}: ₹${formatCurrency(entry.value)}`}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${formatCurrency(v)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-6">
            <h3 className="mb-4 font-display font-semibold">Category Comparison</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => `₹${formatCurrency(v)}`} />
                <Legend />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
