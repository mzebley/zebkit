
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/components" | "/components/button";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/components": Record<string, never>;
			"/components/button": Record<string, never>
		};
		Pathname(): "/" | "/components" | "/components/" | "/components/button" | "/components/button/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/zebkit/allowed-token-types.json" | "/zebkit/default-tokens.json" | "/zebkit/token-lookup.json" | "/zebkit/zbk-default-variants.json" | "/zebkit/zbk-default.min.css" | "/zebkit/zebkit.js" | "/zebkit/zebkit.js.map" | string & {};
	}
}