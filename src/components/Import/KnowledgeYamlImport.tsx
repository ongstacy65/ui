import React, { useState } from 'react';
import yaml from 'js-yaml';
import { Alert } from '@patternfly/react-core/dist/dynamic/components/Alert';
import { AlertActionCloseButton } from '@patternfly/react-core/dist/dynamic/components/Alert';
import { FileUpload } from '@patternfly/react-core/dist/dynamic/components/FileUpload';
import { FormGroup } from '@patternfly/react-core/dist/dynamic/components/Form';
import { KnowledgeYamlData } from '@/types';
import { DropEvent } from '@patternfly/react-core/dist/esm/helpers/typeUtils';
import { SeedExample } from '../Contribute/Knowledge';
import { ValidatedOptions } from '@patternfly/react-core/dist/esm/helpers/constants';

interface KnowledgeYamlFileUploadProps {
  onUploadSuccess: (data: SeedExample[]) => void;
  onUploadError: (title: string, message: string) => void;
}

const KnowledgeYamlFileUpload: React.FC<KnowledgeYamlFileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState<string>('');
  const [isFailureAlertVisible, setIsFailureAlertVisible] = useState(false);
  const [failureAlertTitle, setFailureAlertTitle] = useState('');
  const [failureAlertMessage, setFailureAlertMessage] = useState('');

  const handleFileInputChange = (event: DropEvent, file: File) => {
    if (!file) return;

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const fileContent = reader.result as string;
      setUploadedFileContent(fileContent);

      try {
        const yamlData = yaml.load(fileContent) as KnowledgeYamlData;
        if (yamlData && yamlData.seed_examples) {
          // Mapping the seed examples directly to the form format
          const seedExamples: SeedExample[] = yamlData.seed_examples.map((example) => ({
            immutable: true, // Assuming all seed examples are immutable
            isExpanded: false, // Set default state of expansion
            context: example.context,
            isContextValid: ValidatedOptions.default, // Assuming context is valid by default
            questionAndAnswers: example.questions_and_answers.map((qa) => ({
              immutable: true, // Assuming questions/answers are immutable as well
              question: qa.question,
              isQuestionValid: ValidatedOptions.default, // Default to valid
              answer: qa.answer,
              isAnswerValid: ValidatedOptions.default // Default to valid
            }))
          }));
          onUploadSuccess(seedExamples); // Populate the form with seed examples
        }
      } catch (error) {
        const title = 'Invalid YAML File';
        const message = 'The uploaded file could not be parsed. Please ensure it is a valid YAML file.';
        onUploadError(title, message);
        setFailureAlertTitle(title);
        setFailureAlertMessage(message);
        setIsFailureAlertVisible(true);
      }
    };

    reader.readAsText(file);
  };

  const handleClear = () => {
    setUploadedFileName(null);
    setUploadedFileContent('');
    setIsFailureAlertVisible(false);
  };

  return (
    <FormGroup key="upload-yaml-file">
      <h1>Upload Knowledge YAML File</h1>
      <FileUpload
        id="yaml-file-upload"
        value={uploadedFileContent}
        filename={uploadedFileName || ''}
        filenamePlaceholder="Drag and drop a file or upload one"
        onFileInputChange={handleFileInputChange}
        onClearClick={handleClear}
        browseButtonText="Upload"
        accept=".yaml,.yml"
      />
      {isFailureAlertVisible && (
        <Alert variant="danger" title={failureAlertTitle} actionClose={<AlertActionCloseButton onClose={() => setIsFailureAlertVisible(false)} />}>
          {failureAlertMessage}
        </Alert>
      )}
    </FormGroup>
  );
};

export default KnowledgeYamlFileUpload;
