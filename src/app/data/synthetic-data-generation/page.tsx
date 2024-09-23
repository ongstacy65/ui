'use client'

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  Split,
  SplitItem,
  Button,
  Form,
  Select,
  SelectOption,
  SelectList,
  Card,
  CardBody,
  CardTitle,
  Tab,
  Tabs,
  Stack,
  StackItem,
  TabTitleText,
  TextArea,
  MenuToggle,
  MenuToggleElement,
  Alert
} from '@patternfly/react-core';
import { DownloadIcon, TrashIcon } from '@patternfly/react-icons';
import '@patternfly/react-core/dist/styles/base.css';
import { YamlFile } from '@/types';
import { Endpoint, Model } from '@/types';

const SyntheticDataGeneration: React.FC = () => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isModelSelectedOnSend, setIsModelSelectedOnSend] = useState(true);
  const [yamlFiles, setYamlFiles] = useState<YamlFile[]>([]);
  const [activeTabKey, setActiveTabKey] = useState(0);
  const [customModels, setCustomModels] = useState<Model[]>([]);
  const [defaultModels, setDefaultModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDefaultModels = async () => {
      const response = await fetch('/api/envConfig');
      const envConfig = await response.json();

      const defaultModels: Model[] = [
        { name: 'Granite-7b', apiURL: envConfig.GRANITE_API, modelName: envConfig.GRANITE_MODEL_NAME },
        { name: 'Merlinite-7b', apiURL: envConfig.MERLINITE_API, modelName: envConfig.MERLINITE_MODEL_NAME }
      ];

      const storedEndpoints = localStorage.getItem('endpoints');

      const customModels = storedEndpoints
        ? JSON.parse(storedEndpoints).map((endpoint: Endpoint) => ({
          name: endpoint.modelName,
          apiURL: `${endpoint.url}`,
          modelName: endpoint.modelName
        }))
        : [];

      setDefaultModels(defaultModels);
      setCustomModels(customModels);
    };

    fetchDefaultModels();
  }, []);

  const onToggleClick = () => {
    setIsSelectOpen(!isSelectOpen);
  };

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
    const selected = [...defaultModels, ...customModels].find((model) => model.name === value) || null;
    setSelectedModel(selected);
    setIsSelectOpen(false);
    setIsModelSelectedOnSend(true);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isSelectOpen} style={{ width: '200px' }}>
      {selectedModel ? selectedModel.name : 'Select a model'}
    </MenuToggle>
  );

  const dropdownItems = [...defaultModels, ...customModels]
    .filter((model) => model.name && model.apiURL && model.modelName)
    .map((model, index) => (
      <SelectOption key={index} value={model.name}>
        {model.name}
      </SelectOption>
    ));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedModel) {
      return;
    }

    setIsLoading(true);

    const messagesPayload = [
      { role: 'user', content: "Generate 1 data talking about object identification using question and answer format with 'Q:' as the question label and 'A:' as the answer label. Please strictly follow the instruction." },
    ];

    const requestData = {
      model: selectedModel.modelName,
      messages: messagesPayload
    };

    try {
      const chatResponse = await fetch(`${selectedModel.apiURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!chatResponse.body) {
        console.error("Error in Chat Response")
        return;
      }

      const reader = chatResponse.body.getReader();
      const textDecoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          const chunk = textDecoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {

            try {
              const jsonObject = JSON.parse(line);

              const content = jsonObject.choices[0].message.content;

              // Regular expression to match "Question:" followed by any text up to a newline or end of string
              const questionRegex = /(?:Question|Q):\s*(.*?)(?:\n|$)/;
              const answerRegex =  /(?:Answer|A):\s*([\s\S]*?)(?:\n\n|$)/;

              // Execute the regex on the input text
              const questionMatch = questionRegex.exec(content);
              const answerMatch = answerRegex.exec(content);


              const questionValue = questionMatch ? questionMatch[1].trim() : null;
              const answerValue = answerMatch ? answerMatch[1].trim() : null;

              setTimeout(() => {
                setIsLoading(false);

                const yamlFiles: YamlFile[] = [
                  { name: 'generated-data-1.yaml', content: 'created_by: AI Generator\n' +
                      'version: 1 \n' +
                      'task_description: Object Identification\n' +
                      'seed_examples: 1 \n' +
                      ' - question: ' + questionValue + '\n' +
                      ' - answer: ' + answerValue}
                ];
                setYamlFiles(yamlFiles);
              }, 1000);

            } catch (err) {
              console.error('Error parsing chunk:', err);
            }
          }
        }
      }

    } catch(error) {
     console.error("Error in fetch of Chat API");
    }
  }

  const handleTabClick = (event: React.MouseEvent<never>, tabIndex: number | string) => {
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

  const handleReset = () => {
    setYamlFiles([]);
    setActiveTabKey(0);
  };

  return (
    <AppLayout>
     <Split hasGutter className="pf-u-display-flex pf-u-justify-content-center pf-u-align-items-center" style={{ minHeight: '100vh' }}>
       <SplitItem isFilled className="pf-u-mt-xl">
         <Card isFullHeight>
           <CardTitle>Model Data Generation</CardTitle>
           <CardBody>
             <Stack hasGutter>
               <StackItem>
                 <Split hasGutter>
                   <SplitItem>
                       Select Model
                   </SplitItem>
                   <SplitItem isFilled>
                     <Select
                       id="single-select"
                       isOpen={isSelectOpen}
                       selected={selectedModel ? selectedModel.name : 'Select a model'}
                       onSelect={onSelect}
                       onOpenChange={(isOpen) => setIsSelectOpen(isOpen)}
                       toggle={toggle}
                       shouldFocusToggleOnSelect
                     >
                       <SelectList>{dropdownItems}</SelectList>
                     </Select>
                   </SplitItem>
                 </Split>
               </StackItem>
               <StackItem>
                 <Form onSubmit={handleSubmit}>
                   <Button type="submit" variant="primary" isLoading={isLoading} spinnerAriaValueText="Loading...">
                     {isLoading ? 'Generating' : 'Submit'}
                   </Button>
                   {!isModelSelectedOnSend && (
                     <div>
                       <Alert variant="danger" title="No Model Selected" ouiaId="DangerAlert" />
                     </div>
                   )}
                 </Form>
               </StackItem>
             </Stack>
           </CardBody>
         </Card>
       </SplitItem>
        <SplitItem isFilled className="pf-u-mt-xl">
          <Card isFullHeight>
            <CardTitle>Generated Synthetic Data</CardTitle>
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
                      <Split hasGutter>
                        <SplitItem>
                          <Button
                            variant="secondary"
                            icon={<DownloadIcon />}
                            onClick={() => handleDownload(file)}
                          >
                            Download {file.name}
                          </Button>
                        </SplitItem>
                        <SplitItem>
                          <Button
                            variant="danger"
                            aria-label="Reset output"
                            onClick={handleReset}
                            isDisabled={yamlFiles.length === 0}
                            icon={<TrashIcon />}
                          >
                            Reset Output
                          </Button>
                        </SplitItem>
                      </Split>
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
