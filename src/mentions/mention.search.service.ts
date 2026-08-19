import {
  countMentions,
  searchMentions,
} from "./mention.search.repository.js";

const PAGE_SIZE = 5;

export interface SearchMentionsInput {
  q?: string;
  source?: string;
  from?: Date;
  to?: Date;
  page: number;
}

export async function getMentions(
  input: SearchMentionsInput,
) {
  const offset =
    (input.page - 1) * PAGE_SIZE;

  const repositoryParams = {
    q: input.q,
    source: input.source,
    from: input.from,
    to: input.to,
    limit: PAGE_SIZE,
    offset,
  };

  const [data, total] = await Promise.all([
    searchMentions(repositoryParams),
    countMentions(repositoryParams),
  ]);

  return {
    data,
    pagination: {
      page: input.page,
      page_size: PAGE_SIZE,
      total,
      total_pages:
        total === 0
          ? 0
          : Math.ceil(total / PAGE_SIZE),
    },
  };
}