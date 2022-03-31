import * as path from 'path'
import { fileURLToPath } from 'url'

import type { HasClock, OT } from '../effect/index.js'
import { pipe, T } from '../effect/index.js'
import * as fs from './fs.js'

// TODO do this at compile time as this takes 10ms every time
// use static import once JSON modules are no longer experimental
// import utilsPkg from '@contentlayer/utils/package.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const getContentlayerVersion = (): T.Effect<OT.HasTracer & HasClock, GetContentlayerVersionError, string> => {
  // Go two levels up for "dist/node/version.js"
  const packageJsonFilePath = path.join(__dirname, '..', '..', 'package.json')

  return pipe(
    fs.readFileJson(packageJsonFilePath),
    T.map((pkg: any) => pkg.version as string),
    T.catchTag('node.fs.FileNotFoundError', (e) => T.die(e)),
  )
}

export type GetContentlayerVersionError = fs.ReadFileError | fs.JsonParseError
