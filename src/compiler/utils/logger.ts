import { writeSync } from 'node:fs'

const store: {
  currentLogFileId: number | null,
} = {
  currentLogFileId: null,
}

const base = (
  type: 'info' | 'error',
  message: string,
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${type.toUpperCase()}][${new Date().toISOString()}] - ${message}`)
  }
  if (store.currentLogFileId) {
    writeSync(store.currentLogFileId, `[${type.toUpperCase()}][${new Date().toISOString()}] ${message}\n`)
  }
}
export const logger = {
  setLogFileId: (logFileId: number) => {
    store.currentLogFileId = logFileId
  },
  info: (message: string) => {
    base('info', message)
  },
  error: (message: string) => {
    base('error', message)
  },
  log: (message: string) => {
    console.log(`[LOG] - ${message}`)
  },
}