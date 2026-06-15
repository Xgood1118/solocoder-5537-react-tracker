import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatDuration, formatDurationHours } from '../utils';
import dayjs from 'dayjs';

const Timeline = ({ onEditEntry }) => {
  const [viewMode, setViewMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(dayjs().startOf('day'));
  const [hoveredEntry, setHoveredEntry] = useState(null);

  const projects = useLiveQuery(() =>
    db.projects.filter(e => !e.deleted_at).toArray()
  );
  const tasks = useLiveQuery(() =>
    db.tasks.filter(e => !e.deleted_at).toArray()
  );

  let entries = useLiveQuery(() => {
    if (viewMode === 'day') {
      const start = currentDate.valueOf();
      const end = currentDate.add(1, 'day').valueOf();
      return db.entries
        .where('start_time')
        .between(start, end)
        .filter(e => !e.deleted_at && !e.is_active)
        .toArray();
    } else if (viewMode === 'week') {
      const start = currentDate.startOf('week').valueOf();
      const end = currentDate.endOf('week').valueOf();
      return db.entries
        .where('start_time')
        .between(start, end)
        .filter(e => !e.deleted_at && !e.is_active)
        .toArray();
    } else {
      const start = currentDate.startOf('month').valueOf();
      const end = currentDate.endOf('month').valueOf();
      return db.entries
        .where('start_time')
        .between(start, end)
        .filter(e => !e.deleted_at && !e.is_active)
        .toArray();
    }
  }, [viewMode, currentDate]);

  if (!projects || !tasks || !entries) return <div className="loading">加载中...</div>;

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));

  const navigateDate = (direction) => {
    if (viewMode === 'day') {
      setCurrentDate(currentDate.add(direction, 'day'));
    } else if (viewMode === 'week') {
      setCurrentDate(currentDate.add(direction, 'week'));
    } else {
      setCurrentDate(currentDate.add(direction, 'month'));
    }
  };

  const getDateRangeLabel = () => {
    if (viewMode === 'day') {
      return currentDate.format('YYYY年MM月DD日');
    } else if (viewMode === 'week') {
      return `${currentDate.startOf('week').format('MM月DD日')} - ${currentDate.endOf('week').format('MM月DD日')}`;
    } else {
      return currentDate.format('YYYY年MM月');
    }
  };

  const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const renderDayTimeline = () => {
    const dayStart = currentDate.valueOf();
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="timeline-day">
        <div className="timeline-axis">
          {hours.map(hour => (
            <div key={hour} className="timeline-hour-label">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div className="timeline-bars">
          {entries.length === 0 ? (
            <div className="timeline-empty">今日暂无记录</div>
          ) : (
            entries.map(entry => {
              const project = projectMap[entry.project_id];
              const task = taskMap[entry.task_id];
              if (!project || !task) return null;

              const startOffset = ((entry.start_time - dayStart) / (24 * 60 * 60 * 1000)) * 100;
              const width = (entry.duration / (24 * 60 * 60 * 1000)) * 100;

              return (
                <div
                  key={entry.id}
                  className="timeline-bar"
                  style={{
                    left: `${startOffset}%`,
                    width: `${Math.max(width, 0.5)}%`,
                    backgroundColor: project.color
                  }}
                  onMouseEnter={() => setHoveredEntry(entry)}
                  onMouseLeave={() => setHoveredEntry(null)}
                  onClick={() => onEditEntry && onEditEntry(entry)}
                >
                  <span className="timeline-bar-title">{task.name}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderAggregatedView = () => {
    const grouped = {};
    
    entries.forEach(entry => {
      const key = viewMode === 'week' 
        ? dayjs(entry.start_time).format('MM-DD')
        : dayjs(entry.start_time).format('YYYY-MM-DD');
      
      if (!grouped[key]) {
        grouped[key] = { total: 0, projects: {} };
      }
      grouped[key].total += entry.duration || 0;
      
      const project = projectMap[entry.project_id];
      if (project) {
        if (!grouped[key].projects[project.id]) {
          grouped[key].projects[project.id] = { name: project.name, color: project.color, duration: 0 };
        }
        grouped[key].projects[project.id].duration += entry.duration || 0;
      }
    });

    const sortedKeys = Object.keys(grouped).sort();

    return (
      <div className="timeline-aggregated">
        {sortedKeys.length === 0 ? (
          <div className="timeline-empty">暂无记录</div>
        ) : (
          sortedKeys.map(dateKey => {
            const dayData = grouped[dateKey];
            return (
              <div key={dateKey} className="aggregated-day">
                <div className="aggregated-date">{dateKey}</div>
                <div className="aggregated-bars">
                  {Object.values(dayData.projects).map((p, idx) => (
                    <div
                      key={idx}
                      className="aggregated-bar"
                      style={{
                        width: `${(p.duration / dayData.total) * 100}%`,
                        backgroundColor: p.color
                      }}
                      title={`${p.name}: ${formatDurationHours(p.duration)}h`}
                    />
                  ))}
                </div>
                <div className="aggregated-total">{formatDurationHours(dayData.total)}h</div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-controls">
          <div className="view-switcher">
            <button
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              日
            </button>
            <button
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              周
            </button>
            <button
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              月
            </button>
          </div>
          <div className="date-nav">
            <button className="btn-icon" onClick={() => navigateDate(-1)}>←</button>
            <span className="current-date">{getDateRangeLabel()}</span>
            <button className="btn-icon" onClick={() => navigateDate(1)}>→</button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setCurrentDate(dayjs())}
            >
              今天
            </button>
          </div>
        </div>
        <div className="timeline-summary">
          <strong>总工时：</strong>
          <span className="summary-hours">{formatDuration(totalDuration)}</span>
          <span className="summary-hours-secondary">
            ({formatDurationHours(totalDuration)} 小时)</span>
        </div>
      </div>

      {hoveredEntry && (
        <div className="timeline-tooltip">
          <div className="tooltip-title">
            {taskMap[hoveredEntry.task_id]?.name}
          </div>
          <div className="tooltip-detail">
            项目：{projectMap[hoveredEntry.project_id]?.name}
          </div>
          <div className="tooltip-detail">
            时间：{dayjs(hoveredEntry.start_time).format('HH:mm:ss')} - {dayjs(hoveredEntry.end_time).format('HH:mm:ss')}
          </div>
          <div className="tooltip-detail">
            时长：{formatDuration(hoveredEntry.duration)}
          </div>
          {hoveredEntry.note && (
            <div className="tooltip-note">备注：{hoveredEntry.note}</div>
          )}
        </div>
      )}

      <div className="timeline-content">
        {viewMode === 'day' ? renderDayTimeline() : renderAggregatedView()}
      </div>

      {viewMode === 'day' && entries.length > 0 && (
        <div className="timeline-list">
          <h4>详细记录</h4>
          {[...entries].sort((a, b) => b.start_time - a.start_time).map(entry => {
            const project = projectMap[entry.project_id];
            const task = taskMap[entry.task_id];
            if (!project || !task) return null;
            
            return (
              <div key={entry.id} className="timeline-list-item" onClick={() => onEditEntry && onEditEntry(entry)}>
                <div className="list-item-color" style={{ backgroundColor: project.color }} />
                <div className="list-item-content">
                  <div className="list-item-title">{task.name}</div>
                  <div className="list-item-subtitle">
                    {project.name} · {dayjs(entry.start_time).format('HH:mm')} - {dayjs(entry.end_time).format('HH:mm')}
                  </div>
                  {entry.note && <div className="list-item-note">{entry.note}</div>}
                </div>
                <div className="list-item-duration">{formatDuration(entry.duration)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Timeline;
