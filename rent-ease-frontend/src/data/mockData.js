// Seed data so the UI has something to browse before a backend is connected.
// Default demo property photos are intentionally kept here as permanent starter images
// until the owner decides to replace them with real property media.

export const AMENITIES_LIST = [
  'Lift', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Club House',
  'Children Play Area', 'Garden', 'CCTV', 'Gated Community', 'Water Supply', 'Wi-Fi Ready',
];

export const PROPERTY_TYPES = ['House', 'Flat', 'Villa', 'Land', 'Commercial'];

export const seedProperties = [
  {
    id: 'p1', title: 'Sunrise Meadows 3BHK', type: 'Flat', status: 'Rent', price: 32000,
    city: 'Hyderabad', state: 'Telangana', area: 'Gachibowli', pincode: '500032',
    address: 'Plot 14, Gachibowli Main Road', bedrooms: 3, bathrooms: 2, kitchen: 1, hall: 1,
    parking: 1, sqft: 1450, amenities: ['Lift', 'Power Backup', 'Security', 'Gym'],
    description: 'A bright, airy 3BHK in a gated community close to the IT corridor, with a west-facing balcony and dedicated parking.',
    roomLength: 14, roomWidth: 12, roomHeight: 10,
    ownerId: 'seed-owner-1', ownerName: 'Rakesh Verma', ownerPhone: '+91 98765 43210',
    photos: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [], views: 214, interested: 6, createdAt: '2026-06-02',
  },
  {
    id: 'p2', title: 'Palm Grove Villa', type: 'Villa', status: 'Sale', price: 48000000,
    city: 'Hyderabad', state: 'Telangana', area: 'Kokapet', pincode: '500075',
    address: '22, Palm Grove Layout', bedrooms: 4, bathrooms: 4, kitchen: 1, hall: 2,
    parking: 2, sqft: 3200, amenities: ['Swimming Pool', 'Garden', 'Security', 'Club House', 'CCTV'],
    description: 'An independent villa with a private garden and pool, ideal for a growing family looking for space and privacy.',
    roomLength: 18, roomWidth: 16, roomHeight: 11,
    ownerId: 'seed-owner-2', ownerName: 'Anita Rao', ownerPhone: '+91 90000 11223',
    photos: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-fda1b17bc36d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [], views: 452, interested: 14, createdAt: '2026-05-18',
  },
  {
    id: 'p3', title: 'Cedar Heights Studio', type: 'Flat', status: 'Rent', price: 22000,
    city: 'Bengaluru', state: 'Karnataka', area: 'Whitefield', pincode: '560066',
    address: 'Cedar Heights, ITPL Main Road', bedrooms: 1, bathrooms: 1, kitchen: 1, hall: 1,
    parking: 0, sqft: 620, amenities: ['Lift', 'Security', 'Wi-Fi Ready', 'Power Backup'],
    description: 'Compact studio apartment perfect for a young professional, walking distance to tech parks.',
    roomLength: 11, roomWidth: 10, roomHeight: 9,
    ownerId: 'seed-owner-3', ownerName: 'Farah Sheikh', ownerPhone: '+91 99887 66554',
    photos: [
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [], views: 130, interested: 3, createdAt: '2026-07-01',
  },
  {
    id: 'p4', title: 'Green Acres Plot', type: 'Land', status: 'Sale', price: 10500000,
    city: 'Hyderabad', state: 'Telangana', area: 'Shamshabad', pincode: '501218',
    address: 'Survey No. 88, Green Acres', bedrooms: 0, bathrooms: 0, kitchen: 0, hall: 0,
    parking: 0, sqft: 2400, amenities: ['Gated Community', 'Water Supply', 'CCTV'],
    description: 'HMDA-approved open plot near the airport expressway, ready for construction.',
    roomLength: 0, roomWidth: 0, roomHeight: 0,
    ownerId: 'seed-owner-4', ownerName: 'Suresh Kumar', ownerPhone: '+91 91234 56780',
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [], views: 88, interested: 2, createdAt: '2026-04-22',
  },
  {
    id: 'p5', title: 'Marigold Business Suite', type: 'Commercial', status: 'Rent', price: 85000,
    city: 'Pune', state: 'Maharashtra', area: 'Hinjewadi', pincode: '411057',
    address: 'Marigold Towers, Phase 2', bedrooms: 0, bathrooms: 2, kitchen: 1, hall: 1,
    parking: 4, sqft: 2100, amenities: ['Lift', 'Power Backup', 'Security', 'CCTV'],
    description: 'Fully fitted office suite in a prime commercial hub, ready to move in.',
    roomLength: 20, roomWidth: 15, roomHeight: 12,
    ownerId: 'seed-owner-5', ownerName: 'Deepak Joshi', ownerPhone: '+91 98111 22334',
    photos: [
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [], views: 301, interested: 9, createdAt: '2026-03-30',
  },
  {
    id: 'p6', title: 'Willow Creek Independent House', type: 'House', status: 'Sale', price: 24500000,
    city: 'Hyderabad', state: 'Telangana', area: 'Manikonda', pincode: '500089',
    address: '9-2-14 Willow Creek Colony', bedrooms: 3, bathrooms: 3, kitchen: 1, hall: 1,
    parking: 2, sqft: 2000, amenities: ['Garden', 'Security', 'Power Backup'],
    description: 'Two-storey independent house with a small garden, quiet street, close to schools.',
    roomLength: 15, roomWidth: 13, roomHeight: 10,
    ownerId: 'seed-owner-6', ownerName: 'Meera Iyer', ownerPhone: '+91 97654 32109',
    photos: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [], views: 176, interested: 5, createdAt: '2026-06-25',
  },
];

export const testimonials = [
  { name: 'Priya N.', role: 'Tenant, Hyderabad', quote: 'Found a flat near my office within two days — the filters saved me so much time.' },
  { name: 'Arjun M.', role: 'Landlord, Bengaluru', quote: 'Listing my property took minutes and I could see interested tenants right away.' },
  { name: 'Kavya S.', role: 'Tenant, Pune', quote: 'The 3D room view genuinely helped me picture the space before visiting.' },
];
