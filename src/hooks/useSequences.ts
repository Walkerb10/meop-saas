import { useState, useEffect, useCallback } from 'react';
import { Sequence } from '@/types/sequence';

const STORAGE_KEY = 'agent-sequences';

export function useSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSequences(
          parsed.map((s: Sequence) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          }))
        );
      } catch (e) {
        console.error('Failed to parse sequences from storage:', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
  }, [sequences]);

  const addSequence = useCallback((sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const newSequence: Sequence = {
      ...sequence,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setSequences((prev) => [...prev, newSequence]);
    return newSequence;
  }, []);

  const updateSequence = useCallback((id: string, updates: Partial<Sequence>) => {
    setSequences((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, ...updates, updatedAt: new Date() }
          : s
      )
    );
  }, []);

  const deleteSequence = useCallback((id: string) => {
    setSequences((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    sequences,
    addSequence,
    updateSequence,
    deleteSequence,
  };
}
