import { getDb } from '@/lib/auth/db';

export type CatalogSpecialty = {
  id: string; name: string; category: string; shortDesc: string; fullDesc: string;
  commonSymptoms: string[]; chiefDoctor: string; iconName: string; diseasesCovered: number; doctorCount: number;
};

export type CatalogDoctor = {
  id: string; name: string; title: string; specialtyId: string; specialtyName: string;
  experienceYears: number; education: string; hospitalAffiliation: string; bio: string;
  availableDays: string[]; consultationFee: number; imageUrl: string;
  qualifications: string[]; achievements: string[];
};

export function parseStringList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

export function getCatalogSpecialties(): CatalogSpecialty[] {
  return getDb().prepare(`SELECT s.*, COUNT(d.id) AS doctor_count FROM specialties s
    LEFT JOIN doctors d ON d.specialty_id = s.id AND d.is_active = 1
    WHERE s.is_active = 1 GROUP BY s.id ORDER BY s.name`).all().map((row: any) => ({
      id: row.id, name: row.name, category: row.category, shortDesc: row.short_desc || '', fullDesc: row.full_desc || '',
      commonSymptoms: parseStringList(row.common_symptoms), chiefDoctor: row.chief_doctor_name || '', iconName: row.icon_name || 'Stethoscope',
      diseasesCovered: Number(row.diseases_covered || 0), doctorCount: Number(row.doctor_count || 0),
    }));
}

export function getCatalogDoctors(random = false): CatalogDoctor[] {
  const order = random ? 'RANDOM()' : 's.name, d.name';
  return getDb().prepare(`SELECT d.*, s.name AS specialty_name FROM doctors d JOIN specialties s ON s.id = d.specialty_id
    WHERE d.is_active = 1 AND s.is_active = 1 ORDER BY ${order}`).all().map(mapDoctor);
}

export function getCatalogDoctor(id: string): CatalogDoctor | null {
  const row = getDb().prepare(`SELECT d.*, s.name AS specialty_name FROM doctors d JOIN specialties s ON s.id = d.specialty_id
    WHERE d.id = ? AND d.is_active = 1 AND s.is_active = 1`).get(id);
  return row ? mapDoctor(row) : null;
}

function mapDoctor(row: any): CatalogDoctor {
  return {
    id: row.id, name: row.name, title: row.title, specialtyId: row.specialty_id, specialtyName: row.specialty_name,
    experienceYears: Number(row.experience_years || 0), education: row.education || '', hospitalAffiliation: row.hospital_affiliation || '',
    bio: row.bio || '', availableDays: parseStringList(row.available_days), consultationFee: Number(row.consultation_fee || 0),
    imageUrl: row.image_url || '', qualifications: parseStringList(row.qualifications), achievements: parseStringList(row.achievements),
  };
}
