
import React, { useEffect, useRef } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptionDisplayProps {
  history: TranscriptionEntry[];
  current: { user: string; bot: string };
}

const MoroccoFlag = () => (
  <svg className="w-6 h-6 mr-2 text-red-600" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 0H40V24H0V0Z" fill="#C1272D"/>
    <path d="M20 7.5L21.5279 12.4721L16.5 9.5H23.5L18.4721 12.4721L20 7.5Z" fill="#006233"/>
  </svg>
);

const BotIcon = () => (
  <svg className="w-6 h-6 mr-2 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <path d="M8.5 12.5h7v2h-7zm2-3h3v2h-3zm-1 6h5v2h-5z"/>
    <circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>
  </svg>
);


export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ history, current }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, current]);

  return (
    <div ref={scrollRef} className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto bg-white/10 rounded-lg">
      {history.map((entry) => (
        <div key={entry.id} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
          {entry.speaker === 'bot' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <BotIcon />
            </div>
          )}
          <div className={`p-3 rounded-lg max-w-xs md:max-w-md ${entry.speaker === 'user' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-200'}`}>
            <p className="text-sm">{entry.text}</p>
          </div>
          {entry.speaker === 'user' && (
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <MoroccoFlag />
            </div>
          )}
        </div>
      ))}
      {current.user && (
         <div className="flex items-start gap-3 justify-end">
             <div className="p-3 rounded-lg max-w-xs md:max-w-md bg-green-500/50 text-white">
                <p className="text-sm italic">{current.user}</p>
             </div>
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <MoroccoFlag />
            </div>
         </div>
      )}
       {current.bot && (
         <div className="flex items-start gap-3">
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <BotIcon />
            </div>
             <div className="p-3 rounded-lg max-w-xs md:max-w-md bg-gray-700/50 text-gray-200">
                <p className="text-sm italic">{current.bot}</p>
             </div>
         </div>
      )}
    </div>
  );
};
