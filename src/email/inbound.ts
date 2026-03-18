import type { SESEvent } from "aws-lambda";

export const handler = async (event: SESEvent): Promise<void> => {
  console.log("Inbound email received:", JSON.stringify(event));
};
