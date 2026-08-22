export type Probe = {
	url: string;
	origin: string;
	pathname: string;
	method: string;
	clientAddress: string;
	platform: {
		keys: string[];
		hasServer: boolean;
		hasRequest: boolean;
	};
	instrumented: boolean;
	prodMarker: string;
	devMarker: string;
	forwardedFor: string | null;
};
