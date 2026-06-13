import { getHcsMessages } from "./data";

export async function getHcsTopicMessages(topicId: string) {
  return getHcsMessages(topicId);
}
