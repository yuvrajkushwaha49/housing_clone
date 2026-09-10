import HomePageContent from '../components/public/HomePageContent';
import HomeHeader from '../components/public/HomeHeader';
import PublicSiteFooter from '../components/public/PublicSiteFooter';
import { useHomeLocationsContext } from '../contexts/HomeLocationsContext';

export default function HomePage() {
  const {
    cities,
    cityId,
    setCityId,
    cityName,
    localities,
    loadingLocalities,
  } = useHomeLocationsContext();

  return (
    <div className="home-page">
      <HomePageContent
        cityId={cityId}
        setCityId={setCityId}
        cityName={cityName}
        localities={localities}
        loadingLocalities={loadingLocalities}
        header={(
          <HomeHeader
            cities={cities}
            selectedCityId={cityId}
            onCityChange={setCityId}
            localities={localities}
            overlay
          />
        )}
      />
      <PublicSiteFooter />
    </div>
  );
}
