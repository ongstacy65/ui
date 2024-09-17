import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { load } from 'js-yaml'
import { stringify } from 'yaml';

const INCLUDED_FOLDERS = ['compositional_skills', 'foundational_skills', 'knowledge'];
const EXCLUDED_FILES = ['.gitignore', '.md'];


const pathIncludesIncludedFolder = (path: string): boolean => {
  return INCLUDED_FOLDERS.some(folder => path.includes(folder));
};

const isExcludedFile = (path: string): boolean => {
  return EXCLUDED_FILES.some(file => path.includes(file));
};

async function fetchGithubRepoData(path = ''): Promise<any> {
  const REPO_OWNER = process.env.NEXT_PUBLIC_TAXONOMY_REPO_OWNER;
  const REPO_NAME = process.env.NEXT_PUBLIC_TAXONOMY_REPO;

  if (!REPO_OWNER || !REPO_NAME) {
    throw new Error('Repository owner or name is not defined in environment variables');
  }

  const GITHUB_REPO_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

  const response = await fetch(GITHUB_REPO_API_URL, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const data = await response.json();

  const filteredData = data.filter((item: any) => pathIncludesIncludedFolder(item.path) && !isExcludedFile(item.path));

  for (const item of filteredData) {
    if (item.type === 'dir') {
      item.children = await fetchGithubRepoData(item.path);
    } else if (item.type === 'file') {
      item.content = await fetchFileContent(item.download_url);
    }
  }

  return filteredData;
}

// TODO: render file data in frontend through pop up window
async function fetchFileContent(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const text = await response.text();
 
  try {
    const parsedYaml = load(text);
    return stringify(parsedYaml);
  } catch (e) {
    console.error('Failed to parse YAML', e);
    return text;
  }
}


function buildTree(data: any, parentPath = ''): any {
  return data.map((item: any) => {
    const isFolder = item.type === 'dir';
    return {
      name: item.name,
      path: `${parentPath}/${item.name}`,
      type: isFolder ? 'folder' : 'file',
      ...(isFolder && { children: buildTree(item.children, `${parentPath}/${item.name}`) }),
      content: isFolder ? 'No content' : item.content,
    };
  });
}

export async function GET() {
  try {
    const data = await fetchGithubRepoData('');
    const folderStructure = buildTree(data);
    return NextResponse.json(folderStructure);
  } catch (error) {
    console.error('Error in GET /api/taxonomy/graph:', error);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export { fetchFileContent };