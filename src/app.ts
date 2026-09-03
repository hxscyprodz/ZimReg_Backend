import express from "express";
import morgan from "morgan";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import ErrorHandlingMiddleware from "./middlewares/ErrorHandling";
import RouteNotFoundMiddleware from "./middlewares/ResourceNotFound";
import { config } from "./config/envConfig";
import AuthRoutes from "./routes/AuthRoutes";
import ProvincesRoutes from "./routes/ProvincesRoutes";
import DistrictsRoutes from "./routes/DistrictsRoutes";
import StationsRoutes from "./routes/StationsRoutes";
import HospitalRoutes from "./routes/HospitalsRoutes";
import { ForbiddenError } from "./errors/errors";

export const app = express();

const allowedOrigin = config.ORIGINS.split(",") || [];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigin.includes(origin)) {
      callback(null, true);
    } else {
      callback(
        new ForbiddenError("Blocked by CORS policy: Origin not allowed"),
      );
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cors(corsOptions));
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/provinces", ProvincesRoutes);
app.use("/api/v1/districts", DistrictsRoutes);
app.use("/api/v1/stations", StationsRoutes);
app.use("/api/v1/hospitals", HospitalRoutes);

app.use(RouteNotFoundMiddleware);
app.use(ErrorHandlingMiddleware);
