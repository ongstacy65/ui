import React from 'react';
import { AppLayout } from '../../../components/AppLayout';
import TaxonomyGraph from '../../../components/Taxonomy/Graph';

const TaxonomyGraphPage: React.FC = () => {
  return (
    <AppLayout>
      <div style={{ padding: '20px' }}>
        <h1>Taxonomy Graph Visualization</h1>
        <TaxonomyGraph />
      </div>
    </AppLayout>
  );
};

export default TaxonomyGraphPage;
