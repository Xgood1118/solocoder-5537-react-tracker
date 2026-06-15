import React, { useRef } from 'react';
import { db, cleanupSoftDeleted } from '../db';
import { exportToJSON, importFromJSON } from '../utils';

const Settings = () => {
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      await exportToJSON(db);
    } catch (err) {
      alert('导出失败：' + err.message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importFromJSON(db, file);
      alert('导入成功！数据已按ID去重合并');
    } catch (err) {
      alert('导入失败：' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleCleanup = async () => {
    if (confirm('确定要清理30天前已软删除的数据吗？此操作不可撤销。')) {
      try {
        await cleanupSoftDeleted();
        alert('清理完成');
      } catch (err) {
        alert('清理失败：' + err.message);
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有数据吗？此操作不可撤销！')) {
      if (confirm('再次确认：所有数据将被永久删除，确定继续吗？')) {
        try {
          await db.transaction('rw', db.projects, db.tasks, db.entries, db.audit_logs, async () => {
            await db.projects.clear();
            await db.tasks.clear();
            await db.entries.clear();
            await db.audit_logs.clear();
          });
          alert('所有数据已清空');
        } catch (err) {
          alert('清空失败：' + err.message);
        }
      }
    }
  };

  return (
    <div className="settings-container">
      <h3>设置</h3>

      <div className="settings-section">
        <h4>数据管理</h4>
        <div className="settings-grid">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">导出数据</div>
              <div className="setting-desc">将所有数据导出为 JSON 格式备份</div>
            </div>
            <button className="btn btn-primary" onClick={handleExport}>
              📤 导出 JSON
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">导入数据</div>
              <div className="setting-desc">从 JSON 文件导入数据，按 ID 去重</div>
            </div>
            <button className="btn btn-secondary" onClick={handleImportClick}>
              📥 导入 JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">清理已删除数据</div>
              <div className="setting-desc">清理 30 天前已软删除的记录</div>
            </div>
            <button className="btn btn-warning" onClick={handleCleanup}>
              🧹 清理
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">清空所有数据</div>
              <div className="setting-desc">永久删除所有数据，不可恢复</div>
            </div>
            <button className="btn btn-danger" onClick={handleClearAll}>
              ⚠️ 清空数据
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h4>云同步（预留接口）</h4>
        <div className="settings-grid">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">同步状态</div>
              <div className="setting-desc">当前仅使用本地存储，云同步功能开发中</div>
            </div>
            <span className="sync-status">本地模式</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h4>关于</h4>
        <div className="about-info">
          <p><strong>Time Tracker</strong> - 时间追踪工具</p>
          <p>技术栈：React 18 + Vite + Dexie + Recharts</p>
          <p>数据存储：IndexedDB（本地浏览器存储）</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
