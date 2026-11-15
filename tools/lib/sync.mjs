// Three-way sync of src/ against upstream, per file (SSOT §6 C3, C4).
// base = derive(old pin), theirs = derive(new commit), ours = current src/.
// merge(ours, base, theirs) -> { ok, text } does the line-level merge; the CLI passes `git merge-file`.

const same = (a, b) => a !== undefined && b !== undefined && a.equals(b);

export function syncTrees({ base, theirs, ours, forks, merge }) {
  const registered = new Set(forks.map((fork) => fork.path));
  const files = new Map();
  const report = { updated: [], added: [], deleted: [], forked: [], merged: [], conflicts: [], own: [], missing: [], unregisteredForks: [], staleForks: [] };
  const upstreamPaths = new Set();

  const paths = [...new Set([...base.keys(), ...theirs.keys(), ...ours.keys()])].sort();
  for (const path of paths) {
    const [b, t, o] = [base.get(path), theirs.get(path), ours.get(path)];
    if (b || t) upstreamPaths.add(path);

    if (!b && !t) {
      files.set(path, o);
      report.own.push(path);
    } else if (!o) {
      if (b && t) report.missing.push(path);
      else if (t) {
        files.set(path, t);
        report.added.push(path);
      }
    } else if (!t) {
      // Upstream deleted the file (b exists). Follow only if orcstack never changed it.
      if (same(o, b)) report.deleted.push(path);
      else {
        files.set(path, o);
        report.conflicts.push(path);
      }
    } else if (!b) {
      // Upstream added a file at a path orcstack already uses.
      if (same(o, t)) files.set(path, o);
      else {
        files.set(path, merge(o, Buffer.alloc(0), t).text);
        report.conflicts.push(path);
      }
    } else if (same(o, b)) {
      files.set(path, t);
      if (!same(t, b)) report.updated.push(path);
    } else if (same(t, b) || same(o, t)) {
      files.set(path, o);
      if (!same(o, t)) report.forked.push(path);
    } else {
      const result = merge(o, b, t);
      files.set(path, result.text);
      (result.ok ? report.merged : report.conflicts).push(path);
    }
  }

  for (const path of upstreamPaths) {
    const result = files.get(path);
    const diverges = result !== undefined && !same(result, theirs.get(path));
    if (diverges && !registered.has(path) && !report.conflicts.includes(path)) report.unregisteredForks.push(path);
  }
  for (const path of registered) {
    const result = files.get(path);
    if (result === undefined || same(result, theirs.get(path))) report.staleForks.push(path);
  }
  for (const list of Object.values(report)) list.sort();

  const ok = report.conflicts.length === 0 && report.unregisteredForks.length === 0 && report.missing.length === 0;
  return { files, report, ok };
}
