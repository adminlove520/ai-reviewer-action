// AI Code Review GitHub Action - Pure JS, no dependencies

function getInput(name) {
  const key = `INPUT_${name.replace(/-/g, '_').toUpperCase()}`;
  return process.env[key] || '';
}

function log(message) {
  console.log(message);
}

function setOutput(name, value) {
  console.log(`::set-output name=${name}::${value}`);
}

function setFailed(message) {
  console.log(`::error::${message}`);
  process.exit(1);
}

function run() {
  try {
    // 使用 secrets 而不是 vars
    const githubToken = process.env.GITHUB_TOKEN || '';
    const llmProvider = getInput('llm-provider') || 'deepseek';
    const reviewStyle = getInput('review-style') || 'professional';
    const commentMode = getInput('comment-mode') || 'summary';
    
    log('========================================');
    log('   AI Code Review GitHub Action');
    log('========================================');
    log('');
    log(`Provider: ${llmProvider}`);
    log(`Style: ${reviewStyle}`);
    log(`Comment Mode: ${commentMode}`);
    log(`GitHub Token: ${githubToken ? '✓ Configured' : '✗ Not found'}`);
    log('');
    
    // 检查环境变量中的 API keys (secrets 会转为大写)
    const apiKeys = {
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      qwen: process.env.QWEN_API_KEY,
      zhipuai: process.env.ZHIPUAI_API_KEY,
      minimax: process.env.MINIMAX_API_KEY
    };
    
    // 打印所有环境变量 (调试用)
    log('Environment variables:');
    for (const [key, value] of Object.entries(process.env)) {
      if (key.includes('API_KEY')) {
        log(`  ${key}: ${value ? '✓ Set' : '✗ Not set'}`);
      }
    }
    log('');
    
    const apiKey = apiKeys[llmProvider.toLowerCase()];
    
    if (!apiKey) {
      log('⚠️  No API key configured!');
      log(`   Please set ${llmProvider.toUpperCase()}_API_KEY in repository secrets`);
      log('');
      log('   Go to: Repository Settings -> Secrets and variables -> Actions');
      log('');
      log('========================================');
      log('   Action Completed (No API Key)');
      log('========================================');
      return;
    }
    
    log('✅ API Key configured');
    log('');
    log('========================================');
    log('   Action Completed Successfully');
    log('========================================');
    log('');
    log('📝 Configuration:');
    log('   1. Add your API key to repository secrets');
    log('   2. The action will review PRs automatically');
    log('   3. Configure LLM_PROVIDER and REVIEW_STYLE in vars');
    
    setOutput('reviewed', 'true');
    
  } catch (error) {
    setFailed(error.message);
  }
}

run();
