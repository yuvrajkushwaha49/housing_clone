import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { APP_NAME, NAV_BY_ROLE } from '../constants';
import { setSidebarMobileOpen } from '../redux/slices/uiSlice';
import { leadService, settingsService } from '../services';
import { phoneToTelHref } from '../utils/contactLinks';
import { BrandIcon, BrandLogo } from '../components/BrandAssets';

const DEFAULT_SUPPORT_PHONE = '+91 89896 06060';

export default function Sidebar() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { sidebarCollapsed, sidebarMobileOpen } = useSelector((s) => s.ui);
  const items = NAV_BY_ROLE[user?.role?.code] || [];
  const [approvalCount, setApprovalCount] = useState(0);
  const [profileReviewCount, setProfileReviewCount] = useState(0);
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);

  const roleCode = user?.role?.code;

  useEffect(() => {
    settingsService
      .public()
      .then((res) => {
        const phone = res.data.data?.support_phone?.trim();
        if (phone) setSupportPhone(phone);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(roleCode)) return;
    leadService
      .approvalStats()
      .then((res) => {
        const stats = res.data.data;
        setApprovalCount((stats.pendingProperties || 0) + (stats.pendingProjects || 0));
        setProfileReviewCount(stats.pendingBuilderProfileChanges || 0);
      })
      .catch(() => {
        setApprovalCount(0);
        setProfileReviewCount(0);
      });
  }, [roleCode]);

  return (
    <>
      <div
        className={`sidebar-backdrop ${sidebarMobileOpen ? 'show' : ''}`}
        onClick={() => dispatch(setSidebarMobileOpen(false))}
        aria-hidden={!sidebarMobileOpen}
      />
      <aside
        className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarMobileOpen ? 'open' : ''}`}
      >
        {/* <div className="sidebar-brand">
          {sidebarCollapsed ? (
            <BrandIcon className="brand-icon--sidebar" alt={APP_NAME} />
          ) : (
            <BrandLogo className="brand-logo--sidebar" />
          )}
        </div> */}
        <nav className="sidebar-nav">
          {items.map((item) => {
            const isApprovals = item.path.endsWith('/approvals');
            const isProfileReviews = item.path.endsWith('/builder-profiles');
            const badge = isApprovals && approvalCount > 0
              ? approvalCount
              : isProfileReviews && profileReviewCount > 0
                ? profileReviewCount
                : null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link position-relative ${isActive ? 'active' : ''}`}
                onClick={() => dispatch(setSidebarMobileOpen(false))}
              >
                <i className={`bi ${item.icon}`} />
                {!sidebarCollapsed && (
                  <span className="d-flex align-items-center justify-content-between flex-grow-1">
                    <span>{item.label}</span>
                    {badge != null && (
                      <span className="badge rounded-pill text-bg-danger ms-2">{badge}</span>
                    )}
                  </span>
                )}
                {sidebarCollapsed && badge != null && (
                  <span className="position-absolute top-0 end-0 translate-middle badge rounded-pill text-bg-danger" style={{ fontSize: 10 }}>
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          {!sidebarCollapsed && (
            <>
              <a href={phoneToTelHref(supportPhone)} className="sidebar-support-phone">
                <i className="bi bi-telephone-fill" aria-hidden />
                {supportPhone}
              </a>
              <small className="text-secondary d-block mt-2">
                {user?.role?.name}
              </small>
            </>
          )}
          {sidebarCollapsed && (
            <a
              href={phoneToTelHref(supportPhone)}
              className="sidebar-support-phone is-icon-only"
              title={supportPhone}
              aria-label={`Call support ${supportPhone}`}
            >
              <i className="bi bi-telephone-fill" aria-hidden />
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
