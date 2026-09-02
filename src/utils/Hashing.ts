import { password as Password } from "bun";

class Hashing {
  static hashPassword(password: string): Promise<string> {
    return Password.hash(password, { algorithm: "argon2id" });
  }

  static verifyPassword(
    password: string,
    hashPassword: string,
  ): Promise<boolean> {
    return Password.verify(password, hashPassword);
  }
}

export default Hashing;
