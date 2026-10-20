import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useAppData } from '../context/AppDataContext';
import { PROPERTY_TYPES } from '../data/mockData';
import HouseConfigurator, { createDefault3DConfig } from './HouseConfigurator';
import { backdropFadeVariants, modalScaleVariants } from '../utils/motionVariants';

export default function EditPropertyModal({ property, onClose }) {
  const { updateProperty } = useAppData();
  const shouldReduceMotion = useReducedMotion();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <motion.div
        variants={backdropFadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        variants={modalScaleVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative z-10 card w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Edit Property</h3>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Close"
          >
            <FiX size={18} />
          </motion.button>
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
          <div className="flex gap-3 pt-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="btn-ghost flex-1 border border-black/10 dark:border-white/10"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary flex-1 shadow-md"
            >
              Save Changes
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
