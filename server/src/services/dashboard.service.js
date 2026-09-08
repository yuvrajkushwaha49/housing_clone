import { query } from '../config/db.js';
import * as userService from './user.service.js';

export async function getDashboardStats(roleCode) {
  const usersByRole = await userService.countUsersByRole();
  const usersByStatus = await userService.countUsersByStatus();

  const [totals] = await query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS totalUsers,
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'active') AS activeUsers,
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS newUsersWeek,
       (SELECT COUNT(*) FROM roles WHERE deleted_at IS NULL) AS totalRoles,
       (SELECT COUNT(*) FROM permissions WHERE deleted_at IS NULL) AS totalPermissions,
       (SELECT COUNT(*) FROM activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS activityLast24h`
  );

  const [recentActivity] = await query(
    `SELECT a.id, a.activity_type AS activityType, a.description, a.created_at AS createdAt,
            u.email AS userEmail, u.first_name AS firstName
     FROM activity_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC
     LIMIT 10`
  );

  return {
    roleCode,
    kpis: {
      totalUsers: Number(totals[0].totalUsers),
      activeUsers: Number(totals[0].activeUsers),
      newUsersWeek: Number(totals[0].newUsersWeek),
      totalRoles: Number(totals[0].totalRoles),
      totalPermissions: Number(totals[0].totalPermissions),
      activityLast24h: Number(totals[0].activityLast24h),
    },
    usersByRole: usersByRole.map((r) => ({
      roleCode: r.roleCode,
      roleName: r.roleName,
      total: Number(r.total),
    })),
    usersByStatus: usersByStatus.map((s) => ({
      status: s.status,
      total: Number(s.total),
    })),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      activityType: a.activityType,
      description: a.description,
      createdAt: a.createdAt,
      userEmail: a.userEmail,
      firstName: a.firstName,
    })),
  };
}
