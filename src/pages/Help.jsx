import { Link } from 'react-router-dom';
import { FiHelpCircle, FiMail, FiPhone, FiMapPin, FiSearch, FiShield, FiUser } from 'react-icons/fi';

const helpTopics = [
  {
    icon: FiSearch,
    title: 'How to search properties',
    text: 'Use the search page to filter by city, area, type, and rent or sale status. You can also sort and compare listings quickly.',
  },
  {
    icon: FiUser,
    title: 'How to sign in or register',
    text: 'Create an account to access your dashboard, save favorite properties, and manage your listing or tenant profile.',
  },
  {
    icon: FiShield,
    title: 'How to manage listings',
    text: 'Landlords can add and edit properties through the dashboard and keep the listing information up to date.',
  },
];

export default function Help() {
  return (
    <div className="section py-16 md:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          <FiHelpCircle size={18} /> Help Center
        </div>
        <h1 className="font-display text-4xl font-bold md:text-5xl">How can we help?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink/60 dark:text-slate-400">
          Find the answers you need about property search, landlord tools, account access, and getting the most from Rent Ease.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {helpTopics.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={22} />
            </div>
            <h2 className="mb-2 font-display text-xl font-semibold">{title}</h2>
            <p className="text-sm text-ink/60 dark:text-slate-400">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
            <FiMail /> Email Support
          </div>
          <p className="text-sm text-ink/60 dark:text-slate-400">projectplatform15@gmail.com</p>
        </div>

        <div className="card p-6">
          <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
            <FiPhone /> Call Us
          </div>
          <p className="text-sm text-ink/60 dark:text-slate-400">8985211790</p>
        </div>

        <div className="card p-6">
          <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
            <FiMapPin /> Office
          </div>
          <p className="text-sm text-ink/60 dark:text-slate-400">Dhanekula, Gangur</p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link to="/search" className="btn-primary inline-flex">Browse Properties</Link>
      </div>
    </div>
  );
}
