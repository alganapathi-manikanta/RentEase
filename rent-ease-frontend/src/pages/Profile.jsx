import { useEffect, useState } from 'react';
import { FiUser, FiEdit2, FiLock, FiSave, FiX, FiCamera } from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

const emptyForm = { name: '', phone: '', address: '', city: '', state: '', country: '', about: '', profileImage: '' };

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNextPw, setShowNextPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setForm({ ...emptyForm, ...user }), [user]);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, profileImage: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await updateProfile(form);
      setEditing(false);
      setMessage('Profile updated successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setError('');
    if (pwForm.next !== pwForm.confirm) return setError('New passwords do not match.');
    if (pwForm.next.length < 6) return setError('Password must be at least 6 characters.');
    try {
      await changePassword(pwForm.current, pwForm.next);
      setChangingPw(false);
      setPwForm({ current: '', next: '', confirm: '' });
      setMessage('Password changed successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const fields = [['Email', user?.email], ['Phone', user?.phone], ['Address', user?.address], ['City', user?.city], ['State', user?.state], ['Country', user?.country]];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Landlord Profile</h1>
      <p className="mt-1 mb-6 text-sm text-ink/60 dark:text-slate-400">View and manage the details tenants see about you.</p>
      {message && <p className="mb-4 rounded-lg bg-secondary/10 px-4 py-2.5 text-sm text-secondary dark:text-slate-200">{message}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="card p-6 sm:p-8">
        <div className="mb-7 flex flex-wrap items-center gap-4">
          {user?.profileImage ? <img src={resolveMediaUrl(user.profileImage)} alt={user.name} className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary"><FiUser size={32} /></div>}
          <div><p className="font-display text-lg font-semibold">{user?.name}</p><span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold capitalize text-primary">{user?.role}</span></div>
        </div>

        {editing ? <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-3"><label htmlFor="profile-photo" className="btn-outline cursor-pointer !px-4 !py-2"><FiCamera /> Change photo</label><input id="profile-photo" type="file" accept="image/*" onChange={handleImage} className="sr-only" /></div>
          <div className="grid gap-4 sm:grid-cols-2">{[['name', 'Full Name'], ['phone', 'Phone Number'], ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['country', 'Country']].map(([name, label]) => <div key={name}><label className="label">{label}</label><input required={name !== 'address'} className="input" value={form[name] || ''} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} /></div>)}</div>
          <div><label className="label">About / Bio</label><textarea className="input" rows="4" value={form.about || ''} onChange={(event) => setForm((current) => ({ ...current, about: event.target.value }))} placeholder="Tell tenants a little about yourself." /></div>
          <div className="flex gap-3"><button type="submit" className="btn-primary"><FiSave /> Save Changes</button><button type="button" onClick={() => setEditing(false)} className="btn-ghost border border-black/10 dark:border-white/10"><FiX /> Cancel</button></div>
        </form> : <>
          <div className="grid gap-x-8 sm:grid-cols-2">{fields.map(([label, value]) => <p key={label} className="flex justify-between gap-4 border-b border-black/5 py-3 text-sm dark:border-white/5"><span className="text-ink/50 dark:text-slate-400">{label}</span><span className="text-right font-medium">{value || 'Not provided'}</span></p>)}</div>
          <div className="border-b border-black/5 py-3 text-sm dark:border-white/5"><p className="text-ink/50 dark:text-slate-400">About</p><p className="mt-1">{user?.about || 'Not provided'}</p></div>
          <p className="py-3 text-sm"><span className="text-ink/50 dark:text-slate-400">Registered </span><span className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}</span></p>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-black/5 pt-6 dark:border-white/5"><button onClick={() => setEditing(true)} className="btn-outline"><FiEdit2 /> Edit Profile</button><button onClick={() => setChangingPw((current) => !current)} className="btn-ghost border border-black/10 dark:border-white/10"><FiLock /> Change Password</button></div>
        </>}

        {changingPw && (
          <form onSubmit={handleChangePassword} className="mt-6 space-y-4 border-t border-black/5 pt-6 dark:border-white/5">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  required
                  type={showCurrentPw ? 'text' : 'password'}
                  className="input pr-11"
                  value={pwForm.current}
                  onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
                  aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrentPw ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  required
                  type={showNextPw ? 'text' : 'password'}
                  className="input pr-11"
                  value={pwForm.next}
                  onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowNextPw((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
                  aria-label={showNextPw ? 'Hide new password' : 'Show new password'}
                >
                  {showNextPw ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input
                  required
                  type={showConfirmPw ? 'text' : 'password'}
                  className="input pr-11"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
                  aria-label={showConfirmPw ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPw ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary">Update Password</button>
          </form>
        )}
      </div>
    </div>
  );
}
