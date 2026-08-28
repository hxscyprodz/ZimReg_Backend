import express from "express";
import morgan from "morgan";
import ErrorHandlingMiddleware from "./middlewares/ErrorHandling";
import RouteNotFoundMiddleware from "./middlewares/ResourceNotFound";
import { config } from "./config/envConfig";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

app.use(RouteNotFoundMiddleware);
app.use(ErrorHandlingMiddleware);
