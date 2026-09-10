import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { deleteStoredFile, slugify, storeUpload } from '../helpers/storage.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';

async function uniqueSlug(table, base, excludeId = null) {
  let slug = slugify(base) || 'item';
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const [rows] = await query(
      `SELECT id FROM ${table} WHERE slug = :slug AND deleted_at IS NULL
       ${excludeId ? 'AND id <> :excludeId' : ''} LIMIT 1`,
      { slug: candidate, excludeId }
    );
    if (!rows.length) return candidate;
    n += 1;
  }
}

function mapPage(r) {
  return {
    id: r.uuid,
    slug: r.slug,
    title: r.title,
    body: r.body,
    pageType: r.page_type,
    status: r.status,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    metaKeywords: r.meta_keywords,
    publishedAt: r.published_at,
    city: r.city_uuid ? { id: r.city_uuid, name: r.city_name, slug: r.city_slug } : null,
  };
}

function mapArticle(r) {
  return {
    id: r.uuid,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    body: r.body,
    coverImage: r.cover_image ? `/uploads/${r.cover_image}` : null,
    status: r.status,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    publishedAt: r.published_at,
    author: r.author_name
      ? { id: r.author_uuid, name: r.author_name }
      : null,
  };
}

function mapBanner(r) {
  return {
    id: r.uuid,
    title: r.title,
    imageUrl: r.image_path ? `/uploads/${r.image_path}` : null,
    linkUrl: r.link_url,
    position: r.position,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    isActive: Boolean(r.is_active),
    sortOrder: r.sort_order,
  };
}

export async function getPageBySlug(slug, { includeDraft = false } = {}) {
  const [rows] = await query(
    `SELECT p.uuid, p.slug, p.title, p.body, p.page_type, p.status, p.meta_title, p.meta_description,
            p.meta_keywords, p.published_at, c.uuid AS city_uuid, c.name AS city_name, c.slug AS city_slug
     FROM cms_pages p
     LEFT JOIN cities c ON c.id = p.city_id
     WHERE p.slug = :slug AND p.deleted_at IS NULL
       ${includeDraft ? '' : "AND p.status = 'published'"}
     LIMIT 1`,
    { slug }
  );
  if (!rows.length) throw new ApiError(404, 'Page not found');
  return mapPage(rows[0]);
}

export async function listPages({ pageType, admin = false } = {}) {
  const where = ['p.deleted_at IS NULL'];
  const params = {};
  if (!admin) where.push(`p.status = 'published'`);
  if (pageType) {
    where.push('p.page_type = :pageType');
    params.pageType = pageType;
  }
  const [rows] = await query(
    `SELECT p.uuid, p.slug, p.title, p.body, p.page_type, p.status, p.meta_title, p.meta_description,
            p.meta_keywords, p.published_at, c.uuid AS city_uuid, c.name AS city_name, c.slug AS city_slug
     FROM cms_pages p
     LEFT JOIN cities c ON c.id = p.city_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.updated_at DESC`,
    params
  );
  return rows.map(mapPage);
}

export async function upsertPage(payload, user, req, uuid = null) {
  let cityId = null;
  if (payload.cityId) {
    const [cities] = await query(
      `SELECT id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.cityId }
    );
    if (!cities.length) throw new ApiError(400, 'Invalid city');
    cityId = cities[0].id;
  }

  if (uuid) {
    const [existing] = await query(
      `SELECT id FROM cms_pages WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid }
    );
    if (!existing.length) throw new ApiError(404, 'Page not found');
    const slug = payload.slug
      ? await uniqueSlug('cms_pages', payload.slug, existing[0].id)
      : undefined;
    await query(
      `UPDATE cms_pages SET
        title = :title,
        body = :body,
        page_type = COALESCE(:pageType, page_type),
        city_id = :cityId,
        status = COALESCE(:status, status),
        meta_title = :metaTitle,
        meta_description = :metaDescription,
        meta_keywords = :metaKeywords,
        slug = COALESCE(:slug, slug),
        published_at = CASE WHEN :status = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
        updated_by = :actorId
       WHERE id = :id`,
      {
        id: existing[0].id,
        title: payload.title,
        body: payload.body,
        pageType: payload.pageType || null,
        cityId,
        status: payload.status || null,
        metaTitle: payload.metaTitle || payload.title,
        metaDescription: payload.metaDescription || null,
        metaKeywords: payload.metaKeywords || null,
        slug: slug || null,
        actorId: user.id,
      }
    );
    return getPageBySlug(slug || payload.slug || (await getSlugByUuid('cms_pages', uuid)), {
      includeDraft: true,
    });
  }

  const newUuid = generateUuid();
  const slug = await uniqueSlug('cms_pages', payload.slug || payload.title);
  const status = payload.status || 'draft';
  await query(
    `INSERT INTO cms_pages
      (uuid, slug, title, body, page_type, city_id, status, meta_title, meta_description, meta_keywords, published_at, created_by)
     VALUES (:uuid, :slug, :title, :body, :pageType, :cityId, :status, :metaTitle, :metaDescription, :metaKeywords,
             ${status === 'published' ? 'NOW()' : 'NULL'}, :createdBy)`,
    {
      uuid: newUuid,
      slug,
      title: payload.title,
      body: payload.body,
      pageType: payload.pageType || 'static',
      cityId,
      status,
      metaTitle: payload.metaTitle || payload.title,
      metaDescription: payload.metaDescription || null,
      metaKeywords: payload.metaKeywords || null,
      createdBy: user.id,
    }
  );
  await writeAuditLog({
    actorUserId: user.id,
    action: 'cms.page.create',
    entityType: 'cms_page',
    entityId: newUuid,
    newValues: { slug, title: payload.title },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return getPageBySlug(slug, { includeDraft: true });
}

async function getSlugByUuid(table, uuid) {
  const [rows] = await query(`SELECT slug FROM ${table} WHERE uuid = :uuid LIMIT 1`, { uuid });
  return rows[0]?.slug;
}

export async function listBlogs({ admin = false, limit = 20 } = {}) {
  const where = ['b.deleted_at IS NULL'];
  if (!admin) where.push(`b.status = 'published'`);
  const [rows] = await query(
    `SELECT b.uuid, b.slug, b.title, b.excerpt, b.body, b.cover_image, b.status, b.meta_title,
            b.meta_description, b.published_at,
            u.uuid AS author_uuid, CONCAT(u.first_name, IFNULL(CONCAT(' ', u.last_name), '')) AS author_name
     FROM blogs b
     LEFT JOIN users u ON u.id = b.author_id
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(b.published_at, b.created_at) DESC
     LIMIT ${Number(limit)}`
  );
  return rows.map(mapArticle);
}

export async function getBlogBySlug(slug, { includeDraft = false } = {}) {
  const [rows] = await query(
    `SELECT b.uuid, b.slug, b.title, b.excerpt, b.body, b.cover_image, b.status, b.meta_title,
            b.meta_description, b.published_at,
            u.uuid AS author_uuid, CONCAT(u.first_name, IFNULL(CONCAT(' ', u.last_name), '')) AS author_name
     FROM blogs b
     LEFT JOIN users u ON u.id = b.author_id
     WHERE b.slug = :slug AND b.deleted_at IS NULL
       ${includeDraft ? '' : "AND b.status = 'published'"}
     LIMIT 1`,
    { slug }
  );
  if (!rows.length) throw new ApiError(404, 'Blog not found');
  return mapArticle(rows[0]);
}

export async function upsertBlog(payload, user, req, uuid = null, file = null) {
  if (uuid) {
    const [existing] = await query(
      `SELECT id, cover_image FROM blogs WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid }
    );
    if (!existing.length) throw new ApiError(404, 'Blog not found');
    let coverImage = existing[0].cover_image;
    if (file) {
      const stored = await storeUpload(file, { folder: 'cms', mediaType: 'image' });
      if (coverImage) await deleteStoredFile(coverImage);
      coverImage = stored.filePath;
    } else if (payload.removeCover === true || payload.removeCover === 'true' || payload.removeCover === '1') {
      if (coverImage) await deleteStoredFile(coverImage);
      coverImage = null;
    }
    let slug = null;
    if (payload.slug) {
      slug = await uniqueSlug('blogs', payload.slug, existing[0].id);
    }
    await query(
      `UPDATE blogs SET
        title = :title, excerpt = :excerpt, body = :body, cover_image = :coverImage,
        ${slug ? 'slug = :slug,' : ''}
        status = COALESCE(:status, status),
        meta_title = :metaTitle, meta_description = :metaDescription,
        published_at = CASE WHEN :status = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = :id`,
      {
        id: existing[0].id,
        title: payload.title,
        excerpt: payload.excerpt || null,
        body: payload.body,
        coverImage,
        slug,
        status: payload.status || null,
        metaTitle: payload.metaTitle || payload.title,
        metaDescription: payload.metaDescription || null,
      }
    );
    const [slugRow] = await query(`SELECT slug FROM blogs WHERE id = :id`, { id: existing[0].id });
    return getBlogBySlug(slugRow[0].slug, { includeDraft: true });
  }

  const newUuid = generateUuid();
  const slug = await uniqueSlug('blogs', payload.slug || payload.title);
  const status = payload.status || 'draft';
  let coverImage = null;
  if (file) {
    const stored = await storeUpload(file, { folder: 'cms', mediaType: 'image' });
    coverImage = stored.filePath;
  }
  await query(
    `INSERT INTO blogs
      (uuid, slug, title, excerpt, body, cover_image, author_id, status, meta_title, meta_description, published_at)
     VALUES (:uuid, :slug, :title, :excerpt, :body, :coverImage, :authorId, :status, :metaTitle, :metaDescription,
             ${status === 'published' ? 'NOW()' : 'NULL'})`,
    {
      uuid: newUuid,
      slug,
      title: payload.title,
      excerpt: payload.excerpt || null,
      body: payload.body,
      coverImage,
      authorId: user.id,
      status,
      metaTitle: payload.metaTitle || payload.title,
      metaDescription: payload.metaDescription || null,
    }
  );
  await writeAuditLog({
    actorUserId: user.id,
    action: 'cms.blog.create',
    entityType: 'blog',
    entityId: newUuid,
    newValues: { slug },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return getBlogBySlug(slug, { includeDraft: true });
}

export async function deleteBlog(uuid, user, req) {
  const [rows] = await query(
    `SELECT id, cover_image FROM blogs WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Blog not found');
  await query(`UPDATE blogs SET deleted_at = NOW() WHERE id = :id`, { id: rows[0].id });
  if (rows[0].cover_image) await deleteStoredFile(rows[0].cover_image);
  await writeAuditLog({
    actorUserId: user.id,
    action: 'cms.blog.delete',
    entityType: 'blog',
    entityId: uuid,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export async function listNews({ admin = false, limit = 20 } = {}) {
  const where = ['n.deleted_at IS NULL'];
  if (!admin) where.push(`n.status = 'published'`);
  const [rows] = await query(
    `SELECT n.uuid, n.slug, n.title, n.excerpt, n.body, n.cover_image, n.status, n.meta_title,
            n.meta_description, n.published_at,
            u.uuid AS author_uuid, CONCAT(u.first_name, IFNULL(CONCAT(' ', u.last_name), '')) AS author_name
     FROM news n
     LEFT JOIN users u ON u.id = n.author_id
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(n.published_at, n.created_at) DESC
     LIMIT ${Number(limit)}`
  );
  return rows.map(mapArticle);
}

export async function getNewsBySlug(slug, { includeDraft = false } = {}) {
  const [rows] = await query(
    `SELECT n.uuid, n.slug, n.title, n.excerpt, n.body, n.cover_image, n.status, n.meta_title,
            n.meta_description, n.published_at,
            u.uuid AS author_uuid, CONCAT(u.first_name, IFNULL(CONCAT(' ', u.last_name), '')) AS author_name
     FROM news n
     LEFT JOIN users u ON u.id = n.author_id
     WHERE n.slug = :slug AND n.deleted_at IS NULL
       ${includeDraft ? '' : "AND n.status = 'published'"}
     LIMIT 1`,
    { slug }
  );
  if (!rows.length) throw new ApiError(404, 'News not found');
  return mapArticle(rows[0]);
}

export async function upsertNews(payload, user, req, uuid = null, file = null) {
  if (uuid) {
    const [existing] = await query(
      `SELECT id, slug, cover_image FROM news WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid }
    );
    if (!existing.length) throw new ApiError(404, 'News not found');
    let coverImage = existing[0].cover_image;
    if (file) {
      const stored = await storeUpload(file, { folder: 'cms', mediaType: 'image' });
      if (coverImage) await deleteStoredFile(coverImage);
      coverImage = stored.filePath;
    } else if (payload.removeCover === true || payload.removeCover === 'true' || payload.removeCover === '1') {
      if (coverImage) await deleteStoredFile(coverImage);
      coverImage = null;
    }
    let slug = existing[0].slug;
    if (payload.slug) {
      slug = await uniqueSlug('news', payload.slug, existing[0].id);
    }
    await query(
      `UPDATE news SET
        title = :title, excerpt = :excerpt, body = :body, cover_image = :coverImage,
        slug = :slug,
        status = COALESCE(:status, status),
        meta_title = :metaTitle, meta_description = :metaDescription,
        published_at = CASE WHEN :status = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = :id`,
      {
        id: existing[0].id,
        title: payload.title,
        excerpt: payload.excerpt || null,
        body: payload.body,
        coverImage,
        slug,
        status: payload.status || null,
        metaTitle: payload.metaTitle || payload.title,
        metaDescription: payload.metaDescription || null,
      }
    );
    return getNewsBySlug(slug, { includeDraft: true });
  }

  const newUuid = generateUuid();
  const slug = await uniqueSlug('news', payload.slug || payload.title);
  const status = payload.status || 'draft';
  let coverImage = null;
  if (file) {
    const stored = await storeUpload(file, { folder: 'cms', mediaType: 'image' });
    coverImage = stored.filePath;
  }
  await query(
    `INSERT INTO news
      (uuid, slug, title, excerpt, body, cover_image, author_id, status, meta_title, meta_description, published_at)
     VALUES (:uuid, :slug, :title, :excerpt, :body, :coverImage, :authorId, :status, :metaTitle, :metaDescription,
             ${status === 'published' ? 'NOW()' : 'NULL'})`,
    {
      uuid: newUuid,
      slug,
      title: payload.title,
      excerpt: payload.excerpt || null,
      body: payload.body,
      coverImage,
      authorId: user.id,
      status,
      metaTitle: payload.metaTitle || payload.title,
      metaDescription: payload.metaDescription || null,
    }
  );
  return getNewsBySlug(slug, { includeDraft: true });
}

export async function deleteNews(uuid, user, req) {
  const [rows] = await query(
    `SELECT id, cover_image FROM news WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'News not found');
  await query(`UPDATE news SET deleted_at = NOW() WHERE id = :id`, { id: rows[0].id });
  if (rows[0].cover_image) await deleteStoredFile(rows[0].cover_image);
  await writeAuditLog({
    actorUserId: user.id,
    action: 'cms.news.delete',
    entityType: 'news',
    entityId: uuid,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export async function listBanners({ position, admin = false } = {}) {
  const where = ['deleted_at IS NULL'];
  const params = {};
  if (!admin) {
    where.push('is_active = 1');
    where.push('(starts_at IS NULL OR starts_at <= NOW())');
    where.push('(ends_at IS NULL OR ends_at >= NOW())');
  }
  if (position) {
    where.push('position = :position');
    params.position = position;
  }
  const [rows] = await query(
    `SELECT uuid, title, image_path, link_url, position, starts_at, ends_at, is_active, sort_order
     FROM banners WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC, id DESC`,
    params
  );
  return rows.map(mapBanner);
}

export async function upsertBanner(payload, user, req, uuid = null) {
  if (uuid) {
    const [existing] = await query(
      `SELECT id FROM banners WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid }
    );
    if (!existing.length) throw new ApiError(404, 'Banner not found');
    await query(
      `UPDATE banners SET
        title = :title, link_url = :linkUrl, position = :position,
        is_active = :isActive, sort_order = :sortOrder
       WHERE id = :id`,
      {
        id: existing[0].id,
        title: payload.title,
        linkUrl: payload.linkUrl || null,
        position: payload.position || 'home_top',
        isActive: payload.isActive === false ? 0 : 1,
        sortOrder: Number(payload.sortOrder || 0),
      }
    );
  } else {
    const newUuid = generateUuid();
    await query(
      `INSERT INTO banners (uuid, title, link_url, position, is_active, sort_order)
       VALUES (:uuid, :title, :linkUrl, :position, :isActive, :sortOrder)`,
      {
        uuid: newUuid,
        title: payload.title,
        linkUrl: payload.linkUrl || null,
        position: payload.position || 'home_top',
        isActive: payload.isActive === false ? 0 : 1,
        sortOrder: Number(payload.sortOrder || 0),
      }
    );
    uuid = newUuid;
  }
  const banners = await listBanners({ admin: true });
  return banners.find((b) => b.id === uuid);
}
