import express from "express";
import morgan from "morgan";
import ErrorHandlingMiddleware from "./middlewares/ErrorHandling";
import RouteNotFoundMiddleware from "./middlewares/ResourceNotFound";
import { config } from "./config/envConfig";
import AuthRoutes from "./routes/AuthRoutes";
import ProvincesRoutes from "./routes/ProvincesRoutes";
import DistrictsRoutes from "./routes/DistrictsRoutes";
import StationsRoutes from "./routes/StationsRoutes";
import HospitalRoutes from "./routes/HospitalsRoutes";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/provinces", ProvincesRoutes);
app.use("/api/v1/districts", DistrictsRoutes);
app.use("/api/v1/stations", StationsRoutes);
app.use("/api/v1/hospitals", HospitalRoutes);

app.use(RouteNotFoundMiddleware);
app.use(ErrorHandlingMiddleware);
