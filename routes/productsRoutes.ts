import { Router } from "express";
import productsController from "../сontrollers/products/productsController";

const productRoutes = Router();

productRoutes.get("/search", productsController.search.bind(productsController));
productRoutes.get("/search/sizes", productsController.getAvailableSizes.bind(productsController));
productRoutes.get("/product", productsController.getProduct);

export default productRoutes;