import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreatorInfo } from '@/hooks/useCreatorInfo';
import { cn } from '@/lib/utils';

interface CreatorBadgeProps {
  userId: string | null | undefined;
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function CreatorBadge({ userId, showName = false, size = 'sm', className }: CreatorBadgeProps) {
  const { getCreatorName, getCreatorInitials, getCreatorAvatar } = useCreatorInfo();

  const name = getCreatorName(userId);
  const initials = getCreatorInitials(userId);
  const avatar = getCreatorAvatar(userId);

  const avatarSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5", className)}>
          <Avatar className={avatarSize}>
            <AvatarImage src={avatar || undefined} alt={name} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {showName && (
            <span className={cn("text-muted-foreground truncate max-w-[100px]", textSize)}>
              {name}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Created by {name}</p>
      </TooltipContent>
    </Tooltip>
  );
}
