import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";

import _ from "lodash";
import validationService from "../../services/validationService";
import { createHttpError } from "../../services/httpErrorService";

import productService from "../../services/products/productService";
import { SearchQuery } from "../../services/products/types";
import { searchColors } from "../../services/products/utils";
import { SEARCH_COLORS } from "../../services/products/productSearchConstants";
import { productGenderSchema, productQuerySchema, sortBySchema } from "./productsValidation";

class ProductsController {
  async prepareSearchQuery(req: Request) {
    const {
      q,
      skip,
      minPrice,
      maxPrice,
      discount,
      sizes,
      sortByPrice,
      exactMode = "false",
      gender = "all",
    } = req.query as any;
    let { colors } = req.query as any;

    colors = (colors && searchColors(colors + " " + q)) ?? searchColors(q) ?? undefined;

    if (colors === null) {
      throw createHttpError(400, {
        errors: { field: "colors", value: "Choose available colors" },
        available: SEARCH_COLORS,
      });
    }

    await validationService.validateField(sortByPrice, sortBySchema, "sortByPrice");
    await validationService.validateField(q, productQuerySchema, "q");
    await validationService.validateField(gender, productGenderSchema, "gender");

    return {
      q,
      skip,
      gender,
      colors,
      sizes,
      minPrice,
      maxPrice,
      discount,
      sortByPrice,
      exactMode: exactMode === "true",
    } as SearchQuery;
  }
  /**
   * Выполняет поиск продуктов в базе данных на основе заданных параметров.
   *
   * @description
   * Для выполнения поиска необходимо передать параметры запроса:
   * - q: Обязательный параметр для поиска (query запрос).
   * - skip: Параметр для пропуска результатов (опциональный).
   * - sizes: Параметр для фильтрации по размеру (опциональный).
   * - gender: Параметр для фильтрации по полу (по умолчанию "all").
   * - minPrice: Минимальная цена продукта (опциональный).
   * - maxPrice: Максимальная цена продукта (опциональный).
   * - discount: Фильтр по наличию скидки (опциональный).
   * - sortByPrice: Сортирока цены, low-to-high "asc" и high-to-low "desc" (опциональный, по умолчанию без сортировки).
   * - exactMode: Флаг для точного поиска (опциональный, по умолчанию false).
   * - colors: Массив цветов для фильтрации по цветам (опциональный).
   *
   * Пример запроса:
   * /search?q=yellow and red shoes&gender=all&minPrice=40&maxPrice=100&discount=true&colors[]=red&colors[]=multi-color
   */
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = await this.prepareSearchQuery(req);
      const searchResults = await productService.search(query);

      res.status(200).send(searchResults);
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }
  async getAvailableSizes(req: Request, res: Response, next: NextFunction) {
    try {
      const query = await this.prepareSearchQuery(req);
      const productQuery = productService.buildProductQuery(query);
      const sizes = await productService.getAvailableSizes(productQuery);

      res.status(200).send(sizes);
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }
  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.query;

      res
        .status(200)
        .send({ product: isValidObjectId(id) && (await productService.getProduct(id as string)) });
    } catch (err) {
      next(err);
    } finally {
      next();
    }
  }
}

export default new ProductsController();
