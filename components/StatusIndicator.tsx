
import React from 'react';
import { CallStatus } from '../types';

interface StatusIndicatorProps {
  status: CallStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case CallStatus.ACTIVE:
        return { text: 'Listening...', color: 'bg-[#8B9A6B]', pulse: true };
      case CallStatus.CONNECTING:
        return { text: 'Connecting...', color: 'bg-[#D4A574]', pulse: true };
      case CallStatus.ERROR:
        return { text: 'Error. Please try again.', color: 'bg-[#B8866B]', pulse: false };
      case CallStatus.IDLE:
      default:
        return { text: 'Ready to talk', color: 'bg-[#A08B73]', pulse: false };
    }
  };

  const { text, color, pulse } = getStatusInfo();

  return (
    <div className="flex items-center justify-center text-[#5D4E37] font-medium">
      <div className={`w-2.5 h-2.5 rounded-full mr-2 ${color} ${pulse ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm">{text}</span>
    </div>
  );
};
