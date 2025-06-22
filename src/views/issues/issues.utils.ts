import type { IssuesSource } from "../searches"

export const getIssuesViewTitle = (source?: IssuesSource): string => {
  switch (source?.type) {
    case "project":
      return `Issues from Project: ${source.source.shortName}`

    case "search":
      return `Issues from Search: ${source.source.name}`

    case "sprint":
      return `Issues from Sprint: ${source.source.name}`

    case "favorites":
      return "Favorites Issues"

    case "assignedToMe":
      return "Assigned to Me Issues"

    case "commentedByMe":
      return "Commented by Me Issues"

    case "reportedByMe":
      return "Reported by Me Issues"

    default:
      return "Issues"
  }
}

export const getIssuesViewDescription = ({ type, source } = {} as IssuesSource, filter?: string): string => {
  switch (type) {
    case "project":
      return `project: {${source.shortName}} ${filter ? ` ${filter}` : ""}`

    case "search":
      return `saved search: ${source.name} ${filter ? ` ${filter}` : ""}`

    case "sprint":
      return `Board ${source.agile.name}: ${source.name}`

    case "favorites":
      return `tag: Star ${filter ? ` ${filter}` : ""}`

    case "assignedToMe":
      return `assigned to: me ${filter ? ` ${filter}` : ""}`

    case "commentedByMe":
      return `commented by: me ${filter ? ` ${filter}` : ""}`

    case "reportedByMe":
      return `reported by: me ${filter ? ` ${filter}` : ""}`

    default:
      return filter || ""
  }
}
