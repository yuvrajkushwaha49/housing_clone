import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PublicSiteHeader from '../components/public/PublicSiteHeader';
import PublicSiteFooter from '../components/public/PublicSiteFooter';
import Sidebar from './Sidebar';
import { PANELS_WITHOUT_SIDEBAR } from '../constants';

export default function PanelLayout() {
  const { user } = useSelector((s) => s.auth);
  const hideSidebar = PANELS_WITHOUT_SIDEBAR.includes(user?.role?.code);

  return (
    <div className={`panel-shell${hideSidebar ? ' panel-shell--no-sidebar' : ''}`}>
      <PublicSiteHeader panelMode hideSidebar={hideSidebar} />
      <div className="app-shell">
        {!hideSidebar && <Sidebar />}
        <div className="app-main">
          <main className="app-content">
            <Outlet />
          </main>
          {hideSidebar && <PublicSiteFooter />}
        </div>
      </div>
    </div>
  );
}
