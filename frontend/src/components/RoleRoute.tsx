import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function RoleRoute({ allowedRoles }: { allowedRoles: ('ADMIN' | 'CUSTOMER')[] }) {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (!user) return <Navigate to="/auth" replace />;

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'CUSTOMER' ? '/customer/dashboard' : '/'} replace />;
    }

    return <Outlet />;
}
