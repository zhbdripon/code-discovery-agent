import { ListFilesReturnItem } from "../types";

type TreeNode = {
  files: Set<string>;
  dirs: Map<string, TreeNode>;
};

export default function formatFileTree(items: ListFilesReturnItem[]): string {
  const root: TreeNode = {
    files: new Set(),
    dirs: new Map(),
  };

  // Build tree
  for (const item of items) {
    const parts = item.path
      .replace(/^\.\/+/, "")
      .split("/")
      .filter(Boolean);

    if (parts.length === 0) continue;

    let node = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      let child = node.dirs.get(part);

      if (!child) {
        child = {
          files: new Set(),
          dirs: new Map(),
        };

        node.dirs.set(part, child);
      }

      node = child;
    }

    const name = parts[parts.length - 1];

    if (item.type === "file") {
      node.files.add(name);
    } else {
      // Make sure explicitly returned directories exist in the tree.
      if (!node.dirs.has(name)) {
        node.dirs.set(name, {
          files: new Set(),
          dirs: new Map(),
        });
      }
    }
  }

  const lines: string[] = [];

  function render(node: TreeNode, prefix: string, indent: string) {
    // Files
    for (const file of [...node.files].sort()) {
      lines.push(`${indent}${file}`);
    }

    // Directories
    for (const [name, child] of [...node.dirs.entries()].sort()) {
      const path = `${prefix}${name}`;

      // Collapse directories that only contain another directory.
      let collapsedPath = path;
      let current = child;

      while (current.files.size === 0 && current.dirs.size === 1) {
        const [childName, childNode] = [...current.dirs.entries()][0];

        collapsedPath += `/${childName}`;
        current = childNode;
      }

      lines.push(`${indent}${collapsedPath}/`);

      render(current, `${collapsedPath}/`, indent + "  ");
    }
  }

  render(root, "", "");
  return lines.join("\n");
}
