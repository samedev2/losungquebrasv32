import { useState, useEffect } from 'react';
import { Occurrence, OccurrenceTimeline } from '../types/occurrences';

export function useOccurrences(recordId?: string) {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [timelines, setTimelines] = useState<Record<string, OccurrenceTimeline[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In a real app, this would fetch from the database
  useEffect(() => {
    if (recordId) {
      loadOccurrences(recordId);
    }
  }, [recordId]);

  const loadOccurrences = async (recordId: string) => {
    setLoading(true);
    try {
      // Simulate API call - in real app, fetch from Supabase
      const storedOccurrences = localStorage.getItem(`occurrences_${recordId}`);
      const storedTimelines = localStorage.getItem(`timelines_${recordId}`);
      
      if (storedOccurrences) {
        setOccurrences(JSON.parse(storedOccurrences));
      }
      
      if (storedTimelines) {
        setTimelines(JSON.parse(storedTimelines));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ocorrências');
    } finally {
      setLoading(false);
    }
  };

  const addOccurrence = async (occurrence: Occurrence) => {
    try {
      const newOccurrences = [...occurrences, occurrence];
      setOccurrences(newOccurrences);
      
      // Save to localStorage (in real app, save to Supabase)
      localStorage.setItem(`occurrences_${occurrence.record_id}`, JSON.stringify(newOccurrences));
      
      // Create initial timeline entry
      const initialTimeline: OccurrenceTimeline = {
        id: `timeline_${occurrence.id}_1`,
        occurrence_id: occurrence.id,
        action_type: 'criada',
        description: `Ocorrência "${occurrence.title}" foi criada`,
        created_by: occurrence.created_by,
        created_at: occurrence.created_at,
        metadata: { category: occurrence.category, priority: occurrence.priority }
      };
      
      const newTimelines = {
        ...timelines,
        [occurrence.id]: [initialTimeline]
      };
      setTimelines(newTimelines);
      localStorage.setItem(`timelines_${occurrence.record_id}`, JSON.stringify(newTimelines));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar ocorrência');
      throw err;
    }
  };

  const updateOccurrence = async (occurrence: Occurrence) => {
    try {
      const updatedOccurrences = occurrences.map(occ => 
        occ.id === occurrence.id ? occurrence : occ
      );
      setOccurrences(updatedOccurrences);
      
      // Save to localStorage (in real app, save to Supabase)
      localStorage.setItem(`occurrences_${occurrence.record_id}`, JSON.stringify(updatedOccurrences));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar ocorrência');
      throw err;
    }
  };

  const addTimelineEntry = async (occurrenceId: string, entry: Omit<OccurrenceTimeline, 'id' | 'created_at'>) => {
    try {
      const newEntry: OccurrenceTimeline = {
        ...entry,
        id: `timeline_${occurrenceId}_${Date.now()}`,
        created_at: new Date().toISOString()
      };
      
      const newTimelines = {
        ...timelines,
        [occurrenceId]: [...(timelines[occurrenceId] || []), newEntry]
      };
      setTimelines(newTimelines);
      
      // Save to localStorage (in real app, save to Supabase)
      const occurrence = occurrences.find(occ => occ.id === occurrenceId);
      if (occurrence) {
        localStorage.setItem(`timelines_${occurrence.record_id}`, JSON.stringify(newTimelines));
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar entrada na timeline');
      throw err;
    }
  };

  const getOccurrencesByRecord = (recordId: string): Occurrence[] => {
    return occurrences.filter(occ => occ.record_id === recordId);
  };

  const getTimelineByOccurrence = (occurrenceId: string): OccurrenceTimeline[] => {
    return timelines[occurrenceId] || [];
  };

  return {
    occurrences,
    timelines,
    loading,
    error,
    addOccurrence,
    updateOccurrence,
    addTimelineEntry,
    getOccurrencesByRecord,
    getTimelineByOccurrence,
    loadOccurrences
  };
}