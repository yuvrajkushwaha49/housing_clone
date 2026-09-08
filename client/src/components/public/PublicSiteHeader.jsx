import HomeHeader from './HomeHeader';
import { useSelector } from 'react-redux';
import { ROLE_CODES } from '../../constants';
import { useHomeLocationsContext } from '../../contexts/HomeLocationsContext';

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

  const isBuilderPanel = panelMode && user?.role?.code === ROLE_CODES.BUILDER;

  return (
    <HomeHeader
      panelMode={panelMode}
      hideSidebar={hideSidebar}
      cities={cities}
      selectedCityId={isBuilderPanel ? panelCityId : cityId}
      selectedCityName={isBuilderPanel ? panelCityName : undefined}
      onCityChange={isBuilderPanel ? setPanelCityId : setCityId}
      showAllLocationsOption={isBuilderPanel}
      localities={localities}
    />
  );
}
