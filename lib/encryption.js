const crypto = require('crypto')


const ALGORITHM = 'aes-256-cbc'

module.exports = {
    encrypt(readableStream, key, iv) {
        this.validateKey(key)
        if (iv.length !== 16) {
            throw new Error(`encrypt iv must be exactly 16 bytes, but received ${iv.length}`)
        }
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)
        readableStream.pipe(cipher)
        return cipher
    },
    decrypt(readableStream, key, iv) {
        this.validateKey(key)
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)
        readableStream.pipe(decipher)
        return decipher
    },
    validateKey(key) {
        const bytes = Buffer.from(key, 'hex')
        if (bytes.length !== 32) {
            throw new Error('encrypt key must be a 32 byte hex string')
        }
        return true
    },
    generateIv() {
        return crypto.randomBytes(16)
    }
}
