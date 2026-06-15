import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { db, generateId } from '../db';
import { formatDuration } from '../utils';

const EntryModal = ({ isOpen, onClose, entry, projects, tasks }) => {
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (entry) {
      setProjectId(entry.project_id);
      setTaskId(entry.task_id);
      setStartTime(dayjs(entry.start_time).format('YYYY-MM-DDTHH:mm'));
      setEndTime(dayjs(entry.end_time).format('YYYY-MM-DDTHH:mm'));
      setNote(entry.note || '');
      setDuration(entry.duration || 0);
    } else {
      setProjectId('');
      setTaskId('');
      setStartTime(dayjs().format('YYYY-MM-DDTHH:mm'));
      setEndTime(dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
      setNote('');
      setDuration(3600000);
    }
  }, [entry, isOpen]);

  useEffect(() => {
    if (startTime && endTime) {
      const start = dayjs(startTime).valueOf();
      const end = dayjs(endTime).valueOf();
      const dur = end - start;
      if (dur > 0) {
        setDuration(dur);
      }
    }
  }, [startTime, endTime]);

  const projectTasks = tasks.filter(t => t.project_id === projectId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId || !taskId || !startTime || !endTime) return;

    const start = dayjs(startTime).valueOf();
    const end = dayjs(endTime).valueOf();
    const dur = end - start;

    if (dur <= 0) {
      alert('结束时间必须晚于开始时间');
      return;
    }

    if (dur > 24 * 60 * 60 * 1000) {
      const confirmed = window.confirm('该记录时长超过24小时，确认保存吗？');
      if (!confirmed) return;
    }

    const oldValues = entry ? {
      project_id: entry.project_id,
      task_id: entry.task_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      duration: entry.duration,
      note: entry.note
    } : null;

    const newValues = {
      ...(entry || {}),
      id: entry?.id || generateId(),
      project_id: projectId,
      task_id: taskId,
      start_time: start,
      end_time: end,
      duration: dur,
      note: note.trim(),
      updated_at: Date.now()
    };

    if (entry) {
      await db.transaction('rw', db.entries, db.audit_logs, async () => {
        await db.entries.put(newValues);
        await db.audit_logs.add({
          id: generateId(),
          entry_id: entry.id,
          action: 'edit',
          old_value: JSON.stringify(oldValues),
          new_value: JSON.stringify({
            project_id: projectId,
            task_id: taskId,
            start_time: start,
            end_time: end,
            duration: dur,
            note: note.trim()
          }),
          created_at: Date.now()
        });
      });
    } else {
      await db.entries.put({
        ...newValues,
        is_active: 0,
        created_at: Date.now(),
        deleted_at: null
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{entry ? '编辑记录' : '新建记录'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>项目</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">请选择项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>任务</label>
            <select
              value={taskId}
              onChange={e => setTaskId(e.target.value)}
              disabled={!projectId}
            >
              <option value="">请选择任务</option>
              {projectTasks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>开始时间</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>结束时间</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="duration-display">
              时长：{formatDuration(duration)}
            </div>
          </div>

          <div className="form-group">
            <label>备注</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="可选，用于补充说明"
              rows={3}
            />
          </div>

          {entry && (
            <div className="form-hint">
              创建时间：{dayjs(entry.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!projectId || !taskId || !startTime || !endTime}
            >
              {entry ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;
