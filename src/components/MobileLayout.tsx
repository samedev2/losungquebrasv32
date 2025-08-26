import React from 'react';
import { MobileRecordCard } from './MobileRecordCard';
import { LogisticsRecord } from '../types/logistics';

interface MobileLayoutProps {
  records: LogisticsRecord[];
  onUpdateStatus: (id: string, status: string, comment?: string) => void;
  onUpdateRecord: (id: string, updates: Partial<LogisticsRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onOpenTracking: (record: LogisticsRecord) => void;
  onOpenOccurrenceManager: (record: LogisticsRecord) => void;
  onNewRecord: () => void;
  highlightedRecordId?: string;
  showResolved: boolean;
  onToggleResolved: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  records,
  onUpdateStatus,
  onUpdateRecord,
  onDeleteRecord,
  onOpenTracking,
  onOpenOccurrenceManager,
  onNewRecord,
  highlightedRecordId,
  showResolved,
  onToggleResolved
}) => {
  return (
    <div className="flex flex-col space-y-4 p-4">
      {records.map((record) => (
        <MobileRecordCard
          key={record.id}
          record={record}
          onUpdateStatus={onUpdateStatus}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onOpenTracking={onOpenTracking}
          onOpenOccurrenceManager={onOpenOccurrenceManager}
          isHighlighted={record.id === highlightedRecordId}
        />
      ))}
    </div>
  );
};