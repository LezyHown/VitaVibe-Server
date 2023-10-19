
export type ProductQuery = {
  q: string;
  exactMode?: boolean;
  gender?: string;
  colors?: string[];
  sizes?: string;
  minPrice?: string;
  maxPrice?: string;
  discount?: string;
};

export type SearchQuery = ProductQuery & { skip: string; sortByPrice?: "asc" | "desc" };