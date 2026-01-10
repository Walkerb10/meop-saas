import { useState, useEffect, useCallback } from 'react';

const TIMEZONE_STORAGE_KEY = 'app_timezone';

export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>(() => {
    return localStorage.getItem(TIMEZONE_STORAGE_KEY) || 'America/New_York';
  });

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('timezone-changed', { detail: tz }));
  }, []);

  // Listen for timezone changes from other components
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setTimezoneState(e.detail);
    };
    window.addEventListener('timezone-changed', handler as EventListener);
    return () => window.removeEventListener('timezone-changed', handler as EventListener);
  }, []);

  // Format time from 24h to 12h with AM/PM
  const formatTime = useCallback((time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, []);

  // Format a date to the selected timezone
  const formatDateTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric',
    });
  }, [timezone]);

  // Get timezone abbreviation
  const getTimezoneAbbr = useCallback((): string => {
    const date = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find(p => p.type === 'timeZoneName')?.value || '';
  }, [timezone]);

  return {
    timezone,
    setTimezone,
    formatTime,
    formatDateTime,
    getTimezoneAbbr,
    timezones: TIMEZONES,
  };
}
