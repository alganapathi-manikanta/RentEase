import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#2563EB', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const { user } = useAuth();
  const { properties } = useAppData();
  const myProperties = useMemo(() => properties.filter((p) => p.ownerId === user?.id), [properties, user]);

  const viewsData = myProperties.map((p) => ({ name: p.title.slice(0, 14), views: p.views, interested: p.interested }));
  const typeBreakdown = useMemo(() => {
    const map = {};
    myProperties.forEach((p) => { map[p.type] = (map[p.type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [myProperties]);

  if (myProperties.length === 0) {
    return (
      <div className="card p-16 text-center text-ink/50 dark:text-slate-400">
        Add properties to start seeing performance reports.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">Performance across your listed properties.</p>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 font-display font-semibold">Views vs Interested Tenants</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={viewsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey="views" fill="#2563EB" radius={[6, 6, 0, 0]} />
            <Bar dataKey="interested" fill="#10B981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 font-display font-semibold">Listings by Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={typeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {typeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
