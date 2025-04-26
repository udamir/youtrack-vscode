import yaml from "js-yaml"
import type { ArticleEntity, IssueEntity } from "../../views"

export const dumpEntity = (entity: IssueEntity | ArticleEntity | null): string => {
  if (!entity) {
    return ""
  }

  const { content, description, ...rest } = entity as any

  return `---\n${yaml.dump(rest)}---\n${content || description || ""}`
}
