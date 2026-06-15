import React from 'react';
import { useReminder } from '../contexts/ReminderContext';

const ReminderDisplay = () => {
  const { reminders, removeReminder } = useReminder();

  return (
    <div className="reminder-container">
      {reminders.map(reminder => (
        <div
          key={reminder.id}
          className={`reminder-item reminder-${reminder.type}`}
        >
          <span className="reminder-message">{reminder.message}</span>
          <button
            className="reminder-close"
            onClick={() => removeReminder(reminder.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ReminderDisplay;
