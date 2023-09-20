import { NextFunction, Request, Response } from "express";

import _ from "lodash";
import validationService from "../../services/validationService";
import { createHttpError } from "../../services/httpErrorService";

import { isValidObjectId } from "mongoose";
import { SEARCH_COLORS } from "../../services/productSearchConstants";
import productService, { searchColors } from "../../services/productService";
import { productGenderSchema, productQuerySchema, sortBySchema } from "./productsValidation";

class ProductsController {
  /**
   * Выполняет поиск продуктов в базе данных на основе заданных параметров.
   *
   * @description
   * Для выполнения поиска необходимо передать параметры запроса:
   * - q: Обязательный параметр для поиска (query запрос).
   * - skip: Параметр для пропуска результатов (опциональный).
   * - gender: Параметр для фильтрации по полу (по умолчанию "all").
   * - minPrice: Минимальная цена продукта (опциональный).
   * - maxPrice: Максимальная цена продукта (опциональный).
   * - discount: Фильтр по наличию скидки (опциональный).
   * - exactMode: Флаг для точного поиска (опциональный, по умолчанию false).
   * - colors: Массив цветов для фильтрации по цветам (опциональный).
   *
   * Пример запроса:
   * /search?q=yellow and red shoes&gender=all&minPrice=40&maxPrice=100&discount=true&colors[]=red&colors[]=multi-color
   */
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        q,
        skip,
        minPrice,
        maxPrice,
        discount,
        sortByPrice,
        gender = "all",
        exactMode = false,
      } = req.query as any;
      var { colors } = req.query as any;

      // ====================================================
      // Поиск цветов в запросе и настройка параметра colors
      // ====================================================
      colors = (colors && searchColors(colors + " " + q)) ?? searchColors(q) ?? undefined;

      // =============================
      // Валидация параметров поиска
      // =============================
      if (colors === null) {
        throw createHttpError(400, {
          errors: { field: "colors", value: "Choose available colors" },
          available: SEARCH_COLORS,
        });
      }

      await validationService.validateField(sortByPrice, sortBySchema, "sortByPrice");
      await validationService.validateField(q, productQuerySchema, "q");
      await validationService.validateField(gender, productGenderSchema, "gender");

      const searchResults = await productService.search(
        q,
        skip,
        gender,
        colors,
        minPrice,
        maxPrice,
        discount,
        sortByPrice,
        exactMode
      );

      res.status(200).send({ ...searchResults });
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
