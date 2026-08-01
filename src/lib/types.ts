export type SignalDirection = 'LONG' | 'SHORT';
export type SignalStatus = 'OPEN' | 'TP' | 'SL';

export interface ClusterFill {
  walletAddress: string;
  sz: string;
}

export interface Signal {
  id: string;
  pair: string;
  type: SignalDirection;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  roi: string;
  status: SignalStatus;
  timestamp: string;
  leverage: string;
  liquidationPrice: string;
  margin: string;
  size: string;
  contributingWallets: number;
  contributingWalletAddresses: string[];
  takeProfitTargets: string[];
  stopLoss: string;
  clusterFills?: ClusterFill[];
}

export interface Wallet {
  address: string;
  addedOn: string;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
  cooldowns: { [coin: string]: string };
  favorite: boolean;
}

export interface Settings {
  minWalletCount: number;
  timeWindow: number;
  minVolume: number;
  walletPollInterval: number;
  pricePollInterval: number;
  defaultStopLoss: number;
  takeProfitTargets: string;
  includeFunding: boolean;
  telegramBotToken: string;
  telegramChannelIds: string;
  monitoredPairs: string;
  quoteCurrencies: string;
  ignoredPairs: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: Record<string, unknown>;
}

export interface WalletPerformance {
  rank: number;
  address: string;
  successRate: number;
  pnl: number;
  trades: number;
}

export interface WalletPosition {
  address: string;
  coin: string;
  direction: SignalDirection;
  positionSize: string;
  entryPrice: string;
  positionValue: string;
  timestamp: string;
}

export interface WalletPositionDetail {
  coin: string;
  side: SignalDirection;
  size: number;
  entryPx: number;
  markPx: number;
  positionValue: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number;
  margin: number;
  openedAt: string | null;
}

export interface WalletData {
  pnl: string;
  roi: string;
  positions: WalletPositionDetail[];
  accountValue: string;
  marginUsed: string;
}

export interface WalletPositionView {
  address: string;
  coin: string;
  direction: SignalDirection;
  positionSize: string;
  entryPrice: string;
  positionValue: string;
  timestamp: string;
  leverage: number;
  liquidationPx: string;
  unrealizedPnl: string;
  markPx: string;
  openedAt: string | null;
}

export interface DashboardData {
  totalPnl: number;
  totalRoi: number;
  winRate: number;
  totalClosedSignals: number;
  activeSignals: number;
  trackedWallets: number;
  performanceChartData: { month: string; winrate: number }[];
  signalOutcomes: { TP: number; SL: number; OPEN: number };
  recentSignals: {
    pair: string;
    type: SignalDirection;
    pnl: number;
    status: SignalStatus;
    contributingWallets: number;
  }[];
  topPairs: { pair: string; signals: number; winRate: number | null }[];
  standoutSignals: SignalInsight[];
  attentionSignals: SignalInsight[];
  walletClusters: { wallets: string[]; trades: number; coins: string[]; score: number }[];
}

export interface SignalInsight {
  pair: string;
  type: SignalDirection;
  roi: number;
  pnl: number;
  status: SignalStatus;
  timestamp: string;
}

export interface RunRecord {
  runId: string;
  status: 'running' | 'success' | 'error' | 'timeout';
  startedAt: string;
  updatedAt: string;
  durationMs?: number;
  reason?: string;
}
