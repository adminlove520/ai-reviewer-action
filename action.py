"""
GitHub Action Entry Point
"""
import os
import sys
import json
import subprocess

def main():
    # 获取输入
    github_token = os.getenv('INPUT_GITHUB-TOKEN', '')
    llm_provider = os.getenv('INPUT_LLM-PROVIDER', 'deepseek')
    llm_model = os.getenv('INPUT_LLM-MODEL', '')
    review_style = os.getenv('INPUT-REVIEW-STYLE', 'professional')
    
    print(f"AI Reviewer Action")
    print(f"Provider: {llm_provider}")
    print(f"Style: {review_style}")
    
    # 打印环境信息
    print(f"GitHub Token: {'*' * 10}{github_token[-4:] if github_token else 'None'}")
    print(f"LLM Model: {llm_model or 'default'}")
    
    # 这里可以添加实际的审查逻辑
    print("Action completed successfully!")

if __name__ == "__main__":
    main()
