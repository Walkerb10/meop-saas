import { useMemo } from 'react';
import { useTeamMembers } from './useTeamMembers';

export function useCreatorInfo() {
  const { members } = useTeamMembers();

  const getCreatorName = useMemo(() => {
    return (userId: string | null | undefined): string => {
      if (!userId) return 'Unknown';
      const member = members.find(m => m.user_id === userId);
      return member?.display_name || member?.email?.split('@')[0] || 'Unknown';
    };
  }, [members]);

  const getCreatorInitials = useMemo(() => {
    return (userId: string | null | undefined): string => {
      const name = getCreatorName(userId);
      if (name === 'Unknown') return '?';
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };
  }, [getCreatorName]);

  const getCreatorAvatar = useMemo(() => {
    return (userId: string | null | undefined): string | null => {
      if (!userId) return null;
      const member = members.find(m => m.user_id === userId);
      return member?.avatar_url || null;
    };
  }, [members]);

  return {
    getCreatorName,
    getCreatorInitials,
    getCreatorAvatar,
    members,
  };
}
