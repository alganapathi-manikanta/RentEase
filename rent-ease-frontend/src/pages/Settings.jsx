import { FiSettings, FiBell, FiShield, FiMoon } from 'react-icons/fi';

const settingsItems = [
  { icon: FiBell, title: 'Notifications', text: 'Manage alerts for new property updates and saved listings.' },
  { icon: FiShield, title: 'Privacy', text: 'Review account privacy preferences and security settings.' },
  { icon: FiMoon, title: 'Appearance', text: 'Switch between light and dark theme for a comfortable viewing experience.' },
];

export default function Settings() {
  return (
    <div className="section py-10">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          <FiSettings size={16} /> Settings
        </div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Account settings</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {settingsItems.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={22} />
            </div>
            <h2 className="mb-2 font-display text-xl font-semibold">{title}</h2>
            <p className="text-sm text-ink/60 dark:text-slate-400">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
