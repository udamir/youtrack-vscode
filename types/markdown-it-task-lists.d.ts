declare module "markdown-it-task-lists" {
  interface TaskListOptions {
    enabled?: boolean
    label?: boolean
    labelAfter?: boolean
    labelClass?: string
    containerClass?: string
  }

  function markdownitTaskLists(md: any, options?: TaskListOptions): any
  export = markdownitTaskLists
}
