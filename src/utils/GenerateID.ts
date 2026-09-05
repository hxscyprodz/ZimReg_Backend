import { redisClient } from "../services/Redis";

class GenerateIds {
  private static getDateComponents() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    return { year, month };
  }

  static async UserID(baseKey: string): Promise<string> {
    const { month, year } = this.getDateComponents();

    const monthlyKey = `${baseKey}:${year}${month}`;
    const newValue = await redisClient.incr(monthlyKey);

    const normalizedValue = newValue.toString().padStart(4, "0");
    return `CT-${year}${month}${normalizedValue}`;
  }

  static async ApplicationID(type: "BIRTH" | "ID", baseKey: string) {
    const { month, year } = this.getDateComponents();

    const key = `${type.toLocaleLowerCase()}-${baseKey}`;
    const monthlyKey = `${key}:${year}${month}`;
    const newValue = await redisClient.incr(monthlyKey);

    const normalizedValue = newValue.toString().padStart(5, "0");
    return `${type}-${year}${month}${normalizedValue}`;
  }
}

export default GenerateIds;
