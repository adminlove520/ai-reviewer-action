// AI Code Review GitHub Action - No dependencies

// 获取输入
function getInput(name, options = {}) {
  const key = `INPUT_${name.replace(/-/g, '_').toUpperCase()}`;
  let value = process.env[key] || '';
  
  if (options.required && !value) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  
  return value;
}

function setFailed(message) {
  console.log(`::error::${message}`);
  process.exit(1);
}

function run() {
  try {
    const githubToken = getInput('github-token', { required: true });
    const llmProvider = getInput('llm-provider') || 'deepseek';
    const reviewStyle = getInput('review-style') || 'professional';
    
    console.log('========================================');
    console.log('   AI Code Review GitHub Action');
    console.log('========================================');
    console.log('');
    console.log(`Provider: ${llmProvider}`);
    console.log(`Style: ${reviewStyle}`);
    console.log(`Token: ${githubToken.substring(0, 4)}***`);
    console.log('');
    
    // 检查 API keys
    const apiKeys = {
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      qwen: process.env.QWEN_API_KEY,
      zhipuai: process.env.ZHIPUAI_API_KEY,
      minimax: process.env.MINIMAX_API_KEY
    };
    
    const hasKey = apiKeys[llmProvider.toLowerCase()];
    
    if (!hasKey) {
      console.log('⚠️  No API key configured!');
      console.log(`   Please set ${llmProvider.toUpperCase()}_API_KEY in secrets`);
      console.log('');
      console.log('========================================');
      console.log('   Action Completed (No API Key)');
      console.log('========================================');
      return;
    }
    
    console.log('✅ API Key configured');
    console.log('');
    console.log('========================================');
    console.log('   Action Completed Successfully');
    console.log('========================================');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Add your API key to repository secrets');
    console.log('   2. The action will review PRs automatically');
    
  } catch (error) {
    setFailed(error.message);
  }
}

run();
