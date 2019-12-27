const moment = require('moment')
const path = require('path')

module.exports = {
    generateBackupPath(databaseName, rootPath, now = null) {
        now = now || moment().utc()
        const timestamp = moment(now).format('DD-MM-YYYY@HH-mm-ss')
        const day = moment(now).format('YYYY-MM-DD')
        const filename = `${databaseName}-${timestamp}.backup`
        const key = path.join(rootPath || '', day, filename)
        return key
    }
}
