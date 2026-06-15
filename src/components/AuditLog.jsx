import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import dayjs from 'dayjs';

const AuditLog = () => {
  const logs = useLiveQuery(() =>
    db.audit_logs.orderBy('created_at').reverse().limit(100).toArray()
  );
  const entries = useLiveQuery(() =>
    db.entries.toArray()
  );
  const projects = useLiveQuery(() =>
    db.projects.toArray()
  );
  const tasks = useLiveQuery(() =>
    db.tasks.toArray()
  );

  if (!logs || !entries || !projects || !tasks) return <div className="loading">加载中...</div>;

  const entryMap = Object.fromEntries(entries.map(e => [e.id, e]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));

  const formatDiff = (oldVal, newVal) => {
    try {
      const oldObj = JSON.parse(oldVal);
      const newObj = JSON.parse(newVal);
      const diffs = [];
      
      const fieldLabels = {
        project_id: '项目',
        task_id: '任务',
        start_time: '开始时间',
        end_time: '结束时间',
        duration: '时长',
        note: '备注'
      };

      Object.keys(newObj).forEach(key => {
        if (oldObj[key] !== newObj[key]) {
          let oldDisplay = oldObj[key];
          let newDisplay = newObj[key];

          if (key === 'project_id') {
            oldDisplay = projectMap[oldObj[key]]?.name || oldObj[key];
            newDisplay = projectMap[newObj[key]]?.name || newObj[key];
          } else if (key === 'task_id') {
            oldDisplay = taskMap[oldObj[key]]?.name || oldObj[key];
            newDisplay = taskMap[newObj[key]]?.name || newObj[key];
          } else if (key === 'start_time' || key === 'end_time') {
            oldDisplay = dayjs(oldObj[key]).format('YYYY-MM-DD HH:mm');
            newDisplay = dayjs(newObj[key]).format('YYYY-MM-DD HH:mm');
          } else if (key === 'duration') {
            oldDisplay = `${(oldObj[key] / 3600000).toFixed(2)}h`;
            newDisplay = `${(newObj[key] / 3600000).toFixed(2)}h`;
          }

          diffs.push(
            <div key={key} className="diff-item">
              <span className="diff-field">{fieldLabels[key] || key}:</span>
              <span className="diff-old">{String(oldDisplay)}</span>
              <span className="diff-arrow">→</span>
              <span className="diff-new">{String(newDisplay)}</span>
            </div>
          );
        }
      });

      return diffs.length > 0 ? diffs : <span className="no-diff">无变更</span>;
    } catch (e) {
      return <span className="parse-error">解析失败</span>;
    }
  };

  return (
    <div className="audit-log-container">
      <h3>审计日志</h3>
      <p className="log-hint">最近 100 条编辑记录</p>

      {logs.length === 0 ? (
        <div className="empty-logs">暂无审计记录</div>
      ) : (
        <div className="log-list">
          {logs.map(log => {
            const entry = entryMap[log.entry_id];
            const project = entry ? projectMap[entry.project_id] : null;
            const task = entry ? taskMap[entry.task_id] : null;

            return (
              <div key={log.id} className="log-item">
                <div className="log-header">
                  <span className="log-time">
                    {dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                  <span className="log-action">
                    {log.action === 'edit' ? '✏️ 编辑' : log.action}
                  </span>
                </div>
                <div className="log-entry-info">
                  {project && <span className="log-project" style={{ color: project.color }}>{project.name}</span>}
                  {task && <span className="log-task"> / {task.name}</span>}
                </div>
                <div className="log-diff">
                  {formatDiff(log.old_value, log.new_value)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditLog;
