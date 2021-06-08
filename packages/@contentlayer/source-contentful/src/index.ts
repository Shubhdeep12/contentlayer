import type { GetAllTypeNamesGen, SourcePlugin } from '@contentlayer/core'
import { createClient } from 'contentful-management'
import type { Observable } from 'rxjs'
import { forkJoin, from, interval, of } from 'rxjs'
import { mergeMap, startWith } from 'rxjs/operators'

import type * as Contentful from './contentful-types'
import { fetchData } from './fetchData'
import { provideSchema } from './provideSchema'

export type SchemaOverrides = {
  objectTypes?: GetAllTypeNamesGen[]
  documentTypes?: GetAllTypeNamesGen[]
}

type MakeSourcePlugin = (_: {
  accessToken: string
  spaceId: string
  environmentId?: string
  /**
   * Since Contentful only provides one kind of content types this schema overrides argument allows you
   * to turn relations into embedded objects. Either provide an array of type names via `objectTypes` or `documentTypes`.
   */
  schemaOverrides?: SchemaOverrides
}) => SourcePlugin

export const makeSourcePlugin: MakeSourcePlugin = ({
  accessToken,
  spaceId,
  environmentId = 'master',
  schemaOverrides = {},
}) => ({
  type: 'contentful',
  provideSchema: async () => {
    const environment = await getEnvironment({ accessToken, spaceId, environmentId })
    return provideSchema({ environment, schemaOverrides })
  },
  fetchData: ({ watch, force, previousCache }) => {
    const updates$ = watch ? getUpdateEvents().pipe(startWith(0)) : of(0)
    const data$ = from(getEnvironment({ accessToken, spaceId, environmentId })).pipe(
      mergeMap((environment) => forkJoin([of(environment), provideSchema({ environment, schemaOverrides })])),
      mergeMap(([environment, schemaDef]) => fetchData({ schemaDef, force, previousCache, environment })),
    )

    return updates$.pipe(mergeMap(() => data$))
  },
})

const getEnvironment = async ({
  accessToken,
  spaceId,
  environmentId,
}: {
  accessToken: string
  spaceId: string
  environmentId: string
}): Promise<Contentful.Environment> => {
  const client = createClient({ accessToken })
  const space = await client.getSpace(spaceId)
  return space.getEnvironment(environmentId)
}

// TODO remove polling and implement "properly"
const getUpdateEvents = (): Observable<any> => interval(5_000)
