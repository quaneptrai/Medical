export interface SystemStatus {
  service: string;
  model_loaded: boolean;
  model_release: string;
  model_path: string;
  knowledge_base_files: number;
  vector_index: {
    state: string;
    count: number;
    target: number;
    error?: string;
  };
  general_bm25_weight: number;
  deterministic_guardrail: string;
  semantic_guardrail: string;
  v3_status: string;
  stores_queries: boolean;
}

export interface CandidateResult {
  rank: number;
  disease_id: string;
  name: string;
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  tier: number;
  fit_label: 'Rất phù hợp' | 'Phù hợp' | 'Có thể';
  description: string;
  symptoms: string[];
  score: number;
  dense_score?: number;
  bm25_score?: number;
  raw_bm25?: number;
}

export interface EmergencyPayload {
  is_emergency: boolean;
  tier?: number;
  rule_id?: string;
  rule_name?: string;
  red_flag?: string;
  message: string;
}

export interface SearchResponse {
  query: string;
  requested_mode: 'auto' | 'hybrid' | 'dense';
  effective_mode: 'hybrid' | 'dense';
  route_reason: string;
  latency_ms: number;
  model_release: string;
  emergency: EmergencyPayload | null;
  candidates: CandidateResult[];
  disclaimer: string;
}

// Browser code always talks to the same-origin Next.js proxy. Internal backend
// addresses must never be exposed to the client or depend on browser-side CORS.
const API_BASE_URL = '/api';

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Không thể kiểm tra trạng thái máy chủ Phòng khám Quang Thanh.'
    );
  }
}

export async function searchSymptoms(
  query: string,
  top_k: number = 5,
  mode: 'auto' | 'hybrid' | 'dense' = 'auto'
): Promise<SearchResponse> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    throw new Error('Mô tả triệu chứng quá ngắn (tối thiểu 2 ký tự).');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed, top_k, mode }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Lỗi máy chủ (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Không thể kết nối đến máy chủ phân loại Phòng khám Quang Thanh.'
    );
  }
}
