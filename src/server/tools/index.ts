import { retrieveKnowledge } from "../knowledge/repository";
import { groups, sources } from "../../content/catalog";
import { config } from "../config";
import type { Identity, Service } from "../service";
export function tools(service: Service, identity: Identity) {
  config();
  return {
    get_my_profile: () => service.profile(identity),
    get_group_questions: (group: string, stage: "explore" | "clarify") =>
      groups
        .find((g) => g.id === group)
        ?.questions.filter((q) => q.purpose === stage) ?? [],
    retrieve_approved_content: (query: string) =>
      retrieveKnowledge(service.db, identity, query),
    get_strategy_options: (group: string) =>
      groups.find((g) => g.id === group)?.actions ?? [],
    get_support_options: () => ({
      configured: false,
      options: [],
      reason: "Chưa có đầu mối được xác minh; không liên hệ bên ngoài",
    }),
  };
}
