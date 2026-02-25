// ===== Imports =====
import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import History from "./History.jsx";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import gsap from "gsap";
import { Activity, CheckCircle, Clock, XCircle, Grid, User as UserIcon, Zap, TrendingUp, Award, BookOpen, Target, ShieldCheck, MessageSquare, Send, X } from "lucide-react";
import "./UserDashboard.css";

// ===== Helper: Determine Status =====
const getStatus = (res) => {
  if (!res) return 'failed';
  // BDD / Scenario Tests
  if (res.success === true || res.success === 'true') return 'success';
  if (res.success === false || res.success === 'false') return 'failed';

  // Standard Scan Tests (if keys exist, the scan ran successfully)
  if (res.lighthouse || res.availability || res.security) return 'success';

  // Fallback
  return 'failed';
};

// ===== UserDashboard Component =====
const UserDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState([]);
  const [mongoUser, setMongoUser] = useState(null);
  const [loading, setLoading] = useState(true);


  const containerRef = useRef(null);

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress;

  // ===== Fetch Data =====
  useEffect(() => {
    if (!email) return;

    setLoading(true);

    // Fetch History
    const fetchHistory = fetch(`${import.meta.env.VITE_API_BASE_URL}/history/${email}`)
      .then((res) => res.json())
      .then((data) => {
        const normalizedData = Array.isArray(data) ? data.map((item) => ({
          ...item,
          resultStatus: getStatus(item.result),
          date: new Date(item.createdAt).toLocaleDateString(),
          fullDate: new Date(item.createdAt),
          displayUrl: item.url.replace(/^https?:\/\//, '')
        })) : [];
        setHistoryData(normalizedData.reverse()); // Newest first
      });

    // Fetch User Details (Tokens)
    const fetchUser = fetch(`${import.meta.env.VITE_API_BASE_URL}/user/${email}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.message) {
          setMongoUser(data);
        }
      });

    Promise.all([fetchHistory, fetchUser])
      .finally(() => setLoading(false));
    Promise.all([fetchHistory, fetchUser])
      .finally(() => setLoading(false));
  }, [email]);



  // ===== GSAP Animations =====
  // Removed complex staggering for instant snappiness as requested
  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from(".dashboard-header", { opacity: 0, y: -10, duration: 0.4, ease: "power1.out" });
      gsap.from(".stat-card", {
        opacity: 0,
        y: 10,
        duration: 0.4,
        ease: "power1.out",
        delay: 0.1
        // Removed stagger
      });
      gsap.from(".chart-card", { opacity: 0, y: 10, duration: 0.4, ease: "power1.out", delay: 0.2 });
      gsap.from(".dashboard-section", { opacity: 0, y: 10, duration: 0.4, ease: "power1.out", delay: 0.3 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // ===== Compute Stats =====
  const totalTests = historyData.length;
  const successTests = historyData.filter((h) => h.resultStatus === "success").length;
  const failedTests = totalTests - successTests;
  const successRate = totalTests
    ? Math.round((successTests / totalTests) * 100)
    : 0;

  const lastTest = totalTests && historyData[0]
    ? new Date(historyData[0].createdAt).toLocaleString()
    : "Never";

  // Chart Data: Pie
  const pieData = [
    { name: 'Passed', value: successTests },
    { name: 'Failed', value: failedTests },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  // Chart Data: Activity (Group by Date)
  const activityMap = {};
  historyData.forEach(h => {
    const d = h.date;
    if (!activityMap[d]) activityMap[d] = 0;
    activityMap[d]++;
  });
  const activityData = Object.keys(activityMap).map(date => ({ date, count: activityMap[date] })).slice(-7); // Last 7 active days

  return (
    <div className="user-dashboard-container" ref={containerRef}>
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="header-text">
            <h1>Welcome back, <span className="highlight">{user?.firstName || "Guest"}</span></h1>
            <p>Here is your quality assurance overview.</p>
          </div>
          <div className="header-avatar">
            <img src={user?.imageUrl} alt="Profile" className="user-avatar-lg" />
          </div>
        </div>

        {/* Stats Grid */}
        {/* Stats Grid */}
        <div className="stats-grid">

          <div className="stat-card glass-panel stat-upgrade">
            <div className="stat-icon-bg purple neon-glow">
              <Activity size={26} />
            </div>
            <div className="stat-info">
              <h3>Total Scans</h3>
              <p className="stat-number highlight-strong">{totalTests}</p>
            </div>
          </div>

          <div className="stat-card glass-panel stat-upgrade">
            <div className="stat-icon-bg green neon-glow">
              <CheckCircle size={26} />
            </div>
            <div className="stat-info">
              <h3>Success Rate</h3>
              <p className="stat-number highlight-strong">{successRate}%</p>
            </div>
          </div>

          <div className="stat-card glass-panel stat-upgrade">
            <div className="stat-icon-bg blue neon-glow">
              <Clock size={26} />
            </div>
            <div className="stat-info">
              <h3>Last Activity</h3>
              <p className="stat-number sm strong-dim">{lastTest}</p>
            </div>
          </div>

          <div className="stat-card glass-panel stat-upgrade">
            <div className="stat-icon-bg orange neon-glow">
              <Zap size={26} />
            </div>
            <div className="stat-info">
              <h3>Normal Tokens</h3>
              <p className="stat-number highlight-strong">{mongoUser?.normalTokens ?? 3}</p>
            </div>
          </div>

          <div className="stat-card glass-panel stat-upgrade">
            <div className="stat-icon-bg purple neon-glow">
              <TrendingUp size={26} />
            </div>
            <div className="stat-info">
              <h3>Special Tokens</h3>
              <p className="stat-number highlight-strong">{mongoUser?.specialTokens ?? 3}</p>
            </div>
          </div>

        </div>


        {/* Charts Section */}
        <div className="dashboard-charts-row">
          {/* Performance Pie */}
          <div className="chart-card glass-panel">
            <h3>Test Performance</h3>
            <div style={{ width: '100%', height: 250 }}>
              {totalTests > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-chart">No test data available for charts</div>
              )}
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="dot pass"></span> Passed</div>
              <div className="legend-item"><span className="dot fail"></span> Failed</div>
            </div>
          </div>

          {/* Activity Area Chart */}
          <div className="chart-card glass-panel" style={{ minWidth: 0 }}>
            <h3>Scanning Activity (Last 7 Days)</h3>
            <div style={{ width: '100%', height: 250 }}>
              {activityData.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-chart">No activity yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="dashboard-section glass-panel">
          <div className="section-header">
            <h3>Recent Scans</h3>
          </div>
          <div className="mini-history-list">
            {historyData.slice(0, 10).map((h, i) => (
              <div key={i} className="mini-history-item">
                <div className={`status-pill ${h.resultStatus}`}>
                  {h.resultStatus === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                </div>
                <div className="history-details-flex">
                  <span className="history-url">{h.displayUrl}</span>
                  <div className="history-meta">
                    <span className="date-badge">{h.date}</span>
                    <span className={`status-text ${h.resultStatus}`}>{h.resultStatus.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
            {historyData.length === 0 && <p className="text-muted">No recent scans found.</p>}
          </div>
        </div>

        {/* NEW: Achievements & Learning Center */}
        <div className="dashboard-extras-row">
          {/* Achievements Section */}
          <div className="dashboard-section glass-panel half-width">
            <div className="section-header">
              <h3><Award size={20} className="text-yellow" /> Your Achievements</h3>
            </div>
            <div className="achievements-list">
              <div className={`achievement-item ${totalTests > 0 ? 'unlocked' : 'locked'}`}>
                <div className="ach-icon"><Target size={18} /></div>
                <div className="ach-info">
                  <h4>First Steps</h4>
                  <p>Run your first scan</p>
                </div>
              </div>
              <div className={`achievement-item ${successTests >= 5 ? 'unlocked' : 'locked'}`}>
                <div className="ach-icon"><ShieldCheck size={18} /></div>
                <div className="ach-info">
                  <h4>Quality Guardian</h4>
                  <p>5 Passing Tests</p>
                </div>
              </div>
              <div className={`achievement-item ${totalTests >= 20 ? 'unlocked' : 'locked'}`}>
                <div className="ach-icon"><Zap size={18} /></div>
                <div className="ach-info">
                  <h4>Power User</h4>
                  <p>Run 20+ Scans</p>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Center Section */}
          <div className="dashboard-section glass-panel half-width">
            <div className="section-header">
              <h3><BookOpen size={20} className="text-blue" /> Learning Center</h3>
            </div>
            <div className="resources-list">
              <div className="resource-card">
                <h4>Getting Started Guide</h4>
                <p>Learn how to optimize your first scan results.</p>
                <button className="text-btn">Read Now</button>
              </div>
              <div className="resource-card">
                <h4>Understanding Tokens</h4>
                <p>How normal vs special tokens work.</p>
                <button className="text-btn">Read Now</button>
              </div>
            </div>
          </div>
        </div>





      </div >
    </div >
  );
};

export default UserDashboard;
