export type ProductCartVariant = {
  color: string;
  _id: string;
  name: string;
  subTitle: string;
  price: number;
  oldPrice: number;
  currency: string;
};
export type CartProduct = ProductCartVariant & {
  productRefId: string;
  sizes: Record<string, { quantity: number }>;
  image: string;
};

export type Cart = {
  products: Record<CartProduct["_id"], CartProduct>;
  deliveryType: "post" | "courier";
};

export type CartVariantModel = ProductCartVariant & {
  images: { thumbnail: string, original: string }[],
  sizes: {
    count: number;
    size: string;
  }[];
};

export type MismatchedVariant = {
  variantId: string, 
  size: string, 
  quantity: number
}

export type PaymentData = { paymentMethodData: { tokenizationData: { token: string } } };