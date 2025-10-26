declare module 'webpack' {
  export interface Compiler {}
  export interface Compilation {}
  export interface LoaderContext<T = any> {}
  export interface WebpackPluginInstance {
    apply(compiler: Compiler): void;
  }
}

declare module '@rspack/core' {
  export interface Compiler {}
  export interface Compilation {}
  export interface LoaderContext<T = any> {}
  export interface RspackPluginInstance {
    apply(compiler: Compiler): void;
  }
}

declare module '@farmfe/core' {
  export interface CompilationContext {}
  export interface JsPlugin {
    name: string;
  }
}

declare module 'rolldown' {
  export interface Plugin {
    name: string;
  }
}

declare module 'unloader' {
  export interface Plugin {
    name: string;
  }
}

declare module 'json-schema-to-ts' {
  export type JSONSchema = unknown;
  export type FromSchema<T> = any;
}

declare module '@inlang/paraglide-js/dist/compiler/runtime.js' {
  export type Locale = globalThis.Locale;
}

declare module 'virtual:icons/*' {
  const component: any;
  export default component;
}

declare module 'virtual:icons/mdi/cart-outline' {
  const component: any;
  export default component;
}

declare module '$lib/paraglide/runtime.js' {
  export const locales: readonly Locale[];
  export const localizeHref: (path: string) => string;
  export const deLocalizeUrl: (url: string | URL) => URL;
  export const getLocale: () => Locale;
  export const setLocale: (locale: Locale, options?: { reload?: boolean }) => Promise<void>;
}

declare module '$lib/paraglide/server' {
  export const paraglideMiddleware: (request: Request, handler: (context: { request: Request; locale: Locale }) => unknown) => Promise<unknown>;
}


declare module '$env/static/private' {
  export const RESIZER_URL: string;
}

declare global {
  type Locale = 'es' | 'en';
}
