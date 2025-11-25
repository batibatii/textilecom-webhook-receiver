import app from './app'
import * as os from 'os'
import logger from './common/logger'
import dotenv from 'dotenv'

// to use env variables
dotenv.config()

const PORT = parseInt(process.env.PORT || '8000', 10)

app.listen(PORT, () => {
  logger.info(`up and running in ${process.env.NODE_ENV || 'development'} @: ${os.hostname()} on port ${PORT}`)
})
