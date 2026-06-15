import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { generateWeeklyReport, formatWeeklyReportText } from '../utils';
import dayjs from 'dayjs';

const WeeklyReport = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [reportTemplate, setReportTemplate] = useState('');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  const projects = useLiveQuery(() =>
    db.projects.filter(e => !e.deleted_at).toArray()
  );
  const tasks = useLiveQuery(() =>
    db.tasks.filter(e => !e.deleted_at).toArray()
  );
  const entries = useLiveQuery(() =>
    db.entries.filter(e => !e.deleted_at).toArray()
  );
  const savedTemplate = useLiveQuery(() =>
    db.settings.get('weekly_report_template')
  );

  const startOfWeek = useMemo(() => {
    return dayjs().add(weekOffset, 'week').startOf('week').valueOf();
  }, [weekOffset]);

  const report = useMemo(() => {
    if (!projects || !tasks || !entries) return null;
    return generateWeeklyReport(entries, projects, tasks, startOfWeek);
  }, [projects, tasks, entries, startOfWeek]);

  const template = savedTemplate?.value || reportTemplate || null;

  const reportText = report ? formatWeeklyReportText(report, template) : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      alert('周报已复制到剪贴板');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = reportText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('周报已复制到剪贴板');
    }
  };

  const handleSaveTemplate = async () => {
    await db.settings.put({
      key: 'weekly_report_template',
      value: reportTemplate
    });
    setShowTemplateEditor(false);
    alert('模板已保存');
  };

  if (!report) return <div className="loading">加载中...</div>;

  return (
    <div className="weekly-report-container">
      <div className="reports-header">
        <h3>周报生成</h3>
        <div className="reports-controls">
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setWeekOffset(w => w - 1)}
          >
            ← 上周
          </button>
          <span className="current-week">
            {dayjs(startOfWeek).format('YYYY年MM月DD日')} - {dayjs(startOfWeek + 6 * 24 * 60 * 60 * 1000).format('MM月DD日')}
          </span>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setWeekOffset(w => w + 1)}
            disabled={weekOffset >= 0}
          >
            下周 →
          </button>
          {weekOffset !== 0 && (
            <button
              className="btn btn-primary btn-small"
              onClick={() => setWeekOffset(0)}
            >
              本周
            </button>
          )}
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setShowTemplateEditor(!showTemplateEditor)}
          >
            ✏️ 模板
          </button>
        </div>
      </div>

      {showTemplateEditor && (
        <div className="template-editor">
          <h4>周报模板</h4>
          <p className="template-hint">
            可用变量：{'{dateRange}'} {'{totalHours}'} {'{#billableProjects}'} {'{/billableProjects}'}{' '}
            {'{#nonBillableProjects}'} {'{/nonBillableProjects}'}
          </p>
          <textarea
            value={reportTemplate}
            onChange={e => setReportTemplate(e.target.value)}
            placeholder="输入自定义模板，留空使用默认模板"
            rows={8}
          />
          <div className="template-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowTemplateEditor(false)}
            >
              取消
            </button>
            <button className="btn btn-primary" onClick={handleSaveTemplate}>
              保存模板
            </button>
          </div>
        </div>
      )}

      <div className="weekly-report-content">
        <textarea
          className="report-textarea"
          value={reportText}
          onChange={e => {}}
          readOnly
          rows={15}
        />
        <div className="report-actions">
          <button className="btn btn-primary" onClick={handleCopy}>
            📋 复制到剪贴板
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
