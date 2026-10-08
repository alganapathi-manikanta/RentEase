import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useAppData } from '../context/AppDataContext';
import { PROPERTY_TYPES } from '../data/mockData';
import HouseConfigurator, { createDefault3DConfig } from './HouseConfigurator';

export default function EditPropertyModal({ property, onClose }) {
  const { updateProperty } = useAppData();
  const [form, setForm] = useState({
    title: property.title, type: property.type, status: property.status,
    price: property.price, description: property.description,
    bedrooms: property.bedrooms || 0, bathrooms: property.bathrooms || 0,
    kitchen: property.kitchen || 0, hall: property.hall || 0,
  });
  const [threeDConfig, setThreeDConfig] = useState(() => property.threeDConfig || createDefault3DConfig(property));

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProperty(property.id, { ...form, price: Number(form.price), threeDConfig: { ...threeDConfig, enabled: true } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Edit Property</h3>
          <button onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input name="title" value={form.title} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="input">
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                <option value="Rent">Rent</option>
                <option value="Sale">Sale</option>
              </select>
            </div>
            <div>
              <label className="label">Price (₹)</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} className="input" />
            </div>
          </div>
          <HouseConfigurator value={threeDConfig} onChange={setThreeDConfig} form={form} />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 border border-black/10 dark:border-white/10">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
