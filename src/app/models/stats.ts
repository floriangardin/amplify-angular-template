export type Stats = Record<string, number>;

export type DefeatReason = 'dataBreach' | 'burnout' | 'budget' | 'dataQuality' | 'reputation';

export interface DefeatStats {
  reason: DefeatReason;
  stats: Stats;
}