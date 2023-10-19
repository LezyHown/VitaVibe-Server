import Joi from "joi";

import validationService from "../validationService";
import productModel from "../../mongodb/models/productModel";

import { MAX_SEARCH_RESULTS } from "./productSearchConstants";
import { filterProductVariants } from "./utils";
import { ProductQuery, SearchQuery } from "./types";
import _ from "lodash";

class ProductService {
  buildProductQuery(query: ProductQuery) {
    const regexQuery = new RegExp(`${query.q}`, "ig");
    const searchByQuery = query.exactMode
      ? { $or: [{ "variants.name": regexQuery }, { "variants.subTitle": regexQuery }] }
      : { $text: { $search: query.q, $caseSensitive: false } };

    const searchByColor = query.colors &&
      query.colors.length > 0 && { "variants.color": new RegExp(`${query.colors.join("|")}`, "i") };
    const searchByDiscount = query.discount && { "variants.oldPrice": { $exists: true } };
    const filterBySizes = query.sizes && {
      $and: [
        {
          "variants.sizes.size": { $regex: new RegExp(query.sizes.replace(/,/g, "|")) },
          "variants.sizes.count": { $gte: 1 },
        },
      ],
    };

    return {
      ...searchByQuery,
      ...searchByDiscount,
      ...searchByColor,
      ...filterBySizes,
      "variants.images": { $ne: [] },
      "variants.price": { $gte: query.minPrice ?? 0, $lte: query.maxPrice ?? Number.MAX_VALUE },
      "variants.gender":
        query.gender === "all"
          ? { $in: ["male", "female", null] }
          : query.gender === "null"
          ? null
          : query.gender,
    };
  }
  filterByColors(products: any[], colors: string[]) {
    return filterProductVariants(products, "color", (color) =>
      new RegExp(`${colors?.join("|")}`, "i").test(color)
    );
  }
  filterByPrice(products: any[], minPrice?: string, maxPrice?: string) {
    return filterProductVariants(
      products,
      "price",
      (price) => price >= Number(minPrice ?? 0) && price <= Number(maxPrice ?? Number.MAX_VALUE)
    );
  }
  filterByDiscount(products: any[]) {
    return filterProductVariants(products, "oldPrice", (oldPrice) => Boolean(oldPrice));
  }
  async getAvailableSizes(query: object) {
    const sizes = await productModel.distinct("variants.sizes.size", query).exec();
    const uniqueSizes = [...new Set(sizes?.map((size) => size.replace(/\(.*\)/, "").trim()))];
    return uniqueSizes ?? [];
  }
  async fetchProducts(query: object, searchByIndexes: object, applyPriceSort?: object, skip?: string) {
    const select = {
      "variants.available": 1,
      "variants.color": 1,
      "variants.currency": 1,
      "variants.name": 1,
      "variants.subTitle": 1,
      "variants.sizes": 1,
      "variants.price": 1,
      "variants.oldPrice": 1,
      "variants.images": { $slice: 2 },
      "variants._id": 1,
    };
    const sort = {
      "variants.orders": -1,
      ...searchByIndexes,
      ...applyPriceSort,
    };

    return await productModel
      .find(query, searchByIndexes)
      .select(select)
      .sort(sort as any)
      .skip(Number(skip ?? 0))
      .limit(MAX_SEARCH_RESULTS);
  }
  async getTotalCount(query: object, skip?: string) {
    const countProducts = await productModel.countDocuments(query);
    await validationService.validateField(skip, Joi.number().min(0).max(countProducts).optional(), "skip");
    return countProducts - Number(skip ?? 0);
  }
  async search(squery: SearchQuery) {
    const { sortByPrice, exactMode, colors, skip, minPrice, maxPrice, discount } = squery;

    const query = this.buildProductQuery(squery);
    const applyPriceSort = sortByPrice && { "variants.price": sortByPrice === "asc" ? 1 : -1 };
    const searchByIndexes = !exactMode && !sortByPrice ? { score: { $meta: "textScore" } } : {};

    var products = await this.fetchProducts(query, searchByIndexes, applyPriceSort, skip);

    if (colors) {
      products = this.filterByColors(products, colors);
    }
    if (minPrice || maxPrice) {
      products = this.filterByPrice(products, minPrice, maxPrice);
    }
    if (discount) {
      products = this.filterByDiscount(products);
    }

    return {
      totalCount: await this.getTotalCount(query, skip),
      length: products.length,
      products: products.filter(({ variants }) => variants.length > 0),
    };
  }
  async getProduct(id: string) {
    var product = await productModel.findById(id).select("-variants.clicks -variants.available._id");

    return product;
  }
}

export default new ProductService();
