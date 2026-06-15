import dayjs from 'dayjs';

export const formatDuration = (ms) => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatDurationHours = (ms) => {
  return (ms / 3600000).toFixed(2);
};

export const exportToCSV = (entries, projects, tasks) => {
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));
  
  const headers = ['开始时间', '结束时间', '时长(小时)', '项目', '任务', '备注', '是否计费'];
  const rows = entries.map(entry => {
    const project = projectMap[entry.project_id] || {};
    const task = taskMap[entry.task_id] || {};
    return [
      dayjs(entry.start_time).format('YYYY-MM-DD HH:mm:ss'),
      dayjs(entry.end_time).format('YYYY-MM-DD HH:mm:ss'),
      formatDurationHours(entry.duration),
      project.name || '',
      task.name || '',
      entry.note || '',
      project.billable ? '是' : '否'
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `工时报表_${dayjs().format('YYYYMMDD')}.csv`;
  link.click();
};

export const exportToJSON = async (db) => {
  const [projects, tasks, entries, auditLogs] = await Promise.all([
    db.projects.toArray(),
    db.tasks.toArray(),
    db.entries.toArray(),
    db.audit_logs.toArray()
  ]);
  
  const data = { version: 1, exported_at: Date.now(), projects, tasks, entries, auditLogs };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `时间追踪备份_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
  link.click();
};

export const importFromJSON = async (db, file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        await db.transaction('rw', db.projects, db.tasks, db.entries, db.audit_logs, async () => {
          if (data.projects) {
            for (const item of data.projects) {
              const existing = await db.projects.get(item.id);
              if (!existing) await db.projects.put(item);
            }
          }
          if (data.tasks) {
            for (const item of data.tasks) {
              const existing = await db.tasks.get(item.id);
              if (!existing) await db.tasks.put(item);
            }
          }
          if (data.entries) {
            for (const item of data.entries) {
              const existing = await db.entries.get(item.id);
              if (!existing) await db.entries.put(item);
            }
          }
          if (data.auditLogs) {
            for (const item of data.auditLogs) {
              const existing = await db.audit_logs.get(item.id);
              if (!existing) await db.audit_logs.put(item);
            }
          }
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const generateWeeklyReport = (entries, projects, tasks, startOfWeek) => {
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));
  const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000;
  
  const weekEntries = entries.filter(e => 
    e.start_time >= startOfWeek && e.start_time < endOfWeek && !e.deleted_at
  );
  
  const byProject = {};
  let totalHours = 0;
  
  weekEntries.forEach(entry => {
    const project = projectMap[entry.project_id];
    if (!project) return;
    const hours = entry.duration / 3600000;
    totalHours += hours;
    if (!byProject[project.id]) {
      byProject[project.id] = {
        project: project.name,
        billable: project.billable,
        hours: 0,
        tasks: {}
      };
    }
    byProject[project.id].hours += hours;
    const task = taskMap[entry.task_id];
    const taskName = task ? task.name : '未分类';
    if (!byProject[project.id].tasks[taskName]) {
      byProject[project.id].tasks[taskName] = 0;
    }
    byProject[project.id].tasks[taskName] += hours;
  });
  
  return { totalHours, byProject, startOfWeek, endOfWeek };
};

export const formatWeeklyReportText = (report, template = null) => {
  const defaultTemplate = `周报 - {dateRange}

总工时：{totalHours} 小时

{#billableProjects}
【可计费项目】
{/billableProjects}

{#nonBillableProjects}
【内部项目】
{/nonBillableProjects}

{#projectSection}
{projectName}（{billableLabel}）- {projectHours} 小时
{#tasks}  - {taskName}: {taskHours} 小时
{/tasks}
{/projectSection}`;

  const tpl = template || defaultTemplate;
  const dateRange = `${dayjs(report.startOfWeek).format('YYYY-MM-DD')} ~ ${dayjs(report.endOfWeek - 1).format('YYYY-MM-DD')}`;
  
  let result = tpl
    .replace('{dateRange}', dateRange)
    .replace('{totalHours}', report.totalHours.toFixed(2));
  
  const billableProjects = Object.values(report.byProject).filter(p => p.billable);
  const nonBillableProjects = Object.values(report.byProject).filter(p => !p.billable);
  
  if (billableProjects.length > 0) {
    const billableSection = billableProjects.map(p => {
      const tasksText = Object.entries(p.tasks)
        .map(([name, hours]) => `  - ${name}: ${hours.toFixed(2)} 小时`)
        .join('\n');
      return `${p.project}（可计费）- ${p.hours.toFixed(2)} 小时\n${tasksText}`;
    }).join('\n\n');
    result = result.replace('{#billableProjects}\n{/billableProjects}', billableSection);
  } else {
    result = result.replace('{#billableProjects}\n{/billableProjects}', '无可计费项目');
  }
  
  if (nonBillableProjects.length > 0) {
    const nonBillableSection = nonBillableProjects.map(p => {
      const tasksText = Object.entries(p.tasks)
        .map(([name, hours]) => `  - ${name}: ${hours.toFixed(2)} 小时`)
        .join('\n');
      return `${p.project}（内部）- ${p.hours.toFixed(2)} 小时\n${tasksText}`;
    }).join('\n\n');
    result = result.replace('{#nonBillableProjects}\n{/nonBillableProjects}', nonBillableSection);
  } else {
    result = result.replace('{#nonBillableProjects}\n{/nonBillableProjects}', '无内部项目');
  }
  
  result = result.replace(/\{#projectSection\}[\s\S]*?\{\/projectSection\}/, '');
  
  return result;
};
