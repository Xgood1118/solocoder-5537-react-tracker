import Dexie from 'dexie';

export const db = new Dexie('TimeTrackerDB');

db.version(1).stores({
  projects: '++id, name, color, billable, estimated_hours, created_at, updated_at, deleted_at',
  tasks: '++id, project_id, name, sort_order, created_at, updated_at, deleted_at',
  entries: '++id, task_id, project_id, start_time, end_time, duration, note, is_active, created_at, updated_at, deleted_at',
  audit_logs: '++id, entry_id, action, old_value, new_value, created_at',
  settings: 'key, value'
});

export const COLOR_PALETTE = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD',
  '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
  '#4DB6AC', '#81C784', '#AED581', '#DCE775',
  '#FFD54F', '#FFB74D', '#FF8A65', '#A1887F'
];

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const getActualHours = async (projectId) => {
  const entries = await db.entries
    .where('project_id')
    .equals(projectId)
    .filter(e => !e.deleted_at)
    .toArray();
  return entries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600000;
};

export const getBudgetWarning = (estimated, actual) => {
  if (!estimated) return 'none';
  const ratio = actual / estimated;
  if (ratio >= 1) return 'red';
  if (ratio >= 0.8) return 'yellow';
  if (ratio >= 0.5) return 'green';
  return 'none';
};

export const cleanupSoftDeleted = async () => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await db.entries.where('deleted_at').below(thirtyDaysAgo).delete();
  await db.projects.where('deleted_at').below(thirtyDaysAgo).delete();
  await db.tasks.where('deleted_at').below(thirtyDaysAgo).delete();
};
