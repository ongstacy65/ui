'use client';

import React, { useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import styles from './graph.module.css';

interface NodeData {
  path: string;
  name: string;
  type: string;
  children?: NodeData[];
}

const fetchTaxonomyData = async (): Promise<NodeData[]> => {
  const response = await fetch('/api/taxonomy/graph');
  if (!response.ok) {
    throw new Error('Failed to fetch folder data');
  }
  return response.json();
};

const buildGraphElements = (data: NodeData[]): any[] => {
  let elements: any[] = [];
  let nodesSet = new Set<string>();

  elements.push({
    data: { id: 'taxonomy', label: 'taxonomy', type: 'folder', children: data },
  });

  nodesSet.add('taxonomy');
  data.forEach((item) => {
    elements = elements.concat(buildGraphElementsRecursive(item, 'taxonomy', nodesSet));
  });

  return elements;
};

const buildGraphElementsRecursive = (node: NodeData, parentId: string, nodesSet: Set<string>): any[] => {
  let elements: any[] = [];
  const nodeId = node.path;

  if (nodesSet.has(nodeId)) {
    return elements;
  }
  nodesSet.add(nodeId);

  elements.push({
    data: { id: nodeId, label: node.name, type: node.type, children: node.children },
  });

  elements.push({
    data: { source: parentId, target: nodeId },
  });

  if (node.type !== 'folder' || !node.children || node.children.length === 0) {
    return elements;
  }

  node.children.forEach((child) => {
    elements = elements.concat(buildGraphElementsRecursive(child, nodeId, nodesSet));
  });

  return elements;
};

const Modal: React.FC<{ isVisible: boolean; content: string; onClose: () => void }> = ({ isVisible, content, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <span>{content}</span>
          <button onClick={onClose} className={styles.closeButton}>Close</button>
        </div>
      </div>
    </div>
  );
};

const TaxonomyGraph: React.FC = () => {
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeContent, setSelectedNodeContent] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchTaxonomyData();
        const graphElements = buildGraphElements(data);
        setElements(graphElements);
      } catch (error) {
        setError('Error fetching folder data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleNodeClick = (event: any) => {
    const node = event.target;
    const nodeType = node.data('type');
    const nodeName = node.data('label');
    const children = node.data('children');
    
    if (nodeType !== 'folder') {
      setSelectedNodeContent(nodeName);
      setIsModalVisible(true);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedNodeContent(null);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={styles.cytoscapeContainer}>
      {elements.length > 0 && (
        <>
          <CytoscapeComponent
            elements={elements}
            style={{ width: '100%', height: '900px' }}
            layout={{ name: 'breadthfirst', directed: true, spacingFactor: 1.2, animate: true }}
            stylesheet={getStylesheet()}
            cy={(cy) => {
              cy.on('tap', 'node', handleNodeClick);
            }}
          />
          <Modal
            isVisible={isModalVisible}
            content={selectedNodeContent || ''}
            onClose={closeModal}
          />
        </>
      )}
    </div>
  );
};

const getStylesheet = (): cytoscape.Stylesheet[] => [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': '#60b0f4',
      color: '#fff',
      'font-size': '12px',
      width: '80px',
      height: '80px',
      shape: 'ellipse',
      'text-wrap': 'wrap',
      'text-max-width': '60px',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#ddd',
      'target-arrow-color': '#ddd',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
    },
  },
];

export default TaxonomyGraph;
