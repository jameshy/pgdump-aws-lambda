const fs = require('fs')
const tmp = require('tmp')
const { expect } = require('chai')
const encryption = require('../lib/encryption')


function waitForStream(stream) {
    return new Promise(fulfill => stream.on('finish', fulfill))
}

// in real world usage we use streams from S3
// but here in tests we use streams from fs
describe('encryption', () => {
    const ENCRYPT_KEY = '4141414141414141414141414141414141414141414141414141414141414141'
    const IV = encryption.generateIv()

    it('should encrypt and decrypt', async () => {
        // create a temporary, unencrypted file
        const unencryptedPath = tmp.tmpNameSync()
        fs.writeFileSync(unencryptedPath, 'some-unencrypted-data')

        // encrypt
        const encryptedStream = encryption.encrypt(
            fs.createReadStream(unencryptedPath),
            ENCRYPT_KEY,
            IV
        )
        const encryptedPath = tmp.tmpNameSync()
        let writeStream = fs.createWriteStream(encryptedPath)
        encryptedStream.pipe(writeStream)
        await waitForStream(writeStream)

        const contents = fs.readFileSync(encryptedPath)
        expect(contents).to.have.length(32)
        expect(contents.includes('some-unencrypted-data')).to.be.false

        // decrypt
        const decryptedStream = encryption.decrypt(
            fs.createReadStream(encryptedPath),
            ENCRYPT_KEY,
            IV
        )
        const decryptedPath = tmp.tmpNameSync()
        writeStream = fs.createWriteStream(decryptedPath)
        decryptedStream.pipe(writeStream)
        await waitForStream(writeStream)

        // verify decrypt was successful
        expect(
            fs.readFileSync(decryptedPath).toString('utf8')
        ).to.equal('some-unencrypted-data')
    })

    it('should throw an error for an invalid key', () => {
        expect(() => encryption.encrypt(
            undefined,
            'bad-key',
            'bad-IV'
        )).to.throw('encrypt key must be a 32 byte hex string')
    })

    it('should throw an error for an invalid iv', () => {
        expect(() => encryption.encrypt(
            undefined,
            ENCRYPT_KEY,
            'bad-IV'
        )).to.throw('encrypt iv must be exactly 16 bytes, but received 6')
    })
})
