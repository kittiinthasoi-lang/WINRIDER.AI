import React from 'react';
import { WinWalletPanel } from './WinWalletPanel';

export const WalletTopUpPanel: React.FC<{
  role?: 'citizen' | 'knight' | 'merchant' | 'partner';
  userId?: string;
  userName?: string;
  onBalanceUpdate?: (balance: number) => void;
}> = (props) => {
  return <WinWalletPanel {...props} />;
};

