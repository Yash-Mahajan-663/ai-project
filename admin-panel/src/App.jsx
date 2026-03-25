import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Calendar, Settings, TrendingUp, Search, Bell } from 'lucide-react'

// Sub-components implemented inline for simplicity but could be separate files
const SidebarItem = ({ icon: Icon, label, active }) => (
  <div className={`sidebar-item ${active ? 'active' : ''}`} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    color: active ? '#8338ec' : '#adb5bd',
    background: active ? 'rgba(131, 56, 236, 0.08)' : 'transparent',
    marginBottom: '8px',
    transition: 'all 0.3s ease'
  }}>
    <Icon size={20} />
    <span style={{ fontWeight: 600 }}>{label}</span>
  </div>
)

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="glass stat-card">
    <div className="icon-label">
      <div style={{ padding: '8px', borderRadius: '8px', background: `${color}15`, color: color }}>
        <Icon size={18} />
      </div>
      <span>{label}</span>
    </div>
    <div className="value">{value}</div>
  </div>
)

const App = () => {
  const [stats, setStats] = useState({ total: 0, booked: 0, pending: 0, cancelled: 0, revenue: 0 })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch('/api/admin/stats')
        const bookingsRes = await fetch('/api/admin/bookings')
        
        const statsJson = await statsRes.json()
        const bookingsJson = await bookingsRes.json()

        if (statsJson.success) setStats(statsJson.data)
        if (bookingsJson.success) setBookings(bookingsJson.data)
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="app-container">
      {/* Sidebar */}
      <nav className="glass sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3rem', cursor: 'pointer' }}>
          <div style={{ 
            width: '32px', height: '32px', background: 'var(--accent-primary)', 
            borderRadius: '8px', display: 'grid', placeItems: 'center', fontWeight: 'bold' 
          }}>11</div>
          <h2 style={{ fontSize: '1.2rem', color: '#fff' }}>11za Admin</h2>
        </div>

        <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
        <SidebarItem icon={Users} label="Customers" />
        <SidebarItem icon={Calendar} label="Bookings" />
        <SidebarItem icon={TrendingUp} label="Reports" />
        
        <div style={{ marginTop: 'auto' }}>
          <SidebarItem icon={Settings} label="Settings" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back to your premium booking manager.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="glass" style={{ padding: '0.6rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Search size={20} />
            </div>
            <div className="glass" style={{ padding: '0.6rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Bell size={20} />
            </div>
            <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-secondary)' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Admin</span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard label="Total Bookings" value={stats.total} icon={Users} color="#3a86ff" />
          <StatCard label="Confirmed" value={stats.booked} icon={TrendingUp} color="#06d6a0" />
          <StatCard label="Pending" value={stats.pending} icon={TrendingUp} color="#ffd166" />
          <StatCard label="Cancelled" value={stats.cancelled} icon={TrendingUp} color="#ef476f" />
        </div>

        {/* Bookings Table */}
        <section className="bookings-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Recent Bookings</h3>
            <button className="glass" style={{ 
              padding: '0.6rem 1.2rem', border: 'none', background: 'rgba(255,255,255,0.08)',
              color: '#fff', cursor: 'pointer', fontSize: '0.85rem' 
            }}>View All</button>
          </div>

          <div className="glass table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date & Time</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading bookings...</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>No bookings found.</td></tr>
                ) : bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{booking.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{booking.phone}</div>
                    </td>
                    <td>{booking.service || 'N/A'}</td>
                    <td>
                      <div>{booking.date || 'TBD'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{booking.time || ''}</div>
                    </td>
                    <td>${booking.price || 0}</td>
                    <td>
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
