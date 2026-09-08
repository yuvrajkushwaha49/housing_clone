import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicSiteHeader from '../../components/public/PublicSiteHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import { cmsService, mediaUrl } from '../../services';
import { useToast } from '../../hooks/useToast';

function formatBlogDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function BlogCard({ post, featured = false }) {
  const cover = post.coverImage ? mediaUrl(post.coverImage) : null;

  return (
    <article className={`public-blog-card ${featured ? 'public-blog-card--featured' : ''}`}>
      <Link to={`/blog/${post.slug}`} className="public-blog-card-link text-decoration-none">
        <div className="public-blog-card-image">
          {cover ? (
            <img src={cover} alt="" loading="lazy" />
          ) : (
            <div className="public-blog-card-placeholder" aria-hidden>
              <i className="bi bi-journal-richtext" />
            </div>
          )}
        </div>
        <div className="public-blog-card-body">
          <span className="public-blog-card-tag">Guide</span>
          <h2 className="public-blog-card-title">{post.title}</h2>
          {post.excerpt && (
            <p className="public-blog-card-excerpt">{post.excerpt}</p>
          )}
          <div className="public-blog-card-meta">
            <span>{post.author?.name || 'Workians Team'}</span>
            {post.publishedAt && (
              <>
                <span className="public-blog-card-dot">·</span>
                <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
              </>
            )}
          </div>
          <span className="public-blog-card-cta">
            Read article <i className="bi bi-arrow-right" aria-hidden />
          </span>
        </div>
      </Link>
    </article>
  );
}

function BlogGridSkeleton({ count = 6 }) {
  return (
    <div className="public-blog-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="public-blog-card public-blog-card--skeleton">
          <div className="public-blog-card-image skeleton-block" />
          <div className="public-blog-card-body">
            <div className="skeleton-line skeleton-line--short" />
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BlogListPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    cmsService
      .listBlogs()
      .then((res) => setItems(res.data.data || []))
      .catch((err) => {
        toast.apiError(err, 'Failed to load blog posts');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((post) => {
      const haystack = [post.title, post.excerpt, post.author?.name].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const featuredPost = !query.trim() && filteredItems.length > 0 ? filteredItems[0] : null;
  const gridPosts = featuredPost ? filteredItems.slice(1) : filteredItems;

  return (
    <div className="public-blog-page">
      <PublicSiteHeader active="/blog" />

      <section className="property-search-hero">
        <div className="container">
          <div className="property-search-hero-head">
            <div>
              <h1>News &amp; Guides</h1>
              <p>Tips for buyers, sellers, and investors — property insights from the Workians team.</p>
            </div>
            <Link to="/" className="btn btn-sm btn-outline-light">
              <i className="bi bi-house" aria-hidden /> Home
            </Link>
          </div>

          <form
            className="property-search-filters"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="property-search-filters-main">
              <div className="property-search-field property-search-field--grow">
                <i className="bi bi-search" aria-hidden />
                <input
                  type="search"
                  placeholder="Search articles by title or topic"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search blog posts"
                />
              </div>
              {query && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setQuery('')}
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <div className="container public-blog-body">
        <div className="public-blog-results-head">
          <div>
            <h2 className="h5 mb-1">
              {loading
                ? 'Loading articles…'
                : `${filteredItems.length} article${filteredItems.length === 1 ? '' : 's'}`}
            </h2>
            <p className="text-secondary small mb-0">
              Expert advice on buying, renting, and investing in real estate.
            </p>
          </div>
          <Link to="/search?purpose=sale" className="btn btn-sm btn-outline-primary">
            Browse properties
          </Link>
        </div>

        {loading ? (
          <BlogGridSkeleton />
        ) : loadFailed ? (
          <div className="public-blog-empty panel-card text-center py-5">
            <i className="bi bi-journal-x display-4 text-secondary mb-3 d-block" />
            <h3 className="h5">Could not load articles</h3>
            <p className="text-secondary mb-0">Please refresh the page and try again.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="public-blog-empty panel-card text-center py-5">
            <i className="bi bi-journal-text display-4 text-secondary mb-3 d-block" />
            <h3 className="h5">{query ? 'No articles match your search' : 'No articles yet'}</h3>
            <p className="text-secondary mb-3">
              {query ? 'Try a different keyword or clear the search.' : 'Check back soon for new guides and updates.'}
            </p>
            {query && (
              <button type="button" className="btn btn-primary" onClick={() => setQuery('')}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {featuredPost && <BlogCard post={featuredPost} featured />}
            {gridPosts.length > 0 && (
              <div className="public-blog-grid">
                {gridPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <PublicSiteFooter />
    </div>
  );
}

export function BlogDetailPage() {
  const toast = useToast();
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    cmsService
      .getBlog(slug)
      .then((res) => setItem(res.data.data))
      .catch((err) => {
        toast.apiError(err, 'Not found');
        setLoadFailed(true);
      });
  }, [slug, toast]);

  if (loadFailed) {
    return (
      <div className="public-blog-page">
        <PublicSiteHeader active="/blog" />
        <div className="container py-5">
          <div className="public-blog-empty panel-card text-center py-5">
            <i className="bi bi-journal-x display-4 text-secondary mb-3 d-block" />
            <h1 className="h4">Article not found</h1>
            <p className="text-secondary mb-4">This post may have been removed or is no longer available.</p>
            <Link to="/blog" className="btn btn-primary">Back to blog</Link>
          </div>
        </div>
        <PublicSiteFooter />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="public-blog-page">
        <PublicSiteHeader active="/blog" />
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
        <PublicSiteFooter />
      </div>
    );
  }

  const cover = item.coverImage ? mediaUrl(item.coverImage) : null;

  return (
    <div className="public-blog-page">
      <PublicSiteHeader active="/blog" />

      <div className="public-blog-detail-hero-band">
        <div className="container py-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb public-blog-breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/blog">Blog</Link></li>
              <li className="breadcrumb-item active" aria-current="page">{item.title}</li>
            </ol>
          </nav>
        </div>
      </div>

      <article className="container public-blog-article">
        <header className="public-blog-article-header">
          <span className="public-blog-card-tag">Guide</span>
          <h1>{item.title}</h1>
          <div className="public-blog-article-meta">
            <span>{item.author?.name || 'Workians Team'}</span>
            {item.publishedAt && (
              <>
                <span className="public-blog-card-dot">·</span>
                <time dateTime={item.publishedAt}>{formatBlogDate(item.publishedAt)}</time>
              </>
            )}
          </div>
        </header>

        {cover && (
          <div className="public-blog-article-cover">
            <img src={cover} alt="" />
          </div>
        )}

        {item.excerpt && (
          <p className="public-blog-article-lead">{item.excerpt}</p>
        )}

        <div className="cms-body public-blog-article-body" dangerouslySetInnerHTML={{ __html: item.body }} />

        <div className="public-blog-article-footer">
          <Link to="/blog" className="btn btn-outline-primary">
            <i className="bi bi-arrow-left me-1" aria-hidden />
            All articles
          </Link>
          <Link to="/search?purpose=sale" className="btn btn-primary">
            Browse properties
          </Link>
        </div>
      </article>

      <PublicSiteFooter />
    </div>
  );
}

export function NewsListPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    cmsService.listNews().then((res) => setItems(res.data.data));
  }, []);

  return (
    <div className="public-search">
      <div className="container py-5">
        <Link to="/" className="btn btn-sm btn-outline-secondary mb-3">← Home</Link>
        <h1 className="h2 mb-4">News</h1>
        {items.map((n) => (
          <div key={n.id} className="panel-card mb-3">
            <h2 className="h5 mb-1"><Link to={`/news/${n.slug}`}>{n.title}</Link></h2>
            <p className="mb-0 text-secondary">{n.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    cmsService.getNews(slug).then((res) => setItem(res.data.data));
  }, [slug]);

  if (!item) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

  return (
    <div className="public-search">
      <div className="container py-5" style={{ maxWidth: 820 }}>
        <Link to="/news" className="btn btn-sm btn-outline-secondary mb-3">← News</Link>
        <h1 className="h2 mb-3">{item.title}</h1>
        <div className="cms-body" dangerouslySetInnerHTML={{ __html: item.body }} />
      </div>
    </div>
  );
}
