import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { decode as decodeJpeg } from 'jpeg-js'

/**
 * Conteo de ganado ON-DEVICE (Fase A de visión computacional, PLANNING §6.5).
 *
 * Modelo: YOLOv8n preentrenado en COCO exportado a ONNX (640x640, fp32,
 * ~12 MB, embebido en el APK — cero red). Pipeline verificado 1:1 contra la
 * referencia en Python (scratch hsvision/verify.py): stretch-resize a 640x640
 * (sin letterbox), RGB float32 /255 en NCHW, salida [1, 84, 8400]
 * (4 coords xywh + 80 clases), filtro por clase + NMS propio.
 *
 * COCO: cow=19, horse=17, sheep=18.
 */

const INPUT = 640
const NUM_ANCHORS = 8400
const IOU_THRESHOLD = 0.45
export const CLASSES = { cow: 19, horse: 17, sheep: 18 }

// Sensibilidad expuesta a la UI: umbral de confianza por detección.
export const SENSITIVITY = {
  high: { label: 'Sensible', conf: 0.25 },
  normal: { label: 'Normal', conf: 0.35 },
  strict: { label: 'Estricto', conf: 0.5 },
}

// --- Modelo (singleton perezoso) -------------------------------------------

// ⚠ onnxruntime-react-native se requiere PEREZOSAMENTE: su binding.ts llama
// NativeModules.Onnxruntime.install() al evaluarse el módulo — si eso pasa
// durante la carga del bundle (import top-level), el runtime de RN aún no está
// listo y el app CRASHEA al arrancar ("[runtime not ready] ... 'install' of
// null"). Requerirlo aquí garantiza que solo se evalúa cuando el usuario abre
// el contador, con el runtime arriba.
let ortModule = null
function ort() {
  if (!ortModule) ortModule = require('onnxruntime-react-native')
  return ortModule
}

let sessionPromise = null

export function loadSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { InferenceSession } = ort()
      const asset = Asset.fromModule(require('../../assets/models/yolov8n.onnx'))
      await asset.downloadAsync() // en release copia el asset del APK a disco
      const uri = asset.localUri || asset.uri
      const path = uri.startsWith('file://') ? uri.slice(7) : uri
      try {
        return await InferenceSession.create(path)
      } catch (e) {
        return await InferenceSession.create(uri) // fallback con el scheme
      }
    })()
    // Si falla, permitir reintentar en el próximo intento (no cachear el error).
    sessionPromise.catch(() => {
      sessionPromise = null
    })
  }
  return sessionPromise
}

// --- Preprocesamiento --------------------------------------------------------

// base64 → Uint8Array (decoder propio: Hermes no siempre trae atob y el paso
// por string binario sería más lento para ~1 MB).
const B64 = new Int8Array(128).fill(-1)
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach((c, i) => {
  B64[c.charCodeAt(0)] = i
})

function base64ToBytes(b64) {
  let len = b64.length
  while (len > 0 && b64.charCodeAt(len - 1) === 61) len -= 1 // '=' padding
  const outLen = Math.floor((len * 3) / 4)
  const out = new Uint8Array(outLen)
  let o = 0
  let buffer = 0
  let bits = 0
  for (let i = 0; i < len; i += 1) {
    const v = B64[b64.charCodeAt(i)]
    if (v < 0) continue // saltos de línea u otros
    buffer = (buffer << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[o++] = (buffer >> bits) & 0xff
    }
  }
  return out
}

// Foto (uri) → tensor NCHW float32 [1,3,640,640]. Stretch-resize (sin
// letterbox), igual que la referencia verificada.
async function photoToTensor(uri) {
  const resized = await manipulateAsync(uri, [{ resize: { width: INPUT, height: INPUT } }], {
    compress: 0.92,
    format: SaveFormat.JPEG,
  })
  const b64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' })
  const jpegBytes = base64ToBytes(b64)
  const { data, width, height } = decodeJpeg(jpegBytes, { useTArray: true, formatAsRGBA: true })
  if (width !== INPUT || height !== INPUT) throw new Error(`Resize inesperado: ${width}x${height}`)

  const size = INPUT * INPUT
  const chw = new Float32Array(3 * size)
  for (let i = 0; i < size; i += 1) {
    const p = i * 4 // RGBA
    chw[i] = data[p] / 255 // R
    chw[size + i] = data[p + 1] / 255 // G
    chw[2 * size + i] = data[p + 2] / 255 // B
  }
  const { Tensor } = ort()
  return new Tensor('float32', chw, [1, 3, INPUT, INPUT])
}

// --- Postprocesamiento -------------------------------------------------------

// data plano [84 * 8400]: v(c, i) = data[c*8400 + i]
function candidatesFor(data, classIdx, conf) {
  const out = []
  const row = (4 + classIdx) * NUM_ANCHORS
  for (let i = 0; i < NUM_ANCHORS; i += 1) {
    const score = data[row + i]
    if (score >= conf) {
      const cx = data[i]
      const cy = data[NUM_ANCHORS + i]
      const w = data[2 * NUM_ANCHORS + i]
      const h = data[3 * NUM_ANCHORS + i]
      out.push({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, score })
    }
  }
  return out
}

function nms(cands, iouThreshold) {
  const sorted = [...cands].sort((a, b) => b.score - a.score)
  const keep = []
  for (const c of sorted) {
    let ok = true
    for (const k of keep) {
      const xa = Math.max(c.x1, k.x1)
      const ya = Math.max(c.y1, k.y1)
      const xb = Math.min(c.x2, k.x2)
      const yb = Math.min(c.y2, k.y2)
      const inter = Math.max(0, xb - xa) * Math.max(0, yb - ya)
      const areaC = (c.x2 - c.x1) * (c.y2 - c.y1)
      const areaK = (k.x2 - k.x1) * (k.y2 - k.y1)
      if (inter / (areaC + areaK - inter + 1e-9) >= iouThreshold) {
        ok = false
        break
      }
    }
    if (ok) keep.push(c)
  }
  return keep
}

// Salida cruda → detecciones por clase con el umbral dado. Cajas normalizadas
// 0..1 respecto a la FOTO ORIGINAL (el stretch hace que /640 aplique directo).
export function postprocess(rawData, conf) {
  const result = {}
  for (const [name, idx] of Object.entries(CLASSES)) {
    const boxes = nms(candidatesFor(rawData, idx, conf), IOU_THRESHOLD).map((b) => ({
      left: Math.max(0, b.x1 / INPUT),
      top: Math.max(0, b.y1 / INPUT),
      width: Math.min(1, (b.x2 - b.x1) / INPUT),
      height: Math.min(1, (b.y2 - b.y1) / INPUT),
      score: b.score,
    }))
    result[name] = boxes
  }
  return result
}

// --- API principal -----------------------------------------------------------

/**
 * Analiza una foto y devuelve la salida CRUDA del modelo (Float32Array).
 * La UI llama postprocess(raw, conf) — re-contar al cambiar la sensibilidad
 * no requiere re-inferencia.
 */
export async function analyzePhoto(uri) {
  const session = await loadSession()
  const input = await photoToTensor(uri)
  const results = await session.run({ [session.inputNames[0]]: input })
  const output = results[session.outputNames[0]]
  return output.data // Float32Array [84 * 8400]
}
