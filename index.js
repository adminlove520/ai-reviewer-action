const core = require('@actions/core');
const github = require('@actions/github');

// LLM API 调用
async function callLLM(prompt, config) {
  const { provider, apiKey, model } = config;
  
  let endpoint = '';
  let headers = {
    'Content-Type': 'application/json'
  };
  let body = {};
  
  switch (provider.toLowerCase()) {
    case 'deepseek':
      endpoint = 'https://api.deepseek.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位专业的代码审查员。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      };
      break;
      
    case 'openai':
      endpoint = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'gpt-4',
        messages: [
          { role: 'system', content: '你是一位专业的代码审查员。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      };
      break;
      
    case 'anthropic':
    case 'claude':
      endpoint = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: model || 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: prompt }
        ]
      };
      break;
      
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // 解析不同 API 的响应格式
  if (provider.toLowerCase() === 'anthropic' || provider.toLowerCase() === 'claude') {
    return data.content[0].text;
  }
  
  return data.choices[0].message.content;
}

async function run() {
  try {
    // 获取输入
    const githubToken = core.getInput('github-token', { required: true });
    const llmProvider = core.getInput('llm-provider') || 'deepseek';
    const llmModel = core.getInput('llm-model') || '';
    const reviewStyle = core.getInput('review-style') || 'professional';
    const commentMode = core.getInput('comment-mode') || 'summary';
    
    // 获取环境变量中的 API Key
    const apiKeys = {
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      claude: process.env.ANTHROPIC_API_KEY,
      qwen: process.env.QWEN_API_KEY,
      zhipuai: process.env.ZHIPUAI_API_KEY
    };
    
    const apiKey = apiKeys[llmProvider.toLowerCase()];
    if (!apiKey) {
      core.setFailed(`No API key found for provider: ${llmProvider}`);
      return;
    }
    
    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    
    // 检查是否是 PR 事件
    if (context.eventName !== 'pull_request' && context.eventName !== 'push') {
      core.info('Not a pull request or push event, skipping');
      return;
    }
    
    // 获取代码变更
    const changes = await getChanges(octokit, context);
    
    if (!changes || changes.length === 0) {
      core.info('No changes found');
      return;
    }
    
    core.info(`Found ${changes.length} changed files`);
    
    // 构建审查提示
    const prompt = buildReviewPrompt(changes, reviewStyle);
    
    // 调用 LLM 进行审查
    core.info(`Calling LLM (${llmProvider})...`);
    const reviewResult = await callLLM(prompt, {
      provider: llmProvider,
      apiKey: apiKey,
      model: llmModel
    });
    
    core.info('Review completed');
    
    // 写入审查结果到 PR 评论
    if (context.eventName === 'pull_request') {
      await postReviewComment(octokit, context, reviewResult, changes);
    }
    
    // 写入 Summary
    core.summary.addRaw(`## 🔍 AI Code Review\n\n`).addRaw(reviewResult).write();
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getChanges(octokit, context) {
  const { owner, repo } = context.repo;
  let changes = [];
  
  if (context.eventName === 'pull_request') {
    const prNumber = context.payload.pull_request.number;
    
    // 获取 PR diff
    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      accept: 'application/vnd.github.v3.diff'
    });
    
    // 解析 diff
    const diffContent = response.data;
    const fileDiffs = parseDiff(diffContent);
    changes = fileDiffs;
    
  } else if (context.eventName === 'push') {
    const commit = context.payload.after;
    if (commit) {
      const response = await octokit.rest.repos.getCommit({
        owner,
        repo,
        commit_sha: commit
      });
      
      for (const file of response.data.files || []) {
        changes.push({
          file: file.filename,
          diff: file.patch || '',
          additions: file.additions,
          deletions: file.deletions
        });
      }
    }
  }
  
  return changes;
}

function parseDiff(diffContent) {
  const files = [];
  if (!diffContent) return files;
  
  const fileBlocks = diffContent.split(/^diff --git/m).filter(Boolean);
  
  for (const block of fileBlocks) {
    const lines = block.split('\n');
    let filePath = '';
    let diff = '';
    
    for (const line of lines) {
      if (line.startsWith('+++ b/')) {
        filePath = line.replace('+++ b/', '').trim();
      } else if (diff || line.startsWith('+') || line.startsWith('-') || line.startsWith('@@')) {
        diff += line + '\n';
      }
    }
    
    if (filePath && diff) {
      files.push({ file: filePath, diff: diff.trim() });
    }
  }
  
  return files;
}

function buildReviewPrompt(changes, style) {
  const stylePrompts = {
    professional: '你是一位资深的软件开发工程师，专注于代码审查。请严谨细致地审查代码。',
    sarcastic: '你是一位毒舌的代码审查员。请用幽默讽刺的方式指出代码问题。',
    gentle: '你是一位温和的代码审查员。请用委婉友善的方式给出建议。',
    humorous: '你是一位幽默的代码审查员。请用轻松有趣的方式审查代码。'
  };
  
  const systemPrompt = stylePrompts[style] || stylePrompts.professional;
  
  // 限制文件数量，避免 token 过多
  const limitedChanges = changes.slice(0, 10);
  
  const fileList = limitedChanges.map(c => {
    return `### 文件: ${c.file}\n\`\`\`diff\n${c.diff.slice(0, 2000)}\n\`\`\``;
  }).join('\n\n');
  
  return `${systemPrompt}

请审查以下代码变更:

${fileList}

请从以下几个方面进行审查:
1. 代码规范问题
2. 潜在错误和 Bug
3. 安全风险
4. 性能问题
5. 代码可读性和可维护性
6. 改进建议

请给出具体的审查结果，包括问题位置和修复建议。`;
}

async function postReviewComment(octokit, context, reviewResult, changes) {
  const { owner, repo } = context.repo;
  const prNumber = context.payload.pull_request.number;
  
  // 限制评论长度
  const maxLength = 65000;
  let result = reviewResult;
  if (result.length > maxLength) {
    result = result.slice(0, maxLength) + '\n\n...(审查结果过长，已截断)';
  }
  
  const commentBody = `## 🔍 AI Code Review

${result}

---
*由 ai-reviewer 自动生成*`;
  
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: commentBody
  });
  
  core.info('Review comment posted successfully');
}

module.exports = run;
