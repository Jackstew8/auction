import serverless from 'serverless-http'
import { app, init } from '../../app.js'

let initialized = false
const _handler = serverless(app)

export const handler = async (event, context) => {
  if (!initialized) {
    await init()
    initialized = true
  }
  // Restore the original /api/* path from rawUrl (Netlify rewrites change event.path)
  if (event.rawUrl) {
    const url = new URL(event.rawUrl)
    event.path = url.pathname
  }
  return _handler(event, context)
}
