import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { db } from '../db';

const ReminderContext = createContext(null);

export const useReminder = () => {
  const context = useContext(ReminderContext);
  if (!context) throw new Error('useReminder must be used within ReminderProvider');
  return context;
};

export const ReminderProvider = ({ children, onAutoPause }) => {
  const [reminders, setReminders] = useState([]);
  const lastActivityRef = useRef(Date.now());
  const lastBreakReminderRef = useRef(0);
  const lastHoursReminderRef = useRef(0);
  const timerCheckRef = useRef(null);
  const activityCheckRef = useRef(null);

  const addReminder = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setReminders(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setReminders(prev => prev.filter(r => r.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeReminder = useCallback((id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const handleMouseMove = () => handleActivity();
    const handleKeyDown = () => handleActivity();
    const handleClick = () => handleActivity();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [handleActivity]);

  useEffect(() => {
    timerCheckRef.current = setInterval(async () => {
      const now = Date.now();
      const activeEntry = await db.entries.where('is_active').equals(1).first();

      if (activeEntry) {
        const currentDuration = now - activeEntry.start_time;
        const currentSessionDuration = currentDuration - lastBreakReminderRef.current;
        
        if (currentSessionDuration >= 50 * 60 * 1000) {
          addReminder('⏰ 已经连续工作50分钟了，起来活动一下吧~', 'break', 0);
          lastBreakReminderRef.current = currentDuration;
        }
      }

      const hour = dayjs().hour();
      if (hour === 17 && lastHoursReminderRef.current !== dayjs().format('YYYY-MM-DD')) {
        const startOfDay = dayjs().startOf('day').valueOf();
        const entries = await db.entries
          .where('start_time')
          .above(startOfDay)
          .filter(e => !e.deleted_at)
          .toArray();
        
        const totalHours = entries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600000;
        
        if (totalHours < 4) {
          const gap = (4 - totalHours).toFixed(1);
          addReminder(`⏰ 已经17点了，今日工时还差 ${gap} 小时才到4小时哦~`, 'hours', 0);
          lastHoursReminderRef.current = dayjs().format('YYYY-MM-DD');
        }
      }
    }, 60000);

    return () => {
      if (timerCheckRef.current) clearInterval(timerCheckRef.current);
    };
  }, [addReminder]);

  useEffect(() => {
    activityCheckRef.current = setInterval(async () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      const activeEntry = await db.entries.where('is_active').equals(1).first();

      if (activeEntry && idleTime >= 10 * 60 * 1000) {
        const confirmed = window.confirm('检测到您已经10分钟没有活动了，是否暂停计时？');
        if (confirmed && onAutoPause) {
          await onAutoPause();
          addReminder('⏸️ 计时已自动暂停', 'info', 3000);
        }
        lastActivityRef.current = now;
      }
    }, 30000);

    return () => {
      if (activityCheckRef.current) clearInterval(activityCheckRef.current);
    };
  }, [addReminder, onAutoPause]);

  return (
    <ReminderContext.Provider value={{
      reminders,
      addReminder,
      removeReminder,
      handleActivity
    }}>
      {children}
    </ReminderContext.Provider>
  );
};
