import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain",
    },
    body: `ok (stage: ${process.env.STAGE})`,
  };
};
