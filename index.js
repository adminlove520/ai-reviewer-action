const core = require('@actions/core');
const github = require('@actions/github');

function run() {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const llmProvider = core.getInput('llm-provider') || 'deepseek';
    const reviewStyle = core.getInput('review-style') || 'professional';
    
    console.log('=== AI Code Review Action ===');
    console.log(`Provider: ${llmProvider}`);
    console.log(`Style: ${reviewStyle}`);
    console.log(`Token: ${githubToken.substring(0, 4)}...`);
    
    // 检查环境变量
    const apiKeys = {
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    };
    
    const hasKey = apiKeys[llmProvider.toLowerCase()];
    console.log(`API Key configured: ${hasKey ? 'Yes' : 'No'}`);
    
    console.log('=== Action Completed ===');
    console.log('AI Reviewer is ready! Configure API keys in repository secrets.');
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
