/**
 * BigInt JSON serialization polyfill
 * Automatically converts BigInt values to string representation during JSON.stringify
 */
export const registerBigIntSerializer = (): void => {
  if (!(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function (): string {
      return this.toString();
    };
  }
};

registerBigIntSerializer();
