import HomeHeader from './HomeHeader';
import { useSelector } from 'react-redux';
import { ROLE_CODES } from '../../constants';
import { useHomeLocationsContext } from '../../contexts/HomeLocationsContext';

/**
 * Single shared site header for public + panel pages.
 * Logged-in buyers always get the exact same chrome as /panel/buyer/dashboard.
 */
export default function PublicSiteHeader({ panelMode = false, hideSidebar = false }) {
  const { user } = useSelector((s) => s.auth);
  const {
    cities,
    cityId,
    setCityId,
    panelCityId,
    setPanelCityId,
    panelCityName,
    localities,
  } = useHomeLocationsContext();

  const isBuyer = user?.role?.code === ROLE_CODES.BUYER;
  const isBuilderPanel = panelMode && user?.role?.code === ROLE_CODES.BUILDER;

  // Force dashboard header props for buyers on every page
  const effectivePanelMode = isBuyer ? true : panelMode;
  const effectiveHideSidebar = isBuyer ? true : hideSidebar;
  const overlay = isBuyer || !effectivePanelMode;

  // Panel shell already pads content; public pages need a spacer under the fixed header
  const showSpacer = overlay && !(isBuyer && panelMode);

  return (
    <>
      <HomeHeader
        panelMode={effectivePanelMode}
        hideSidebar={effectiveHideSidebar}
        cities={cities}
        selectedCityId={isBuilderPanel ? panelCityId : cityId}
        selectedCityName={isBuilderPanel ? panelCityName : undefined}
        onCityChange={isBuilderPanel ? setPanelCityId : setCityId}
        showAllLocationsOption={isBuilderPanel}
        localities={localities}
        overlay={overlay}
      />
      {showSpacer && <div className="home-header-spacer" aria-hidden />}
    </>
  );
}
