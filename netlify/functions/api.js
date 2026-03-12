import serverless from 'serverless-http'
import { app, init } from '../../app.js'

let initialized = false
let initError = null
const _handler = serverless(app)

export const handler = async (event, context) => {
  if (!initialized && !initError) {
    try {
      await init()
      initialized = true
    } catch (err) {
      initError = err.message
      console.error('DB init failed:', err)
    }
  }

  if (initError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'DB init failed', detail: initError }),
    }
  }

  // Restore the original /api/* path (Netlify rewrites change event.path)
  if (event.rawUrl) {
    const url = new URL(event.rawUrl)
    event.path = url.pathname
  }

  return _handler(event, context)
}
