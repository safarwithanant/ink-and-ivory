type DefaultShippingAddress = {
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function toStripeShippingAddress(address: DefaultShippingAddress) {
  return {
    name: address.fullName,
    phone: address.phone || undefined,
    address: {
      line1: address.line1,
      line2: address.line2 || undefined,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      country: address.country,
    },
  };
}
