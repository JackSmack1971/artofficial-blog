/**
* Ambient declaration to satisfy TypeScript for '@tryghost/content-api' which ships without types.
* This includes the overloaded signatures used by our code (read(params) and read(params, options)).
*/
declare module '@tryghost/content-api' {
 interface GhostContentAPIConfig {
   url: string
   key: string
   version?: string
 }

 type Params = Record<string, unknown>
 interface ReadOptions {
   include?: string[] | string
   fields?: string[] | string
   formats?: string[] | string
 }

 // Minimal surface we use; extend as needed
 class GhostContentAPI {
   constructor(config: GhostContentAPIConfig)
   posts: {
     browse(params?: Params): Promise<unknown[]>
     // Support both 1-arg and 2-arg usages
     read(params: Params): Promise<unknown>
     read(params: Params, options: ReadOptions): Promise<unknown>
   }
   pages: {
     browse(params?: Params): Promise<unknown[]>
     read(params: Params): Promise<unknown>
     read(params: Params, options: ReadOptions): Promise<unknown>
   }
   tags: {
     browse(params?: Params): Promise<unknown[]>
     read(params: Params): Promise<unknown>
     read(params: Params, options: ReadOptions): Promise<unknown>
   }
   authors: {
     browse(params?: Params): Promise<unknown[]>
     read(params: Params): Promise<unknown>
     read(params: Params, options: ReadOptions): Promise<unknown>
   }
 }

 export default GhostContentAPI
}