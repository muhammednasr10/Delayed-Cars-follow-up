import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const publicJwk = publicKey.export({ format: 'jwk' })
const privateJwk = privateKey.export({ format: 'jwk' })

function b64urlToBuf(value) {
  const pad = value + '='.repeat((4 - (value.length % 4)) % 4)
  return Buffer.from(pad.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

const uncompressed = Buffer.concat([
  Buffer.from([0x04]),
  b64urlToBuf(publicJwk.x),
  b64urlToBuf(publicJwk.y)
])

console.log(`VITE_VAPID_PUBLIC_KEY=${uncompressed.toString('base64url')}`)
console.log(`VAPID_PUBLIC_KEY=${uncompressed.toString('base64url')}`)
console.log(`VAPID_PRIVATE_KEY=${privateJwk.d}`)
