import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, getActualHours, getBudgetWarning } from '../db';
import { useTimer } from '../contexts/TimerContext';
import { formatDurationHours } from '../utils';

const SortableTask = ({ task, project, onEdit, onDelete, isActive }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-item ${isActive ? 'active' : ''}`}
    >
      <div className="task-item-content">
        <span className="drag-handle" {...attributes} {...listeners}>⋮⋮</span>
        <span className="task-name">{task.name}</span>
        <div className="task-actions">
          <button className="btn-icon" onClick={() => onEdit(task)} title="编辑">✏️</button>
          <button className="btn-icon" onClick={() => onDelete(task)} title="删除">🗑️</button>
        </div>
      </div>
    </div>
  );
};

const ProjectItem = ({ project, tasks, onSelectTask, onEditProject, onDeleteProject, onAddTask, onEditTask, onDeleteTask, activeTaskId, activeEntryId }) => {
  const [expanded, setExpanded] = useState(true);
  const [actualHours, setActualHours] = useState(0);
  const { startTimer } = useTimer();

  React.useEffect(() => {
    getActualHours(project.id).then(setActualHours);
  }, [project.id, tasks]);

  const warning = getBudgetWarning(project.estimated_hours, actualHours);
  const warningColors = {
    red: '#E57373',
    yellow: '#FFD54F',
    green: '#81C784',
    none: 'transparent'
  };

  const handleTaskClick = async (task) => {
    await startTimer(task, project);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      
      await db.transaction('rw', db.tasks, async () => {
        for (let i = 0; i < newTasks.length; i++) {
          await db.tasks.update(newTasks[i].id, { sort_order: i, updated_at: Date.now() });
        }
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedTasks = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="project-item">
      <div
        className="project-header"
        style={{ borderLeftColor: project.color }}
      >
        <div
          className="project-header-content"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
          <span
            className="project-color-dot"
            style={{ backgroundColor: project.color }}
          />
          <span className="project-name">{project.name}</span>
          {project.billable && <span className="billable-badge">💰</span>}
          {warning !== 'none' && (
            <span
              className="warning-indicator"
              style={{ backgroundColor: warningColors[warning] }}
              title={`实际工时 ${actualHours.toFixed(1)}h / 预估 ${project.estimated_hours}h`}
            />
          )}
        </div>
        <div className="project-actions">
          <span className="project-hours" title={`实际 ${actualHours.toFixed(1)}h / 预估 ${project.estimated_hours || '-'}h`}>
            {formatDurationHours(actualHours * 3600000)}{project.estimated_hours ? ` / ${project.estimated_hours}h` : ''}
          </span>
          <button className="btn-icon" onClick={() => onAddTask(project)} title="添加任务">+</button>
          <button className="btn-icon" onClick={() => onEditProject(project)} title="编辑项目">✏️</button>
          <button className="btn-icon" onClick={() => onDeleteProject(project)} title="删除项目">🗑️</button>
        </div>
      </div>

      {expanded && (
        <div className="project-tasks">
          {sortedTasks.length === 0 ? (
            <div className="empty-tasks">暂无任务，点击 + 添加</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={`task-clickable ${activeTaskId === task.id && activeEntryId ? 'active-task' : ''}`}
                  >
                    <SortableTask
                      task={task}
                      project={project}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      isActive={activeTaskId === task.id && activeEntryId}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
};

const ProjectTaskTree = ({
  onEditProject,
  onDeleteProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onAddProject
}) => {
  const projects = useLiveQuery(() =>
    db.projects.filter(e => !e.deleted_at).toArray()
  );

  const tasks = useLiveQuery(() =>
    db.tasks.filter(e => !e.deleted_at).toArray()
  );

  const activeEntry = useLiveQuery(() =>
    db.entries.where('is_active').equals(1).first()
  );

  if (!projects || !tasks) return <div className="loading">加载中...</div>;

  const getTasksByProject = (projectId) =>
    tasks.filter(t => t.project_id === projectId);

  return (
    <div className="project-task-tree">
      <div className="tree-header">
        <h3>项目任务</h3>
        <button className="btn btn-primary btn-small" onClick={onAddProject}>
          + 新建项目
        </button>
      </div>
      <div className="tree-content">
        {projects.length === 0 ? (
          <div className="empty-projects">
            <p>还没有项目</p>
            <button className="btn btn-primary" onClick={onAddProject}>
              创建第一个项目
            </button>
          </div>
        ) : (
          projects.map(project => (
            <ProjectItem
              key={project.id}
              project={project}
              tasks={getTasksByProject(project.id)}
              onEditProject={onEditProject}
              onDeleteProject={onDeleteProject}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              activeTaskId={activeEntry?.task_id}
              activeEntryId={activeEntry?.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectTaskTree;
