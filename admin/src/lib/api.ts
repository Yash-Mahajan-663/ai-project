const API_BASE = '/api/admin';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchBookings() {
  const res = await fetch(`${API_BASE}/bookings`);
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}

export async function fetchClients() {
  const res = await fetch(`${API_BASE}/clients`);
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
}

export async function fetchRevenue() {
  const res = await fetch(`${API_BASE}/revenue`);
  if (!res.ok) throw new Error('Failed to fetch revenue');
  return res.json();
}

export async function fetchInquiries() {
  const res = await fetch(`${API_BASE}/inquiries`);
  if (!res.ok) throw new Error('Failed to fetch inquiries');
  return res.json();
}
