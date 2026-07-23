import React from 'react';

interface TopBarProps {
  onOpenUpgrade: () => void;
  messageUnitsUsed: number;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenUpgrade, messageUnitsUsed }) => {
  return (
    <div className="w-full h-10 px-5 flex items-center justify-between z-10 shrink-0 select-none">
      {/* Left empty spacer */}
      <div className="w-16"></div>

      {/* Center empty spacer */}
      <div></div>

      {/* Right empty spacer */}
      <div className="w-16"></div>
    </div>
  );
};

