import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { load } from 'js-yaml';
import { stringify } from 'yaml';

interface GithubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
  content?: string;
  created_by?: string;
  children?: GithubFile[];
}

interface GithubApiResponse {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
}

const INCLUDED_FOLDERS = ['compositional_skills', 'foundational_skills', 'knowledge'];
const EXCLUDED_FILES = ['.gitignore', '.md'];

const pathIncludesIncludedFolder = (path: string): boolean => {
  return INCLUDED_FOLDERS.some((folder) => path.includes(folder));
};

const isExcludedFile = (path: string): boolean => {
  return EXCLUDED_FILES.some((file) => path.includes(file));
};

async function fetchGithubRepoData(path = ''): Promise<GithubFile[]> {
  const REPO_OWNER = process.env.NEXT_PUBLIC_TAXONOMY_REPO_OWNER;
  const REPO_NAME = process.env.NEXT_PUBLIC_TAXONOMY_REPO;

  if (!REPO_OWNER || !REPO_NAME) {
    throw new Error('Repository owner or name is not defined in environment variables');
  }

  const GITHUB_REPO_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

  const response = await fetch(GITHUB_REPO_API_URL, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const data: GithubApiResponse[] = (await response.json()) as GithubApiResponse[];

  const filteredData: GithubFile[] = data
    .filter((item: GithubApiResponse) => pathIncludesIncludedFolder(item.path) && !isExcludedFile(item.path))
    .map((item) => ({
      ...item,
      children: item.type === 'dir' ? [] : undefined
    }));

  for (const item of filteredData) {
    if (item.type === 'dir') {
      item.children = await fetchGithubRepoData(item.path);
    } else if (item.type === 'file' && item.download_url) {
      const content = await fetchFileContent(item.download_url);
      item.content = typeof content === 'string' ? content : stringify(content);
      item.created_by = (typeof content !== 'string' && (content?.created_by as string)) || 'Unknown';
    }
  }

  return filteredData;
}

async function fetchFileContent(url: string): Promise<Record<string, unknown> | string> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const text = await response.text();

  try {
    const parsedYaml = load(text) as Record<string, unknown>;
    return parsedYaml;
  } catch (e) {
    console.error('Failed to parse YAML', e);
    return text;
  }
}

function buildTree(data: GithubFile[], parentPath = ''): GithubFile[] {
  return data.map((item) => {
    const isFolder = item.type === 'dir';
    return {
      name: item.name,
      path: `${parentPath}/${item.name}`,
      type: item.type,
      ...(isFolder && { children: buildTree(item.children || [], `${parentPath}/${item.name}`) }),
      content: isFolder ? 'No content' : item.content,
      created_by: item.created_by
    };
  });
}

export async function GET() {
  try {
    const data = await fetchGithubRepoData('');
    const folderStructure = buildTree(data);
    return NextResponse.json(folderStructure);
  } catch (error: unknown) {
    console.error('Error in GET /api/taxonomy/graph:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
