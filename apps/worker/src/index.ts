import { Worker, Queue } from 'bullmq'
import type { WorkerJobType } from '@syndicsage/types'
import { handleSendEmail }        from './jobs/sendEmail.js'
import { handleScanFile }         from './jobs/scanFile.js'
import { handleSendNotification } from './jobs/sendNotification.js'
import { handleGeneratePdf }      from './jobs/generatePdf.js'
import { handleProcessExport }    from './jobs/processExport.js'
import { handleAiExtract }        from './jobs/aiExtract.js'
import { handleAiSummarize }      from './jobs/aiSummarize.js'
import { handleAiEmbed }          from './jobs/aiEmbed.js'
import { handleAnomalyDetection } from './jobs/anomalyDetection.js'
import { handleChargeReminders }  from './jobs/chargeReminders.js'

const REDIS_URL  = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
const QUEUE_NAME = 'syndicsage'

const connection = { url: REDIS_URL }

// ── Job dispatcher ────────────────────────────────────────────
// Single worker consuming all job types from the shared queue.
// Each job type is handled by its own handler in src/jobs/.
// Add new job types by creating a handler and adding a case here.

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const type = job.name as WorkerJobType

    switch (type) {
      case 'send_email':         return handleSendEmail(job.data)
      case 'scan_file':          return handleScanFile(job.data)
      case 'send_notification':  return handleSendNotification(job.data)
      case 'generate_pdf':       return handleGeneratePdf(job.data)
      case 'process_export':     return handleProcessExport(job.data)
      case 'ai_extract':         return handleAiExtract(job.data)
      case 'ai_summarize':       return handleAiSummarize(job.data)
      case 'ai_embed':           return handleAiEmbed(job.data)
      case 'anomaly_detection':  return handleAnomalyDetection(job.data)
      case 'charge_reminders':   return handleChargeReminders(job.data)
      default:
        // Throw so BullMQ marks the job as failed and retries/dead-letters it
        // rather than silently completing and losing the job.
        throw new Error(`Unknown job type: ${type as string}`)
    }
  },
  { connection },
)

worker.on('completed', (job) => {
  console.log(`[worker] ✓ ${job.name} — ${job.id}`)
})

worker.on('failed', (job, err) => {
  console.error(`[worker] ✗ ${job?.name ?? 'unknown'} — ${job?.id}:`, err.message)
})

console.log(`[worker] Listening on queue "${QUEUE_NAME}" — ${REDIS_URL}`)

// ── Queue helper (used by apps/api to enqueue jobs) ───────────
export const queue = new Queue(QUEUE_NAME, { connection })

// ── Scheduled jobs ────────────────────────────────────────────
// Anomaly detection runs every hour on the hour.
// BullMQ deduplicates repeat jobs by jobId — safe to call on every worker start.
void queue.add(
  'anomaly_detection',
  {},
  {
    repeat:  { pattern: '0 * * * *' },  // every hour
    jobId:   'anomaly_detection_hourly', // stable ID prevents duplicates on restart
  },
)

console.log('[worker] Scheduled: anomaly_detection (hourly)')

void queue.add(
  'charge_reminders',
  {},
  {
    repeat:  { pattern: '0 8 * * *' },   // every day at 08:00
    jobId:   'charge_reminders_daily',
  },
)

console.log('[worker] Scheduled: charge_reminders (daily 08:00)')
