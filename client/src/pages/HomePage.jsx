import HomeHeader from '../components/public/HomeHeader';
import HomePageContent from '../components/public/HomePageContent';
import PublicSiteFooter from '../components/public/PublicSiteFooter';
import { useHomeLocationsContext } from '../contexts/HomeLocationsContext';

export default function HomePage() {
  const {
    cities,
    cityId,
    setCityId,
    cityName,
    localities,
    loadingCities,
    loadingLocalities,
  } = useHomeLocationsContext();

  return (
    <div className="home-page">
      <HomeHeader
        cities={cities}
        selectedCityId={cityId}
        onCityChange={setCityId}
        localities={localities}
        loading={loadingCities}
      />
      <HomePageContent
        cityId={cityId}
        setCityId={setCityId}
        cityName={cityName}
        localities={localities}
        loadingLocalities={loadingLocalities}
      />
      <PublicSiteFooter />
    </div>
  );
}
