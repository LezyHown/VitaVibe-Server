import { Router } from "express";
import productsController from "../сontrollers/products/productsController";

const productRoutes = Router();

productRoutes.get("/search", productsController.search);
productRoutes.get("/product", productsController.getProduct);

export default productRoutes;