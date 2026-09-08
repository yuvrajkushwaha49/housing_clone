import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cmsService } from '../../services';
import ComingSoonPage from './ComingSoonPage';

export default function PublicCmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setPage(null);
    setLoadFailed(false);
    cmsService
      .getPage(slug)
      .then((res) => setPage(res.data.data))
      .catch(() => setLoadFailed(true));
  }, [slug]);

  if (loadFailed) {
    return <ComingSoonPage />;
  }
  if (!page) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div className="public-search">
      <div className="container py-5" style={{ maxWidth: 820 }}>
        <Link to="/" className="btn btn-sm btn-outline-secondary mb-3">← Home</Link>
        <h1 className="h2 mb-3">{page.title}</h1>
        <div className="cms-body" dangerouslySetInnerHTML={{ __html: page.body }} />
        {page.pageType === 'city' && page.city && (
          <Link className="btn btn-primary mt-4" to={`/search?city=${page.city.slug}`}>
            Search in {page.city.name}
          </Link>
        )}
      </div>
    </div>
  );
}
