import type { ReactNode } from "react";

export interface TreeNode {
  children?: TreeNode[];
  defaultExpanded?: boolean;
  description?: ReactNode;
  id: string;
  label: ReactNode;
}

export interface TreeProps {
  nodes: TreeNode[];
}

export function Tree({ nodes }: TreeProps) {
  return (
    <div className="yza-tree">
      {nodes.map((node) => (
        <TreeBranch key={node.id} node={node} />
      ))}
    </div>
  );
}

function TreeBranch({ node }: { node: TreeNode }) {
  const hasChildren = Boolean(node.children?.length);

  if (!hasChildren) {
    return (
      <div className="yza-tree__leaf">
        <div className="yza-tree__label">{node.label}</div>
        {node.description ? (
          <div className="yza-tree__description">{node.description}</div>
        ) : null}
      </div>
    );
  }

  return (
    <details className="yza-tree__branch" open={node.defaultExpanded}>
      <summary className="yza-tree__summary">
        <span className="yza-tree__label">{node.label}</span>
        {node.description ? (
          <span className="yza-tree__description">{node.description}</span>
        ) : null}
      </summary>
      <div className="yza-tree__children">
        {node.children?.map((child) => <TreeBranch key={child.id} node={child} />)}
      </div>
    </details>
  );
}
