type AdminUserRow = {
  id: string; email: string; username: string | null; display_name: string | null; full_name: string | null;
  phone: string | null; date_of_birth: string | null; gender: string | null; address: string | null;
  status: string; is_verified: number; created_at: number; profile_updated_at: number | null;
  last_session_at: number | null; appointment_count: number; roles: string;
};

export type AdminData = {
  viewer: { email: string; display_name?: string; roles: string[] };
  counts: Record<string, number>;
  permissions: Array<{ id: string; code: string; name: string; category: string }>;
  roles: Array<{ id: string; code: string; name: string; user_count: number; permission_count: number }>;
  users: AdminUserRow[];
  tenants: Array<{ id: string; code: string; name: string; brand_name: string; license_number: string; hotline: string; address: string; is_active: number }>;
  specialties: Array<{ id: string; name: string; category: string; short_desc: string; full_desc: string; common_symptoms: string; chief_doctor_name: string; icon_name: string; diseases_covered: number; is_active: number }>;
  services: Array<{ id: string; specialty_id: string | null; name: string; code: string; service_type: string; description: string; is_active: number }>;
  doctors: Array<{ id: string; name: string; title: string; specialty_id: string; specialty_name: string; experience_years: number; education: string; hospital_affiliation: string; bio: string; available_days: string; consultation_fee: number; image_url: string; qualifications: string; achievements: string; is_active: number }>;
  appointments: Array<{ id: string; patient_name: string; appointment_date: string; appointment_time: string; status: string; queue_number: number }>;
  triage: Array<{ id: string; stage: string; chief_complaint: string; is_emergency: number }>;
  invoices: Array<{ id: string; amount: number; payment_method: string; payment_status: string; transaction_code: string }>;
  audit: Array<{ id: string; action: string; resource_type: string; resource_id: string; user_id: string; created_at: number }>;
  feedback: Array<{ id: string; rating: number; comment: string; status: string; doctor_name: string; specialty_name: string; created_at: number }>;
  specialtyPerformance: Array<{ id: string; name: string; appointment_count: number; feedback_count: number; average_rating: number | null }>;
  inventory: Array<{ id: string; sku: string; name: string; category: string; unit: string; current_quantity: number; minimum_quantity: number; expiry_date: string; is_active: number }>;
  stockMovements: Array<{ id: string; movement_type: string; quantity: number; note: string; created_at: number; item_name: string; unit: string }>;
  maintenance: Array<{ id: string; asset_code: string; asset_name: string; category: string; last_maintenance_date: string; next_maintenance_date: string; status: string; note: string }>;
  operatingMetrics: { appointmentsTotal: number; feedbackTotal: number; averageRating: number; inventoryAlerts: number; maintenanceDue: number };
};
