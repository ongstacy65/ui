'use client'

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  Split,
  SplitItem,
  Button,
  Form,
  FormGroup,
  TextInput,
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
  Flex,
  FlexItem
} from '@patternfly/react-core';
import { DownloadIcon, TrashIcon } from '@patternfly/react-icons';
import '@patternfly/react-core/dist/styles/base.css';
import { YamlFile } from '@/types';
import { MenuToggle, MenuToggleElement } from '@patternfly/react-core/dist/esm/components/MenuToggle';
import { Endpoint, Message, Model } from '@/types';

const SyntheticDataGeneration: React.FC = () => {
  const [isModelOpen, setIsModelOpen] = useState(false);
  // const [selectedSkill, setSelectedSkill] = useState<string>('');
  // const [isSkillOpen, setIsSkillOpen] = useState(false);
  // const [numberOfData, setNumberOfData] = useState<string>('');
  const [yamlFiles, setYamlFiles] = useState<YamlFile[]>([]);
  // const [isLoading, setIsLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(0);
  const [customModels, setCustomModels] = useState<Model[]>([]);
  const [defaultModels, setDefaultModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const modelOptions = [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'claude-v1', label: 'Claude v1' },
    { value: 'claude-v2', label: 'Claude v2' },
  ];


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

      console.log("Custom Models: " + customModels.toString());

      setDefaultModels(defaultModels);
      setCustomModels(customModels);
      setSelectedModel(customModels[0])
    };

    fetchDefaultModels();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedModel) {
      return;
    }

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
        console.info("ERROR IN CHAT RESPONSE")
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

              console.info("CONTENT: " + content)

              // Regular expression to match "Question:" followed by any text up to a newline or end of string
              const questionRegex = /(?:Question|Q):\s*(.*?)(?:\n|$)/;
              const answerRegex =  /(?:Answer|A):\s*([\s\S]*?)(?:\n\n|$)/;

              // Execute the regex on the input text
              const questionMatch = questionRegex.exec(content);
              const answerMatch = answerRegex.exec(content);


              const questionValue = questionMatch ? questionMatch[1].trim() : null;
              const answerValue = answerMatch ? answerMatch[1].trim() : null;

              console.info("QUESTION: " + questionValue)
              console.info("ANSWER: " + answerValue)

            } catch (err) {
              console.error('Error parsing chunk:', err);
            }
          }
        }
      }

        // const reader = chatResponse.body.getReader();
    // const textDecoder = new TextDecoder('utf-8');
    // let botMessage = '';

    // setMessages((messages) => [...messages, { text: '', isUser: false }]);

    // let done = false;
    // while (!done) {
    //   const { value, done: isDone } = await reader.read();
    //   done = isDone;
    //   if (value) {
    //     const chunk = textDecoder.decode(value, { stream: true });
    //     const lines = chunk.split('\n').filter((line) => line.trim() !== '');
    //
    //     for (const line of lines) {
    //       if (line.startsWith('data: ')) {
    //         const json = line.replace('data: ', '');
    //         if (json === '[DONE]') {
    //           setIsLoading(false);
    //           return;
    //         }
    //
    //         try {
    //           const parsed = JSON.parse(json);
    //           const deltaContent = parsed.choices[0].delta?.content;
    //
    //           if (deltaContent) {
    //             botMessage += deltaContent;
    //
    //             setMessages((messages) => {
    //               const updatedMessages = [...messages];
    //               if (updatedMessages.length > 1) {
    //                 updatedMessages[updatedMessages.length - 1].text = botMessage;
    //               }
    //               return updatedMessages;
    //             });
    //           }
    //         } catch (err) {
    //           console.error('Error parsing chunk:', err);
    //         }
    //       }
    //     }
    //   }
    // }


      // const onModelToggle = (isModelOpen: boolean) => {
      //   setIsModelOpen(isModelOpen);
      // }
    } catch(error) {
    // setMessages((messages) => [...messages, { text: 'Error fetching chat response', isUser: false }]);
    // setIsLoading(false);
     console.info("ERROR IN FETCH");
    }
  }

  // const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
  //   <MenuToggle ref={toggleRef} onClick={onModelToggle} isExpanded={isSelectOpen} style={{ width: '200px' }}>
  //     {selectedModel ? selectedModel.name : 'Select a model'}
  //   </MenuToggle>
  // );


  const onModelSelect = (event: React.MouseEvent | React.ChangeEvent, selection: string) => {
    setSelectedModel(selection);
    setIsModelOpen(false);
  };

  // const onSkillToggle = (isOpen: boolean) => setIsSkillOpen(isOpen);
  // const onSkillSelect = (event: React.MouseEvent | React.ChangeEvent, selection: string) => {
  //   setSelectedSkill(selection);
  //   setIsSkillOpen(false);
  // };
  //
  // const onNumberChange = (value: string) => {
  //   setNumberOfData(value);
  // };
  //
  // const handleSubmit = () => {
  //   setIsLoading(true);
  //   // Simulate an API call
  //   setTimeout(() => {
  //     // Mock response with multiple YAML files
  //     const mockYamlFiles: YamlFile[] = [
  //       { name: 'file1.yaml', content: 'key1: value1\nkey2: value2' },
  //       { name: 'file2.yaml', content: 'key3: value3\nkey4: value4' },
  //       { name: 'file3.yaml', content: 'key5: value5\nkey6: value6' },
  //     ];
  //     setYamlFiles(mockYamlFiles);
  //     setIsLoading(false);
  //   }, 2000);
  // };

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

  {modelOptions.map((option, index) => (
    <SelectOption key={index} value={option.value}>
      {option.label}
    </SelectOption>
  ))}

  return (
    <AppLayout>
     <Split hasGutter className="pf-u-display-flex pf-u-justify-content-center pf-u-align-items-center" style={{ minHeight: '100vh' }}>
       <SplitItem>
         <Card isFullHeight>
           <CardTitle>Test</CardTitle>
           <CardBody>
             <Form onSubmit={handleSubmit}>
               <FormGroup
                 label="Enter some text"
                 isRequired
                 fieldId="input-field"
               >
                 <TextInput
                   id="input-field"
                   name="input-field"
                   aria-describedby="input-field-helper"
                 />
               </FormGroup>
               <Button type="submit" variant="primary">
                 Submit
               </Button>
           </Form>
           </CardBody>
         </Card>
       </SplitItem>
       <SplitItem isFilled className="pf-u-mt-xl">
         <Card isFullHeight>
           <CardTitle>Input Data</CardTitle>
           <CardBody>
             {/*<Form>*/}
             {/*  <FormGroup label="Model Selection" isRequired fieldId="model-select">*/}
             {/*    <Select*/}
             {/*      id="single-select"*/}
             {/*      style={{ width: '300px' }}*/}
             {/*      aria-label="Select Model"*/}
             {/*      aria-placeholder="Select a Model"*/}
             {/*      toggle={onModelToggle}*/}
             {/*      onSelect={onModelSelect}*/}
             {/*      selections={selectedModel}*/}
             {/*      isOpen={isModelOpen}*/}
             {/*      shouldFocusToggleOnSelect*/}
             {/*    >*/}
             {/*      {modelOptions.map((option, index) => (*/}
             {/*        <SelectOption key={index}   value={option.value}>*/}
             {/*          {option.label}*/}
             {/*        </SelectOption>*/}
             {/*      ))}*/}
             {/*    </Select>*/}
             {/*  </FormGroup>*/}
             {/*</Form>*/}
           </CardBody>
         </Card>

       </SplitItem>

      {/*<Split hasGutter className="pf-u-display-flex pf-u-justify-content-center pf-u-align-items-center" style={{ minHeight: '100vh' }}>*/}
      {/*<SplitItem isFilled className="pf-u-mt-xl">*/}

        {/*<Form>*/}
        {/*  <FormGroup label="Model Selection" isRequired fieldId="model-select">*/}
        {/*    <Select*/}
        {/*      variant="single"*/}
        {/*      aria-label="Select Model"*/}
        {/*      toggle={onModelToggle}*/}
        {/*      onSelect={onModelSelect}*/}
        {/*      selections={selectedModel}*/}
        {/*      isOpen={isModelOpen}*/}
        {/*    >*/}
        {/*      {modelOptions.map((option, index) => (*/}
        {/*        <SelectOption key={index} value={option.value}>*/}
        {/*          {option.label}*/}
        {/*        </SelectOption>*/}
        {/*      ))}*/}
        {/*    </Select>*/}
        {/*  </FormGroup>*/}
        {/*  <FormGroup label="Skill Selection" isRequired fieldId="skill-select">*/}
        {/*    <Select*/}
        {/*      variant="single"*/}
        {/*      aria-label="Select Skill"*/}
        {/*      toggle={onSkillToggle}*/}
        {/*      onSelect={onSkillSelect}*/}
        {/*      selections={selectedSkill}*/}
        {/*      isOpen={isSkillOpen}*/}
        {/*    >*/}
        {/*      {skillOptions.map((option, index) => (*/}
        {/*        <SelectOption key={index} value={option.value}>*/}
        {/*          {option.label}*/}
        {/*        </SelectOption>*/}
        {/*      ))}*/}
        {/*      </Select>*/}
        {/*  </FormGroup>*/}
        {/*  <FormGroup label="Number of Data" isRequired fieldId="number-input">*/}
        {/*      <TextInput type="number" id="number-input" name="number-input" value={numberOfData} onChange={onNumberChange} />*/}
        {/*  </FormGroup>*/}
        {/*  <Button*/}
        {/*    variant="primary"*/}
        {/*    onClick={handleSubmit}*/}
        {/*    isLoading={isLoading}*/}
        {/*    isDisabled={!selectedModel || !selectedSkill || !numberOfData}*/}
        {/*  >*/}
        {/*    Generate*/}
        {/*  </Button>*/}
        {/*</Form>*/}
      {/*</SplitItem>*/}
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
