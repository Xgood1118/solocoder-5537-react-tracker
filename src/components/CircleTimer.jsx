import React from 'react';
import { useTimer } from '../contexts/TimerContext';
import { formatDuration } from '../utils';

const CircleTimer = ({ onStart, onPause, onResume, onStop }) => {
  const { currentTask, currentProject, isRunning, isPaused, elapsed, smoothSeconds } = useTimer();

  const size = 320;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const minuteProgress = (Math.floor(elapsed / 60000) % 60) / 60;
  const hourProgress = (Math.floor(elapsed / 3600000) % 12) / 12;
  
  const minuteOffset = circumference * (1 - minuteProgress);
  const hourOffset = circumference * (1 - hourProgress);

  const secondAngle = smoothSeconds * 6;
  const minuteAngle = (Math.floor(elapsed / 60000) % 60) * 6 + (smoothSeconds * 0.1);
  const hourAngle = (Math.floor(elapsed / 3600000) % 12) * 30 + (Math.floor(elapsed / 60000) % 60) * 0.5;

  const color = currentProject?.color || '#64B5F6';

  return (
    <div className="circle-timer-container">
      <div className="circle-timer-wrapper">
        <svg width={size} height={size} className="circle-timer">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={strokeWidth}
          />
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth - 4}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth={strokeWidth - 4}
          />
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth - 4}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth - 4}
            strokeDasharray={circumference - (strokeWidth + 4) * Math.PI}
            strokeDashoffset={hourOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={minuteOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />

          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={-radius + 50}
              stroke="#333"
              strokeWidth="4"
              strokeLinecap="round"
              transform={`rotate(${hourAngle})`}
            />
            
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={-radius + 30}
              stroke="#555"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${minuteAngle})`}
            />
            
            <line
              x1="0"
              y1="20"
              x2="0"
              y2={-radius + 15}
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${secondAngle})`}
              style={{ transition: 'transform 0.05s linear' }}
            />
            
            <circle cx="0" cy="0" r="8" fill={color} />
            <circle cx="0" cy="0" r="4" fill="#fff" />
          </g>

          {[...Array(60)].map((_, i) => {
            const isHour = i % 5 === 0;
            const angle = i * 6;
            const innerR = radius - (isHour ? 15 : 10);
            const outerR = radius - 5;
            const x1 = size / 2 + innerR * Math.sin((angle * Math.PI) / 180);
            const y1 = size / 2 - innerR * Math.cos((angle * Math.PI) / 180);
            const x2 = size / 2 + outerR * Math.sin((angle * Math.PI) / 180);
            const y2 = size / 2 - outerR * Math.cos((angle * Math.PI) / 180);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isHour ? '#333' : '#ccc'}
                strokeWidth={isHour ? 2 : 1}
              />
            );
          })}
        </svg>

        <div className="timer-content">
          <div className="timer-task-name">
            {currentTask ? currentTask.name : '选择任务开始计时'}
          </div>
          <div className="timer-project-name" style={{ color }}>
            {currentProject ? currentProject.name : ''}
          </div>
          <div className="timer-display">
            {formatDuration(elapsed)}
          </div>
          <div className="timer-status">
            {isRunning && !isPaused && <span className="status-running">● 计时中</span>}
            {isRunning && isPaused && <span className="status-paused">⏸ 已暂停</span>}
            {!isRunning && <span className="status-idle">○ 空闲</span>}
          </div>
        </div>
      </div>

      <div className="timer-controls">
        {!isRunning ? (
          <button
            className="btn btn-primary btn-large"
            onClick={onStart}
            disabled={!currentTask}
          >
            ▶ 开始
          </button>
        ) : (
          <>
            {!isPaused ? (
              <button className="btn btn-warning btn-large" onClick={onPause}>
                ⏸ 暂停
              </button>
            ) : (
              <button className="btn btn-primary btn-large" onClick={onResume}>
                ▶ 继续
              </button>
            )}
            <button className="btn btn-danger btn-large" onClick={onStop}>
              ⏹ 停止
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CircleTimer;
