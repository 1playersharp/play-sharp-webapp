import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useProfileStore, { isProfileComplete } from '@/state/useProfileStore';

export default function ProfileGate() {
    const complete = useProfileStore((s) => isProfileComplete(s.profile));
    const location = useLocation();
    if (!complete) {
        return (
            <Navigate
                to="/profile"
                replace
                state={{ locked: true, from: location.pathname }}
            />
        );
    }
    return <Outlet />;
}