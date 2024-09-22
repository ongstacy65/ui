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
  Spinner,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { YamlFile } from '@/types';

const SyntheticDataGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [yamlFiles, setYamlFiles] = useState<YamlFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(0);



  const handlePromptChange = (value: string) => {
    setPrompt(value);
  };

  const handleSubmit = () => {
    setIsLoading(true);
    // Simulate an API call
    setTimeout(() => {
      // Mock response with multiple YAML files
      const mockYamlFiles: YamlFile[] = [
        { name: 'file1.yaml', content: 'key1: value1\nkey2: value2' },
        { name: 'file2.yaml', content: 'key3: value3\nkey4: value4' },
        { name: 'file3.yaml', content: 'key5: value5\nkey6: value6' },
      ];
      setYamlFiles(mockYamlFiles);
      setIsLoading(false);
    }, 2000);
  };

  const handleTabClick = (event: React.MouseEvent<any>, tabIndex: number | string) => {
    setActiveTabKey(tabIndex as number);
  };

  const handleDownload = (file: YamlFile) => {
    const blob = new Blob([file.content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <Split hasGutter className="pf-u-display-flex pf-u-justify-content-center pf-u-align-items-center" style={{ minHeight: '100vh' }}>
      <SplitItem isFilled className="pf-u-mt-xl">
          <Card isFullHeight>
            <CardTitle>Describe your desired skill</CardTitle>
            <CardBody isFilled>
              <Stack hasGutter>
                <StackItem className="pf-u-display-flex pf-u-justify-content-center">
                  <TextArea
                  value={prompt}
                  onChange={(_event, value) => handlePromptChange(value)}
                  aria-label="Skill Description"
                  resizeOrientation="vertical"
                  />
                </StackItem>
                <StackItem className="pf-u-display-flex pf-u-justify-content-center">
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    isDisabled={isLoading}
                  >
                    {isLoading ? <Spinner size="md" /> : 'Submit'}
                  </Button>
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </SplitItem>
        <SplitItem isFilled className="pf-u-mt-xl">
          <Card isFullHeight>
            <CardTitle>Skill Generation</CardTitle>
            <CardBody>
              <Tabs activeKey={activeTabKey} onSelect={handleTabClick} isBox={true}>
                {yamlFiles.map((file, index) => (
                  <Tab
                    key={index}
                    eventKey={index}
                    title={<TabTitleText>{file.name}</TabTitleText>}
                  >
                    <Stack hasGutter>
                      <StackItem>
                        <TextArea
                          value={file.content}
                          aria-label={<code>YAML content for ${file.name}</code>}
                          isReadOnly
                          resizeOrientation="vertical"
                        />
                      </StackItem>
                      <StackItem>
                        <Button
                          variant="secondary"
                          icon={<DownloadIcon />}
                          onClick={() => handleDownload(file)}
                        >
                          Download {file.name}
                        </Button>
                      </StackItem>
                    </Stack>
                  </Tab>
                ))}
              </Tabs>
            </CardBody>
          </Card>
        </SplitItem>
      </Split>
    </AppLayout>
  );
};

export default SyntheticDataGeneration;
