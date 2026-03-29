import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const kv = {
  async get<T>(pk: string): Promise<T | null> {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk },
      }),
    );
    return (Item?.data as T) || null;
  },

  async set<T>(pk: string, data: T, ttlSeconds?: number): Promise<void> {
    const Item: Record<string, T> = {
      pk,
      data,
    };

    if (ttlSeconds !== undefined) {
      Item.expires_at = Math.floor(Date.now() / 1000) + ttlSeconds;
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item,
      }),
    );
  },

  async delete(pk: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk },
      }),
    );
  },
};
