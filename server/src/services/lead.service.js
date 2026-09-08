import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeActivityLog, writeAuditLog } from '../helpers/audit.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';
import * as userService from './user.service.js';

async function resolveActorProfile(user) {
  if (!user?.id) return null;
  const profile = await userService.findUserById(user.id);
  return profile;
}

async function getApprovedProperty(propertyUuid) {
  const [rows] = await query(
    `SELECT p.id, p.uuid, p.title, p.slug, p.status, p.listed_by_user_id AS listedByUserId,
            u.email AS listerEmail, u.first_name AS listerFirstName, u.uuid AS listerUuid
     FROM properties p
     INNER JOIN users u ON u.id = p.listed_by_user_id
     WHERE p.uuid = :uuid AND p.deleted_at IS NULL
     LIMIT 1`,
    { uuid: propertyUuid }
  );
  if (!rows.length) throw new ApiError(404, 'Property not found');
  return rows[0];
}

function mapInquiry(r) {
  return {
    id: r.uuid,
    name: r.name,
    email: r.email,
    phone: r.phone,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
    property: r.property_uuid
      ? { id: r.property_uuid, title: r.property_title, slug: r.property_slug }
      : null,
    leadId: r.lead_uuid || null,
  };
}

function mapLead(r) {
  return {
    id: r.uuid,
    source: r.source,
    status: r.status,
    notes: r.notes,
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    guestPhone: r.guest_phone,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    property: r.property_uuid
      ? { id: r.property_uuid, title: r.property_title, slug: r.property_slug }
      : null,
    project: r.project_uuid
      ? { id: r.project_uuid, name: r.project_name, slug: r.project_slug }
      : null,
    city: r.city_uuid
      ? { id: r.city_uuid, name: r.city_name }
      : null,
    buyer: r.buyer_uuid
      ? {
          id: r.buyer_uuid,
          name: `${r.buyer_first_name}${r.buyer_last_name ? ` ${r.buyer_last_name}` : ''}`,
          email: r.buyer_email,
        }
      : null,
    assignedTo: r.assigned_uuid
      ? {
          id: r.assigned_uuid,
          name: `${r.assigned_first_name}${r.assigned_last_name ? ` ${r.assigned_last_name}` : ''}`,
          email: r.assigned_email,
        }
      : null,
  };
}

export async function createInquiry(payload, user, req) {
  if (!user) {
    throw new ApiError(401, 'Buyer login required to send an inquiry');
  }
  const property = await getApprovedProperty(payload.propertyId);
  if (property.status !== 'approved') {
    throw new ApiError(400, 'Inquiries are only allowed on approved listings');
  }

  const profile = await resolveActorProfile(user);
  const name =
    payload.name ||
    (profile ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ''}` : '');
  const email = payload.email || profile?.email || user?.email;
  const phone = (payload.phone || profile?.phone || '').toString().trim() || null;
  if (!name || !email || !payload.message) {
    throw new ApiError(400, 'Name, email, and message are required');
  }
  if (!phone) {
    throw new ApiError(400, 'Phone number is required');
  }

  const inquiryUuid = generateUuid();
  const leadUuid = generateUuid();

  const result = await withTransaction(async (conn) => {
    const [inqResult] = await conn.execute(
      `INSERT INTO inquiries
        (uuid, property_id, user_id, name, email, phone, message, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
      [
        inquiryUuid,
        property.id,
        user?.id || null,
        name,
        email.toLowerCase(),
        phone,
        payload.message,
        user?.id || null,
      ]
    );

    const [leadResult] = await conn.execute(
      `INSERT INTO leads
        (uuid, source, property_id, assigned_to_user_id, buyer_user_id,
         guest_name, guest_email, guest_phone, status, inquiry_id, created_by)
       VALUES (?, 'inquiry', ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [
        leadUuid,
        property.id,
        property.listedByUserId,
        user?.id || null,
        name,
        email.toLowerCase(),
        phone,
        inqResult.insertId,
        user?.id || null,
      ]
    );

    await conn.execute(`UPDATE inquiries SET lead_id = ? WHERE id = ?`, [
      leadResult.insertId,
      inqResult.insertId,
    ]);

    return { inquiryId: inqResult.insertId, leadId: leadResult.insertId };
  });

  await notifyUser(property.listedByUserId, {
    type: 'inquiry.new',
    title: 'New property inquiry',
    body: `${name} inquired about ${property.title}`,
    data: { propertyId: property.uuid, inquiryId: inquiryUuid, leadId: leadUuid },
    email: property.listerEmail,
  });

  await writeActivityLog({
    userId: user?.id || null,
    activityType: 'inquiry.created',
    description: `Inquiry on ${property.title}`,
    ipAddress: req.ip,
  });

  return {
    id: inquiryUuid,
    leadId: leadUuid,
    message: 'Inquiry submitted successfully',
    inquiryDbId: result.inquiryId,
  };
}

export async function createSellerContact(payload, user, req) {
  if (!user) {
    throw new ApiError(401, 'Sign in required to contact sellers');
  }

  const [projects] = await query(
    `SELECT p.id, p.uuid, p.name, p.slug, p.status, p.published_at,
            bp.user_id AS builderUserId, u.email AS builderEmail, u.first_name AS builderFirstName
     FROM projects p
     INNER JOIN builder_profiles bp ON bp.id = p.builder_id
     INNER JOIN users u ON u.id = bp.user_id
     WHERE p.uuid = :uuid AND p.deleted_at IS NULL
     LIMIT 1`,
    { uuid: payload.projectId }
  );
  if (!projects.length) throw new ApiError(404, 'Project not found');
  const project = projects[0];
  const isPublic =
    project.status === 'published' || (project.status === 'pending' && project.published_at != null);
  if (!isPublic) {
    throw new ApiError(400, 'This project is not open for contact requests');
  }

  const profile = await resolveActorProfile(user);
  const name =
    (payload.name || '').trim() ||
    (profile ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ''}`.trim() : '');
  const email = (payload.email || profile?.email || user.email || '').toLowerCase().trim();
  const phone = (payload.phone || profile?.phone || '').toString().trim();
  if (!name || !email || !phone) {
    throw new ApiError(400, 'Name, email, and phone are required');
  }

  const notes = [
    payload.message?.trim() || `Contact request for ${project.name}`,
    payload.interestedLoan ? 'Interested in Home Loans: Yes' : null,
    payload.unitLabel ? `Preferred unit: ${payload.unitLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const leadUuid = generateUuid();
  const bookingUuid = generateUuid();
  const bookingNotes = [
    `Contact request for ${project.name}`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    payload.interestedLoan ? 'Interested in Home Loans' : null,
    payload.unitLabel ? `Preferred unit: ${payload.unitLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await query(
    `INSERT INTO leads
      (uuid, source, project_id, assigned_to_user_id, buyer_user_id,
       guest_name, guest_email, guest_phone, status, notes, created_by)
     VALUES (:uuid, 'contact', :projectId, :assignedTo, :buyerId,
             :guestName, :guestEmail, :guestPhone, 'new', :notes, :createdBy)`,
    {
      uuid: leadUuid,
      projectId: project.id,
      assignedTo: project.builderUserId,
      buyerId: user.id,
      guestName: name,
      guestEmail: email,
      guestPhone: phone,
      notes,
      createdBy: user.id,
    }
  );

  // Also store as booking so Bookings panel shows the same contact request
  await query(
    `INSERT INTO booking_requests
      (uuid, project_id, unit_id, buyer_user_id, amount, status, notes)
     VALUES (:uuid, :projectId, NULL, :buyerId, NULL, 'requested', :notes)`,
    {
      uuid: bookingUuid,
      projectId: project.id,
      buyerId: user.id,
      notes: bookingNotes,
    }
  );

  await notifyUser(project.builderUserId, {
    type: 'lead.contact',
    title: 'New seller contact request',
    body: `${name} requested contact details for ${project.name}`,
    data: { projectId: project.uuid, leadId: leadUuid, bookingId: bookingUuid },
    email: project.builderEmail,
  });

  await writeActivityLog({
    userId: user.id,
    activityType: 'lead.contact_created',
    description: `Contact sellers request on ${project.name}`,
    ipAddress: req.ip,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'leads.contact',
    entityType: 'lead',
    entityId: leadUuid,
    newValues: { projectId: project.uuid, name, email, phone, bookingId: bookingUuid },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return {
    id: leadUuid,
    bookingId: bookingUuid,
    message: 'Contact request sent. Sellers will reach out soon.',
  };
}

export async function listInquiries(user, filters = {}) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 20), 50);
  const offset = (page - 1) * limit;
  const where = ['i.deleted_at IS NULL'];
  const params = {};

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  if (!isAdmin) {
    where.push('p.listed_by_user_id = :userId');
    params.userId = user.id;
  }
  if (filters.status) {
    where.push('i.status = :status');
    params.status = filters.status;
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await query(
    `SELECT COUNT(*) AS total
     FROM inquiries i
     INNER JOIN properties p ON p.id = i.property_id
     WHERE ${whereSql}`,
    params
  );

  const [rows] = await query(
    `SELECT i.uuid, i.name, i.email, i.phone, i.message, i.status, i.created_at,
            p.uuid AS property_uuid, p.title AS property_title, p.slug AS property_slug,
            l.uuid AS lead_uuid
     FROM inquiries i
     INNER JOIN properties p ON p.id = i.property_id
     LEFT JOIN leads l ON l.id = i.lead_id
     WHERE ${whereSql}
     ORDER BY i.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map(mapInquiry),
    meta: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function updateInquiryStatus(uuid, status, user, req) {
  const [rows] = await query(
    `SELECT i.*, p.listed_by_user_id AS listedByUserId
     FROM inquiries i
     INNER JOIN properties p ON p.id = i.property_id
     WHERE i.uuid = :uuid AND i.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Inquiry not found');

  const inquiry = rows[0];
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  if (!isAdmin && inquiry.listedByUserId !== user.id) {
    throw new ApiError(403, 'Forbidden');
  }

  await query(
    `UPDATE inquiries SET status = :status, updated_by = :actorId WHERE id = :id`,
    { status, actorId: user.id, id: inquiry.id }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'inquiries.status',
    entityType: 'inquiry',
    entityId: inquiry.id,
    oldValues: { status: inquiry.status },
    newValues: { status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return { id: uuid, status };
}

export async function listLeads(user, filters = {}) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 20), 50);
  const offset = (page - 1) * limit;
  const where = ['l.deleted_at IS NULL'];
  const params = {};

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  if (isAdmin) {
    // all leads
  } else if (user.roleCode === 'BUYER') {
    where.push('l.buyer_user_id = :userId');
    params.userId = user.id;
  } else {
    where.push('l.assigned_to_user_id = :userId');
    params.userId = user.id;
  }
  if (filters.status) {
    where.push('l.status = :status');
    params.status = filters.status;
  }
  if (filters.source) {
    where.push('l.source = :source');
    params.source = filters.source;
  }
  if (filters.listingType === 'project') {
    where.push('l.project_id IS NOT NULL');
  } else if (filters.listingType === 'property') {
    where.push('l.property_id IS NOT NULL');
  }
  if (filters.cityId) {
    where.push('(prci.uuid = :cityId OR pci.uuid = :cityId)');
    params.cityId = filters.cityId;
  }
  if (filters.q) {
    where.push('(pr.name LIKE :q OR p.title LIKE :q OR l.guest_name LIKE :q OR l.guest_email LIKE :q)');
    params.q = `%${filters.q}%`;
  }
  if (filters.dateFrom) {
    where.push('l.created_at >= :dateFrom');
    params.dateFrom = `${filters.dateFrom} 00:00:00`;
  }
  if (filters.dateTo) {
    where.push('l.created_at <= :dateTo');
    params.dateTo = `${filters.dateTo} 23:59:59`;
  }

  const whereSql = where.join(' AND ');
  const fromSql = `FROM leads l
     LEFT JOIN properties p ON p.id = l.property_id
     LEFT JOIN projects pr ON pr.id = l.project_id
     LEFT JOIN cities pci ON pci.id = p.city_id
     LEFT JOIN cities prci ON prci.id = pr.city_id
     LEFT JOIN users bu ON bu.id = l.buyer_user_id
     INNER JOIN users au ON au.id = l.assigned_to_user_id`;

  const [countRows] = await query(
    `SELECT COUNT(*) AS total ${fromSql} WHERE ${whereSql}`,
    params
  );

  const [rows] = await query(
    `SELECT l.uuid, l.source, l.status, l.notes, l.guest_name, l.guest_email, l.guest_phone,
            l.created_at, l.updated_at,
            p.uuid AS property_uuid, p.title AS property_title, p.slug AS property_slug,
            pr.uuid AS project_uuid, pr.name AS project_name, pr.slug AS project_slug,
            COALESCE(prci.uuid, pci.uuid) AS city_uuid,
            COALESCE(prci.name, pci.name) AS city_name,
            bu.uuid AS buyer_uuid, bu.first_name AS buyer_first_name, bu.last_name AS buyer_last_name, bu.email AS buyer_email,
            au.uuid AS assigned_uuid, au.first_name AS assigned_first_name, au.last_name AS assigned_last_name, au.email AS assigned_email
     ${fromSql}
     WHERE ${whereSql}
     ORDER BY l.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map(mapLead),
    meta: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function updateLead(uuid, payload, user, req) {
  const [rows] = await query(
    `SELECT * FROM leads WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Lead not found');
  const lead = rows[0];

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  if (!isAdmin && lead.assigned_to_user_id !== user.id) {
    throw new ApiError(403, 'Forbidden');
  }

  const allowed = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];
  if (payload.status && !allowed.includes(payload.status)) {
    throw new ApiError(400, 'Invalid lead status');
  }

  await query(
    `UPDATE leads SET
      status = COALESCE(:status, status),
      notes = COALESCE(:notes, notes),
      updated_by = :actorId
     WHERE id = :id`,
    {
      status: payload.status ?? null,
      notes: payload.notes ?? null,
      actorId: user.id,
      id: lead.id,
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'leads.update',
    entityType: 'lead',
    entityId: lead.id,
    oldValues: { status: lead.status },
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const [fresh] = await query(
    `SELECT l.uuid, l.source, l.status, l.notes, l.guest_name, l.guest_email, l.guest_phone,
            l.created_at, l.updated_at,
            p.uuid AS property_uuid, p.title AS property_title, p.slug AS property_slug,
            pr.uuid AS project_uuid, pr.name AS project_name, pr.slug AS project_slug,
            bu.uuid AS buyer_uuid, bu.first_name AS buyer_first_name, bu.last_name AS buyer_last_name, bu.email AS buyer_email,
            au.uuid AS assigned_uuid, au.first_name AS assigned_first_name, au.last_name AS assigned_last_name, au.email AS assigned_email
     FROM leads l
     LEFT JOIN properties p ON p.id = l.property_id
     LEFT JOIN projects pr ON pr.id = l.project_id
     LEFT JOIN users bu ON bu.id = l.buyer_user_id
     INNER JOIN users au ON au.id = l.assigned_to_user_id
     WHERE l.id = :id`,
    { id: lead.id }
  );
  return mapLead(fresh[0]);
}

export async function createSiteVisit(payload, user, req) {
  if (!user) {
    throw new ApiError(401, 'Buyer login required to book a site visit');
  }
  const property = await getApprovedProperty(payload.propertyId);
  if (property.status !== 'approved') {
    throw new ApiError(400, 'Visits can only be booked on approved listings');
  }

  const scheduledAt = new Date(payload.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    throw new ApiError(400, 'scheduledAt must be a future date/time');
  }

  const profile = await resolveActorProfile(user);
  const guestName =
    payload.name ||
    (profile ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ''}`.trim() : '');
  const guestEmail = payload.email || profile?.email || user?.email;
  const guestPhone = (payload.phone || profile?.phone || '').toString().trim() || null;
  if (!guestName || !guestEmail) {
    throw new ApiError(400, 'Name and email are required to book a visit');
  }
  if (!guestPhone) {
    throw new ApiError(400, 'Phone number is required');
  }

  // Conflict: same host, overlapping ±30 minutes confirmed/requested
  const [conflicts] = await query(
    `SELECT id FROM site_visits
     WHERE host_user_id = :hostId
       AND deleted_at IS NULL
       AND status IN ('requested','confirmed')
       AND ABS(TIMESTAMPDIFF(MINUTE, scheduled_at, :scheduledAt)) < 30
     LIMIT 1`,
    { hostId: property.listedByUserId, scheduledAt }
  );
  if (conflicts.length) {
    throw new ApiError(409, 'Selected slot conflicts with another visit. Choose another time.');
  }

  const visitUuid = generateUuid();
  const leadUuid = generateUuid();

  await withTransaction(async (conn) => {
    const [leadResult] = await conn.execute(
      `INSERT INTO leads
        (uuid, source, property_id, assigned_to_user_id, buyer_user_id,
         guest_name, guest_email, guest_phone, status, created_by)
       VALUES (?, 'visit', ?, ?, ?, ?, ?, ?, 'new', ?)`,
      [
        leadUuid,
        property.id,
        property.listedByUserId,
        user?.id || null,
        guestName,
        guestEmail.toLowerCase(),
        guestPhone,
        user?.id || null,
      ]
    );

    await conn.execute(
      `INSERT INTO site_visits
        (uuid, property_id, requester_user_id, host_user_id, guest_name, guest_email, guest_phone,
         scheduled_at, status, notes, lead_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?)`,
      [
        visitUuid,
        property.id,
        user?.id || null,
        property.listedByUserId,
        guestName,
        guestEmail.toLowerCase(),
        guestPhone,
        scheduledAt,
        payload.notes || null,
        leadResult.insertId,
        user?.id || null,
      ]
    );
  });

  await notifyUser(property.listedByUserId, {
    type: 'visit.requested',
    title: 'New site visit request',
    body: `${guestName} requested a visit for ${property.title} on ${scheduledAt.toLocaleString()}`,
    data: { propertyId: property.uuid, visitId: visitUuid },
    email: property.listerEmail,
  });

  await writeActivityLog({
    userId: user?.id || null,
    activityType: 'visit.requested',
    description: `Visit requested for ${property.title}`,
    ipAddress: req.ip,
  });

  return { id: visitUuid, leadId: leadUuid, message: 'Visit requested successfully' };
}

export async function listSiteVisits(user, filters = {}) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 20), 50);
  const offset = (page - 1) * limit;
  const where = ['v.deleted_at IS NULL'];
  const params = {};

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  if (filters.scope === 'mine' || user.roleCode === 'BUYER') {
    where.push('v.requester_user_id = :userId');
    params.userId = user.id;
  } else if (!isAdmin) {
    where.push('v.host_user_id = :userId');
    params.userId = user.id;
  }

  if (filters.status) {
    where.push('v.status = :status');
    params.status = filters.status;
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM site_visits v WHERE ${whereSql}`,
    params
  );

  const [rows] = await query(
    `SELECT v.uuid, v.scheduled_at AS scheduledAt, v.status, v.notes, v.host_notes AS hostNotes,
            v.guest_name AS guestName, v.guest_email AS guestEmail, v.guest_phone AS guestPhone,
            v.created_at AS createdAt,
            p.uuid AS propertyId, p.title AS propertyTitle, p.slug AS propertySlug,
            hu.uuid AS hostId, hu.first_name AS hostFirstName, hu.email AS hostEmail,
            ru.uuid AS requesterId, ru.first_name AS requesterFirstName
     FROM site_visits v
     INNER JOIN properties p ON p.id = v.property_id
     INNER JOIN users hu ON hu.id = v.host_user_id
     LEFT JOIN users ru ON ru.id = v.requester_user_id
     WHERE ${whereSql}
     ORDER BY v.scheduled_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map((r) => ({
      id: r.uuid,
      scheduledAt: r.scheduledAt,
      status: r.status,
      notes: r.notes,
      hostNotes: r.hostNotes,
      guestName: r.guestName,
      guestEmail: r.guestEmail,
      guestPhone: r.guestPhone,
      createdAt: r.createdAt,
      property: { id: r.propertyId, title: r.propertyTitle, slug: r.propertySlug },
      host: { id: r.hostId, name: r.hostFirstName, email: r.hostEmail },
      requester: r.requesterId
        ? { id: r.requesterId, name: r.requesterFirstName }
        : null,
    })),
    meta: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function updateSiteVisitStatus(uuid, payload, user, req) {
  const [rows] = await query(
    `SELECT v.*, p.title AS propertyTitle, p.uuid AS propertyUuid,
            ru.email AS requesterEmail, ru.id AS requesterId
     FROM site_visits v
     INNER JOIN properties p ON p.id = v.property_id
     LEFT JOIN users ru ON ru.id = v.requester_user_id
     WHERE v.uuid = :uuid AND v.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Visit not found');
  const visit = rows[0];

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  const isHost = visit.host_user_id === user.id;
  const isRequester = visit.requester_user_id === user.id;

  const hostStatuses = ['confirmed', 'completed', 'cancelled', 'no_show'];
  const requesterStatuses = ['cancelled'];

  let allowed = [];
  if (isAdmin || isHost) allowed = hostStatuses;
  else if (isRequester) allowed = requesterStatuses;
  else throw new ApiError(403, 'Forbidden');

  if (!allowed.includes(payload.status)) {
    throw new ApiError(400, `You cannot set status to ${payload.status}`);
  }

  const transitions = {
    requested: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  if (!(transitions[visit.status] || []).includes(payload.status)) {
    throw new ApiError(400, `Cannot change visit from ${visit.status} to ${payload.status}`);
  }

  await query(
    `UPDATE site_visits SET
      status = :status,
      host_notes = COALESCE(:hostNotes, host_notes),
      updated_by = :actorId
     WHERE id = :id`,
    {
      status: payload.status,
      hostNotes: payload.hostNotes ?? null,
      actorId: user.id,
      id: visit.id,
    }
  );

  if (visit.requesterId) {
    await notifyUser(visit.requesterId, {
      type: 'visit.status',
      title: `Visit ${payload.status}`,
      body: `Your visit for ${visit.propertyTitle} is now ${payload.status}`,
      data: { visitId: uuid, propertyId: visit.propertyUuid, status: payload.status },
      email: visit.requesterEmail,
    });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'visits.status',
    entityType: 'site_visit',
    entityId: visit.id,
    oldValues: { status: visit.status },
    newValues: { status: payload.status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return { id: uuid, status: payload.status };
}

export async function getApprovalQueueStats() {
  const [rows] = await query(
    `SELECT
       (SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL AND status = 'pending') AS pendingProperties,
       (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL AND status = 'pending') AS pendingProjects,
       (SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL AND verification_status = 'pending') AS pendingVerification,
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'pending') AS pendingUsers,
       (SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL AND status = 'new') AS newLeads,
       (SELECT COUNT(*) FROM site_visits WHERE deleted_at IS NULL AND status = 'requested') AS visitRequests,
       (SELECT COUNT(*) FROM inquiries WHERE deleted_at IS NULL AND status = 'new') AS newInquiries,
       (SELECT COUNT(*) FROM builder_profile_change_requests
        WHERE deleted_at IS NULL AND status = 'pending') AS pendingBuilderProfileChanges`
  );
  return {
    pendingProperties: Number(rows[0].pendingProperties),
    pendingProjects: Number(rows[0].pendingProjects),
    pendingVerification: Number(rows[0].pendingVerification),
    pendingUsers: Number(rows[0].pendingUsers),
    newLeads: Number(rows[0].newLeads),
    visitRequests: Number(rows[0].visitRequests),
    newInquiries: Number(rows[0].newInquiries),
    pendingBuilderProfileChanges: Number(rows[0].pendingBuilderProfileChanges || 0),
  };
}
