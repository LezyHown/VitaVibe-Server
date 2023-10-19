import { set } from "lodash";
import { SEARCH_COLORS } from "./productSearchConstants";

export function filterProductVariants(products: any[], field: string, condition: (value: any) => boolean) {
  return products.map((product) => {
    const cleanProductVariants = product.variants.filter((variant: any) => condition(variant[field]));
    return set(product, "variants", cleanProductVariants);
  });
}

export function searchColors(input: string): string[] | null {
  const regexColors = new RegExp(`(\\b${SEARCH_COLORS.join("\\b|\\b")}\\b)`, "gi");
  return input.match(regexColors);
}