// src/app/edit-submission/knowledge/[id]/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Alert, AlertActionLink, AlertActionCloseButton } from '@patternfly/react-core/dist/dynamic/components/Alert';
import { FormFieldGroupExpandable, FormFieldGroupHeader, Form, FormGroup, ActionGroup } from '@patternfly/react-core/dist/dynamic/components/Form';
import { PlusIcon, MinusCircleIcon } from '@patternfly/react-icons/dist/dynamic/icons/';
import { Title } from '@patternfly/react-core/dist/dynamic/components/Title';
import { PageSection } from '@patternfly/react-core/dist/dynamic/components/Page';
import { TextInput } from '@patternfly/react-core/dist/dynamic/components/TextInput';
import { TextArea } from '@patternfly/react-core/dist/dynamic/components/TextArea';
import { Button } from '@patternfly/react-core/dist/dynamic/components/Button';
import { Text } from '@patternfly/react-core/dist/dynamic/components/Text';
import { AppLayout } from '../../../../components/AppLayout';
import { UploadFile } from '../../../../components/Contribute/Knowledge/UploadFile';
import { AttributionData, PullRequestFile, KnowledgeYamlData, SchemaVersion } from '@/types';
import {
  fetchPullRequest,
  fetchFileContent,
  updatePullRequest,
  fetchPullRequestFiles,
  getGitHubUsername,
  amendCommit
} from '../../../../utils/github';
import yaml from 'js-yaml';
import axios from 'axios';
import { dumpYaml } from '@/utils/yamlConfig';

const EditKnowledgePage: React.FunctionComponent<{ params: { id: string } }> = ({ params }) => {
  const { data: session } = useSession();
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [document_outline, setDocumentOutline] = React.useState('');
  const [domain, setDomain] = React.useState('');
  const [repo, setRepo] = React.useState('');
  const [commit, setCommit] = React.useState('');
  const [patterns, setPatterns] = React.useState('');
  const [title_work, setTitleWork] = React.useState('');
  const [link_work, setLinkWork] = React.useState('');
  const [revision, setRevision] = React.useState('');
  const [license_work, setLicenseWork] = React.useState('');
  const [creators, setCreators] = React.useState('');
  const [seedExamples, setSeedExamples] = React.useState([
    {
      context: '',
      questions_and_answers: [
        { question: '', answer: '' },
        { question: '', answer: '' },
        { question: '', answer: '' }
      ]
    }
  ]);
  const [error, setError] = React.useState<string | null>(null);
  const [yamlFile, setYamlFile] = React.useState<PullRequestFile | null>(null);
  const [attributionFile, setAttributionFile] = React.useState<PullRequestFile | null>(null);
  const [branchName, setBranchName] = React.useState<string | null>(null);
  const [useFileUpload, setUseFileUpload] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [filePath, setFilePath] = React.useState<string>('');
  const [originalFilePath, setOriginalFilePath] = React.useState<string>(''); // Store original file path
  const router = useRouter();
  const number = parseInt(params.id, 10);

  // Alerts
  const [isSuccessAlertVisible, setIsSuccessAlertVisible] = React.useState(false);
  const [isFailureAlertVisible, setIsFailureAlertVisible] = React.useState(false);
  const [failureAlertTitle, setFailureAlertTitle] = React.useState('');
  const [failureAlertMessage, setFailureAlertMessage] = React.useState('');
  const [successAlertTitle, setSuccessAlertTitle] = React.useState('');
  const [successAlertMessage, setSuccessAlertMessage] = React.useState<React.ReactNode>('');
  const [successAlertLink, setSuccessAlertLink] = React.useState<string>('');

  React.useEffect(() => {
    console.log('Params:', params);
    const fetchPRData = async () => {
      if (session?.accessToken) {
        try {
          console.log(`Fetching PR with number: ${number}`);
          const prData = await fetchPullRequest(session.accessToken, number);
          console.log(`Fetched PR data:`, prData);
          setTitle(prData.title);
          setBody(prData.body);
          setBranchName(prData.head.ref); // Store the branch name from the pull request

          const prFiles: PullRequestFile[] = await fetchPullRequestFiles(session.accessToken, number);
          console.log(`Fetched PR files:`, prFiles);

          const foundYamlFile = prFiles.find((file: PullRequestFile) => file.filename.endsWith('.yaml'));
          if (!foundYamlFile) {
            throw new Error('No YAML file found in the pull request.');
          }
          setYamlFile(foundYamlFile);
          console.log(`YAML file found:`, foundYamlFile);

          const yamlContent = await fetchFileContent(session.accessToken, foundYamlFile.filename, prData.head.sha);
          console.log('Fetched YAML content:', yamlContent);
          const yamlData: KnowledgeYamlData = yaml.load(yamlContent) as KnowledgeYamlData;
          console.log('Parsed YAML data:', yamlData);

          // Populate the form fields with YAML data
          setDocumentOutline(yamlData.document_outline);
          setDomain(yamlData.domain);
          setRepo(yamlData.document.repo);
          setCommit(yamlData.document.commit);
          setPatterns(yamlData.document.patterns.join(', '));
          setSeedExamples(yamlData.seed_examples);

          // Set the file path from the current YAML file
          const currentFilePath = foundYamlFile.filename.split('/').slice(0, -1).join('/');
          setFilePath(currentFilePath);
          setOriginalFilePath(currentFilePath); // Store the original file path

          // Fetch and parse attribution file if it exists
          const foundAttributionFile = prFiles.find((file: PullRequestFile) => file.filename.includes('attribution'));
          if (foundAttributionFile) {
            setAttributionFile(foundAttributionFile);
            console.log(`Attribution file found:`, foundAttributionFile);
            const attributionContent = await fetchFileContent(session.accessToken, foundAttributionFile.filename, prData.head.sha);
            console.log('Fetched attribution content:', attributionContent);
            const attributionData = parseAttributionContent(attributionContent);
            console.log('Parsed attribution data:', attributionData);

            // Populate the form fields with attribution data
            setTitleWork(attributionData.title_of_work);
            setLinkWork(attributionData.link_to_work);
            setRevision(attributionData.revision);
            setLicenseWork(attributionData.license_of_the_work);
            setCreators(attributionData.creator_names);
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error('Error fetching pull request data:', error.response ? error.response.data : error.message);
            setError(`Failed to fetch pull request data: ${error.message}`);
          } else if (error instanceof Error) {
            console.error('Error fetching pull request data:', error.message);
            setError(`Failed to fetch pull request data: ${error.message}`);
          }
        }
      }
    };
    fetchPRData();
  }, [session, number, params]);

  const handleSave = async () => {
    if (session?.accessToken && yamlFile && attributionFile && branchName && email && name) {
      try {
        console.log(`Updating PR with number: ${number}`);
        await updatePullRequest(session.accessToken, number, { title, body });

        const githubUsername = await getGitHubUsername(session.accessToken);
        console.log(`GitHub username: ${githubUsername}`);

        const updatedYamlData: KnowledgeYamlData = {
          created_by: githubUsername,
          version: SchemaVersion,
          domain,
          document_outline,
          document: {
            repo,
            commit,
            patterns: patterns.split(',').map((pattern) => pattern.trim())
          },
          seed_examples: seedExamples.map((example) => ({
            context: example.context,
            questions_and_answers: example.questions_and_answers.map((qa) => ({
              question: qa.question,
              answer: qa.answer
            }))
          }))
        };

        const updatedYamlContent = dumpYaml(updatedYamlData);

        console.log('Updated YAML content:', updatedYamlContent);

        const updatedAttributionData: AttributionData = {
          title_of_work: title_work,
          link_to_work: link_work,
          revision,
          license_of_the_work: license_work,
          creator_names: creators
        };

        const updatedAttributionContent = `Title of work: ${updatedAttributionData.title_of_work}
Link to work: ${updatedAttributionData.link_to_work}
Revision: ${updatedAttributionData.revision}
License of the work: ${updatedAttributionData.license_of_the_work}
Creator names: ${updatedAttributionData.creator_names}
`;

        console.log('Updated Attribution content:', updatedAttributionContent);

        const commitMessage = `Amend commit with updated content\n\nSigned-off-by: ${name} <${email}>`;

        // Ensure proper file paths for the edit
        const finalYamlPath = filePath.replace(/^\//, '').replace(/\/?$/, '/') + yamlFile.filename.split('/').pop();
        const finalAttributionPath = filePath.replace(/^\//, '').replace(/\/?$/, '/') + attributionFile.filename.split('/').pop();

        const oldFilePath = {
          yaml: originalFilePath.replace(/^\//, '').replace(/\/?$/, '/') + yamlFile.filename.split('/').pop(),
          attribution: originalFilePath.replace(/^\//, '').replace(/\/?$/, '/') + attributionFile.filename.split('/').pop()
        };

        const newFilePath = {
          yaml: finalYamlPath,
          attribution: finalAttributionPath
        };

        const res = await fetch('/api/envConfig');
        const envConfig = await res.json();

        const amendedCommitResponse = await amendCommit(
          session.accessToken,
          githubUsername,
          envConfig.UPSTREAM_REPO_NAME,
          oldFilePath,
          newFilePath,
          updatedYamlContent,
          updatedAttributionContent,
          branchName,
          commitMessage
        );
        console.log('Amended commit response:', amendedCommitResponse);

        const prLink = `https://github.com/${envConfig.UPSTREAM_REPO_OWNER}/${envConfig.UPSTREAM_REPO_NAME}/pull/${number}`;
        setSuccessAlertTitle('Pull request updated successfully!');
        setSuccessAlertMessage('Your pull request has been updated successfully.');
        setSuccessAlertLink(prLink);
        setIsSuccessAlertVisible(true);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Error updating pull request:', error.response ? error.response.data : error.message);
          setFailureAlertTitle('Failed to update pull request');
          setFailureAlertMessage(error.message);
          setIsFailureAlertVisible(true);
        } else if (error instanceof Error) {
          console.error('Error updating pull request:', error.message);
          setFailureAlertTitle('Failed to update pull request');
          setFailureAlertMessage(error.message);
          setIsFailureAlertVisible(true);
        }
      }
    } else {
      setFailureAlertTitle('Error');
      setFailureAlertMessage('YAML file, Attribution file, branch name, email, or name is missing.');
      setIsFailureAlertVisible(true);
    }
  };

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
    setPatterns(files.map((file) => file.name).join(', ')); // Populate the patterns field
  };

  const handleDocumentUpload = async () => {
    if (uploadedFiles.length > 0) {
      const fileContents: { fileName: string; fileContent: string }[] = [];

      await Promise.all(
        uploadedFiles.map(
          (file) =>
            new Promise<void>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const fileContent = e.target!.result as string;
                fileContents.push({ fileName: file.name, fileContent });
                resolve();
              };
              reader.onerror = reject;
              reader.readAsText(file);
            })
        )
      );

      if (fileContents.length === uploadedFiles.length) {
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files: fileContents })
          });

          const result = await response.json();
          if (response.ok) {
            setRepo(result.repoUrl);
            setCommit(result.commitSha);
            setPatterns(result.documentNames.join(', ')); // Populate the patterns field
            console.log('Files uploaded:', result.documentNames);
            setSuccessAlertTitle('Document uploaded successfully!');
            setSuccessAlertMessage('Documents have been uploaded to your repo to be referenced in the knowledge submission.');
            setSuccessAlertLink(result.prUrl);
            setIsSuccessAlertVisible(true);
            setUseFileUpload(false); // Switch back to manual mode to display the newly created values in the knowledge submission
          } else {
            throw new Error(result.error || 'Failed to upload document');
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            setFailureAlertTitle('Failed to upload document');
            setFailureAlertMessage(error.message);
            setIsFailureAlertVisible(true);
          }
        }
      }
    }
  };

  const handleInputChange = (exampleIndex: number, type: string, value: string, qaIndex?: number) => {
    const updatedSeedExamples = [...seedExamples];
    if (type === 'context') {
      updatedSeedExamples[exampleIndex].context = value;
    } else if (qaIndex !== undefined) {
      if (type === 'question') {
        updatedSeedExamples[exampleIndex].questions_and_answers[qaIndex].question = value;
      } else if (type === 'answer') {
        updatedSeedExamples[exampleIndex].questions_and_answers[qaIndex].answer = value;
      }
    }
    setSeedExamples(updatedSeedExamples);
  };

  const addQuestionAnswerPair = (exampleIndex: number) => {
    const updatedSeedExamples = [...seedExamples];
    updatedSeedExamples[exampleIndex].questions_and_answers.push({ question: '', answer: '' });
    setSeedExamples(updatedSeedExamples);
  };

  const deleteQuestionAnswerPair = (exampleIndex: number, qaIndex: number) => {
    const updatedSeedExamples = [...seedExamples];
    updatedSeedExamples[exampleIndex].questions_and_answers = updatedSeedExamples[exampleIndex].questions_and_answers.filter((_, i) => i !== qaIndex);
    setSeedExamples(updatedSeedExamples);
  };

  const addSeedExample = () => {
    setSeedExamples([
      ...seedExamples,
      {
        context: '',
        questions_and_answers: [
          { question: '', answer: '' },
          { question: '', answer: '' },
          { question: '', answer: '' }
        ]
      }
    ]);
  };

  const parseAttributionContent = (content: string): AttributionData => {
    const lines = content.split('\n');
    const attributionData: { [key: string]: string } = {};
    lines.forEach((line) => {
      const [key, ...value] = line.split(':');
      if (key && value) {
        // Remove spaces in the attribution field for parsing
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        attributionData[normalizedKey] = value.join(':').trim();
      }
    });
    return attributionData as unknown as AttributionData;
  };

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="lg">
          Edit Knowledge Submission
        </Title>
        {error && <Alert variant="danger" title={error} />}
        <Form>
          <FormGroup label="" fieldId="title">
            <TextInput isDisabled type="text" id="title" name="title" value={title} />
          </FormGroup>
          <FormFieldGroupExpandable
            isExpanded
            toggleAriaLabel="Details"
            header={
              <FormFieldGroupHeader titleText={{ text: 'Author Info', id: 'author-info-id' }} titleDescription="Provide your user information." />
            }
          >
            <FormGroup isRequired key={'author-info-details-id'}>
              <TextInput
                isRequired
                type="text"
                aria-label="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(_event, value) => setName(value)}
              />
              <TextInput
                isRequired
                type="email"
                aria-label="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(_event, value) => setEmail(value)}
              />
            </FormGroup>
          </FormFieldGroupExpandable>

          <FormFieldGroupExpandable
            isExpanded
            toggleAriaLabel="Details"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'Knowledge Info', id: 'knowledge-info-id' }}
                titleDescription="Provide brief information about the knowledge."
              />
            }
          >
            <FormGroup key={'knowledge-info-details-id'}>
              <TextInput
                isRequired
                type="text"
                aria-label="domain"
                placeholder="Enter domain information"
                value={domain}
                onChange={(_event, value) => setDomain(value)}
              />
              <TextArea
                isRequired
                type="text"
                aria-label="document_outline"
                placeholder="Enter brief description of the knowledge"
                value={document_outline}
                onChange={(_event, value) => setDocumentOutline(value)}
              />
            </FormGroup>
          </FormFieldGroupExpandable>

          <FormFieldGroupExpandable
            isExpanded
            toggleAriaLabel="Details"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'File Path Info', id: 'file-path-info-id' }}
                titleDescription="Specify the file path for the QnA and Attribution files."
              />
            }
          >
            <FormGroup isRequired key={'file-path-details-id'}>
              <TextInput
                isRequired
                type="text"
                aria-label="filePath"
                placeholder="Enter the file path for both files"
                value={filePath}
                onChange={(_event, value) => setFilePath(value)}
              />
            </FormGroup>
          </FormFieldGroupExpandable>

          <FormFieldGroupExpandable
            isExpanded
            toggleAriaLabel="Details"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'Seed Knowledge Examples', id: 'seed-examples-id' }}
                titleDescription="Add seed examples with context and Q&A pairs"
              />
            }
          >
            {seedExamples.map((example, exampleIndex) => (
              <FormGroup key={exampleIndex}>
                <Text className="heading-k">Knowledge Seed Example {exampleIndex + 1}</Text>
                <TextArea
                  isRequired
                  type="text"
                  aria-label={`Context ${exampleIndex + 1}`}
                  placeholder="Enter the context"
                  value={example.context}
                  onChange={(_event, value) => handleInputChange(exampleIndex, 'context', value)}
                />
                {example.questions_and_answers.map((qa, qaIndex) => (
                  <React.Fragment key={qaIndex}>
                    <TextArea
                      isRequired
                      type="text"
                      aria-label={`Question ${exampleIndex + 1}-${qaIndex + 1}`}
                      placeholder={`Enter question ${qaIndex + 1}`}
                      value={qa.question}
                      onChange={(_event, value) => handleInputChange(exampleIndex, 'question', value, qaIndex)}
                    />
                    <TextArea
                      isRequired
                      type="text"
                      aria-label={`Answer ${exampleIndex + 1}-${qaIndex + 1}`}
                      placeholder={`Enter answer ${qaIndex + 1}`}
                      value={qa.answer}
                      onChange={(_event, value) => handleInputChange(exampleIndex, 'answer', value, qaIndex)}
                    />
                    <Button variant="danger" onClick={() => deleteQuestionAnswerPair(exampleIndex, qaIndex)}>
                      <MinusCircleIcon /> Delete Question and Answer
                    </Button>
                  </React.Fragment>
                ))}
                <div style={{ marginTop: '10px', marginBottom: '20px' }}>
                  <Button variant="primary" onClick={() => addQuestionAnswerPair(exampleIndex)}>
                    <PlusIcon /> Add Question and Answer
                  </Button>
                </div>
              </FormGroup>
            ))}
            <Button variant="primary" onClick={addSeedExample}>
              <PlusIcon /> Add Knowledge Seed Example
            </Button>
          </FormFieldGroupExpandable>

          <FormFieldGroupExpandable
            toggleAriaLabel="Details"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'Document Info', id: 'doc-info-id' }}
                titleDescription="Add the relevant document's information"
              />
            }
          >
            <FormGroup>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant={useFileUpload ? 'secondary' : 'primary'}
                  className={!useFileUpload ? 'button-active' : 'button-secondary'}
                  onClick={() => setUseFileUpload(false)}
                >
                  Manually Enter Document Details
                </Button>
                <Button
                  variant={useFileUpload ? 'primary' : 'secondary'}
                  className={useFileUpload ? 'button-active' : 'button-secondary'}
                  onClick={() => setUseFileUpload(true)}
                >
                  Automatically Upload Documents
                </Button>
              </div>
            </FormGroup>

            {!useFileUpload ? (
              <FormGroup key={'doc-info-details-id'}>
                <TextInput
                  isRequired
                  type="url"
                  aria-label="repo"
                  placeholder="Enter repo url where document exists"
                  value={repo}
                  onChange={(_event, value) => setRepo(value)}
                />
                <TextInput
                  isRequired
                  type="text"
                  aria-label="commit"
                  placeholder="Enter the commit sha of the document in that repo"
                  value={commit}
                  onChange={(_event, value) => setCommit(value)}
                />
                <TextInput
                  isRequired
                  type="text"
                  aria-label="patterns"
                  placeholder="Enter the documents name (comma separated)"
                  value={patterns}
                  onChange={(_event, value) => setPatterns(value)}
                />
              </FormGroup>
            ) : (
              <>
                <UploadFile onFilesChange={handleFilesChange} />
                <Button variant="primary" onClick={handleDocumentUpload}>
                  Submit Files
                </Button>
              </>
            )}
          </FormFieldGroupExpandable>

          <FormFieldGroupExpandable
            toggleAriaLabel="Details"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'Attribution Info', id: 'attribution-info-id' }}
                titleDescription="Provide attribution information."
              />
            }
          >
            <FormGroup isRequired key={'attribution-info-details-id'}>
              <TextInput
                isRequired
                type="text"
                aria-label="title_work"
                placeholder="Enter title of work"
                value={title_work}
                onChange={(_event, value) => setTitleWork(value)}
              />
              <TextInput
                isRequired
                type="url"
                aria-label="link_work"
                placeholder="Enter link to work"
                value={link_work}
                onChange={(_event, value) => setLinkWork(value)}
              />
              <TextInput
                isRequired
                type="text"
                aria-label="revision"
                placeholder="Enter document revision information"
                value={revision}
                onChange={(_event, value) => setRevision(value)}
              />
              <TextInput
                isRequired
                type="text"
                aria-label="license_work"
                placeholder="Enter license of the work"
                value={license_work}
                onChange={(_event, value) => setLicenseWork(value)}
              />
              <TextInput
                isRequired
                type="text"
                aria-label="creators"
                placeholder="Enter creators Name"
                value={creators}
                onChange={(_event, value) => setCreators(value)}
              />
            </FormGroup>
          </FormFieldGroupExpandable>
          <ActionGroup>
            <Button variant="primary" onClick={handleSave}>
              Update Knowledge Submission
            </Button>
            <Button variant="link" onClick={() => router.back()}>
              Cancel
            </Button>
          </ActionGroup>
        </Form>

        {isSuccessAlertVisible && (
          <Alert
            variant="success"
            title={successAlertTitle}
            actionClose={<AlertActionCloseButton onClose={() => setIsSuccessAlertVisible(false)} />}
            actionLinks={
              <>
                <AlertActionLink component="a" href={successAlertLink} target="_blank" rel="noopener noreferrer">
                  View it here
                </AlertActionLink>
              </>
            }
          >
            {successAlertMessage}
          </Alert>
        )}
        {isFailureAlertVisible && (
          <Alert variant="danger" title={failureAlertTitle} actionClose={<AlertActionCloseButton onClose={() => setIsFailureAlertVisible(false)} />}>
            {failureAlertMessage}
          </Alert>
        )}
      </PageSection>
    </AppLayout>
  );
};

export default EditKnowledgePage;
