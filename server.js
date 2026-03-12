import { app, init } from './app.js'

init().then(() => {
  app.listen(3001, () => console.log('API server → http://localhost:3001'))
}).catch(err => {
  console.error('Failed to initialize DB:', err)
  process.exit(1)
})
