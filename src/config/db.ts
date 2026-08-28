import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "./envConfig";
import logger from "../services/LoggerService";

const { POSTGRESQL_URL, CONNECTION_TIMEOUT, IDLE_TIMEOUT, MAX } = config;

const FLAG = "DATABASE";
export const pool = new Pool({
  connectionString: POSTGRESQL_URL,
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  idleTimeoutMillis: IDLE_TIMEOUT,
  max: MAX,
});

export const db = drizzle({ client: pool });

class Postgres {
  static async connectDB() {
    try {
      await pool.connect();
      await db.execute("select 1");
      logger.info(`[ ${FLAG} ] - Database connected successfully`);
    } catch (error: any) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while connecting to database: ${error?.message}`,
      );
    }
  }

  static async disconnectDB() {
    try {
      await pool.end();
      logger.warn(`[ ${FLAG} ] - Database disconnected successfully`);
    } catch (error: any) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while disconnecting database: ${error?.message}`,
      );
    }
  }
}

export default Postgres;
