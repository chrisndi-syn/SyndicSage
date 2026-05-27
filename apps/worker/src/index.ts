import { Worker, Queue } from 'bullmq'
import type { WorkerJobType } from '@syndicsage/types'
import { handleSendEmail }       from './jobs/sendEmail.js'
import { handleScanFile }        from './jobs/scanFile.js'
import { handleSendNotification }from './jobs/sendNotification.js'
import { handleGeneratePdf }     from './jobs/generatePdf.js'
import { handleProcessExport }   from './jobs/processExport.js'
import { handleAiExtract }       from './jobs/aiExtract.js'
import { handleAiSummarize }     from './jobs/aiSummarize.js'
import { handleAiEmbed }         from './jobs/aiEmbed.js'

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
      default:
        console.warn(`[worker] Unknown job type: ${type as string}`)
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
