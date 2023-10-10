import Joi from "joi";

import validationService from "../validationService";
import productModel from "../../mongodb/models/productModel";

import { MAX_SEARCH_RESULTS, SEARCH_COLORS } from "./productSearchConstants";
import _ from "lodash";

function filterProductVariants(products: any[], field: string, condition: (value: any) => boolean) {
  return products.map((product) => {
    const cleanProductVariants = product.variants.filter((variant: any) => condition(variant[field]));
    return _.set(product, "variants", cleanProductVariants);
  });
}

export function searchColors(input: string): string[] | null {
  const regexColors = new RegExp(`(\\b${SEARCH_COLORS.join("\\b|\\b")}\\b)`, "gi");
  return input.match(regexColors);
}

class ProductService {
  async search(
    q: string,
    skip?: string,
    gender?: string,
    colors?: string[],
    sizes?: string,
    minPrice?: string,
    maxPrice?: string,
    discount?: string,
    sortByPrice?: "asc" | "desc",
    exactMode?: boolean
  ) {
    // ================================
    // Инициализация параметров поиска
    // ================================
    const regexQuery = new RegExp(`${q}`, "ig");
    const searchByQuery = exactMode
      ? { $or: [{ "variants.name": regexQuery }, { "variants.subTitle": regexQuery }] }
      : { $text: { $search: q, $caseSensitive: false } };

    const searchByIndexes = !exactMode && !sortByPrice ? ({ score: { $meta: "textScore" } } as object) : {};
    const searchByColor = colors &&
      colors.length > 0 && { "variants.color": new RegExp(`${colors.join("|")}`, "i") };
    const searchByDiscount = discount && { "variants.oldPrice": { $exists: true } };
    const filterBySizes = sizes && {
      $and: [
        {
          "variants.sizes.size": { $regex: new RegExp(sizes.replace(/,/g, "|")) },
          "variants.sizes.count": { $gte: 1 },
        },
      ],
    };
    const applyPriceSort = sortByPrice && ({ "variants.price": sortByPrice === "asc" ? 1 : -1 } as object);

    // =====================================================
    // Фомирование поискового запроса для модели продуктов
    // =====================================================
    const query = {
      ...searchByQuery,
      ...searchByDiscount,
      ...searchByColor,
      ...filterBySizes,
      "variants.price": { $gte: minPrice ?? 0, $lte: maxPrice ?? Number.MAX_VALUE },
      "variants.gender":
        gender === "all" ? { $in: ["male", "female", null] } : gender === "null" ? null : gender,
    } as any;

    // ==========================================================================
    // Подсчёт поиска возможных вариантов по запросу и применение параметра skip
    // ==========================================================================
    var totalCount = await productModel.countDocuments(query);
    await validationService.validateField(skip, Joi.number().min(0).max(totalCount).optional(), "skip");
    if (skip) {
      totalCount -= Number(skip);
    }

    // ===========================================================
    // Поиск, выборка полей, сортировка, применение доп. фильтров
    // ===========================================================
    var products = await productModel
      .find(query, searchByIndexes)
      .select({
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
      })
      .sort({
        "variants.orders": -1,
        ...searchByIndexes,
        ...applyPriceSort,
      })
      .skip(Number(skip ?? 0))
      .limit(MAX_SEARCH_RESULTS);

    // =======================
    // Фильтрация вариантов
    // =======================
    if (colors)
      products = filterProductVariants(products, "color", (color) =>
        new RegExp(`${colors?.join("|")}`, "i").test(color)
      );
    if (minPrice || maxPrice)
      products = filterProductVariants(
        products,
        "price",
        (price) => price >= Number(minPrice ?? 0) && price <= Number(maxPrice ?? Number.MAX_VALUE)
      );
    if (discount) products = filterProductVariants(products, "oldPrice", (oldPrice) => Boolean(oldPrice));

    // ==============================
    // Достаём все доступные размеры
    // ==============================
    const aggregateSizes =
      (
        await productModel
          .aggregate([
            { $match: query }, // Фильтрация продуктов
            {
              $unwind: "$variants", // Разгружаем массив variants
            },
            {
              $unwind: "$variants.sizes", // Разгружаем массив sizes
            },
            {
              $group: {
                _id: {
                  size: "$variants.sizes.size",
                },
                totalCount: {
                  $sum: "$variants.sizes.count", // Сумма для каждого размера
                },
              },
            },
            {
              $group: {
                _id: null,
                allSizes: {
                  $push: {
                    size: "$_id.size",
                    count: "$totalCount",
                  },
                },
              },
            },
          ])
          .exec()
      )[0]?.allSizes.map((_size: { size: string, count: number }) => ({
        ..._size,
        size: _size.size.replace(/\(.*\)/, "").trim(),
      })) ?? [];

    return {
      totalCount,
      length: products.length,
      allSizes: _.chain(aggregateSizes).uniqBy("size").sortBy("size").value(),
      products: products.filter(
        ({ variants }) => variants.length > 0 && variants.every(({ images }) => images.length > 0)
      ),
    };
  }
  async getProduct(id: string) {
    var product = await productModel.findById(id).select("-variants.clicks -variants.available._id");

    return product;
  }
}

export default new ProductService();
