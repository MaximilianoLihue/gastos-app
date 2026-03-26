import zlib from 'zlib'
import fs from 'fs'
import path from 'path'

function crc32(buf) {
  let crc = 0xFFFFFFFF
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  for (const byte of buf) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 2  // RGB
  const ihdr = chunk('IHDR', ihdrData)

  // Draw icon: dark background + green rounded square + white text "$"
  const raw = []
  const cx = size / 2, cy = size / 2
  const radius = size * 0.18

  for (let y = 0; y < size; y++) {
    raw.push(0) // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const inCircle = Math.sqrt(dx * dx + dy * dy) < size * 0.44

      // Green inner card
      const cardX = size * 0.14, cardY = size * 0.22
      const cardW = size * 0.72, cardH = size * 0.56
      const inCard = x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH

      // Green header bar
      const inHeader = x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH * 0.22

      // Dollar sign (simple vertical stripe simulation)
      const inDollar = Math.abs(x - cx) < size * 0.05 && y > cardY + cardH * 0.28 && y < cardY + cardH * 0.85

      if (!inCircle) {
        raw.push(0, 0, 0) // transparent becomes black bg - but we use fully opaque
      } else if (inHeader) {
        raw.push(16, 185, 129) // emerald-500
      } else if (inCard) {
        raw.push(31, 41, 55)   // gray-800
      } else if (inDollar && inCard) {
        raw.push(16, 185, 129)
      } else {
        raw.push(17, 24, 39)   // gray-900
      }
    }
  }

  const rawBuf = Buffer.from(raw)
  const compressed = zlib.deflateSync(rawBuf)
  const idat = chunk('IDAT', compressed)
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

const dir = path.join(process.cwd(), 'public', 'icons')
fs.mkdirSync(dir, { recursive: true })

for (const size of [192, 512]) {
  const buf = createPNG(size)
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), buf)
  console.log(`✓ icon-${size}.png`)
}
