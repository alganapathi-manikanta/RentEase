import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiPlus, FiTrash2 } from 'react-icons/fi';

const ROOM_TYPES = ['living', 'bedroom', 'bathroom', 'kitchen', 'dining', 'balcony', 'garage', 'other'];
const COLORS = {
  living: '#f6c77b', bedroom: '#8fc9d6', bathroom: '#b9a7e8', kitchen: '#e59a62',
  dining: '#a8d5ba', balcony: '#9db7d5', garage: '#a7adb5', other: '#d5b6a4',
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const makeRoom = (type, index, position = {}) => ({
  id: `${type}-${Date.now()}-${index}`,
  name: `${type[0].toUpperCase()}${type.slice(1)}${type === 'bedroom' || type === 'bathroom' ? ` ${index + 1}` : ''}`,
  type,
  length: type === 'living' ? 18 : type === 'bedroom' ? 14 : type === 'bathroom' ? 8 : type === 'kitchen' ? 12 : 10,
  width: type === 'living' ? 14 : type === 'bedroom' ? 12 : type === 'bathroom' ? 6 : type === 'kitchen' ? 10 : 8,
  height: type === 'bathroom' ? 9 : 10,
  unit: 'ft',
  floorNumber: 0,
  position: { x: position.x || 0, y: 0, z: position.z || 0 },
});

export const createDefault3DConfig = (form = {}) => {
  const rooms = [];
  const addRooms = (type, count) => Array.from({ length: Math.max(toNumber(count), 0) }, (_, index) => rooms.push(makeRoom(type, index)));
  addRooms('living', form.hall ? 1 : 0);
  addRooms('kitchen', form.kitchen ? 1 : 0);
  addRooms('bedroom', form.bedrooms);
  addRooms('bathroom', form.bathrooms);
  const gap = 2;
  let rowWidth = 0;
  let rowDepth = 0;
  let row = 0;
  const maxRowWidth = 36;
  rooms.forEach((room) => {
    if (rowWidth > 0 && rowWidth + room.length > maxRowWidth) {
      row += 1;
      rowWidth = 0;
      rowDepth += 16 + gap;
    }
    room.position = {
      x: rowWidth + room.length / 2,
      y: 0,
      z: rowDepth + room.width / 2,
    };
    rowWidth += room.length + gap;
  });
  return { enabled: false, unit: 'ft', wallThickness: 0.15, floors: [{ floorNumber: 0, rooms }] };
};

export default function HouseConfigurator({ value, onChange, form }) {
  const config = value || createDefault3DConfig(form);
  const [selectedId, setSelectedId] = useState(config.floors?.[0]?.rooms?.[0]?.id || '');
  const rooms = config.floors?.[0]?.rooms || [];

  useEffect(() => {
    if (!value?.floors?.[0]?.rooms?.length) onChange(createDefault3DConfig(form));
  }, []);

  const updateRooms = (nextRooms) => onChange({ ...config, enabled: true, floors: [{ ...config.floors?.[0], floorNumber: 0, rooms: nextRooms }] });
  const selectedRoom = rooms.find((room) => room.id === selectedId) || rooms[0];

  const overlapIds = useMemo(() => {
    const overlaps = new Set();
    rooms.forEach((room, index) => {
      rooms.slice(index + 1).forEach((other) => {
        const horizontal = Math.abs((room.position?.x || 0) - (other.position?.x || 0)) < (room.length + other.length) / 2;
        const vertical = Math.abs((room.position?.z || 0) - (other.position?.z || 0)) < (room.width + other.width) / 2;
        if (horizontal && vertical) { overlaps.add(room.id); overlaps.add(other.id); }
      });
    });
    return overlaps;
  }, [rooms]);

  const updateRoom = (id, updates) => updateRooms(rooms.map((room) => (room.id === id ? { ...room, ...updates } : room)));
  const addRoom = () => {
    const room = makeRoom('other', rooms.length);
    updateRooms([...rooms, room]);
    setSelectedId(room.id);
  };
  const deleteRoom = (id) => {
    updateRooms(rooms.filter((room) => room.id !== id));
    if (selectedId === id) setSelectedId(rooms.find((room) => room.id !== id)?.id || '');
  };

  const moveSelected = (axis, amount) => {
    if (!selectedRoom) return;
    const position = { ...selectedRoom.position, [axis]: (selectedRoom.position?.[axis] || 0) + amount };
    updateRoom(selectedRoom.id, { position });
  };

  const maxLength = Math.max(...rooms.map((room) => Math.abs(room.position?.x || 0) + room.length / 2), 15) * 2.2;
  const maxWidth = Math.max(...rooms.map((room) => Math.abs(room.position?.z || 0) + room.width / 2), 12) * 2.2;
  const scale = Math.min(520 / maxLength, 280 / maxWidth);
  const toX = (x) => 280 + x * scale;
  const toY = (z) => 155 + z * scale;

  return (
    <section className="card space-y-5 p-6">
      <div>
        <h3 className="font-display font-semibold">3D House Configuration</h3>
        <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">Enter exact room dimensions. The 2D plan and 3D house use these measurements.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div><label className="label">Floors</label><select className="input" value={config.floors?.length || 1} onChange={(e) => onChange({ ...config, enabled: true })}><option value="1">Ground Floor</option></select></div>
        <div><label className="label">Bedrooms</label><input className="input" type="number" min="0" value={form.bedrooms} readOnly /></div>
        <div><label className="label">Bathrooms</label><input className="input" type="number" min="0" value={form.bathrooms} readOnly /></div>
        <div><label className="label">Wall thickness (m)</label><input className="input" type="number" min="0.05" step="0.01" value={config.wallThickness || 0.15} onChange={(e) => onChange({ ...config, wallThickness: toNumber(e.target.value, 0.15) })} /></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-xl2 border border-black/10 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">2D Floor Plan</p><button type="button" onClick={addRoom} className="btn-outline !px-3 !py-1.5 text-xs"><FiPlus /> Add room</button></div>
          <svg viewBox="0 0 560 320" className="h-auto w-full" role="img" aria-label="Interactive 2D floor plan">
            <rect x="12" y="12" width="536" height="296" rx="8" fill="#ffffff" stroke="#315b78" strokeWidth="3" />
            {rooms.map((room) => {
              const width = Math.max(room.length * scale, 28);
              const height = Math.max(room.width * scale, 24);
              const x = toX(room.position?.x || 0) - width / 2;
              const y = toY(room.position?.z || 0) - height / 2;
              return <g key={room.id} onClick={() => setSelectedId(room.id)} className="cursor-pointer"><rect x={x} y={y} width={width} height={height} fill={COLORS[room.type] || COLORS.other} stroke={overlapIds.has(room.id) ? '#dc2626' : selectedRoom?.id === room.id ? '#2563eb' : '#315b78'} strokeWidth={selectedRoom?.id === room.id ? 4 : 2} /><text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#17324d">{room.name}</text></g>;
            })}
          </svg>
          {overlapIds.size > 0 && <p className="mt-2 text-xs font-semibold text-red-600">Warning: highlighted rooms overlap. Move them before generating the house.</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">Rooms</p><span className="text-xs text-ink/50">{rooms.length} configured</span></div>
          <div className="max-h-48 space-y-1 overflow-auto pr-1">{rooms.map((room) => <button type="button" key={room.id} onClick={() => setSelectedId(room.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${selectedRoom?.id === room.id ? 'bg-primary text-white' : 'bg-surface dark:bg-slate-800'}`}><span>{room.name}</span><span>{room.length} × {room.width}</span></button>)}</div>
          {selectedRoom && <div className="space-y-3 border-t border-black/10 pt-3 dark:border-white/10">
            <div className="grid grid-cols-[1fr_auto] gap-2"><input className="input" value={selectedRoom.name} onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })} /><button type="button" title="Delete room" onClick={() => deleteRoom(selectedRoom.id)} className="btn-ghost !px-3 text-red-600"><FiTrash2 /></button></div>
            <select className="input" value={selectedRoom.type} onChange={(e) => updateRoom(selectedRoom.id, { type: e.target.value })}>{ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <div className="grid grid-cols-2 gap-2"><input className="input" type="number" min="0.1" step="0.1" value={selectedRoom.length} onChange={(e) => updateRoom(selectedRoom.id, { length: toNumber(e.target.value) })} placeholder="Length" /><input className="input" type="number" min="0.1" step="0.1" value={selectedRoom.width} onChange={(e) => updateRoom(selectedRoom.id, { width: toNumber(e.target.value) })} placeholder="Width" /><input className="input" type="number" min="0.1" step="0.1" value={selectedRoom.height} onChange={(e) => updateRoom(selectedRoom.id, { height: toNumber(e.target.value) })} placeholder="Height" /><select className="input" value={selectedRoom.unit} onChange={(e) => updateRoom(selectedRoom.id, { unit: e.target.value })}><option value="ft">Feet</option><option value="m">Meters</option></select></div>
            <div className="flex items-center justify-center gap-1"><button type="button" className="btn-ghost !p-2" onClick={() => moveSelected('z', -1)} title="Move up"><FiChevronUp /></button><button type="button" className="btn-ghost !p-2" onClick={() => moveSelected('x', -1)} title="Move left"><FiChevronLeft /></button><button type="button" className="btn-ghost !p-2" onClick={() => moveSelected('x', 1)} title="Move right"><FiChevronRight /></button><button type="button" className="btn-ghost !p-2" onClick={() => moveSelected('z', 1)} title="Move down"><FiChevronDown /></button></div>
          </div>}
        </div>
      </div>
    </section>
  );
}
