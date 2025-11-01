
import React from 'react';
import { CallStatus } from '../types';

interface StatusIndicatorProps {
  status: CallStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case CallStatus.ACTIVE:
        return { text: 'Listening...', color: 'bg-green-500', pulse: true };
      case CallStatus.CONNECTING:
        return { text: 'Connecting...', color: 'bg-yellow-500', pulse: true };
      case CallStatus.ERROR:
        return { text: 'Error. Please try again.', color: 'bg-red-500', pulse: false };
      case CallStatus.IDLE:
      default:
        return { text: 'Ready to talk', color: 'bg-gray-400', pulse: false };
    }
  };

  const { text, color, pulse } = getStatusInfo();

  return (
    <div className="flex items-center justify-center text-gray-300">
      <div className={`w-3 h-3 rounded-full mr-2 ${color} ${pulse ? 'animate-pulse' : ''}`}></div>
      <span>{text}</span>
    </div>
  );
};
