export interface Page<T> {nodes: T[]; pageInfo: {hasNextPage: boolean; endCursor?: string | null};}
export async function paginate<T>(fetchPage: (after?: string) => Promise<Page<T>>): Promise<T[]> {
  const all: T[] = []; let after: string | undefined;
  do {
    const page = await fetchPage(after); all.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    if (!page.pageInfo.endCursor) throw new Error("Pagination indicated another page without endCursor");
    after = page.pageInfo.endCursor;
  } while (true);
  return all;
}
