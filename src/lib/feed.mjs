import { base, issues } from './issues.mjs'

const issuesPerPage = 2
export const feedPages = Array.from(
  { length: Math.ceil(issues.length / issuesPerPage) },
  (_, index) => issues.slice(index * issuesPerPage, (index + 1) * issuesPerPage),
)
export const feedUrl = page => page === 1 ? base + '/' : base + '/feed/' + page + '/'

export const directory = Object.entries(Object.groupBy(
  feedPages.flatMap((batch, index) => batch.map(issue => ({
    date: issue.date,
    title: issue.title,
    directoryLabel: issue.directoryLabel ?? Array.from(issue.tags[0]).slice(0, 8).join(''),
    page: index + 1,
  }))),
  issue => issue.date.slice(0, 4),
)).reverse()
