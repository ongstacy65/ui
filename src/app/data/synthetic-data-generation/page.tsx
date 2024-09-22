'use client'

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  Card,
  CardBody,
  CardTitle,
  TextArea,
  Button,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';

const SyntheticDataGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [output, setOutput] = useState<string>('');

  const handlePromptChange = (value: string) => {
    setPrompt(value);
  };

  const handleSubmit = () => {
    // Here you would typically send the prompt to an API and get the response
    // For this example, we'll just set the output to the prompt
    setOutput(`Response to: ${prompt}`);
  };

  return (
    <AppLayout>
      <Split hasGutter className="pf-u-display-flex pf-u-justify-content-center pf-u-align-items-center" style={{ minHeight: '100vh' }}>
      <SplitItem isFilled className="pf-u-mt-xl">
          <Card isFullHeight>
            <CardTitle>Prompt Input</CardTitle>
            <CardBody isFilled>
              <Stack hasGutter>
                <StackItem className="pf-u-display-flex pf-u-justify-content-center">
                  <TextArea
                  value={prompt}
                  onChange={(_event, value) => handlePromptChange(value)}
                  aria-label="Prompt input"
                  resizeOrientation="vertical"
                  style={{ width: '100%', maxWidth: '500px' }}
                  />
                </StackItem>
                <StackItem>
                  <Button variant="primary" onClick={handleSubmit}>
                    Submit
                  </Button>
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </SplitItem>
        <SplitItem isFilled className="pf-u-mt-xl">
          <Card isFullHeight>
            <CardTitle>Output</CardTitle>
            <CardBody>
              <TextArea
              value={output}
              aria-label="Output"
              isReadOnly
              resizeOrientation="vertical"
              />
            </CardBody>
          </Card>
        </SplitItem>
      </Split>
    </AppLayout>
  );
};

export default SyntheticDataGeneration;
