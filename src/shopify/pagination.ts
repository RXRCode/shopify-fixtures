export interface Page<T> {
  nodes: T[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string | null;
  };
}

export async function paginate<T>(
  fetchPage: (after?: string) => Promise<Page<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await fetchPage(after);

    all.push(...page.nodes);

    hasNextPage = page.pageInfo.hasNextPage;

    if (hasNextPage) {
      if (!page.pageInfo.endCursor) {
        throw new Error(
          "Pagination indicated another page without endCursor",
        );
      }

      after = page.pageInfo.endCursor;
    }
  }

  return all;
}