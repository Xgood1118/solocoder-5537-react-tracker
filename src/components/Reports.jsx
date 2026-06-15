import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatDurationHours, exportToCSV } from '../utils';
import dayjs from 'dayjs';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line
} from 'recharts';

const Reports = () => {
  const [dateRange, setDateRange] = useState('week');

  const projects = useLiveQuery(() =>
    db.projects.filter(e => !e.deleted_at).toArray()
  );
  const tasks = useLiveQuery(() =>
    db.tasks.filter(e => !e.deleted_at).toArray()
  );
  const entries = useLiveQuery(() => {
    let start;
    const now = dayjs();
    
    if (dateRange === 'week') {
      start = now.startOf('week').valueOf();
    } else if (dateRange === 'month') {
      start = now.startOf('month').valueOf();
    } else {
      start = now.subtract(3, 'month').startOf('day').valueOf();
    }
    
    return db.entries
      .where('start_time')
      .above(start)
      .filter(e => !e.deleted_at && !e.is_active)
      .toArray();
  }, [dateRange]);

  if (!projects || !tasks || !entries) return <div className="loading">加载中...</div>;

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));

  const byProjectData = useMemo(() => {
    const billable = [];
    const nonBillable = [];
    
    projects.forEach(project => {
      const projectEntries = entries.filter(e => e.project_id === project.id);
      const total = projectEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      if (total > 0) {
        const data = {
          name: project.name,
          value: parseFloat(formatDurationHours(total * 3600000)),
          color: project.color
        };
        if (project.billable) {
          billable.push(data);
        } else {
          nonBillable.push(data);
        }
      }
    });
    
    return { billable, nonBillable };
  }, [projects, entries]);

  const byTaskData = useMemo(() => {
    const taskTotals = {};
    entries.forEach(entry => {
      const task = taskMap[entry.task_id];
      if (!task) return;
      if (!taskTotals[task.id]) {
        taskTotals[task.id] = { name: task.name, value: 0 };
      }
      taskTotals[task.id].value += entry.duration || 0;
    });
    
    return Object.values(taskTotals)
      .map(t => ({ ...t, value: parseFloat(formatDurationHours(t.value * 3600000)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [entries, tasks]);

  const trendData = useMemo(() => {
    const byDate = {};
    entries.forEach(entry => {
      const date = dayjs(entry.start_time).format('YYYY-MM-DD');
      if (!byDate[date]) {
        byDate[date] = 0;
      }
      byDate[date] += entry.duration || 0;
    });
    
    return Object.entries(byDate)
      .map(([date, duration]) => ({
        date: dayjs(date).format('MM-DD'),
        工时: parseFloat(formatDurationHours(duration * 3600000))
      }));
  }, [entries]);

  const handleExportCSV = () => {
    exportToCSV(entries, projects, tasks);
  };

  const renderCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">{payload[0].name || payload[0].payload.name}</p>
          <p className="chart-tooltip-value">{payload[0].value} 小时</p>
        </div>
      );
    }
    return null;
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600000;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h3>数据报表</h3>
        <div className="reports-controls">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="custom">近三个月</option>
          </select>
          <button className="btn btn-primary" onClick={handleExportCSV}>
            📊 导出 CSV</button>
        </div>
      </div>

      <div className="reports-summary">
        <div className="summary-card">
          <div className="summary-label">总工时</div>
          <div className="summary-value">{totalHours.toFixed(2)} 小时</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">可计费工时</div>
          <div className="summary-value">
            {byProjectData.billable.reduce((sum, p) => sum + p.value, 0).toFixed(2)} 小时
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-value">
            内部工时</div>
          <div className="summary-value">
            {byProjectData.nonBillable.reduce((sum, p) => sum + p.value, 0).toFixed(2)} 小时
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">记录条数</div>
          <div className="summary-value">{entries.length} 条</div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-section">
          <h4>按项目分布</h4>
          <div className="pie-charts-row">
            {byProjectData.billable.length > 0 && (
              <div className="pie-chart-container">
              <h5>可计费项目</h5>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={byProjectData.billable}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {byProjectData.billable.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={renderCustomTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            )}
            {byProjectData.nonBillable.length > 0 && (
            <div className="pie-chart-container">
              <h5>内部项目</h5>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={byProjectData.nonBillable}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {byProjectData.nonBillable.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={renderCustomTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>
        </div>

        <div className="report-section">
          <h4>任务 Top 10</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byTaskData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="h" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip content={renderCustomTooltip} />
              <Bar dataKey="value" fill="#64B5F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="report-section">
          <h4>每日趋势</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="h" />
              <Tooltip content={renderCustomTooltip} />
              <Line
                type="monotone"
                dataKey="工时"
                stroke="#64B5F6"
                strokeWidth={2}
                dot={{ fill: '#64B5F6' }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
