import type { SESEvent } from "aws-lambda";

export const handler = async (event: SESEvent): Promise<void> => {
  console.log("Outbound email received:", JSON.stringify(event));
};
