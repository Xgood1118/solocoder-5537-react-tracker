import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { TimerProvider, useTimer } from './contexts/TimerContext';
import { ReminderProvider } from './contexts/ReminderContext';
import { db, generateId, COLOR_PALETTE } from './db';
import CircleTimer from './components/CircleTimer';
import ProjectTaskTree from './components/ProjectTaskTree';
import ProjectModal from './components/ProjectModal';
import TaskModal from './components/TaskModal';
import EntryModal from './components/EntryModal';
import Timeline from './components/Timeline';
import Reports from './components/Reports';
import WeeklyReport from './components/WeeklyReport';
import Settings from './components/Settings';
import AuditLog from './components/AuditLog';
import ReminderDisplay from './components/ReminderDisplay';
import './styles.css';

const NavLink = ({ to, children, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
      <span className="nav-icon">{icon}</span>
      <span className="nav-text">{children}</span>
    </Link>
  );
};

const AppContent = () => {
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState(null);

  const { autoPause, startTimer, pauseTimer, resumeTimer, stopTimer, currentTask, currentProject } = useTimer();

  const projects = useLiveQuery(() =>
    db.projects.filter(e => !e.deleted_at).toArray()
  );
  const tasks = useLiveQuery(() =>
    db.tasks.filter(e => !e.deleted_at).toArray()
  );

  const handleAddProject = () => {
    setEditingProject(null);
    setProjectModalOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  const handleSaveProject = async (projectData) => {
    if (projectData.id) {
      await db.projects.update(projectData.id, projectData);
    } else {
      const now = Date.now();
      await db.projects.add({
        ...projectData,
        id: generateId(),
        color: projectData.color || COLOR_PALETTE[0],
        created_at: now,
        deleted_at: null
      });
    }
  };

  const handleDeleteProject = async (project) => {
    if (!confirm(`确定要删除项目"${project.name}"吗？相关任务和记录将被软删除。`)) return;
    const now = Date.now();
    await db.transaction('rw', db.projects, db.tasks, db.entries, async () => {
      await db.projects.update(project.id, { deleted_at: now, updated_at: now });
      await db.tasks.where('project_id').equals(project.id).modify({ deleted_at: now, updated_at: now });
      await db.entries.where('project_id').equals(project.id).modify({ deleted_at: now, updated_at: now });
    });
  };

  const handleAddTask = (project) => {
    setSelectedProjectForTask(project);
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setSelectedProjectForTask(null);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    const projectId = taskData.project_id;
    const existingTasks = await db.tasks.where('project_id').equals(projectId).toArray();
    const maxSortOrder = existingTasks.reduce((max, t) => Math.max(max, t.sort_order || 0), -1);

    if (taskData.id) {
      await db.tasks.update(taskData.id, taskData);
    } else {
      const now = Date.now();
      await db.tasks.add({
        ...taskData,
        id: generateId(),
        sort_order: maxSortOrder + 1,
        created_at: now,
        deleted_at: null
      });
    }
  };

  const handleDeleteTask = async (task) => {
    if (!confirm(`确定要删除任务"${task.name}"吗？相关记录将被软删除。`)) return;
    const now = Date.now();
    await db.transaction('rw', db.tasks, db.entries, async () => {
      await db.tasks.update(task.id, { deleted_at: now, updated_at: now });
      await db.entries.where('task_id').equals(task.id).modify({ deleted_at: now, updated_at: now });
    });
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setEntryModalOpen(true);
  };

  const handleDeleteEntry = async (entry) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    const now = Date.now();
    await db.entries.update(entry.id, { deleted_at: now, updated_at: now });
  };

  const handleTimerStart = () => {
    if (currentTask && currentProject) {
      startTimer(currentTask, currentProject);
    }
  };

  const HomePage = () => (
    <div className="home-page">
      <div className="timer-section">
        <CircleTimer
          onStart={handleTimerStart}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={stopTimer}
        />
      </div>
      <div className="timeline-section">
        <Timeline onEditEntry={handleEditEntry} />
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">⏱️ Time Tracker</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" icon="🏠">首页</NavLink>
          <NavLink to="/projects" icon="📁">项目任务</NavLink>
          <NavLink to="/reports" icon="📊">数据报表</NavLink>
          <NavLink to="/weekly" icon="📝">周报</NavLink>
          <NavLink to="/audit" icon="📋">审计日志</NavLink>
          <NavLink to="/settings" icon="⚙️">设置</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="quick-actions">
            <button className="btn btn-secondary btn-small" onClick={() => setEntryModalOpen(true)}>
              + 补录记录
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/projects"
            element={
              <ProjectTaskTree
                onAddProject={handleAddProject}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            }
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="/weekly" element={<WeeklyReport />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <ReminderDisplay />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleSaveProject}
        project={editingProject}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
        project={selectedProjectForTask}
      />

      <EntryModal
        isOpen={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={() => {}}
        entry={editingEntry}
        projects={projects || []}
        tasks={tasks || []}
      />
    </div>
  );
};

const App = () => {
  return (
    <HashRouter>
      <TimerProvider>
        <ReminderProviderWrapper>
          <AppContent />
        </ReminderProviderWrapper>
      </TimerProvider>
    </HashRouter>
  );
};

const ReminderProviderWrapper = ({ children }) => {
  const { autoPause } = useTimer();
  return (
    <ReminderProvider onAutoPause={autoPause}>
      {children}
    </ReminderProvider>
  );
};

export default App;
