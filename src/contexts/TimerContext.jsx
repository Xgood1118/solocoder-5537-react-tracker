import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db, generateId } from '../db';

const TimerContext = createContext(null);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error('useTimer must be used within TimerProvider');
  return context;
};

export const TimerProvider = ({ children }) => {
  const [currentTask, setCurrentTask] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [smoothSeconds, setSmoothSeconds] = useState(0);
  
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const rafTimeRef = useRef(0);

  const updateElapsed = useCallback(() => {
    if (!startTimeRef.current) return;
    const now = performance.now();
    const currentElapsed = now - startTimeRef.current + pausedTimeRef.current;
    setElapsed(currentElapsed);
    setSmoothSeconds((currentElapsed / 1000) % 60);
    rafTimeRef.current = now;
    animationFrameRef.current = requestAnimationFrame(updateElapsed);
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startTimer = useCallback(async (task, project) => {
    const activeEntry = await db.entries.where('is_active').equals(1).first();
    if (activeEntry) {
      await stopTimerInternal(activeEntry);
    }

    const now = Date.now();
    const entryId = generateId();
    const entry = {
      id: entryId,
      task_id: task.id,
      project_id: project.id,
      start_time: now,
      end_time: null,
      duration: 0,
      note: '',
      is_active: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await db.entries.put(entry);
    
    setCurrentTask(task);
    setCurrentProject(project);
    setActiveEntryId(entryId);
    setIsRunning(true);
    setIsPaused(false);
    setElapsed(0);
    pausedTimeRef.current = 0;
    startTimeRef.current = performance.now();
    setSmoothSeconds(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateElapsed);
  }, [updateElapsed]);

  const stopTimerInternal = async (entry) => {
    const now = Date.now();
    const duration = now - entry.start_time;
    
    if (duration > 24 * 60 * 60 * 1000) {
      const confirmed = window.confirm('该记录时长超过24小时，确认保存吗？');
      if (!confirmed) {
        await db.entries.delete(entry.id);
        return;
      }
    }

    await db.entries.update(entry.id, {
      end_time: now,
      duration: duration,
      is_active: 0,
      updated_at: now
    });
  };

  const pauseTimer = useCallback(async () => {
    if (!isRunning || isPaused) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    pausedTimeRef.current = elapsed;
    setIsPaused(true);
    
    if (activeEntryId) {
      await db.entries.update(activeEntryId, {
        duration: elapsed,
        updated_at: Date.now()
      });
    }
  }, [isRunning, isPaused, elapsed, activeEntryId]);

  const resumeTimer = useCallback(() => {
    if (!isPaused) return;
    
    startTimeRef.current = performance.now();
    setIsPaused(false);
    animationFrameRef.current = requestAnimationFrame(updateElapsed);
  }, [isPaused, updateElapsed]);

  const stopTimer = useCallback(async () => {
    if (!activeEntryId) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const entry = await db.entries.get(activeEntryId);
    if (entry) {
      await stopTimerInternal(entry);
    }
    
    setCurrentTask(null);
    setCurrentProject(null);
    setActiveEntryId(null);
    setIsRunning(false);
    setIsPaused(false);
    setElapsed(0);
    setSmoothSeconds(0);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
  }, [activeEntryId]);

  const autoPause = useCallback(async () => {
    if (!isRunning || isPaused) return;
    await pauseTimer();
  }, [isRunning, isPaused, pauseTimer]);

  useEffect(() => {
    const checkActiveEntry = async () => {
      const activeEntry = await db.entries.where('is_active').equals(1).first();
      if (activeEntry) {
        const task = await db.tasks.get(activeEntry.task_id);
        const project = await db.projects.get(activeEntry.project_id);
        if (task && project) {
          setCurrentTask(task);
          setCurrentProject(project);
          setActiveEntryId(activeEntry.id);
          setIsRunning(true);
          setIsPaused(true);
          setElapsed(activeEntry.duration || 0);
          pausedTimeRef.current = activeEntry.duration || 0;
          setSmoothSeconds(((activeEntry.duration || 0) / 1000) % 60);
        }
      }
    };
    checkActiveEntry();
  }, []);

  return (
    <TimerContext.Provider value={{
      currentTask,
      currentProject,
      isRunning,
      isPaused,
      elapsed,
      smoothSeconds,
      activeEntryId,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopTimer,
      autoPause
    }}>
      {children}
    </TimerContext.Provider>
  );
};
