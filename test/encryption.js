const { expect } = require('chai')
const { Readable } = require('stream')
const encryption = require('../lib/encryption')

describe('encryption', () => {
    it('should encrypt and decrypt', () => {
        const data = 'some-unencrypted-data'

        // create mock read stream (to mimic a pg_dump output stream)
        const mockedReadStream = new Readable()
        mockedReadStream._read = () => { }
        mockedReadStream.push(data)

        // pipe the readable stream through encrypt
        const encrypted = encryption.encrypt(mockedReadStream, 'password123')

        // pipe the encrypted stream through decrypt
        const decrypted = encryption.decrypt(encrypted, 'password123')
        mockedReadStream.emit('data', data)

        // verify the decrypted string matches the original data
        const output = decrypted.read().toString('utf8')
        expect(output).to.equal(data)
    })
})
