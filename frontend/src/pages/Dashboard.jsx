/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, AlertCircle, Clock, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { adminAPI, API_BASE_URL, getAuthState } from '../utils/api';

const ALL_CATEGORIES = 'ALL';

function hashColor(name) {
  const base = name.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
  return `hsl(${base % 360}, 70%, 60%)`;
}

function normalizeCategory(category) {
  return category?.trim() || 'General';
}

function normalizePriority(priority) {
  return String(priority || '').toUpperCase();
}

function buildStatsFromComplaints(complaints) {
  const priorityDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const statusDistribution = { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
  const departmentDistribution = {};

  complaints.forEach((complaint) => {
    const priority = normalizePriority(complaint.priority);
    const status = String(complaint.status || '').toUpperCase();
    const department = complaint.department || 'General';

    if (priorityDistribution[priority] !== undefined) {
      priorityDistribution[priority] += 1;
    }

    if (statusDistribution[status] !== undefined) {
      statusDistribution[status] += 1;
    }

    departmentDistribution[department] = (departmentDistribution[department] || 0) + 1;
  });

  return {
    total_complaints: complaints.length,
    priority_distribution: priorityDistribution,
    status_distribution: statusDistribution,
    department_distribution: departmentDistribution,
  };
}

function StatCard({ icon: Icon, label, value, color, trend }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`rounded-lg p-6 text-white backdrop-blur-md ${color} border border-opacity-20 border-white shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && <p className="text-xs opacity-75 mt-1">+{trend}% this week</p>}
        </div>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Icon size={32} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);

  const wsBase = useMemo(() => {
    if (API_BASE_URL.startsWith('http://')) return API_BASE_URL.replace('http://', 'ws://').replace('/api', '');
    if (API_BASE_URL.startsWith('https://')) return API_BASE_URL.replace('https://', 'wss://').replace('/api', '');
    return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await adminAPI.getComplaints();
      const allComplaints = Array.isArray(response.data) ? response.data : [];
      setComplaints(allComplaints);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
    const interval = setInterval(() => { void fetchDashboardData(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    const auth = getAuthState();
    if (!auth?.token) return undefined;

    const socket = new WebSocket(`${wsBase}/api/ws/admin/analytics?token=${encodeURIComponent(auth.token)}`);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'complaint_created' || payload?.type === 'complaint_status_updated') {
          void fetchDashboardData();
        }
      } catch {
        // ignore malformed payloads
      }
    };

    return () => socket.close();
  }, [fetchDashboardData, wsBase]);

  const categoryOptions = useMemo(() => (
    [...new Set(complaints.map((complaint) => normalizeCategory(complaint.category)))]
      .sort((first, second) => first.localeCompare(second))
  ), [complaints]);

  const filteredComplaints = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) {
      return complaints;
    }

    return complaints.filter((complaint) => normalizeCategory(complaint.category) === selectedCategory);
  }, [complaints, selectedCategory]);

  useEffect(() => {
    if (selectedCategory !== ALL_CATEGORIES && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory(ALL_CATEGORIES);
    }
  }, [categoryOptions, selectedCategory]);

  const stats = useMemo(() => buildStatsFromComplaints(filteredComplaints), [filteredComplaints]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </motion.div>
      </div>
    );
  }

  const priorityData = [
    { name: 'High', value: stats.priority_distribution.HIGH, color: '#ef4444' },
    { name: 'Medium', value: stats.priority_distribution.MEDIUM, color: '#f59e0b' },
    { name: 'Low', value: stats.priority_distribution.LOW, color: '#10b981' },
  ];

  const deptData = Object.entries(stats.department_distribution).map(([name, value]) => ({
    name: name.substring(0, 10),
    fullName: name,
    value,
    color: hashColor(name),
  }));

  const priorityCounts = {
    pending: stats.status_distribution.PENDING,
    inProgress: stats.status_distribution.IN_PROGRESS,
    resolved: stats.status_distribution.RESOLVED,
    rejected: stats.status_distribution.REJECTED,
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Smart City Intelligence Panel
        </h1>
        <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Real-time civic grievance analytics powered by AI
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end sm:justify-between ${isDark ? 'border-slate-700 bg-slate-900/70' : 'border-white/80 bg-white/80'}`}
      >
        <div>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Category Filter</p>
          <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Focus the analytics view on a single complaint category.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <label htmlFor="analytics-category-filter" className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Select category
          </label>
          <select
            id="analytics-category-filter"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
          >
            <option value={ALL_CATEGORIES}>All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8"
      >
        <StatCard
          icon={AlertCircle}
          label="Total Complaints"
          value={stats.total_complaints}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          trend="12"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={priorityCounts.pending}
          color="bg-gradient-to-br from-yellow-500 to-orange-600"
          trend="5"
        />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={priorityCounts.inProgress}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          trend="18"
        />
        <StatCard
          icon={CheckCircle}
          label="Resolved"
          value={priorityCounts.resolved}
          color="bg-gradient-to-br from-green-500 to-green-600"
          trend="23"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
      >
        <div className={`rounded-lg p-6 shadow-lg backdrop-blur-md ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Priority Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-lg p-6 shadow-lg backdrop-blur-md ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Department Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ccc'} />
              <XAxis dataKey="name" stroke={isDark ? '#aaa' : '#666'} />
              <YAxis stroke={isDark ? '#aaa' : '#666'} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#333' : '#fff' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {deptData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg p-6 shadow-lg backdrop-blur-md ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
      >
        <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Complaint Status Pipeline
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Pending', count: priorityCounts.pending, icon: Clock, color: 'from-yellow-500 to-orange-500' },
            { label: 'In Progress', count: priorityCounts.inProgress, icon: RefreshCw, color: 'from-blue-500 to-purple-500' },
            { label: 'Resolved', count: priorityCounts.resolved, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
            { label: 'Rejected', count: priorityCounts.rejected, icon: XCircle, color: 'from-gray-500 to-gray-600' },
          ].map((status, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-gradient-to-br ${status.color} rounded-lg p-4 text-white text-center`}
            >
              <status.icon size={28} className="mx-auto mb-2" />
              <p className="text-sm opacity-90">{status.label}</p>
              <p className="text-2xl font-bold">{status.count}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg p-6 shadow-lg backdrop-blur-md mt-8 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
      >
        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Latest Complaints (Real-time)
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredComplaints.length === 0 ? (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              No complaints found for the selected category.
            </p>
          ) : filteredComplaints.slice(0, 10).map((complaint, idx) => (
            <motion.div
              key={complaint.complaint_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} hover:border-blue-400 transition`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    #{complaint.complaint_id}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                    {complaint.description}
                  </p>
                </div>
                <div className="flex gap-2 ml-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                    normalizePriority(complaint.priority) === 'HIGH'
                      ? 'bg-red-500 text-white'
                      : normalizePriority(complaint.priority) === 'MEDIUM'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                  }`}>
                    {complaint.priority}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500 text-white whitespace-nowrap">
                    {complaint.department}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-bold bg-slate-500 text-white whitespace-nowrap">
                    {normalizeCategory(complaint.category)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`mt-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
      >
        <p>Powered by Advanced AI | Last updated: {lastUpdated || 'Syncing...'}</p>
      </motion.div>
    </div>
  );
}

export default Dashboard;
