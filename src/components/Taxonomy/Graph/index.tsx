'use client';

import React, { useEffect, useState, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import styles from './graph.module.css';

// Define the structure of the taxonomy data, including content and created_by
interface NodeData {
  path: string;
  name: string;
  type: string;
  children?: NodeData[];
  content: string;
  created_by: string;
}

// Define GraphElement using Cytoscape's ElementDefinition for type safety
type GraphElement = cytoscape.ElementDefinition;

// Function to fetch taxonomy data from API
const fetchTaxonomyData = async (): Promise<NodeData[]> => {
  const response = await fetch('/api/taxonomy/graph');
  if (!response.ok) {
    throw new Error('Failed to fetch folder data');
  }
  return response.json();
};

// Function to build Cytoscape elements from NodeData
const buildGraphElements = (data: NodeData[], nodePositions: Record<string, { x: number; y: number }>): GraphElement[] => {
  let elements: GraphElement[] = [];
  const nodesSet = new Set<string>();

  // Add the root node with its position
  elements.push({
    data: { id: 'taxonomy', label: 'taxonomy', type: 'folder', children: data, content: '', created_by: '' },
    position: nodePositions['taxonomy'] || { x: 0, y: 0 } // Default position if not set
  });

  nodesSet.add('taxonomy');
  data.forEach((item: NodeData) => {
    // Explicitly type 'item' as NodeData
    elements = elements.concat(buildGraphElementsRecursive(item, 'taxonomy', nodesSet, nodePositions));
  });

  return elements;
};

// Recursive helper function to build elements
const buildGraphElementsRecursive = (
  node: NodeData,
  parentId: string,
  nodesSet: Set<string>,
  nodePositions: Record<string, { x: number; y: number }>
): GraphElement[] => {
  let elements: GraphElement[] = [];
  const nodeId = node.path;

  if (nodesSet.has(nodeId)) {
    return elements;
  }
  nodesSet.add(nodeId);

  // Add the current node with its position
  elements.push({
    data: { id: nodeId, label: node.name, type: node.type, children: node.children, content: node.content, created_by: node.created_by },
    position: nodePositions[nodeId] || { x: 0, y: 0 } // Use stored position or default
  });

  // Add the edge from parent to current node
  elements.push({
    data: { source: parentId, target: nodeId }
  });

  // If the node is a folder and has children, recurse
  if (node.type === 'folder' && node.children && node.children.length > 0) {
    node.children.forEach((child: NodeData) => {
      // Explicitly type 'child' as NodeData
      elements = elements.concat(buildGraphElementsRecursive(child, nodeId, nodesSet, nodePositions));
    });
  }

  return elements;
};

// Modal component to display node content with a badge based on created_by
const Modal: React.FC<{ isVisible: boolean; content: string; createdBy: string; onClose: () => void }> = ({
  isVisible,
  content,
  createdBy,
  onClose
}) => {
  if (!isVisible) return null;

  const badgeStyle = createdBy === 'IBM' ? styles.ibmBadge : styles.otherBadge;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <span className={`${styles.badge} ${badgeStyle}`}>{createdBy}</span>
          <pre className={styles.formattedContent}>{content}</pre>
          <button onClick={onClose} className={styles.closeButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main TaxonomyGraph component
const TaxonomyGraph: React.FC = () => {
  const [elements, setElements] = useState<GraphElement[]>([]);
  const [nodeData, setNodeData] = useState<NodeData[]>([]); // Store original data
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeContent, setSelectedNodeContent] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [modalCreatedBy, setModalCreatedBy] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Ref to store the Cytoscape instance
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Load taxonomy data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchTaxonomyData();
        setNodeData(data); // Store original data
        const initialElements = buildGraphElements(data, nodePositions);
        setElements(initialElements);
      } catch (error) {
        setError('Error fetching folder data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array ensures this runs once

  // Handle node click events
  const handleNodeClick = (event: cytoscape.EventObject): void => {
    const node = event.target as cytoscape.NodeSingular;
    const nodeId = node.data('id');
    const nodeType = node.data('type');
    const nodeContent = node.data('content');
    const createdBy = node.data('created_by');
    const children = node.data('children');

    if (nodeType === 'folder' && children) {
      toggleNodeVisibility(nodeId);
    } else {
      // If the clicked node is not a folder, show the content in the modal
      setSelectedNodeContent(nodeContent);
      setModalCreatedBy(createdBy);
      setIsModalVisible(true);
    }
  };

  // Toggle visibility of node's children
  const toggleNodeVisibility = (nodeId: string) => {
    const newCollapsedNodes = new Set(collapsedNodes);

    if (newCollapsedNodes.has(nodeId)) {
      // The node is currently collapsed, so expand it
      newCollapsedNodes.delete(nodeId);
    } else {
      // The node is currently expanded, so collapse it
      newCollapsedNodes.add(nodeId);
    }

    setCollapsedNodes(newCollapsedNodes);
    updateVisibility(newCollapsedNodes);
  };

  // Update visibility of nodes based on collapsedNodes set
  const updateVisibility = (collapsedNodes: Set<string>) => {
    if (cyRef.current) {
      cyRef.current.batch(() => {
        // First, show all nodes and edges
        cyRef.current.elements().forEach((ele) => {
          ele.style('display', 'element');
        });

        // Then, hide the children of collapsed nodes
        collapsedNodes.forEach((nodeId) => {
          const node = cyRef.current!.getElementById(nodeId);
          if (node && node.data('children')) {
            node.data('children').forEach((child: NodeData) => {
              hideSubtree(child.path);
            });
          }
        });
      });
    }
  };

  // Hide a subtree starting from nodeId
  const hideSubtree = (nodeId: string) => {
    const node = cyRef.current!.getElementById(nodeId);
    if (node) {
      node.style('display', 'none');
      if (node.data('children')) {
        node.data('children').forEach((child: NodeData) => {
          hideSubtree(child.path);
        });
      }
    }
  };

  // Capture node positions after initial layout
  const captureNodePositions = () => {
    if (cyRef.current) {
      const positions: Record<string, { x: number; y: number }> = {};
      cyRef.current.nodes().forEach((node) => {
        const pos = node.position();
        positions[node.id()] = { x: pos.x, y: pos.y };
      });
      setNodePositions(positions);
    }
  };

  // Initialize Cytoscape with preset layout once positions are captured
  useEffect(() => {
    if (cyRef.current && elements.length > 0 && Object.keys(nodePositions).length === 0) {
      // Apply initial layout
      const layout = cyRef.current.layout({
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.2,
        animate: false
      });

      layout.run();

      // After layout is done, capture positions
      layout.on('layoutstop', () => {
        captureNodePositions();
      });
    }
  }, [elements, nodePositions]);

  // Rebuild elements with positions once nodePositions are set
  useEffect(() => {
    if (nodePositions && Object.keys(nodePositions).length > 0 && nodeData.length > 0) {
      const updatedElements = buildGraphElements(nodeData, nodePositions);
      setElements(updatedElements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodePositions]);

  // Apply preset layout when elements change
  useEffect(() => {
    if (cyRef.current && Object.keys(nodePositions).length > 0) {
      cyRef.current.batch(() => {
        cyRef.current.nodes().forEach((node) => {
          const pos = nodePositions[node.id()];
          if (pos) {
            node.position(pos);
          }
        });
      });
    }
  }, [elements, nodePositions]);

  // Close modal handler
  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedNodeContent(null);
    setModalCreatedBy(null);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={styles.cytoscapeContainer}>
      <CytoscapeComponent
        elements={CytoscapeComponent.normalizeElements(elements)}
        style={{ width: '100%', height: '900px' }}
        layout={{ name: 'preset' }}
        stylesheet={getStylesheet(collapsedNodes)}
        cy={(cy) => {
          cyRef.current = cy; // Store the cy instance
          cy.on('tap', 'node', handleNodeClick);
        }}
      />
      <Modal isVisible={isModalVisible} content={selectedNodeContent || ''} createdBy={modalCreatedBy || ''} onClose={closeModal} />
    </div>
  );
};

// Updated getStylesheet to show collapse/expand icon
const getStylesheet = (collapsedNodes: Set<string>): cytoscape.Stylesheet[] => [
  {
    selector: 'node',
    style: {
      label: (ele: cytoscape.NodeSingular) => {
        const nodeId = ele.data('id');
        const nodeType = ele.data('type');
        const hasChildren = ele.data('children') && ele.data('children').length > 0;
        if (nodeType === 'folder' && hasChildren) {
          const isCollapsed = collapsedNodes.has(nodeId);
          return isCollapsed ? `${ele.data('label')} (▶)` : `${ele.data('label')} (▼)`;
        } else {
          return ele.data('label');
        }
      },
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': '#60b0f4',
      color: '#fff',
      'font-size': '12px',
      width: '80px',
      height: '80px',
      shape: 'ellipse',
      'text-wrap': 'wrap',
      'text-max-width': '60px'
    }
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#ddd',
      'target-arrow-color': '#ddd',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier'
    }
  }
];

export default TaxonomyGraph;
