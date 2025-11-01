
import React, { useEffect, useRef } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptionDisplayProps {
  history: TranscriptionEntry[];
  current: { user: string; bot: string };
}

const MoroccoFlag = () => (
  <svg className="w-5 h-5 text-[#C1272D]" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 0H40V24H0V0Z" fill="#C1272D"/>
    <path d="M20 7.5L21.5279 12.4721L16.5 9.5H23.5L18.4721 12.4721L20 7.5Z" fill="#006233"/>
  </svg>
);

const BotIcon = () => (
  <svg className="w-5 h-5 text-[#5D4E37]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
    <div ref={scrollRef} className="flex-1 p-4 space-y-4 overflow-y-auto bg-[#E8D9C5] rounded-xl border border-[#A08B73]/20 shadow-inner">
      {history.length === 0 && !current.user && !current.bot && (
        <div className="flex items-center justify-center h-full text-[#8B7355] text-center">
          <div>
            <p className="text-lg font-medium mb-2">Welcome! 👋</p>
            <p className="text-sm">Start a call to begin your journey through Moroccan monuments</p>
          </div>
        </div>
      )}
      {history.map((entry) => (
        <div key={entry.id} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
          {entry.speaker === 'bot' && (
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#DDC8B4] border-2 border-[#A08B73]/30 flex items-center justify-center shadow-sm">
                <BotIcon />
            </div>
          )}
          <div className={`p-3.5 rounded-xl max-w-xs md:max-w-md shadow-sm ${entry.speaker === 'user' ? 'bg-[#6B5539] text-white' : 'bg-[#F5EDE0] text-[#5D4E37] border border-[#A08B73]/20'}`}>
            <p className="text-sm leading-relaxed">{entry.text}</p>
          </div>
          {entry.speaker === 'user' && (
             <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white border-2 border-[#A08B73]/30 flex items-center justify-center shadow-sm">
                <MoroccoFlag />
            </div>
          )}
        </div>
      ))}
      {current.user && (
         <div className="flex items-start gap-3 justify-end">
             <div className="p-3.5 rounded-xl max-w-xs md:max-w-md bg-[#6B5539]/70 text-white shadow-sm">
                <p className="text-sm italic leading-relaxed">{current.user}</p>
             </div>
             <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white border-2 border-[#A08B73]/30 flex items-center justify-center shadow-sm">
                <MoroccoFlag />
            </div>
         </div>
      )}
       {current.bot && (
         <div className="flex items-start gap-3">
             <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#DDC8B4] border-2 border-[#A08B73]/30 flex items-center justify-center shadow-sm">
                <BotIcon />
            </div>
             <div className="p-3.5 rounded-xl max-w-xs md:max-w-md bg-[#F5EDE0]/70 text-[#5D4E37] border border-[#A08B73]/20 shadow-sm">
                <p className="text-sm italic leading-relaxed">{current.bot}</p>
             </div>
         </div>
      )}
    </div>
  );
};
