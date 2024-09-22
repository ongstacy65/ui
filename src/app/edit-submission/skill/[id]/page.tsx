// src/app/edit-submission/skill/[id]/page.tsx
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
import { AttributionData, PullRequestFile, SchemaVersion, SkillYamlData } from '@/types';
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

const EditSkillPage: React.FunctionComponent<{ params: { id: string } }> = ({ params }) => {
  const { data: session } = useSession();
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [task_description, setTaskDescription] = React.useState('');
  const [title_work, setTitleWork] = React.useState('');
  const [license_work, setLicenseWork] = React.useState('');
  const [creators, setCreators] = React.useState('');
  const [questions, setQuestions] = React.useState<string[]>([]);
  const [contexts, setContexts] = React.useState<string[]>([]);
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [yamlFile, setYamlFile] = React.useState<PullRequestFile | null>(null);
  const [attributionFile, setAttributionFile] = React.useState<PullRequestFile | null>(null);
  const [branchName, setBranchName] = React.useState<string | null>(null);
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
          const yamlData: SkillYamlData = yaml.load(yamlContent) as SkillYamlData;
          console.log('Parsed YAML data:', yamlData);

          // Populate the form fields with YAML data
          setTaskDescription(yamlData.task_description);
          setQuestions(yamlData.seed_examples.map((example) => example.question));
          setContexts(yamlData.seed_examples.map((example) => example.context || ''));
          setAnswers(yamlData.seed_examples.map((example) => example.answer));

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

        const updatedYamlData: SkillYamlData = {
          created_by: githubUsername,
          version: SchemaVersion,
          task_description,
          seed_examples: questions.map((question, index) => ({
            question,
            context: contexts[index],
            answer: answers[index]
          }))
        };

        const updatedYamlContent = dumpYaml(updatedYamlData);

        console.log('Updated YAML content:', updatedYamlContent);

        const updatedAttributionData: AttributionData = {
          title_of_work: title_work,
          link_to_work: '-',
          revision: '-',
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

  const handleInputChange = (index: number, type: string, value: string) => {
    switch (type) {
      case 'question':
        setQuestions((prevQuestions) => {
          const updatedQuestions = [...prevQuestions];
          updatedQuestions[index] = value;
          return updatedQuestions;
        });
        break;
      case 'context':
        setContexts((prevContexts) => {
          const updatedContexts = [...prevContexts];
          updatedContexts[index] = value;
          return updatedContexts;
        });
        break;
      case 'answer':
        setAnswers((prevAnswers) => {
          const updatedAnswers = [...prevAnswers];
          updatedAnswers[index] = value;
          return updatedAnswers;
        });
        break;
      default:
        break;
    }
  };

  const addQuestionAnswerPair = () => {
    setQuestions([...questions, '']);
    setContexts([...contexts, '']);
    setAnswers([...answers, '']);
  };

  const deleteQuestionAnswerPair = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    setContexts(contexts.filter((_, i) => i !== index));
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const parseAttributionContent = (content: string): AttributionData => {
    const lines = content.split('\n');
    const attributionData: AttributionData = {
      title_of_work: '',
      link_to_work: '',
      revision: '',
      license_of_the_work: '',
      creator_names: ''
    };
    lines.forEach((line) => {
      const [key, ...value] = line.split(':');
      if (key && value.length > 0) {
        // Remove spaces in the attribution field for parsing
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        if (normalizedKey in attributionData) {
          (attributionData as unknown as Record<string, string>)[normalizedKey] = value.join(':').trim();
        }
      }
    });
    return attributionData;
  };

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="lg">
          Edit Skill Submission
        </Title>
        {error && <Alert variant="danger" title={error} />}
        <Form>
          <FormGroup label="Commit Message" fieldId="title">
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
              <FormFieldGroupHeader titleText={{ text: 'Skill Info', id: 'skill-info-id' }} titleDescription="Provide information about the skill." />
            }
          >
            <FormGroup key={'skill-info-details-id'}>
              <TextArea
                isRequired
                type="text"
                aria-label="task_description"
                placeholder="Enter a detailed description to improve the teacher model's responses"
                value={task_description}
                onChange={(_event, value) => setTaskDescription(value)}
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
            toggleAriaLabel="Details"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'Skill', id: 'contrib-skill-id' }}
                titleDescription="Contribute skill to the taxonomy repository (shift+enter for a new line)."
              />
            }
          >
            {questions.map((question, index) => (
              <FormGroup key={index}>
                <Text component="h6" className="heading">
                  {' '}
                  Example : {index + 1}
                </Text>
                <TextArea
                  isRequired
                  type="text"
                  aria-label={`Question ${index + 1}`}
                  placeholder="Enter the question"
                  value={questions[index]}
                  onChange={(_event, value) => handleInputChange(index, 'question', value)}
                />
                <TextArea
                  type="text"
                  aria-label={`Context ${index + 1}`}
                  placeholder="Enter the context (Optional)"
                  value={contexts[index]}
                  onChange={(_event, value) => handleInputChange(index, 'context', value)}
                />
                <TextArea
                  isRequired
                  type="text"
                  aria-label={`Answer ${index + 1}`}
                  placeholder="Enter the answer"
                  value={answers[index]}
                  onChange={(_event, value) => handleInputChange(index, 'answer', value)}
                />
                <Button variant="danger" onClick={() => deleteQuestionAnswerPair(index)}>
                  <MinusCircleIcon /> Delete
                </Button>
              </FormGroup>
            ))}
            <Button variant="primary" onClick={addQuestionAnswerPair}>
              <PlusIcon /> Add Question and Answer
            </Button>
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
              Update Skill Submission
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

export default EditSkillPage;
