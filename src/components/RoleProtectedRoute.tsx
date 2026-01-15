import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireOwner?: boolean;
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  requireOwner = false,
}: RoleProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, isOwner, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const loading = authLoading || roleLoading;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && role !== null) {
      // Check owner requirement
      if (requireOwner && !isOwner) {
        navigate('/');
        return;
      }

      // Check allowed roles
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        navigate('/');
        return;
      }
    }
  }, [user, role, loading, requireOwner, isOwner, allowedRoles, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check access
  if (requireOwner && !isOwner) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
