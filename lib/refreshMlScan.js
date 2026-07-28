export async function scanMissingMlCandidates({
  fetchPage,
  isMissing,
  onCandidates,
  shouldStop,
  pageSize = 100,
}) {
  let cursor = null;
  let scanned = 0;

  while (!shouldStop()) {
    const rows = await fetchPage({ cursor, take: pageSize });
    if (!rows.length) break;
    scanned += rows.length;
    cursor = rows.at(-1).id;

    const candidateIds = rows.filter(isMissing).map(({ id }) => id);
    if (candidateIds.length) await onCandidates(candidateIds);
    if (rows.length < pageSize) break;
  }

  return scanned;
}
