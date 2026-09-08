import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { slugify } from '../helpers/storage.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';

function mapCountry(r) {
  return {
    id: r.uuid,
    name: r.name,
    iso2: r.iso2,
    phoneCode: r.phone_code,
    isActive: Boolean(r.is_active),
    numericId: r.id,
  };
}

export async function listCountries({ activeOnly = false } = {}) {
  const where = activeOnly
    ? 'WHERE deleted_at IS NULL AND is_active = 1'
    : 'WHERE deleted_at IS NULL';
  const [rows] = await query(
    `SELECT id, uuid, name, iso2, phone_code, is_active FROM countries ${where} ORDER BY name`
  );
  return rows.map(mapCountry);
}

export async function createCountry(payload, actorId, req) {
  const [existing] = await query(
    `SELECT id FROM countries WHERE iso2 = :iso2 AND deleted_at IS NULL LIMIT 1`,
    { iso2: payload.iso2.toUpperCase() }
  );
  if (existing.length) throw new ApiError(409, 'Country ISO already exists');

  const uuid = generateUuid();
  await query(
    `INSERT INTO countries (uuid, name, iso2, phone_code, is_active, created_by)
     VALUES (:uuid, :name, :iso2, :phoneCode, :isActive, :createdBy)`,
    {
      uuid,
      name: payload.name,
      iso2: payload.iso2.toUpperCase(),
      phoneCode: payload.phoneCode || null,
      isActive: payload.isActive === false ? 0 : 1,
      createdBy: actorId,
    }
  );

  await writeAuditLog({
    actorUserId: actorId,
    action: 'locations.country.create',
    entityType: 'country',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const countries = await listCountries();
  return countries.find((c) => c.id === uuid);
}

export async function updateCountry(uuid, payload, actorId, req) {
  const [rows] = await query(
    `SELECT id FROM countries WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Country not found');

  await query(
    `UPDATE countries SET
      name = COALESCE(:name, name),
      phone_code = COALESCE(:phoneCode, phone_code),
      is_active = COALESCE(:isActive, is_active),
      updated_by = :updatedBy
     WHERE uuid = :uuid`,
    {
      uuid,
      name: payload.name ?? null,
      phoneCode: payload.phoneCode ?? null,
      isActive: payload.isActive === undefined ? null : payload.isActive ? 1 : 0,
      updatedBy: actorId,
    }
  );

  await writeAuditLog({
    actorUserId: actorId,
    action: 'locations.country.update',
    entityType: 'country',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listCountries()).find((c) => c.id === uuid);
}

export async function listStates(countryUuid, { activeOnly = false } = {}) {
  const [countries] = await query(
    `SELECT id FROM countries WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: countryUuid }
  );
  if (!countries.length) throw new ApiError(404, 'Country not found');

  const activeSql = activeOnly ? 'AND s.is_active = 1' : '';
  const [rows] = await query(
    `SELECT s.id, s.uuid, s.name, s.code, s.is_active, c.uuid AS countryUuid
     FROM states s
     INNER JOIN countries c ON c.id = s.country_id
     WHERE s.country_id = :countryId AND s.deleted_at IS NULL ${activeSql}
     ORDER BY s.name`,
    { countryId: countries[0].id }
  );
  return rows.map((r) => ({
    id: r.uuid,
    name: r.name,
    code: r.code,
    isActive: Boolean(r.is_active),
    countryId: r.countryUuid,
    numericId: r.id,
  }));
}

export async function createState(payload, actorId, req) {
  const [countries] = await query(
    `SELECT id FROM countries WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: payload.countryId }
  );
  if (!countries.length) throw new ApiError(404, 'Country not found');

  const uuid = generateUuid();
  try {
    await query(
      `INSERT INTO states (uuid, country_id, name, code, is_active, created_by)
       VALUES (:uuid, :countryId, :name, :code, :isActive, :createdBy)`,
      {
        uuid,
        countryId: countries[0].id,
        name: payload.name,
        code: payload.code || null,
        isActive: payload.isActive === false ? 0 : 1,
        createdBy: actorId,
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'State already exists in this country');
    throw err;
  }

  await writeAuditLog({
    actorUserId: actorId,
    action: 'locations.state.create',
    entityType: 'state',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listStates(payload.countryId)).find((s) => s.id === uuid);
}

export async function listAllCities({ activeOnly = false, countryIso = 'IN' } = {}) {
  const activeSql = activeOnly ? 'AND c.is_active = 1' : '';
  const countrySql = countryIso ? 'AND co.iso2 = :countryIso' : '';
  const [rows] = await query(
    `SELECT c.uuid AS id, c.name, c.slug, c.latitude, c.longitude, c.is_active,
            s.uuid AS stateId
     FROM cities c
     INNER JOIN states s ON s.id = c.state_id AND s.deleted_at IS NULL
     INNER JOIN countries co ON co.id = s.country_id AND co.deleted_at IS NULL
     WHERE c.deleted_at IS NULL ${activeSql} ${countrySql}
     ORDER BY c.name`,
    { countryIso: countryIso || null }
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    latitude: r.latitude,
    longitude: r.longitude,
    isActive: Boolean(r.is_active),
    stateId: r.stateId,
  }));
}

export async function listCities(stateUuid, { activeOnly = false } = {}) {
  const [states] = await query(
    `SELECT id FROM states WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: stateUuid }
  );
  if (!states.length) throw new ApiError(404, 'State not found');

  const activeSql = activeOnly ? 'AND c.is_active = 1' : '';
  const [rows] = await query(
    `SELECT c.id, c.uuid, c.name, c.slug, c.latitude, c.longitude, c.is_active, s.uuid AS stateUuid
     FROM cities c
     INNER JOIN states s ON s.id = c.state_id
     WHERE c.state_id = :stateId AND c.deleted_at IS NULL ${activeSql}
     ORDER BY c.name`,
    { stateId: states[0].id }
  );
  return rows.map((r) => ({
    id: r.uuid,
    name: r.name,
    slug: r.slug,
    latitude: r.latitude,
    longitude: r.longitude,
    isActive: Boolean(r.is_active),
    stateId: r.stateUuid,
    numericId: r.id,
  }));
}

export async function createCity(payload, actorId, req) {
  const [states] = await query(
    `SELECT id FROM states WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: payload.stateId }
  );
  if (!states.length) throw new ApiError(404, 'State not found');

  const uuid = generateUuid();
  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

  try {
    await query(
      `INSERT INTO cities (uuid, state_id, name, slug, latitude, longitude, is_active, created_by)
       VALUES (:uuid, :stateId, :name, :slug, :latitude, :longitude, :isActive, :createdBy)`,
      {
        uuid,
        stateId: states[0].id,
        name: payload.name,
        slug,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        isActive: payload.isActive === false ? 0 : 1,
        createdBy: actorId,
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'City slug already exists');
    throw err;
  }

  await writeAuditLog({
    actorUserId: actorId,
    action: 'locations.city.create',
    entityType: 'city',
    entityId: uuid,
    newValues: { ...payload, slug },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listCities(payload.stateId)).find((c) => c.id === uuid);
}

export async function listLocalities(cityUuid, { activeOnly = false } = {}) {
  const [cities] = await query(
    `SELECT id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: cityUuid }
  );
  if (!cities.length) throw new ApiError(404, 'City not found');

  const activeSql = activeOnly ? 'AND l.is_active = 1' : '';
  const [rows] = await query(
    `SELECT l.id, l.uuid, l.name, l.slug, l.pincode, l.latitude, l.longitude, l.is_active, c.uuid AS cityUuid
     FROM localities l
     INNER JOIN cities c ON c.id = l.city_id
     WHERE l.city_id = :cityId AND l.deleted_at IS NULL ${activeSql}
     ORDER BY l.name`,
    { cityId: cities[0].id }
  );
  return rows.map((r) => ({
    id: r.uuid,
    name: r.name,
    slug: r.slug,
    pincode: r.pincode,
    latitude: r.latitude,
    longitude: r.longitude,
    isActive: Boolean(r.is_active),
    cityId: r.cityUuid,
    numericId: r.id,
  }));
}

export async function createLocality(payload, actorId, req) {
  const [cities] = await query(
    `SELECT id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: payload.cityId }
  );
  if (!cities.length) throw new ApiError(404, 'City not found');

  const uuid = generateUuid();
  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

  try {
    await query(
      `INSERT INTO localities (uuid, city_id, name, slug, pincode, latitude, longitude, is_active, created_by)
       VALUES (:uuid, :cityId, :name, :slug, :pincode, :latitude, :longitude, :isActive, :createdBy)`,
      {
        uuid,
        cityId: cities[0].id,
        name: payload.name,
        slug,
        pincode: payload.pincode || null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        isActive: payload.isActive === false ? 0 : 1,
        createdBy: actorId,
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Locality already exists in this city');
    throw err;
  }

  await writeAuditLog({
    actorUserId: actorId,
    action: 'locations.locality.create',
    entityType: 'locality',
    entityId: uuid,
    newValues: { ...payload, slug },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listLocalities(payload.cityId)).find((l) => l.id === uuid);
}

export async function softDeleteByUuid(table, uuid, actorId) {
  const allowed = new Set(['countries', 'states', 'cities', 'localities']);
  if (!allowed.has(table)) throw new ApiError(400, 'Invalid table');

  const [rows] = await query(
    `SELECT id FROM ${table} WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Record not found');

  await query(
    `UPDATE ${table} SET deleted_at = NOW(), updated_by = :actorId WHERE id = :id`,
    { id: rows[0].id, actorId }
  );
  return { message: 'Deleted' };
}

/** Resolve UUID → numeric id helpers used by property module */
export async function resolveLocationIds({ countryId, stateId, cityId, localityId }) {
  const [countries] = await query(
    `SELECT id FROM countries WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: countryId }
  );
  if (!countries.length) throw new ApiError(400, 'Invalid country');

  const [states] = await query(
    `SELECT id, country_id FROM states WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: stateId }
  );
  if (!states.length || states[0].country_id !== countries[0].id) {
    throw new ApiError(400, 'Invalid state for country');
  }

  const [cities] = await query(
    `SELECT id, state_id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: cityId }
  );
  if (!cities.length || cities[0].state_id !== states[0].id) {
    throw new ApiError(400, 'Invalid city for state');
  }

  let localityNumeric = null;
  if (localityId) {
    const [locs] = await query(
      `SELECT id, city_id FROM localities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid: localityId }
    );
    if (!locs.length || locs[0].city_id !== cities[0].id) {
      throw new ApiError(400, 'Invalid locality for city');
    }
    localityNumeric = locs[0].id;
  }

  return {
    countryId: countries[0].id,
    stateId: states[0].id,
    cityId: cities[0].id,
    localityId: localityNumeric,
  };
}
