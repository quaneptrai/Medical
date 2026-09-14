import { NextResponse } from 'next/server';
import { getDb } from '@/lib/auth/db';

function parseDays(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

export async function GET() {
  const db = getDb();
  const specialties = db.prepare(`
    SELECT s.id, s.name, s.category, s.short_desc, s.full_desc, s.common_symptoms,
           s.chief_doctor_name, s.icon_name, s.diseases_covered,
           COUNT(d.id) AS doctor_count
    FROM specialties s
    LEFT JOIN doctors d ON d.specialty_id = s.id AND d.is_active = 1
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY s.name
  `).all().map((row: any) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    shortDesc: row.short_desc || '',
    fullDesc: row.full_desc || '',
    commonSymptoms: parseDays(row.common_symptoms),
    chiefDoctor: row.chief_doctor_name || '',
    iconName: row.icon_name || 'Stethoscope',
    diseasesCovered: Number(row.diseases_covered || 0),
    doctorCount: Number(row.doctor_count || 0),
  }));

  const doctors = db.prepare(`
    SELECT d.id, d.name, d.title, d.specialty_id, s.name AS specialty_name,
           d.experience_years, d.education, d.hospital_affiliation, d.bio,
           d.available_days, d.consultation_fee, d.image_url, d.qualifications, d.achievements
    FROM doctors d
    JOIN specialties s ON s.id = d.specialty_id
    WHERE d.is_active = 1 AND s.is_active = 1
    ORDER BY RANDOM()
  `).all().map((row: any) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    specialtyId: row.specialty_id,
    specialtyName: row.specialty_name,
    experienceYears: Number(row.experience_years || 0),
    education: row.education || '',
    hospitalAffiliation: row.hospital_affiliation || '',
    bio: row.bio || '',
    availableDays: parseDays(row.available_days),
    consultationFee: Number(row.consultation_fee || 0),
    imageUrl: row.image_url || '',
    qualifications: parseDays(row.qualifications),
    achievements: parseDays(row.achievements),
  }));

  return NextResponse.json({ specialties, doctors });
}
