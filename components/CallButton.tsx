
import React from 'react';
import { CallStatus } from '../types';

interface CallButtonProps {
  status: CallStatus;
  onClick: () => void;
}

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const EndCallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3.6_5.01L5.02_3.6c2.72 2.72 4.25 6.36 4.25 10.15v2.4c-2.89-.59-5.59-2.29-7.67-4.68zM18.99 3.6l1.41 1.41c-2.39 2.39-4.09 5.09-4.68 7.67h2.4c.0-3.79 1.53-7.43 4.25-10.16z" opacity=".3" /><path d="M15.4_20.4c3.79_0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4zm-10.8.0c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4c3.79.0 7.43-1.53 10.16-4.25l-1.41-1.41c-2.39 2.39-5.09 4.09-7.67 4.68v-2.4z" /><path d="M12 9c-1.6 0-3.15.25-4.62.72v3.12c1.47-.47 3.02-.72 4.62-.72s3.15.25 4.62.72v-3.12C15.15 9.25 13.6 9 12 9z" opacity=".3" /><path d="M6.54 5c.06.89.21 1.76.45 2.59l-1.2 1.2c-.41-1.2-.67-2.47-.76-3.79h1.51m12.42 12.42c-.83.24-1.7.39-2.59.45v1.51c1.32-.09 2.59-.35 3.79-.76l-1.2-1.2M4.01 3.64l1.41 1.41C4.09 6.46 3 8.84 3 11.5c0 1.63.45 3.19 1.22 4.54l-1.41 1.41C1.65 15.93 1 13.79 1 11.5c0-3.18 1.35-6.05 3.55-8.05l-1.13-1.13L4.01 3.64zm15.98 15.98l-1.41-1.41c1.33-1.63 2.18-3.59 2.18-5.71 0-2.66-1.09-5.04-2.81-6.75l1.41-1.41C22.35 7.95 23 9.79 23 11.5c0 3.18-1.35 6.05-3.55 8.05l1.13 1.13-.58.56z" /><path d="M12 3C6.48 3 2 7.48 2 13c0 2.22 1.21 4.15 2.87 5.19l1.45-1.45C5.01 15.82 4 14.28 4 13c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.28-.51 2.82-1.32 4.74l1.45 1.45C21.79 18.15 23 16.22 23 13c0-5.52-4.48-10-10-10z" />
    </svg>
);


const Spinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
);

export const CallButton: React.FC<CallButtonProps> = ({ status, onClick }) => {
    const isConnecting = status === CallStatus.CONNECTING;
    const isActive = status === CallStatus.ACTIVE;

    const baseClasses = 'flex items-center justify-center px-8 py-4 rounded-xl text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 font-semibold';
    const activeClasses = 'bg-[#8B6F47] hover:bg-[#7A5F3D] focus:ring-[#8B6F47]';
    const idleClasses = 'bg-[#6B5539] hover:bg-[#5D4930] focus:ring-[#6B5539]';
    const connectingClasses = 'bg-[#8B7355] cursor-not-allowed';

    const getButtonContent = () => {
        if (isConnecting) {
            return (
                <div className="flex items-center gap-2">
                    <Spinner />
                    <span>Connecting...</span>
                </div>
            );
        }
        if (isActive) {
            return (
                <div className="flex items-center gap-2">
                    <EndCallIcon />
                    <span>End Call</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <PhoneIcon />
                <span>Start Call</span>
            </div>
        );
    };

    return (
        <button
            onClick={onClick}
            disabled={isConnecting}
            className={`${baseClasses} ${isActive ? activeClasses : isConnecting ? connectingClasses : idleClasses}`}
            aria-label={isActive ? 'End Call' : 'Start Call'}
        >
            {getButtonContent()}
        </button>
    );
};
