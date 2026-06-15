import React, { useState, useEffect } from 'react';
import { COLOR_PALETTE } from '../db';

const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [customColor, setCustomColor] = useState('');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [billable, setBillable] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      const isCustom = !COLOR_PALETTE.includes(project.color);
      setUseCustomColor(isCustom);
      setColor(isCustom ? COLOR_PALETTE[0] : project.color);
      setCustomColor(isCustom ? project.color : '');
      setBillable(project.billable || false);
      setEstimatedHours(project.estimated_hours || '');
    } else {
      setName('');
      setColor(COLOR_PALETTE[0]);
      setCustomColor('');
      setUseCustomColor(false);
      setBillable(false);
      setEstimatedHours('');
    }
  }, [project, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalColor = useCustomColor && customColor ? customColor : color;
    
    onSave({
      ...(project || {}),
      name: name.trim(),
      color: finalColor,
      billable,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      updated_at: Date.now()
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project ? '编辑项目' : '新建项目'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>项目名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入项目名称"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>项目颜色</label>
            <div className="color-picker">
              <div className="color-palette">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${!useCustomColor && color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      setColor(c);
                      setUseCustomColor(false);
                    }}
                  />
                ))}
              </div>
              <div className="custom-color">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useCustomColor}
                    onChange={e => setUseCustomColor(e.target.checked)}
                  />
                  自定义颜色
                </label>
                {useCustomColor && (
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={customColor || '#64B5F6'}
                      onChange={e => setCustomColor(e.target.value)}
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={e => setCustomColor(e.target.value)}
                      placeholder="#RRGGBB"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={billable}
                onChange={e => setBillable(e.target.checked)}
              />
              可计费项目（外部客户项目）
            </label>
          </div>

          <div className="form-group">
            <label>预估工时（小时）</label>
            <input
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value)}
              placeholder="可选，用于工时预警"
              min="0"
              step="0.5"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              {project ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
