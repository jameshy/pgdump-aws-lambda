const crypto = require('crypto')

const algorithm = 'aes-256-ctr'

module.exports = {
    encrypt(readableStream, password) {
        const cipher = crypto.createCipher(algorithm, password)
        return readableStream.pipe(cipher)
    },
    decrypt(readableStream, password) {
        const decipher = crypto.createDecipher(algorithm, password)
        return readableStream.pipe(decipher)
    }
}
