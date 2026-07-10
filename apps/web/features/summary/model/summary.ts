// Floor-level rollup entity. Pure TS — no React imports.
// Field names mirror the wire format 1:1 (see queue-health/model/queue.ts).

export interface Summary {
  sla_attainment_pct: number
  queues_total: number
  queues_breaching: number
  queues_at_risk: number
  tickets_waiting_total: number
  agents_total: number
  agents_online: number
  agents_out_of_adherence: number
}
