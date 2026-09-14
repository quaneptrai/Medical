import { getDb } from './db';
import { UserRoleCode } from '../types/saas-schema';

/**
 * Tra cứu danh sách các vai trò (roles) mà người dùng đang nắm giữ
 */
export function getUserRoles(userId: string): UserRoleCode[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.code
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ?
  `).all(userId) as Array<{ code: UserRoleCode }>;

  if (rows.length === 0) {
    return ['patient']; // Mặc định tất cả tài khoản là bệnh nhân
  }
  return rows.map((r) => r.code);
}

/**
 * Tra cứu toàn bộ các mã quyền (permissions) người dùng được cấp phép qua vai trò
 */
export function getUserPermissions(userId: string): string[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT DISTINCT p.code
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ?
  `).all(userId) as Array<{ code: string }>;

  // Chỉ tài khoản bệnh nhân nhận bộ quyền mặc định; quản trị viên nhận đúng ma trận RBAC đã seed.
  const roles = getUserRoles(userId);
  const defaultPatientPerms = roles.includes('patient')
    ? ['appointments:write', 'appointments:read', 'chat:patient_send', 'triage:use']
    : [];
  const permSet = new Set<string>([...defaultPatientPerms, ...rows.map((r) => r.code)]);
  return Array.from(permSet);
}

/**
 * Kiểm tra xem người dùng có vai trò chỉ định hay không
 */
export function hasRole(userId: string, roleCode: UserRoleCode): boolean {
  const roles = getUserRoles(userId);
  if (roles.includes('super_admin')) return true; // Super admin có toàn quyền
  return roles.includes(roleCode);
}

/**
 * Kiểm tra xem người dùng có quyền thực thi thao tác cụ thể hay không
 */
export function hasPermission(userId: string, permissionCode: string): boolean {
  const roles = getUserRoles(userId);
  if (roles.includes('super_admin')) return true; // Super admin bypass tất cả quyền
  const permissions = getUserPermissions(userId);
  return permissions.includes(permissionCode);
}

/**
 * Gán vai trò cho người dùng trong cơ sở dữ liệu
 */
export function assignUserRole(userId: string, roleCode: UserRoleCode, tenantId: string = 'yg-clinic-hn'): void {
  const db = getDb();
  const role = db.prepare('SELECT id FROM roles WHERE code = ?').get(roleCode) as { id: string } | undefined;
  if (!role) {
    throw new Error(`Role code '${roleCode}' not found.`);
  }

  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT OR REPLACE INTO user_roles (user_id, role_id, tenant_id, assigned_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, role.id, tenantId, now);
}

/**
 * Ghi nhật ký kiểm toán hệ thống (Audit Log)
 */
export function logAudit(params: {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): void {
  try {
    const db = getDb();
    const id = 'audit-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.tenantId || 'yg-clinic-hn',
      params.userId || null,
      params.action,
      params.resourceType,
      params.resourceId || null,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null,
      params.userAgent || null,
      now
    );
  } catch (err) {
    console.error('Lỗi khi ghi audit log:', err);
  }
}
