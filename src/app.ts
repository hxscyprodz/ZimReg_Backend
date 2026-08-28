import express from "express";
import morgan from "morgan";
import { config } from "./config/envConfig";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
