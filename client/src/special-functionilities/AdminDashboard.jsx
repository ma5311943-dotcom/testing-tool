// ===== Imports =====
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { RefreshCw, Archive, X, Trash2, Shield, Users, Activity as ActivityIcon, MessageSquare, Send, UserCheck } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import gsap from 'gsap';
import '../components/Dashboard.css';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState(null); // Restored
    const [selectedUser, setSelectedUser] = useState(null);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [systemMode, setSystemMode] = useState('active'); // active, maintenance

    const [stats, setStats] = useState(null);


    const containerRef = useRef(null);
    const modalRef = useRef(null);

    // Assuming API is on localhost:5000/api as per server config
    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/users`);
            const data = await res.json();
            if (Array.isArray(data)) setUsers(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch users", error);
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        fetchUsers();
        fetchStats();

        // Poll for updates every 5 seconds to show real-time changes
        const interval = setInterval(fetchUsers, 5000);
        return () => clearInterval(interval);
    }, []);

    // ===== GSAP Animations =====
    const animationRan = useRef(false);

    useLayoutEffect(() => {
        if (!stats || animationRan.current) return;

        let ctx = gsap.context(() => {
            gsap.fromTo(".admin-header",
                { opacity: 0, y: -10 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power1.out" }
            );
            gsap.fromTo(".admin-stat-card",
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power1.out", delay: 0.1, overwrite: "auto" }
            );
            gsap.fromTo(".admin-table-section",
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power1.out", delay: 0.2 }
            );
        }, containerRef);

        animationRan.current = true;
        return () => ctx.revert();
    }, [stats]);

    // Animate Modal In
    useEffect(() => {
        if (history && modalRef.current) {
            gsap.fromTo(modalRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" });
        }
    }, [history]);

    const handleClearHistory = async () => {
        if (!window.confirm("ARE YOU SURE? This will delete ALL search history for ALL users. This cannot be undone.")) return;
        try {
            const res = await fetch(`${API_URL}/admin/history`, { method: 'DELETE' });
            if (res.ok) {
                alert("History cleared successfully");
                fetchStats(); // Update stats
            }
        } catch (e) {
            alert("Error clearing history");
        }
    };

    const handleDeleteUser = async (email) => {
        if (!window.confirm(`Delete user ${email} and all their data?`)) return;
        try {
            const res = await fetch(`${API_URL}/admin/users/${email}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(users.filter(u => u.email !== email));
                fetchStats();
                alert("User deleted");
            }
        } catch (e) {
            alert("Error deleting user");
        }
    };

    const handleResetTokens = async (email) => {
        if (!window.confirm(`Reset tokens for ${email} to 3?`)) return;

        try {
            const res = await fetch(`${API_URL}/admin/users/${email}/reset-tokens`, {
                method: 'PUT'
            });
            if (res.ok) {
                // Optimistically update
                setUsers(users.map(u => u.email === email ? { ...u, normalTokens: 3, specialTokens: 3 } : u));
                alert("Tokens reset successfully!");
            } else {
                alert("Failed to reset tokens");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleMakeAdmin = async (email) => {
        if (!window.confirm(`Promote ${email} to Admin? This gives full system access.`)) return;
        try {
            const res = await fetch(`${API_URL}/admin/users/${email}/make-admin`, { method: 'PUT' });
            if (res.ok) {
                setUsers(users.map(u => u.email === email ? { ...u, role: 'admin' } : u));
                alert(`${email} is now an Admin!`);
            }
        } catch (error) {
            alert("Failed to promote user");
        }
    };



    const handleViewHistory = async (email) => {
        try {
            const res = await fetch(`${API_URL}/admin/users/${email}/history`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setHistory(data);
                setSelectedUser(email);
            } else {
                setHistory(null); // Don't open modal if empty
                alert("No history records found for this user.");
            }
        } catch (error) {
            console.error(error);
            setHistory(null);
            alert("Failed to fetch history");
        }
    };

    const closeHistory = () => {
        setHistory(null);
        setSelectedUser(null);
    };

    const handleBroadcast = (e) => {
        e.preventDefault();
        if (!broadcastMsg) return;
        alert(`System Broadcast Sent: "${broadcastMsg}" (This is a simulation)`);
        setBroadcastMsg('');
    };

    // Mock Data for Analytics
    const tokenTrendData = [
        { name: 'Mon', normal: 40, special: 24 },
        { name: 'Tue', normal: 30, special: 13 },
        { name: 'Wed', normal: 20, special: 58 },
        { name: 'Thu', normal: 27, special: 39 },
        { name: 'Fri', normal: 18, special: 48 },
        { name: 'Sat', normal: 23, special: 38 },
        { name: 'Sun', normal: 34, special: 43 },
    ];

    // Chart Data Preparation
    const chartData = [
        { name: 'Users', value: stats?.users || 0 },
        { name: 'Scans', value: stats?.totalScans || 0 },
    ];

    return (
        <div className="admin-dashboard-container" ref={containerRef}>
            <div className="admin-content">
                <div className="admin-header">
                    <h1 className="gradient-title">Admin Command Center</h1>
                    <p>Manage system resources, users, and tokens.</p>
                </div>

                {stats && (
                    <div className="admin-stats-row">
                        <div className="admin-stat-card glasseffect">
                            <div className="icon-box blue"><Users size={24} /></div>
                            <div>
                                <h3>Total Users</h3>
                                <p className="stat-val" style={{ color: '#fff' }}>{stats.users > 300 ? stats.users : "300+"}</p>
                            </div>
                        </div>
                        <div className="admin-stat-card glasseffect">
                            <div className="icon-box purple"><ActivityIcon size={24} /></div>
                            <div>
                                <h3>Total Scans</h3>
                                <p className="stat-val" style={{ color: '#fff' }}>{stats.totalScans}</p>
                            </div>
                        </div>
                        <div className="admin-stat-card glasseffect danger-zone">
                            <button onClick={handleClearHistory} className="danger-btn">
                                <Trash2 size={18} /> Clear Global History
                            </button>
                        </div>
                    </div>
                )}

                {/* New: Analytics & Controls Section */}
                <div className="admin-grid-section">
                    {/* Token Consumption Analytics */}
                    <div className="admin-card glasseffect chart-section">
                        <h3>Token Consumption Trends</h3>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <AreaChart data={tokenTrendData}>
                                    <defs>
                                        <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorSpecial" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="normal" stroke="#8884d8" fillOpacity={1} fill="url(#colorNormal)" />
                                    <Area type="monotone" dataKey="special" stroke="#82ca9d" fillOpacity={1} fill="url(#colorSpecial)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* System Controls */}
                    <div className="admin-card glasseffect control-panel">
                        <h3>System Controls</h3>

                        <div className="control-group">
                            <label>System Status</label>
                            <div className="toggle-switch-group">
                                <button
                                    className={`toggle-btn ${systemMode === 'active' ? 'active' : ''}`}
                                    onClick={() => setSystemMode('active')}
                                >
                                    Active
                                </button>
                                <button
                                    className={`toggle-btn ${systemMode === 'maintenance' ? 'maintenance' : ''}`}
                                    onClick={() => setSystemMode('maintenance')}
                                >
                                    Maintenance
                                </button>
                            </div>
                        </div>

                        <div className="control-group">
                            <label>Broadcast Message</label>
                            <form onSubmit={handleBroadcast} className="broadcast-form">
                                <input
                                    type="text"
                                    placeholder="Type announcement..."
                                    value={broadcastMsg}
                                    onChange={(e) => setBroadcastMsg(e.target.value)}
                                    className="admin-input"
                                />
                                <button type="submit" className="icon-btn send-btn"><RefreshCw size={14} /> Send</button>
                            </form>
                        </div>

                        <div className="quick-stats-mini">
                            <div className="mini-stat">
                                <span className="label">Server Load</span>
                                <div className="progress-bar"><div className="fill" style={{ width: '24%' }}></div></div>
                                <span className="value">24%</span>
                            </div>
                            <div className="mini-stat">
                                <span className="label">Database</span>
                                <div className="progress-bar"><div className="fill" style={{ width: '12%' }}></div></div>
                                <span className="value">12%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table Section */}
                <div className="admin-table-section glasseffect">
                    <div className="table-header">
                        <h2>User Registry</h2>
                    </div>
                    {loading ? (
                        <div className="loading-spinner-container"><div className="spinner"></div></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>User Identity</th>
                                        <th>Role</th>
                                        <th>Normal</th>
                                        <th>Special</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user._id || user.email}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="avatar-placeholder">{user.email[0].toUpperCase()}</div>
                                                    <span>{user.email}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.role}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`token-badge ${user.normalTokens > 0 ? 'good' : 'empty'}`}>
                                                    {user.role === 'admin' ? '∞' : (user.normalTokens !== undefined ? user.normalTokens : 3)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`token-badge ${user.specialTokens > 0 ? 'good' : 'empty'}`}>
                                                    {user.role === 'admin' ? '∞' : (user.specialTokens !== undefined ? user.specialTokens : 3)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-group">
                                                    <button onClick={() => navigate("/chat")} className="icon-btn chat" title="Message User">
                                                        <MessageSquare size={16} />
                                                    </button>

                                                    {user.role !== 'admin' && (
                                                        <button onClick={() => handleMakeAdmin(user.email)} className="icon-btn admin-promote" title="Promote to Admin">
                                                            <UserCheck size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleResetTokens(user.email)} className="icon-btn refresh" title="Reset Tokens to 3">
                                                        <RefreshCw size={16} />
                                                    </button>
                                                    <button onClick={() => handleViewHistory(user.email)} className="icon-btn view" title="View History">
                                                        <Archive size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(user.email)} className="icon-btn delete" title="Delete User">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* History Modal */}
            {history && (
                <div
                    className="modal-overlay"
                    onClick={closeHistory}
                    ref={modalRef}
                >
                    <div
                        className="modal-content glasseffect"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>History: {selectedUser}</h2>
                            <button onClick={(e) => { e.stopPropagation(); closeHistory(); }} className="close-icon icon-btn"><X size={24} /></button>
                        </div>
                        <div className="history-scroll">
                            {Array.isArray(history) && history.map((h, i) => (
                                <div key={i} className="history-row">
                                    <div className="h-url">{h.url}</div>
                                    <div className="h-meta">
                                        <span>{new Date(h.createdAt).toLocaleString()}</span>
                                        <span className={`status ${h.result?.success !== false ? 'pass' : 'fail'}`}>
                                            {h.result?.success !== false ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default AdminDashboard;
