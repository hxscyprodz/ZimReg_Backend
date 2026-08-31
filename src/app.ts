import express from "express";
import morgan from "morgan";
import ErrorHandlingMiddleware from "./middlewares/ErrorHandling";
import RouteNotFoundMiddleware from "./middlewares/ResourceNotFound";
import { config } from "./config/envConfig";
import ProvincesRoutes from "./routes/ProvincesRoutes";
import DistrictsRoutes from "./routes/DistrictsRoutes";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api/v1/provinces", ProvincesRoutes);
app.use("/api/v1/districts", DistrictsRoutes);

app.use(RouteNotFoundMiddleware);
app.use(ErrorHandlingMiddleware);
