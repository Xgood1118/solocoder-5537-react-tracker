import React, { useState, useEffect } from 'react';

const TaskModal = ({ isOpen, onClose, onSave, task, project }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (task) {
      setName(task.name);
    } else {
      setName('');
    }
  }, [task, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...(task || {}),
      project_id: project?.id || task?.project_id,
      name: name.trim(),
      updated_at: Date.now()
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? '编辑任务' : '新建任务'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {project && (
            <div className="form-hint">
              所属项目：<strong>{project.name}</strong>
            </div>
          )}
          <div className="form-group">
            <label>任务名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入任务名称"
              autoFocus
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              {task ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
