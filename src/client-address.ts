export type ClientAddressOptions = {
  request: Request;
  addressHeader: string;
  xffDepth: number;
  requestIP?: string | null;
};

export function clientAddress({
  request,
  addressHeader,
  xffDepth,
  requestIP,
}: ClientAddressOptions): string {
  if (!addressHeader) {
    return requestIP || "";
  }

  if (!request.headers.has(addressHeader)) {
    throw new Error(
      `Address header was specified with ADDRESS_HEADER=${addressHeader} but is absent from request`,
    );
  }

  const value = request.headers.get(addressHeader) || "";

  if (addressHeader !== "x-forwarded-for") {
    return value;
  }

  const addresses = value.split(",");

  if (xffDepth < 1) {
    throw new Error("XFF_DEPTH must be a positive integer");
  }

  if (xffDepth > addresses.length) {
    throw new Error(
      `XFF_DEPTH is ${xffDepth}, but only found ${addresses.length} addresses`,
    );
  }

  return addresses[addresses.length - xffDepth]?.trim() || "";
}
